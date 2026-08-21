import RNFS from 'react-native-fs';
import {
  zip,
  zipWithPassword,
  unzip,
  unzipWithPassword,
  isPasswordProtected,
} from 'react-native-zip-archive';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@recent_zips';
const EXTRACTED_STORAGE_KEY = '@extracted_history';

/**
 * Checks if a zip archive is encrypted / password protected
 * @param {string} sourceZipPath - Path to the archive
 * @returns {Promise<boolean>}
 */
export const checkArchiveEncrypted = async (sourceZipPath) => {
  if (!sourceZipPath) return false;
  try {
    const cleanPath = decodeURIComponent(sourceZipPath.replace(/^file:\/\//, ''));
    const isProtected = await isPasswordProtected(cleanPath);
    return Boolean(isProtected);
  } catch (err) {
    console.log('Password protection check error:', err);
    return false;
  }
};

/**
 * Creates a zip archive from a list of selected files with optional password
 * @param {Array} files - Array of selected files from DocumentPicker
 * @param {string} archiveName - Target name of the archive (e.g., 'archive.zip')
 * @param {string} password - Optional encryption password
 * @returns {Promise<Object>} Metadata of created zip file
 */
export const createZipArchive = async (files, archiveName, password = '') => {
  if (!files || files.length === 0) {
    throw new Error('No files selected for compression.');
  }

  // Ensure .zip extension
  let fileName = archiveName ? archiveName.trim() : `Archive_${Date.now()}`;
  if (!fileName.toLowerCase().endsWith('.zip')) {
    fileName += '.zip';
  }

  // Determine output directory (Android Download folder)
  const outputDir =
    RNFS.DownloadDirectoryPath ||
    `${RNFS.ExternalStorageDirectoryPath}/Download`;
  const targetZipPath = `${outputDir}/${fileName}`;

  // Unique staging directory for files to be zipped
  const stagingDir = `${RNFS.CachesDirectoryPath}/zip_staging_${Date.now()}`;

  try {
    // Ensure output directory exists
    const dirExists = await RNFS.exists(outputDir);
    if (!dirExists) {
      await RNFS.mkdir(outputDir);
    }

    // Create temporary staging directory
    await RNFS.mkdir(stagingDir);

    // Copy selected files into the staging folder
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const sourceUri = file.path || file.fileCopyUri || file.uri;
      const destinationPath = `${stagingDir}/${file.name || `file_${i}`}`;

      if (sourceUri.startsWith('content://')) {
        // If content URI, copy using RNFS
        await RNFS.copyFile(sourceUri, destinationPath);
      } else {
        const cleanSourcePath = decodeURIComponent(
          sourceUri.replace(/^file:\/\//, '')
        );
        await RNFS.copyFile(cleanSourcePath, destinationPath);
      }
    }

    // Delete existing target file if it already exists
    const exists = await RNFS.exists(targetZipPath);
    if (exists) {
      await RNFS.unlink(targetZipPath);
    }

    // Compress
    let zipResultPath;
    if (password && password.trim().length > 0) {
      // Create password protected zip
      zipResultPath = await zipWithPassword(
        stagingDir,
        targetZipPath,
        password.trim(),
        'AES-256'
      );
    } else {
      // Standard zip
      zipResultPath = await zip(stagingDir, targetZipPath);
    }

    // Index file in Android system media scanner so it appears immediately in file managers
    try {
      if (RNFS.scanFile) {
        await RNFS.scanFile(targetZipPath);
      }
    } catch (scanErr) {
      console.log('scanFile notification:', scanErr);
    }

    // Retrieve file stats
    let fileSize = 0;
    try {
      const stats = await RNFS.stat(targetZipPath);
      fileSize = stats.size;
    } catch (e) {
      // stat failed
    }

    // Save record to AsyncStorage
    const zipRecord = {
      id: Date.now().toString(),
      name: fileName,
      path: targetZipPath,
      size: fileSize,
      timestamp: new Date().toISOString(),
      isProtected: Boolean(password && password.trim().length > 0),
    };

    await saveZipToHistory(zipRecord);

    return zipRecord;
  } finally {
    // Clean up temporary staging directory
    try {
      const stagingExists = await RNFS.exists(stagingDir);
      if (stagingExists) {
        await RNFS.unlink(stagingDir);
      }
    } catch (cleanErr) {
      console.warn('Failed to cleanup staging directory:', cleanErr);
    }
  }
};

/**
 * Extracts a compressed archive to a destination directory
 * @param {string} sourceZipPath - Absolute path to the source archive (.zip, .rar, .7z, etc.)
 * @param {string} targetDirectory - Directory to extract files into
 * @param {string} password - Optional password for encrypted archives
 * @returns {Promise<Object>} Metadata of the extracted archive
 */
export const extractZipArchive = async (sourceZipPath, targetDirectory, password = '') => {
  if (!sourceZipPath) {
    throw new Error('No source archive path provided.');
  }

  const cleanSourcePath = decodeURIComponent(
    sourceZipPath.replace(/^file:\/\//, '')
  );
  const cleanTargetDir = decodeURIComponent(
    targetDirectory.replace(/^file:\/\//, '')
  );

  const fileExists = await RNFS.exists(cleanSourcePath);
  if (!fileExists) {
    throw new Error('Archive file does not exist at: ' + cleanSourcePath);
  }

  // Check file size
  try {
    const fileStat = await RNFS.stat(cleanSourcePath);
    if (fileStat.size === 0) {
      throw new Error('This archive is empty (0 bytes) and cannot be extracted.');
    }
  } catch (statErr) {
    if (statErr.message.includes('0 bytes')) {
      throw statErr;
    }
  }

  // Ensure target extraction directory exists
  const targetExists = await RNFS.exists(cleanTargetDir);
  if (!targetExists) {
    await RNFS.mkdir(cleanTargetDir);
  }

  let extractedPath;
  try {
    if (password && password.trim().length > 0) {
      extractedPath = await unzipWithPassword(
        cleanSourcePath,
        cleanTargetDir,
        password.trim()
      );
    } else {
      extractedPath = await unzip(cleanSourcePath, cleanTargetDir);
    }
  } catch (unzipErr) {
    const errText = String(unzipErr.message || unzipErr || '');
    if (errText.includes('headers not found') || errText.includes('Not a zip')) {
      throw new Error(
        'Invalid or unsupported archive format. The file may not be a valid .zip archive or may be corrupted.'
      );
    }
    throw unzipErr;
  }

  // Notify Android Media Scanner for the extracted directory/files
  try {
    if (RNFS.scanFile) {
      await RNFS.scanFile(cleanTargetDir);
    }
  } catch (scanErr) {
    console.log('scanFile notification:', scanErr);
  }

  const extractRecord = {
    id: Date.now().toString(),
    archiveName: cleanSourcePath.substring(cleanSourcePath.lastIndexOf('/') + 1),
    archivePath: cleanSourcePath,
    extractedPath: cleanTargetDir,
    timestamp: new Date().toISOString(),
    isProtected: Boolean(password && password.trim().length > 0),
  };

  await saveExtractedHistory(extractRecord);

  return extractRecord;
};

/**
 * Saves an extraction record to AsyncStorage
 */
export const saveExtractedHistory = async (record) => {
  try {
    const existing = await AsyncStorage.getItem(EXTRACTED_STORAGE_KEY);
    const list = existing ? JSON.parse(existing) : [];
    list.unshift(record);
    await AsyncStorage.setItem(EXTRACTED_STORAGE_KEY, JSON.stringify(list));
  } catch (error) {
    console.error('Failed to save extracted history:', error);
  }
};

/**
 * Retrieves extraction history from AsyncStorage
 */
export const getExtractedHistory = async () => {
  try {
    const existing = await AsyncStorage.getItem(EXTRACTED_STORAGE_KEY);
    return existing ? JSON.parse(existing) : [];
  } catch (error) {
    console.error('Failed to get extracted history:', error);
    return [];
  }
};

/**
 * Saves a created zip record to AsyncStorage
 */
export const saveZipToHistory = async (zipRecord) => {
  try {
    const existing = await AsyncStorage.getItem(STORAGE_KEY);
    const list = existing ? JSON.parse(existing) : [];
    list.unshift(zipRecord);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (error) {
    console.error('Failed to save zip to history:', error);
  }
};

/**
 * Retrieves history of created zips from AsyncStorage
 */
export const getZipHistory = async () => {
  try {
    const existing = await AsyncStorage.getItem(STORAGE_KEY);
    return existing ? JSON.parse(existing) : [];
  } catch (error) {
    console.error('Failed to get zip history:', error);
    return [];
  }
};

export default {
  createZipArchive,
  extractZipArchive,
  checkArchiveEncrypted,
  saveZipToHistory,
  getZipHistory,
  saveExtractedHistory,
  getExtractedHistory,
};
