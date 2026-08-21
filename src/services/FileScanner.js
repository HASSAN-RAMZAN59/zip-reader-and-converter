import RNFS from 'react-native-fs';

const EXTENSION_CATEGORIES = {
  Compressed: ['.zip', '.rar', '.7z', '.tar', '.gz'],
  Documents: ['.docx', '.xlsx', '.pptx', '.pdf', '.txt'],
  Images: ['.png', '.jpg', '.jpeg'],
  Videos: ['.mp4'],
  Audios: ['.mp3'],
  APK: ['.apk'],
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

  const isIgnoredDir = (dirName, dirPath) => {
    if (!dirName || dirName.startsWith('.')) return true;
    if (IGNORED_FOLDER_NAMES.has(dirName)) return true;
    if (dirPath && (dirPath.includes('/Android/data') || dirPath.includes('/Android/obb'))) {
      return true;
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
              mtime: item.mtime || null,
              extension: ext,
            };

            // Download category (all files within Download directory)
            const normalizedPath = item.path.toLowerCase();
            if (
              normalizedPath.includes('/download/') ||
              normalizedPath.includes('/downloads/')
            ) {
              categorizedFiles.Download.push(fileInfo);
            }

            // Extracted category
            if (
              normalizedPath.includes('/extracted/') ||
              normalizedPath.includes('/zipapp/extracted')
            ) {
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
