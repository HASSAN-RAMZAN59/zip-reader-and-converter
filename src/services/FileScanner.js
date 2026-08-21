import RNFS from 'react-native-fs';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Extensions strictly matching active device gallery & file manager standards
const EXTENSION_CATEGORIES = {
  Images: ['.jpg', '.jpeg', '.png', '.webp', '.heic'],
  Videos: ['.mp4', '.mkv', '.avi', '.mov', '.3gp', '.webm', '.flv', '.wmv'],
  Audios: [
    '.mp3',
    '.wav',
    '.m4a',
    '.aac',
    '.flac',
    '.ogg',
    '.opus',
    '.amr',
    '.wma',
  ],
  Documents: [
    '.pdf',
    '.docx',
    '.doc',
    '.xlsx',
    '.xls',
    '.pptx',
    '.ppt',
    '.txt',
    '.csv',
    '.rtf',
  ],
  APK: ['.apk', '.xapk'],
  Compressed: ['.zip', '.rar', '.7z', '.iso', '.tar', '.gz'],
};

// Folders to ignore to prevent scanning cached thumbnails and cloud/system cache
const IGNORED_FOLDER_NAMES = new Set([
  'cache',
  'caches',
  'thumb',
  'thumbnails',
  'lost+found',
  'whatsapp voice notes',
  'voice notes',
  '.trash',
  '.trashes',
  '.recycle',
]);

const getFileExtension = (filename) => {
  if (!filename || typeof filename !== 'string') return '';
  const lastDotIndex = filename.lastIndexOf('.');
  if (lastDotIndex === -1) return '';
  return filename.substring(lastDotIndex).toLowerCase();
};

/**
 * Gallery-Accurate Deep Storage Scanner
 * Scans up to 15 levels deep across real device folders while strictly
 * ignoring hidden dot-directories (.thumbnails, .nomedia), OS data caches,
 * and zero-byte cloud placeholders.
 *
 * @param {string} rootPath - Storage root (defaults to RNFS.ExternalStorageDirectoryPath)
 * @returns {Promise<Object>} Object containing categorized file arrays
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

  const isIgnoredDirectory = (dirName, dirPath) => {
    if (!dirName) return true;

    // 1. Skip all hidden folders starting with '.' (.thumbnails, .android, .trash, .nomedia)
    if (dirName.startsWith('.')) return true;

    const lowerName = dirName.toLowerCase().trim();
    const lowerPath = (dirPath || '').toLowerCase();

    // 2. Skip cache / junk / voice note spam folders
    if (IGNORED_FOLDER_NAMES.has(lowerName)) return true;

    // 3. Skip Android/data and Android/obb (where app internal cache lives)
    if (
      lowerPath.includes('/android/data') ||
      lowerPath.includes('/android/obb')
    ) {
      return true;
    }

    return false;
  };

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

    // Skip hidden files starting with '.' (.nomedia, .temp, etc.)
    if (item.name && item.name.startsWith('.')) return;

    // Zero-byte filter: ignore empty/corrupted/cloud placeholder files
    const fileSize = Number(item.size);
    if (isNaN(fileSize) || fileSize <= 0) return;

    seenFilePaths.add(item.path);

    const ext = getFileExtension(item.name);
    const fileInfo = {
      name: item.name || 'Unnamed',
      path: item.path,
      size: fileSize,
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

    // Category extensions
    for (const [category, extensions] of Object.entries(EXTENSION_CATEGORIES)) {
      if (extensions.includes(ext)) {
        categorizedFiles[category].push(fileInfo);
        break;
      }
    }
  };

  try {
    const queue = [{ path: rootPath, depth: 0 }];
    const CONCURRENCY_LIMIT = 5;
    const MAX_DEPTH = 15;
    let iterationCount = 0;

    while (queue.length > 0) {
      const currentBatch = queue.splice(0, CONCURRENCY_LIMIT);

      await Promise.all(
        currentBatch.map(async ({ path: currentDir, depth }) => {
          try {
            const items = await RNFS.readDir(currentDir);

            // If folder has .nomedia file, Android Gallery skips all media in it
            const hasNoMedia = items.some(
              (i) => i.name && i.name.toLowerCase() === '.nomedia'
            );
            if (hasNoMedia) return;

            for (let i = 0; i < items.length; i++) {
              const item = items[i];

              if (item.isDirectory()) {
                if (
                  depth < MAX_DEPTH &&
                  !isIgnoredDirectory(item.name, item.path)
                ) {
                  queue.push({ path: item.path, depth: depth + 1 });
                }
              } else if (item.isFile()) {
                processFile(item);
              }
            }
          } catch (dirErr) {
            // Skip unreadable directories
          }
        })
      );

      iterationCount += currentBatch.length;

      // Yield every 12 directories to keep UI at 60 FPS
      if (iterationCount % 12 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 0));
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
