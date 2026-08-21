import RNFS from 'react-native-fs';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Strict extension mapping based on user specifications
const EXTENSION_CATEGORIES = {
  Compressed: ['.zip', '.rar', '.7z', '.tar', '.gz'],
  Documents: ['.docx', '.xlsx', '.pptx', '.pdf', '.txt'],
  Images: ['.png', '.jpg', '.jpeg'],
  Videos: ['.mp4'],
  Audios: ['.mp3', '.wav', '.m4a'],
  APK: ['.apk'],
};

// Target list of standard public and user media directories
const getTargetDirectories = () => {
  const root = RNFS.ExternalStorageDirectoryPath;
  const downloadDir = RNFS.DownloadDirectoryPath || `${root}/Download`;

  return [
    downloadDir,
    `${root}/Documents`,
    `${root}/DCIM/Camera`,
    `${root}/DCIM`,
    `${root}/Pictures`,
    `${root}/Music`,
    `${root}/Movies`,
    `${root}/Android/media/com.whatsapp/WhatsApp/Media/WhatsApp Images`,
    `${root}/Android/media/com.whatsapp/WhatsApp/Media/WhatsApp Video`,
    `${root}/Android/media/com.whatsapp/WhatsApp/Media/WhatsApp Documents`,
    `${downloadDir}/Extracted`,
    `${root}/ZipApp`,
  ];
};

const getFileExtension = (filename) => {
  if (!filename) return '';
  const lastDotIndex = filename.lastIndexOf('.');
  if (lastDotIndex === -1) return '';
  return filename.substring(lastDotIndex).toLowerCase();
};

/**
 * Exact Path Targeted Scanner (Non-recursive)
 * Reads only predefined public and user media directories using shallow RNFS.readDir() calls.
 *
 * @returns {Promise<Object>} Object containing categorized file arrays
 */
export const scanDeviceStorage = async () => {
  const categorizedFiles = {
    Compressed: [],
    Extracted: [],
    Documents: [],
    Videos: [],
    Images: [],
    Audios: [],
    APK: [],
    Download: [],
  };

  const seenFilePaths = new Set();

  // Load known zip archive names for extraction matching
  let knownZipBaseNames = [];
  try {
    const historyJson = await AsyncStorage.getItem('@recent_zips');
    if (historyJson) {
      const history = JSON.parse(historyJson);
      knownZipBaseNames = history
        .map((item) => {
          const cleanName = (item.name || '').replace(/\.[^/.]+$/, '').toLowerCase();
          return cleanName;
        })
        .filter(Boolean);
    }
  } catch (e) {
    // Ignore storage read error
  }

  const isExtractedPath = (normalizedPath) => {
    const extractionKeywords = [
      '/extracted',
      '/extract',
      '/unzip',
      '/unzipped',
      '/unrar',
      '/decompressed',
      '/zipapp',
      '_extracted',
      '-extracted',
      '_unzipped',
      '-unzipped',
    ];

    for (const keyword of extractionKeywords) {
      if (normalizedPath.includes(keyword)) {
        return true;
      }
    }

    for (const baseName of knownZipBaseNames) {
      if (baseName.length > 2 && normalizedPath.includes(`/${baseName}/`)) {
        return true;
      }
    }

    return false;
  };

  const processFile = (item) => {
    if (!item || !item.path || seenFilePaths.has(item.path)) return;
    if (item.name && item.name.startsWith('.')) return; // Skip hidden files

    seenFilePaths.add(item.path);

    const ext = getFileExtension(item.name);
    const fileInfo = {
      name: item.name,
      path: item.path,
      size: item.size || 0,
      mtime: item.mtime
        ? item.mtime instanceof Date
          ? item.mtime.toISOString()
          : String(item.mtime)
        : null,
      extension: ext,
    };

    const normalizedPath = item.path.toLowerCase();

    // Download category
    if (
      normalizedPath.includes('/download/') ||
      normalizedPath.includes('/downloads/')
    ) {
      categorizedFiles.Download.push(fileInfo);
    }

    // Extracted category
    if (isExtractedPath(normalizedPath)) {
      categorizedFiles.Extracted.push(fileInfo);
    }

    // Strict extension categories
    for (const [category, extensions] of Object.entries(EXTENSION_CATEGORIES)) {
      if (extensions.includes(ext)) {
        categorizedFiles[category].push(fileInfo);
        break;
      }
    }
  };

  const targetDirs = getTargetDirectories();

  try {
    // Shallow read on each target path using Promise.all
    await Promise.all(
      targetDirs.map(async (dirPath) => {
        try {
          const items = await RNFS.readDir(dirPath);
          for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (item.isFile()) {
              processFile(item);
            }
          }
        } catch (dirErr) {
          // Safely ignore directories that do not exist on this specific device
        }
      })
    );
  } catch (error) {
    console.error('Error during exact path storage scan:', error);
  }

  return categorizedFiles;
};

export default {
  scanDeviceStorage,
};
