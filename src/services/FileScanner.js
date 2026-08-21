import RNFS from 'react-native-fs';
import AsyncStorage from '@react-native-async-storage/async-storage';

const EXTENSION_CATEGORIES = {
  Compressed: ['.zip', '.rar', '.7z'],
  Documents: [
    '.docx',
    '.doc',
    '.xlsx',
    '.xls',
    '.pptx',
    '.ppt',
    '.pdf',
    '.txt',
    '.csv',
    '.rtf',
    '.odt',
    '.epub',
  ],
  Images: ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.svg', '.heic', '.heif'],
  Videos: ['.mp4', '.mkv', '.avi', '.mov', '.3gp', '.webm', '.flv', '.wmv', '.m4v', '.ts'],
  Audios: [
    '.mp3',
    '.m4a',
    '.wav',
    '.ogg',
    '.opus',
    '.aac',
    '.flac',
    '.amr',
    '.wma',
    '.mid',
    '.midi',
  ],
  APK: ['.apk', '.xapk', '.apks'],
};

// Folders to skip to avoid permission crashes and slow scans
const IGNORED_FOLDER_NAMES = new Set([
  'Android',
  'data',
  'obb',
  '.thumbnails',
  '.trash',
  'cache',
  'caches',
]);

const getFileExtension = (filename) => {
  if (!filename) return '';
  const lastDotIndex = filename.lastIndexOf('.');
  if (lastDotIndex === -1) return '';
  return filename.substring(lastDotIndex).toLowerCase();
};

/**
 * Recursively scans device external storage and categorizes files
 * @param {string} rootPath - Starting directory (defaults to RNFS.ExternalStorageDirectoryPath)
 * @returns {Promise<Object>} Object with arrays of file objects for each category
 */
export const scanDeviceStorage = async (
  rootPath = RNFS.ExternalStorageDirectoryPath
) => {
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

  // Load known zip archive names and tracked extraction locations from history
  let knownZipBaseNames = [];
  try {
    const historyJson = await AsyncStorage.getItem('@recent_zips');
    if (historyJson) {
      const history = JSON.parse(historyJson);
      knownZipBaseNames = history.map((item) => {
        const cleanName = (item.name || '').replace(/\.[^/.]+$/, '').toLowerCase();
        return cleanName;
      }).filter(Boolean);
    }
  } catch (e) {
    // Ignore storage read error
  }

  const isIgnoredDir = (dirName, dirPath) => {
    if (!dirName || dirName.startsWith('.')) return true;
    if (IGNORED_FOLDER_NAMES.has(dirName)) return true;
    if (dirPath && (dirPath.includes('/Android/data') || dirPath.includes('/Android/obb'))) {
      return true;
    }
    return false;
  };

  const isExtractedPath = (filePath, normalizedPath) => {
    // 1. Keyword check in path or folder name
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

    // 2. Check if file is inside a folder that matches any created zip name
    for (const baseName of knownZipBaseNames) {
      if (baseName.length > 2 && normalizedPath.includes(`/${baseName}/`)) {
        return true;
      }
    }

    return false;
  };

  try {
    const queue = [rootPath];

    while (queue.length > 0) {
      const currentDir = queue.shift();

      try {
        const items = await RNFS.readDir(currentDir);

        for (const item of items) {
          if (item.isDirectory()) {
            if (!isIgnoredDir(item.name, item.path)) {
              queue.push(item.path);
            }
          } else if (item.isFile()) {
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

            // Download category (all files within Download directory)
            if (
              normalizedPath.includes('/download/') ||
              normalizedPath.includes('/downloads/')
            ) {
              categorizedFiles.Download.push(fileInfo);
            }

            // Extracted category (scans anywhere across internal storage)
            if (isExtractedPath(item.path, normalizedPath)) {
              categorizedFiles.Extracted.push(fileInfo);
            }

            // Extension-based categories
            for (const [category, extensions] of Object.entries(EXTENSION_CATEGORIES)) {
              if (extensions.includes(ext)) {
                categorizedFiles[category].push(fileInfo);
                break;
              }
            }
          }
        }
      } catch (dirError) {
        // Skip unreadable / permission-restricted subdirectories
      }
    }
  } catch (error) {
    console.error('Error during storage scan:', error);
  }

  return categorizedFiles;
};

export default {
  scanDeviceStorage,
};
