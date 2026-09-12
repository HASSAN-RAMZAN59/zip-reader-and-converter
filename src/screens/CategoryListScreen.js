import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  DeviceEventEmitter,
  Image,
  NativeModules,
  Share,
} from 'react-native';
import DocumentPicker from 'react-native-document-picker';
import RNFS from 'react-native-fs';
import FolderIcon from '../assets/fi_12075662.svg';
import MoreVertIcon from '../assets/more_vert.svg';
import SearchIcon from '../assets/search.svg';
import DocumentBlueIcon from '../assets/document/fi_2991108.svg';
import AudioRecordIcon from '../assets/fi_1834342.svg';
import {
  extractZipArchive,
  checkArchiveEncrypted,
  createZipArchive,
  getArchiveContents,
  getExtractedHistory,
} from '../services/ZipService';
import LottieView from 'lottie-react-native';
import LoadingAnimation from '../assets/Loading.json';
import { GradientButton } from '../components/GradientButton';
import { cleanDisplayPath } from '../utils/pathUtils';

// Import Icons from home (used as file type icons)
import CompressedIcon from '../assets/home/Background.svg';
import DocumentsIcon from '../assets/home/Background (2).svg';
import ImagesIcon from '../assets/home/Background (3).svg';
import AudioIcon from '../assets/home/Background (4).svg';
import VideoIcon from '../assets/home/Background (5).svg';
import APKIcon from '../assets/home/Background (6).svg';
import DefaultFileIcon from '../assets/home/Background (1).svg';

const COMPRESSED_EXTENSIONS = ['.zip', '.rar', '.7z', '.tar', '.gz'];
const IMAGE_EXTENSIONS = [
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.heic',
  '.heif',
  '.gif',
  '.bmp',
  '.svg',
];
const VIDEO_EXTENSIONS = [
  '.mp4',
  '.mkv',
  '.avi',
  '.mov',
  '.3gp',
  '.webm',
  '.flv',
  '.wmv',
];
const AUDIO_EXTENSIONS = ['.mp3', '.wav', '.aac', '.m4a', '.flac', '.ogg', '.wma'];
const DOCUMENT_EXTENSIONS = ['.pdf', '.doc', '.docx', '.txt', '.xls', '.xlsx', '.ppt', '.pptx', '.csv'];

const getExtension = (fileName = '') => {
  if (!fileName || typeof fileName !== 'string') return '';
  const lastDot = fileName.lastIndexOf('.');
  if (lastDot === -1) return '';
  return fileName.substring(lastDot).toLowerCase();
};

const isImageFile = (fileName = '') => {
  const ext = getExtension(fileName);
  return IMAGE_EXTENSIONS.includes(ext);
};

const getFileIcon = (fileName) => {
  const ext = getExtension(fileName);
  switch (ext) {
    case '.png': case '.jpg': case '.jpeg': case '.gif': case '.webp':
      return ImagesIcon;
    case '.mp4': case '.mkv': case '.avi': case '.mov':
      return VideoIcon;
    case '.mp3': case '.wav': case '.aac': case '.m4a': case '.flac': case '.ogg':
      return AudioRecordIcon;
    case '.pdf': case '.doc': case '.docx': case '.txt': case '.xls':
      return DocumentsIcon;
    case '.apk':
      return APKIcon;
    case '.zip': case '.rar': case '.7z':
      return CompressedIcon;
    default:
      return DefaultFileIcon;
  }
};

const isVideoFile = (fileName = '') => {
  const ext = getExtension(fileName);
  return VIDEO_EXTENSIONS.includes(ext);
};

const VideoThumbnail = React.memo(({ path, name }) => {
  const [thumbUri, setThumbUri] = useState(null);

  useEffect(() => {
    let isMounted = true;
    if (
      NativeModules.ManageStorageModule &&
      NativeModules.ManageStorageModule.getVideoThumbnail &&
      path
    ) {
      NativeModules.ManageStorageModule.getVideoThumbnail(path)
        .then((uri) => {
          if (isMounted && uri) {
            setThumbUri(uri);
          }
        })
        .catch(() => { });
    }
    return () => {
      isMounted = false;
    };
  }, [path]);

  const imageSource = thumbUri
    ? { uri: thumbUri }
    : (path && (path.endsWith('.jpg') || path.endsWith('.jpeg') || path.endsWith('.png') || path.endsWith('.webp'))
      ? { uri: 'file://' + path }
      : null);

  return (
    <View style={styles.videoCardContainer}>
      {imageSource ? (
        <Image
          source={imageSource}
          style={styles.videoCardImage}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.videoCardPlaceholder}>
          <VideoIcon width={28} height={28} />
        </View>
      )}

      {/* Play Icon Badge Overlay (Centered white play button as shown in screenshot) */}
      <View style={styles.videoPlayOverlay}>
        <View style={styles.playCircle}>
          <Text style={styles.playIconTriangle}>▶</Text>
        </View>
      </View>
    </View>
  );
});

const ApkIconThumbnail = React.memo(({ path }) => {
  const [iconUri, setIconUri] = useState(null);

  useEffect(() => {
    let isMounted = true;
    if (
      NativeModules.ManageStorageModule &&
      NativeModules.ManageStorageModule.getApkIcon &&
      path
    ) {
      NativeModules.ManageStorageModule.getApkIcon(path)
        .then((uri) => {
          if (isMounted && uri) {
            setIconUri(uri);
          }
        })
        .catch(() => { });
    }
    return () => {
      isMounted = false;
    };
  }, [path]);

  if (iconUri) {
    return (
      <Image
        source={{ uri: iconUri }}
        style={styles.apkThumbnailImage}
        resizeMode="cover"
      />
    );
  }

  return <APKIcon width={40} height={40} />;
});

const ItemIconThumbnail = React.memo(({ item, isDownload, isExtracted }) => {
  const name = item?.name || '';
  const ext = getExtension(name);

  // If in Downloads category:
  // Use ONLY fast static SVG icons! No heavy image/video decoding or native module calls to prevent memory crashes!
  if (isDownload) {
    if (IMAGE_EXTENSIONS.includes(ext)) return <ImagesIcon width={40} height={40} />;
    if (VIDEO_EXTENSIONS.includes(ext)) return <VideoIcon width={40} height={40} />;
    if (ext === '.apk') return <APKIcon width={40} height={40} />;
    if (AUDIO_EXTENSIONS.includes(ext)) return <AudioRecordIcon width={40} height={40} />;
    if (DOCUMENT_EXTENSIONS.includes(ext)) return <DocumentBlueIcon width={32} height={32} />;
    if (COMPRESSED_EXTENSIONS.includes(ext)) return <FolderIcon width={32} height={32} />;
    return <DefaultFileIcon width={32} height={32} />;
  }

  // If in Extracted category:
  if (isExtracted) {
    if (IMAGE_EXTENSIONS.includes(ext)) {
      if (item?.path) {
        return (
          <Image
            source={{ uri: 'file://' + item.path }}
            style={styles.imageThumbnailCard}
            resizeMode="cover"
            onError={() => { }}
          />
        );
      }
      return <ImagesIcon width={40} height={40} />;
    }

    if (VIDEO_EXTENSIONS.includes(ext)) {
      return <VideoThumbnail path={item?.path} name={item?.name} />;
    }

    if (ext === '.apk') return <APKIcon width={40} height={40} />;
    if (AUDIO_EXTENSIONS.includes(ext)) return <AudioRecordIcon width={40} height={40} />;
    if (DOCUMENT_EXTENSIONS.includes(ext)) return <DocumentBlueIcon width={32} height={32} />;
    if (COMPRESSED_EXTENSIONS.includes(ext)) return <FolderIcon width={32} height={32} />;
    return <DefaultFileIcon width={32} height={32} />;
  }

  if (ext === '.apk') {
    return <ApkIconThumbnail path={item?.path} />;
  }

  if (IMAGE_EXTENSIONS.includes(ext)) {
    if (item?.path) {
      return (
        <Image
          source={{ uri: 'file://' + item.path }}
          style={styles.imageThumbnailCard}
          resizeMode="cover"
          onError={() => { }}
        />
      );
    }
    return <ImagesIcon width={40} height={40} />;
  }

  if (VIDEO_EXTENSIONS.includes(ext)) {
    return <VideoThumbnail path={item?.path} name={item?.name} />;
  }

  if (AUDIO_EXTENSIONS.includes(ext)) {
    return <AudioRecordIcon width={40} height={40} />;
  }

  if (DOCUMENT_EXTENSIONS.includes(ext)) {
    return <DocumentBlueIcon width={32} height={32} />;
  }

  if (COMPRESSED_EXTENSIONS.includes(ext)) {
    return <FolderIcon width={32} height={32} />;
  }

  return <DefaultFileIcon width={32} height={32} />;
});

export const CategoryListScreen = ({ route, navigation }) => {
  const { categoryName = 'Files', files = [] } = route.params || {};

  const isDownload = categoryName === 'Download' || categoryName === 'Downloads';
  const isExtracted = categoryName === 'Extracted';

  // Safe file list filtering
  const validFiles = Array.isArray(files)
    ? files.filter((f) => f && typeof f === 'object' && f.name)
    : [];

  const [fileList, setFileList] = useState(validFiles);

  useEffect(() => {
    let isMounted = true;
    const loadExtractedFiles = async () => {
      if (isExtracted) {
        try {
          const history = await getExtractedHistory();
          const merged = [];
          const pathSet = new Set();

          // Recursive helper to get all extracted files inside a folder
          const readFolderRecursively = async (dirPath) => {
            try {
              const items = await RNFS.readDir(dirPath);
              for (const subItem of items) {
                if (subItem.isFile() && !subItem.name.startsWith('.')) {
                  const ext = getExtension(subItem.name);
                  if (!COMPRESSED_EXTENSIONS.includes(ext) && !pathSet.has(subItem.path)) {
                    pathSet.add(subItem.path);
                    merged.push({
                      name: subItem.name,
                      path: subItem.path,
                      size: subItem.size,
                      mtime: subItem.mtime,
                    });
                  }
                } else if (subItem.isDirectory() && !subItem.name.startsWith('.')) {
                  await readFolderRecursively(subItem.path);
                }
              }
            } catch (e) {
              // Ignore unreadable directory
            }
          };

          // 1. Filter out compressed archives from files passed from scanner
          for (const f of validFiles) {
            const ext = getExtension(f.name);
            if (!COMPRESSED_EXTENSIONS.includes(ext) && !pathSet.has(f.path)) {
              pathSet.add(f.path);
              merged.push(f);
            }
          }

          // 2. Scan extracted folders from history
          for (const item of history) {
            if (item.extractedPath) {
              const exists = await RNFS.exists(item.extractedPath);
              if (exists) {
                const stat = await RNFS.stat(item.extractedPath);
                if (stat.isDirectory()) {
                  await readFolderRecursively(item.extractedPath);
                } else if (stat.isFile()) {
                  const ext = getExtension(item.extractedPath);
                  if (!COMPRESSED_EXTENSIONS.includes(ext) && !pathSet.has(item.extractedPath)) {
                    pathSet.add(item.extractedPath);
                    merged.push({
                      name: item.extractedPath.split('/').pop(),
                      path: item.extractedPath,
                      size: stat.size,
                      mtime: stat.mtime,
                    });
                  }
                }
              }
            }
          }

          if (isMounted) {
            setFileList(merged);
          }
        } catch (err) {
          console.error('Error loading extracted files:', err);
        }
      } else {
        setFileList(validFiles);
      }
    };

    loadExtractedFiles();

    return () => {
      isMounted = false;
    };
  }, [isExtracted, files]);

  // Real-time Search State
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Real-time Filtered Files List
  const displayedFiles = fileList.filter((item) => {
    if (!searchQuery.trim()) return true;
    return item?.name?.toLowerCase().includes(searchQuery.trim().toLowerCase());
  });

  // Multi-Selection State (for Long-Press & Batch Zip Compression)
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedPaths, setSelectedPaths] = useState(new Set());

  // Compression Modal State
  const [compressModalVisible, setCompressModalVisible] = useState(false);
  const [compressArchiveName, setCompressArchiveName] = useState('');
  const [compressPassword, setCompressPassword] = useState('');
  const [isCompressing, setIsCompressing] = useState(false);

  // Extraction Modal State
  const [extractModalVisible, setExtractModalVisible] = useState(false); // This will now serve as the full-screen details modal
  const [selectedArchive, setSelectedArchive] = useState(null);
  const [password, setPassword] = useState('');
  const [isEncrypted, setIsEncrypted] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractingStatus, setExtractingStatus] = useState('');
  
  // New State for Zip Details & Custom Success UI Modal
  const [innerFiles, setInnerFiles] = useState([]);
  const [isLoadingContents, setIsLoadingContents] = useState(false);
  const [pendingTargetDir, setPendingTargetDir] = useState(null);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  
  // Custom Success Modal State
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [successData, setSuccessData] = useState(null);
  const [successType, setSuccessType] = useState('extract');

  useEffect(() => {
    const loadContents = async () => {
      if (!selectedArchive || !selectedArchive.path || !extractModalVisible) {
        return;
      }
      setIsLoadingContents(true);
      try {
        const contents = await getArchiveContents(selectedArchive.path);
        const formatted = (contents || [])
          .filter(entry => !entry.isDirectory)
          .map((entry, index) => {
            const parts = entry.path.split('/');
            const name = parts[parts.length - 1];
            return { 
              id: index.toString(), 
              path: entry.path, 
              name: name,
              size: entry.size 
            };
          });
        setInnerFiles(formatted);

        const encrypted = await checkArchiveEncrypted(selectedArchive.path);
        setIsEncrypted(encrypted);
      } catch (err) {
        console.error('Failed to load zip contents:', err);
      } finally {
        setIsLoadingContents(false);
      }
    };

    if (extractModalVisible) {
      loadContents();
    } else {
      // Clear contents when modal closes
      setInnerFiles([]);
    }
  }, [selectedArchive, extractModalVisible]);

  // Image Preview Modal State
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);

  // File Detail / Opener Modal State
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedDetailFile, setSelectedDetailFile] = useState(null);

  const formatFileSize = (bytes) => {
    const num = Number(bytes);
    if (!num || isNaN(num) || num <= 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(num) / Math.log(k));
    if (i < 0) return '0 B';
    const idx = Math.min(i, sizes.length - 1);
    return parseFloat((num / Math.pow(k, idx)).toFixed(1)) + ' ' + sizes[idx];
  };

  const isArchiveFile = (fileName = '') => {
    const ext = getExtension(fileName);
    return COMPRESSED_EXTENSIONS.includes(ext);
  };

  // --- Multi-Selection & Long Press Logic ---
  const handleItemLongPress = (item) => {
    if (!item || !item.path) return;

    if (!isSelectionMode) {
      setIsSelectionMode(true);
      const newSet = new Set();
      newSet.add(item.path);
      setSelectedPaths(newSet);
    } else {
      toggleItemSelection(item.path);
    }
  };

  const toggleItemSelection = (path) => {
    setSelectedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedPaths.size === fileList.length) {
      setSelectedPaths(new Set());
    } else {
      const allSet = new Set(fileList.map((f) => f.path).filter(Boolean));
      setSelectedPaths(allSet);
    }
  };

  const handleExitSelectionMode = () => {
    setIsSelectionMode(false);
    setSelectedPaths(new Set());
  };

  const handleOpenCompressModal = () => {
    if (selectedPaths.size === 0) {
      Alert.alert(
        'No Files Selected',
        'Please select at least 1 file to compress.'
      );
      return;
    }
    const selectedFileObjects = validFiles.filter((f) =>
      selectedPaths.has(f.path)
    );
    const defaultName = `${categoryName}_Archive.zip`;
    setIsSelectionMode(false);
    setSelectedPaths(new Set());
    navigation.navigate('CreateZip', {
      initialFiles: selectedFileObjects,
      defaultName: defaultName,
    });
  };

  const handlePerformCompression = async () => {
    const trimmedName = compressArchiveName.trim();
    if (!trimmedName) {
      Alert.alert('Archive Name Required', 'Please enter a valid archive name.');
      return;
    }

    const selectedFileObjects = validFiles.filter((f) =>
      selectedPaths.has(f.path)
    );

    if (selectedFileObjects.length === 0) {
      Alert.alert('Error', 'No files selected to compress.');
      return;
    }

    setIsCompressing(true);

    try {
      const result = await createZipArchive(
        selectedFileObjects,
        trimmedName,
        compressPassword
      );

      DeviceEventEmitter.emit('ZIP_CREATED', result);

      setCompressModalVisible(false);
      setIsSelectionMode(false);
      setSelectedPaths(new Set());

      setSuccessData({
        title: 'Zip Created Successfully!',
        name: result.name || trimmedName,
        path: result.path,
      });
      setSuccessType('create');
      setSuccessModalVisible(true);
    } catch (error) {
      console.error('Compression failed:', error);
      Alert.alert(
        'Compression Error',
        error.message || 'Failed to create zip archive.'
      );
    } finally {
      setIsCompressing(false);
    }
  };

  // --- Normal Tap Actions ---
  const handleFilePress = async (item) => {
    if (!item) return;

    // If currently in selection mode, tapping toggles selection
    if (isSelectionMode) {
      toggleItemSelection(item.path);
      return;
    }

    if (isArchiveFile(item.name) || categoryName === 'Compressed') {
      setSelectedArchive(item);
      setPassword('');
      setIsEncrypted(false);
      setExtractModalVisible(true);
    } else if (isImageFile(item.name) || categoryName === 'Images') {
      setPreviewImage(item);
      setImageModalVisible(true);
    } else {
      setSelectedDetailFile(item);
      setDetailModalVisible(true);
    }
  };

  const openWithSystemApp = async (filePath) => {
    try {
      if (
        NativeModules.ManageStorageModule &&
        NativeModules.ManageStorageModule.openFile
      ) {
        await NativeModules.ManageStorageModule.openFile(filePath);
      } else {
        Alert.alert('Open File', `Path: ${filePath}`);
      }
    } catch (err) {
      console.error('Failed to open file:', err);
      Alert.alert(
        'Cannot Open File',
        'No suitable app found on device to open this file format.'
      );
    }
  };

  const handleShareFile = async (targetFilePath = null) => {
    let filePaths = [];
    if (typeof targetFilePath === 'string' && targetFilePath.trim()) {
      filePaths = [targetFilePath.trim()];
    } else if (selectedDetailFile && selectedDetailFile.path) {
      filePaths = [selectedDetailFile.path];
    } else if (selectedPaths && selectedPaths.size > 0) {
      filePaths = Array.from(selectedPaths);
    }

    if (filePaths.length > 0) {
      try {
        if (NativeModules.ManageStorageModule) {
          if (filePaths.length === 1 && NativeModules.ManageStorageModule.shareFile) {
            await NativeModules.ManageStorageModule.shareFile(filePaths[0]);
          } else if (filePaths.length > 1 && NativeModules.ManageStorageModule.shareMultipleFiles) {
            await NativeModules.ManageStorageModule.shareMultipleFiles(filePaths);
          } else if (NativeModules.ManageStorageModule.shareFile) {
            await NativeModules.ManageStorageModule.shareFile(filePaths[0]);
          }
        } else {
          Alert.alert('Share File', `Files: ${filePaths.join(', ')}`);
        }
      } catch (error) {
        console.error('Failed to share file:', error);
        Alert.alert('Error', 'Failed to share file.');
      }
    }
  };

  const closeExtractModal = () => {
    if (!isExtracting) {
      setExtractModalVisible(false);
      setPassword('');
      setIsEncrypted(false);
      setPendingTargetDir(null);
    }
  };

  const closePasswordModal = () => {
    if (!isExtracting) {
      setPasswordModalVisible(false);
      setPassword('');
    }
  };

  const getArchiveBaseName = (fileName = '') => {
    return (fileName || '').replace(/\.[^/.]+$/, '');
  };

  const performExtraction = async (destinationDirectory, pwd = '') => {
    if (!selectedArchive) return;

    setIsExtracting(true);
    setExtractingStatus('Extracting... Please wait');

    try {
      const result = await extractZipArchive(
        selectedArchive.path,
        destinationDirectory,
        pwd
      );

      DeviceEventEmitter.emit('EXTRACTION_SUCCESS', result);
      if (typeof route.params?.onExtractSuccess === 'function') {
        route.params.onExtractSuccess(result);
      }

      const extractedName = selectedArchive ? selectedArchive.name : '';
      setIsExtracting(false);
      setExtractingStatus('');
      setExtractModalVisible(false);
      setPasswordModalVisible(false);
      setSelectedArchive(null);
      setPassword('');
      setIsEncrypted(false);
      setPendingTargetDir(null);

      setSuccessData({
        title: 'Extraction Successful!',
        name: extractedName,
        path: result.extractedPath,
      });
      setSuccessType('extract');
      setSuccessModalVisible(true);
    } catch (error) {
      setIsExtracting(false);
      setExtractingStatus('');
      console.error('Extraction error:', error);
      const errMsg = String(error.message || error || '').toLowerCase();
      if (errMsg.includes('password') || errMsg.includes('encrypted')) {
        setIsEncrypted(true);
        if (!passwordModalVisible) {
          setPendingTargetDir(destinationDirectory);
          setPasswordModalVisible(true);
        } else {
          Alert.alert('Incorrect Password', 'The password you entered is incorrect.');
        }
      } else {
        Alert.alert(
          'Extraction Error',
          error.message || 'Failed to extract archive. File might be corrupted.'
        );
      }
    }
  };

  const handleExtractHere = () => {
    if (!selectedArchive || !selectedArchive.path) return;
    const parentDir = selectedArchive.path.substring(
      0,
      selectedArchive.path.lastIndexOf('/')
    );
    const baseName = getArchiveBaseName(selectedArchive.name);
    const targetDir = `${parentDir}/${baseName}`;
    
    if (isEncrypted) {
      setPendingTargetDir(targetDir);
      setPasswordModalVisible(true);
    } else {
      performExtraction(targetDir);
    }
  };

  const convertSafUriToPath = (uri) => {
    if (!uri) return null;
    const decoded = decodeURIComponent(uri);
    if (decoded.includes('tree/primary:')) {
      const relPath = decoded.split('tree/primary:')[1];
      return `/storage/emulated/0/${relPath}`;
    } else if (decoded.includes('tree/')) {
      const parts = decoded.split('tree/')[1];
      const cleanRel = parts.replace(/^primary(:|%3A)/i, '');
      return `/storage/emulated/0/${cleanRel}`;
    }
    return null;
  };

  const handleExtractToCustomFolder = async () => {
    if (!selectedArchive) return;

    try {
      const dirResult = await DocumentPicker.pickDirectory();
      if (dirResult && dirResult.uri) {
        const chosenPath = convertSafUriToPath(dirResult.uri);
        if (chosenPath) {
          const baseName = getArchiveBaseName(selectedArchive.name);
          const targetDir = `${chosenPath}/${baseName}`;
          if (isEncrypted) {
            setPendingTargetDir(targetDir);
            setPasswordModalVisible(true);
          } else {
            performExtraction(targetDir);
          }
        } else {
          Alert.alert(
            'Folder Selection',
            'Could not resolve folder path. Please pick a valid internal storage directory.'
          );
        }
      }
    } catch (err) {
      if (!DocumentPicker.isCancel(err)) {
        console.error('Directory picker error:', err);
        Alert.alert('Error', 'Failed to pick custom folder.');
      }
    }
  };

  const handleConfirmPasswordExtraction = () => {
    if (!password.trim()) {
      Alert.alert('Password Required', 'Please enter the password to extract.');
      return;
    }
    performExtraction(pendingTargetDir, password);
  };

  const renderInnerFileItem = ({ item }) => {
    const IconComp = getFileIcon(item.name);
    return (
      <View style={styles.innerFileItem}>
        <IconComp width={40} height={40} style={styles.fileIcon} />
        <View style={styles.fileDetails}>
          <Text style={styles.fileName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.innerFileSize}>{formatFileSize(item.size)}</Text>
        </View>
      </View>
    );
  };

  const renderFileItem = ({ item, index }) => {
    if (!item) return null;

    const isImg = categoryName === 'Images';
    const isVid = categoryName === 'Videos' || categoryName === 'Video';
    const isCompressed = categoryName === 'Compressed';
    const isDocument = categoryName === 'Documents';
    const isAudio = categoryName === 'Audios' || categoryName === 'Audio';
    const isApk = categoryName === 'APK' || categoryName === 'Apk';
    const isDownload = categoryName === 'Download' || categoryName === 'Downloads';
    const isExtracted = categoryName === 'Extracted';
    const useSpecialCard = isCompressed || isDocument || isImg || isAudio || isVid || isApk || isDownload || isExtracted;
    const isSelected = selectedPaths.has(item.path);

    return (
      <TouchableOpacity
        style={[
          useSpecialCard ? styles.compressedCard : styles.fileItem,
          isSelected && styles.fileItemSelected,
        ]}
        activeOpacity={0.7}
        onPress={() => handleFilePress(item)}
        onLongPress={() => handleItemLongPress(item)}
        delayLongPress={300}
      >
        {/* Selection Checkbox Indicator (Visible in selection mode) */}
        {isSelectionMode && (
          <View
            style={[
              styles.checkboxBox,
              isSelected && styles.checkboxBoxSelected,
            ]}
          >
            {isSelected ? (
              <Text style={styles.checkboxCheckText}>✓</Text>
            ) : null}
          </View>
        )}

        {/* Render Thumbnail / Icon */}
        {useSpecialCard ? (
          <View style={styles.compressedIconContainer}>
            <ItemIconThumbnail item={item} isDownload={isDownload} isExtracted={isExtracted} />
          </View>
        ) : null}

        {/* File Info */}
        <View style={useSpecialCard ? styles.compressedTextContainer : styles.fileDetails}>
          <Text style={useSpecialCard ? styles.compressedFileName : styles.fileName} numberOfLines={1} ellipsizeMode="middle">
            {item.name || 'Unnamed File'}
          </Text>
          <Text style={useSpecialCard ? styles.compressedFileSize : styles.fileSize}>{formatFileSize(item.size)}</Text>
        </View>

        {/* More Icon (3 dots) */}
        {useSpecialCard && !isSelectionMode && (
          <TouchableOpacity
            style={styles.moreButton}
            activeOpacity={0.7}
            onPress={() => {
              setSelectedDetailFile(item);
              setDetailModalVisible(true);
            }}
          >
            <MoreVertIcon width={24} height={24} />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  const isSpecialHeaderCategory =
    categoryName === 'Compressed' ||
    categoryName === 'Documents' ||
    categoryName === 'Images' ||
    categoryName === 'Audios' ||
    categoryName === 'Audio' ||
    categoryName === 'Videos' ||
    categoryName === 'Video' ||
    categoryName === 'APK' ||
    categoryName === 'Apk' ||
    categoryName === 'Download' ||
    categoryName === 'Downloads' ||
    categoryName === 'Extracted';

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={styles.container}>
        {/* Header */}
        <View style={isSpecialHeaderCategory ? styles.compressedHeader : styles.header}>
          {isSelectionMode ? (
            <>
              <TouchableOpacity
                style={styles.backButton}
                activeOpacity={0.7}
                onPress={handleExitSelectionMode}
              >
                <Text style={styles.backButtonText}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {selectedPaths.size} Selected
              </Text>
              <TouchableOpacity
                style={styles.actionHeaderButton}
                activeOpacity={0.7}
                onPress={handleSelectAll}
              >
                <Text style={styles.actionHeaderButtonText}>
                  {selectedPaths.size === validFiles.length
                    ? 'Deselect All'
                    : 'Select All'}
                </Text>
              </TouchableOpacity>
            </>
          ) : isSearchActive ? (
            <View style={styles.searchHeaderContainer}>
              <TextInput
                style={styles.searchInput}
                placeholder={`Search in ${categoryName}...`}
                placeholderTextColor="#888888"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus={true}
              />
              <TouchableOpacity
                style={styles.closeSearchButton}
                activeOpacity={0.7}
                onPress={() => {
                  setIsSearchActive(false);
                  setSearchQuery('');
                }}
              >
                <Text style={styles.closeSearchText}>✕</Text>
              </TouchableOpacity>
            </View>
          ) : isSpecialHeaderCategory ? (
            <>
              <View>
                <Text style={styles.compressedHeaderTitle}>
                  {categoryName === 'Audios' || categoryName === 'Audio'
                    ? 'Audio'
                    : categoryName === 'Videos' || categoryName === 'Video'
                    ? 'Video'
                    : categoryName === 'APK' || categoryName === 'Apk'
                    ? 'APK'
                    : categoryName === 'Download' || categoryName === 'Downloads'
                    ? 'Downloads'
                    : categoryName === 'Extracted'
                    ? 'Extracted'
                    : categoryName === 'Documents'
                    ? 'Document'
                    : categoryName === 'Images'
                    ? 'Images'
                    : 'Compressed'}
                </Text>
                <Text style={styles.compressedHeaderSubtitle}>
                  Total Files ( {displayedFiles.length} )
                </Text>
              </View>
              <TouchableOpacity
                style={styles.searchButton}
                activeOpacity={0.7}
                onPress={() => setIsSearchActive(true)}
              >
                <SearchIcon width={24} height={24} />
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity
                style={styles.backButton}
                activeOpacity={0.7}
                onPress={() => navigation.goBack()}
              >
                <Text style={styles.backButtonText}>{'< Back'}</Text>
              </TouchableOpacity>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {categoryName} ({displayedFiles.length})
              </Text>
            </>
          )}
        </View>

        {/* File List */}
        <FlatList
          data={displayedFiles}
          keyExtractor={(item, index) =>
            item?.path ? `${item.path}-${index}` : `file-${index}`
          }
          renderItem={renderFileItem}
          contentContainerStyle={[
            styles.listContent,
            isSelectionMode && styles.listContentWithBottomBar,
          ]}
          initialNumToRender={15}
          maxToRenderPerBatch={20}
          windowSize={7}
          removeClippedSubviews={true}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {searchQuery.trim()
                  ? `No files match "${searchQuery}"`
                  : 'No files found in this category.'}
              </Text>
            </View>
          }
        />

        {/* Bottom Multi-Selection Action Bar */}
        {isSelectionMode && (
          <View style={styles.selectionBottomBar}>
            <TouchableOpacity
              style={[
                styles.compressActionButton,
                selectedPaths.size === 0 && styles.disabledButton,
              ]}
              activeOpacity={0.7}
              onPress={handleOpenCompressModal}
              disabled={selectedPaths.size === 0}
            >
              <Text style={styles.compressActionButtonText}>
                Compress to Zip ({selectedPaths.size})
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 1. Batch Compression Modal (Triggered by Long-Press & Multi-Select) */}
        <Modal
          visible={compressModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => {
            if (!isCompressing) setCompressModalVisible(false);
          }}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Compress Files</Text>
              <Text style={styles.modalSubtitle}>
                {selectedPaths.size} file(s) selected
              </Text>

              <Text style={styles.inputLabel}>Archive Name (.zip)</Text>
              <TextInput
                style={styles.passwordInput}
                placeholder="Enter archive name"
                placeholderTextColor="#888888"
                value={compressArchiveName}
                onChangeText={setCompressArchiveName}
                editable={!isCompressing}
                autoCapitalize="none"
              />

              <Text style={styles.inputLabel}>Optional Password (AES-256)</Text>
              <TextInput
                style={styles.passwordInput}
                placeholder="Leave blank for no password"
                placeholderTextColor="#888888"
                value={compressPassword}
                onChangeText={setCompressPassword}
                editable={!isCompressing}
                secureTextEntry={false}
                autoCapitalize="none"
              />

              {isCompressing && (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#000000" />
                  <Text style={styles.loadingText}>Compressing into Zip...</Text>
                </View>
              )}

              <TouchableOpacity
                style={[
                  styles.modalButton,
                  isCompressing && styles.disabledButton,
                ]}
                activeOpacity={0.7}
                onPress={handlePerformCompression}
                disabled={isCompressing}
              >
                <Text style={styles.modalButtonText}>Create Zip Archive</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.cancelButton,
                  isCompressing && styles.disabledButton,
                ]}
                activeOpacity={0.7}
                onPress={() => setCompressModalVisible(false)}
                disabled={isCompressing}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* 2. Extraction Action Modal (Now Full Screen Details) */}
        <Modal
          visible={extractModalVisible}
          transparent={false}
          animationType="slide"
          onRequestClose={closeExtractModal}
        >
          <SafeAreaView style={styles.detailsSafeArea}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
            <View style={styles.detailsContainer}>
              {/* Header */}
              <View style={styles.detailsHeader}>
                <View style={styles.detailsHeaderLeft}>
                  <TouchableOpacity onPress={closeExtractModal} style={styles.detailsBackButton}>
                    <Text style={styles.detailsBackButtonText}>{'< Back'}</Text>
                  </TouchableOpacity>
                  <Text style={styles.detailsHeaderTitle}>Extracting</Text>
                </View>
              </View>

              {/* Zip Details Section */}
              <Text style={styles.sectionTitle}>Zip Details</Text>
              <View style={styles.detailCard}>
                <Text style={styles.detailLabel}>File Size</Text>
                <Text style={styles.detailValue}>{selectedArchive ? formatFileSize(selectedArchive.size) : '0 B'}</Text>
              </View>
              <View style={styles.detailCard}>
                <Text style={styles.detailLabel}>Total Files</Text>
                <Text style={styles.detailValue}>{isLoadingContents ? 'Loading...' : innerFiles.length}</Text>
              </View>

              {/* File List Section */}
              <Text style={styles.sectionTitle}>File List</Text>
              <View style={styles.detailsListContainer}>
                {isLoadingContents ? (
                  <ActivityIndicator size="large" color="#4CAF50" style={{ marginTop: 20 }} />
                ) : (
                  <FlatList
                    data={innerFiles}
                    keyExtractor={(item) => item.id}
                    renderItem={renderInnerFileItem}
                    contentContainerStyle={styles.detailsListContent}
                    ListEmptyComponent={
                      <Text style={styles.emptyText}>No files could be parsed or archive is empty.</Text>
                    }
                  />
                )}
              </View>

              {/* Bottom Actions */}
              <View style={styles.detailsBottomActions}>
                <GradientButton style={styles.detailsExtractBtn} onPress={handleExtractHere} title="Extract Here" />
                <GradientButton style={[styles.detailsExtractBtn, styles.detailsCustomFolderBtn]} onPress={handleExtractToCustomFolder} title="Choose Custom Folder" />
              </View>
            </View>
          </SafeAreaView>
        </Modal>

        {/* Password Modal */}
        <Modal
          visible={passwordModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={closePasswordModal}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Password Required</Text>
              <Text style={styles.modalSubtitle} numberOfLines={2}>
                {selectedArchive ? selectedArchive.name : ''}
              </Text>

              <Text style={styles.inputLabel}>Enter archive password</Text>
              <TextInput
                style={styles.passwordInput}
                placeholder="Password"
                placeholderTextColor="#888888"
                value={password}
                onChangeText={setPassword}
                editable={!isExtracting}
                secureTextEntry={true}
                autoCapitalize="none"
              />

              {isExtracting && (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#4CAF50" />
                  <Text style={styles.loadingText}>{extractingStatus}</Text>
                </View>
              )}

              <GradientButton
                style={[styles.modalButton, isExtracting && styles.disabledButton]}
                onPress={handleConfirmPasswordExtraction}
                disabled={isExtracting}
                title="Extract"
              />

              <TouchableOpacity
                style={[styles.cancelButton, isExtracting && styles.disabledButton]}
                activeOpacity={0.8}
                onPress={closePasswordModal}
                disabled={isExtracting}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* 3. Image Full Preview Modal */}
        <Modal
          visible={imageModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setImageModalVisible(false)}
        >
          <TouchableOpacity
            style={styles.previewModalOverlay}
            activeOpacity={1}
            onPressOut={() => setImageModalVisible(false)}
          >
            <TouchableOpacity
              activeOpacity={1}
              style={styles.previewModalContent}
              onPress={() => {}}
            >
              <View style={styles.previewHeader}>
                <Text style={styles.previewTitle} numberOfLines={1}>
                  {previewImage ? previewImage.name : ''}
                </Text>
                <Text style={styles.previewMeta}>
                  {previewImage ? formatFileSize(previewImage.size) : ''}
                </Text>
              </View>

              {previewImage && previewImage.path ? (
                <View style={styles.imagePreviewWrapper}>
                  <Image
                    source={{ uri: 'file://' + previewImage.path }}
                    style={styles.fullPreviewImage}
                    resizeMode="cover"
                    onError={() => { }}
                  />
                </View>
              ) : null}

              <View style={styles.previewFooter}>
                <TouchableOpacity
                  style={styles.imageGalleryBtn}
                  activeOpacity={0.8}
                  onPress={() => {
                    if (previewImage && previewImage.path) {
                      setImageModalVisible(false);
                      openWithSystemApp(previewImage.path);
                    }
                  }}
                >
                  <Text style={styles.imageBtnText}>Open in Gallery</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.imageShareBtn}
                  activeOpacity={0.8}
                  onPress={() => {
                    if (previewImage && previewImage.path) {
                      handleShareFile(previewImage.path);
                    }
                  }}
                >
                  <Text style={styles.imageBtnText}>Share File</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>

        {/* 4. File Detail & System Opener Modal (Videos, Audios, Docs, APK) */}
        <Modal
          visible={detailModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setDetailModalVisible(false)}
        >
          <TouchableOpacity 
            style={styles.modalOverlay} 
            activeOpacity={1} 
            onPressOut={() => setDetailModalVisible(false)}
          >
            <View style={styles.detailModalCard}>
              <Text style={styles.detailModalTitle}>File Details</Text>
              <Text style={styles.detailModalSubtitle} numberOfLines={1}>
                {selectedDetailFile ? selectedDetailFile.name : ''}
              </Text>

              <View style={styles.detailInfoBoxNew}>
                <View style={styles.detailInfoIcon}>
                  {selectedDetailFile ? (
                    (() => {
                      if (isDownload || isExtracted) {
                        const IconComp = getFileIcon(selectedDetailFile.name);
                        return <IconComp width={40} height={40} />;
                      }
                      if (isVideoFile(selectedDetailFile.name)) {
                        return <VideoThumbnail path={selectedDetailFile.path} name={selectedDetailFile.name} />;
                      }
                      const ext = getExtension(selectedDetailFile.name);
                      if (ext === '.apk') {
                        return <ApkIconThumbnail path={selectedDetailFile.path} />;
                      }
                      const IconComp = getFileIcon(selectedDetailFile.name);
                      return <IconComp width={40} height={40} />;
                    })()
                  ) : null}
                </View>
                <View style={styles.detailInfoTextContainer}>
                  <Text style={styles.detailInfoSizeText}>
                    Size: {selectedDetailFile ? formatFileSize(selectedDetailFile.size) : ''}
                  </Text>
                  <Text style={styles.detailInfoPathText} numberOfLines={2}>
                    Path: {selectedDetailFile ? cleanDisplayPath(selectedDetailFile.path) : ''}
                  </Text>
                </View>
              </View>

              <GradientButton
                style={styles.detailActionBtn}
                onPress={() => {
                  if (selectedDetailFile && selectedDetailFile.path) {
                    setDetailModalVisible(false);
                    openWithSystemApp(selectedDetailFile.path);
                  }
                }}
                title="Open File"
              />

              <GradientButton
                style={styles.detailActionBtn}
                onPress={() => handleShareFile()}
                title="Share File"
              />
            </View>
          </TouchableOpacity>
        </Modal>

        {/* 5. Extraction Lottie Loading Modal */}
        <Modal
          visible={isExtracting}
          transparent={true}
          animationType="fade"
          onRequestClose={() => {}}
        >
          <View style={styles.lottieModalOverlay}>
            <View style={styles.lottieCard}>
              <LottieView
                source={LoadingAnimation}
                autoPlay
                loop
                style={styles.lottieAnimation}
              />
            </View>
          </View>
        </Modal>
        {/* 6. Custom Success UI Modal (Extraction & Zip Creation) */}
        <Modal
          visible={successModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setSuccessModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.successModalCard}>
              <View style={styles.successBadgeCircle}>
                <Text style={styles.successCheckmark}>✓</Text>
              </View>

              <Text style={styles.successModalTitle}>
                {successData?.title || 'Successful!'}
              </Text>

              {successData?.name ? (
                <Text style={styles.successArchiveName} numberOfLines={1}>
                  {successData.name}
                </Text>
              ) : null}

              <View style={styles.successPathBox}>
                <Text style={styles.successPathLabel}>Saved Location:</Text>
                <Text style={styles.successPathText} numberOfLines={3}>
                  {cleanDisplayPath(successData?.path)}
                </Text>
              </View>

              <GradientButton
                style={styles.successDoneBtn}
                onPress={() => {
                  setSuccessModalVisible(false);
                }}
                title="Done"
              />
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
    paddingBottom: 12,
  },
  backButton: {
    borderWidth: 1,
    borderColor: '#000000',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 12,
  },
  backButtonText: {
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
    color: '#000000',
  },
  actionHeaderButton: {
    borderWidth: 1,
    borderColor: '#000000',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  actionHeaderButtonText: {
    fontSize: 12,
    fontFamily: 'Poppins-Medium',
    color: '#000000',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Poppins-Medium',
    color: '#000000',
    flex: 1,
  },
  listContent: {
    paddingBottom: 24,
  },
  listContentWithBottomBar: {
    paddingBottom: 80,
  },
  fileItem: {
    borderWidth: 1,
    borderColor: '#000000',
    backgroundColor: '#FFFFFF',
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  fileItemSelected: {
    backgroundColor: '#F2F2F2',
    borderWidth: 2,
    borderColor: '#000000',
  },
  checkboxBox: {
    width: 22,
    height: 22,
    borderWidth: 2,
    borderColor: '#000000',
    backgroundColor: '#FFFFFF',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxBoxSelected: {
    backgroundColor: '#000000',
  },
  checkboxCheckText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: 'Poppins-Medium',
  },
  apkThumbnailImage: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#F0F0F0',
  },
  videoCardContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    marginRight: 14,
    backgroundColor: '#1E1E1E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoCardImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  videoCardPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#2D3748',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoPlayOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
  },
  playCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIconTriangle: {
    fontSize: 10,
    color: '#FFFFFF',
    marginLeft: 2,
  },
  thumbnailContainer: {
    position: 'relative',
    width: 44,
    height: 44,
    marginRight: 12,
  },
  thumbnailImage: {
    width: 44,
    height: 44,
    borderWidth: 1,
    borderColor: '#000000',
    marginRight: 12,
    backgroundColor: '#F0F0F0',
  },
  thumbnailImageCover: {
    width: 44,
    height: 44,
    borderWidth: 1,
    borderColor: '#000000',
    backgroundColor: '#F0F0F0',
  },
  thumbnailPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#EAEAEA',
  },
  placeholderPlayIcon: {
    fontSize: 14,
    color: '#333333',
  },
  videoBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    borderRadius: 3,
    paddingHorizontal: 3,
    paddingVertical: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoBadgeText: {
    fontSize: 8,
    color: '#FFFFFF',
    fontFamily: 'Poppins-Medium',
  },
  fileDetails: {
    flex: 1,
  },
  fileName: {
    fontSize: 14,
    color: '#000000',
    fontFamily: 'Poppins-Medium',
    marginBottom: 2,
  },
  fileSize: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    color: '#000000',
  },
  emptyContainer: {
    paddingVertical: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#000000',
  },
  compressedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
  },
  compressedHeaderTitle: {
    fontSize: 24,
    fontFamily: 'Poppins-Medium',
    color: '#333333',
    fontWeight: '600',
  },
  compressedHeaderSubtitle: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    color: '#888888',
    marginTop: -2,
  },
  searchButton: {
    padding: 8,
  },
  searchHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F4F7',
    borderRadius: 20,
    paddingHorizontal: 16,
    flex: 1,
    height: 48,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#1D2939',
    paddingVertical: 0,
  },
  closeSearchButton: {
    padding: 6,
    marginLeft: 6,
  },
  closeSearchText: {
    fontSize: 16,
    color: '#666666',
    fontWeight: '600',
  },
  compressedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  compressedIconContainer: {
    marginRight: 14,
  },
  imageThumbnailCard: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#EAEAEA',
  },
  compressedTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  compressedFileName: {
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
    color: '#333333',
    marginBottom: 2,
  },
  compressedFileSize: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    color: '#888888',
  },
  moreButton: {
    padding: 4,
  },
  selectionBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 2,
    borderTopColor: '#000000',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  compressActionButton: {
    backgroundColor: '#000000',
    borderWidth: 1,
    borderColor: '#000000',
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compressActionButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'Poppins-Medium',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalContent: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Poppins-SemiBold',
    fontWeight: '700',
    color: '#2D3748',
    marginBottom: 4,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 20,
    fontFamily: 'Poppins-Regular',
  },
  passwordSection: {
    marginBottom: 10,
  },
  inputLabel: {
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
    fontWeight: '600',
    color: '#4A5568',
    marginBottom: 8,
  },
  passwordInput: {
    backgroundColor: '#F2F4F7',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#2D3748',
    marginBottom: 20,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 13,
    fontFamily: 'Poppins-Medium',
    color: '#0F7B39',
    marginLeft: 8,
  },
  modalButton: {
    backgroundColor: '#43A047',
    borderRadius: 28,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    elevation: 3,
    shadowColor: '#2E7D32',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  modalButtonText: {
    fontSize: 15,
    fontFamily: 'Poppins-SemiBold',
    fontWeight: '600',
    color: '#FFFFFF',
  },
  cancelButton: {
    backgroundColor: '#F2F4F7',
    borderRadius: 28,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  cancelButtonText: {
    fontSize: 14,
    color: '#4A5568',
    fontFamily: 'Poppins-Medium',
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.5,
  },
  previewModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  previewModalContent: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 24,
    alignItems: 'center',
  },
  previewHeader: {
    alignItems: 'center',
    marginBottom: 16,
    width: '100%',
  },
  previewTitle: {
    fontSize: 16,
    fontFamily: 'Poppins-Medium',
    color: '#000000',
    textAlign: 'center',
  },
  previewMeta: {
    fontSize: 13,
    fontFamily: 'Poppins-Regular',
    color: '#777777',
    marginTop: 2,
    textAlign: 'center',
  },
  imagePreviewWrapper: {
    width: '100%',
    height: 300,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 20,
    backgroundColor: '#F0F0F0',
  },
  fullPreviewImage: {
    width: '100%',
    height: '100%',
  },
  previewFooter: {
    width: '100%',
  },
  imageGalleryBtn: {
    backgroundColor: '#38A169',
    borderRadius: 25,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    elevation: 3,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  imageShareBtn: {
    backgroundColor: '#38A169',
    borderRadius: 25,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  imageBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'Poppins-Medium',
  },
  detailInfoBox: {
    borderWidth: 1,
    borderColor: '#000000',
    padding: 10,
    marginBottom: 14,
    backgroundColor: '#FFFFFF',
  },
  detailText: {
    fontSize: 13,
    fontFamily: 'Poppins-Regular',
    color: '#000000',
    marginBottom: 4,
  },
  // Zip Details Modal Styles
  detailsSafeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  detailsContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  detailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  detailsHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailsBackButton: {
    marginRight: 12,
    display: 'none', // Removed back button per user request
  },
  detailsBackButtonText: {
    fontSize: 14,
    color: '#666666',
  },
  detailsHeaderTitle: {
    fontSize: 20,
    fontFamily: 'Poppins-SemiBold',
    fontWeight: '700',
    color: '#333333',
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
    color: '#333333',
    marginBottom: 10,
    marginTop: 10,
  },
  detailCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F4F5F7',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 10,
  },
  detailLabel: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#666666',
  },
  detailValue: {
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
    color: '#333333',
  },
  detailsListContainer: {
    flex: 1,
    marginBottom: 10,
  },
  detailsListContent: {
    paddingBottom: 150,
  },
  innerFileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F4F5F7',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  fileIcon: {
    marginRight: 12,
  },
  fileDetails: {
    flex: 1,
  },
  fileName: {
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
    color: '#333333',
    marginBottom: 4,
  },
  innerFileSize: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    color: '#888888',
  },
  detailsBottomActions: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  detailsExtractBtn: {
    width: '85%',
    backgroundColor: '#4CAF50',
    borderRadius: 30,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
    elevation: 4,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  detailsCustomFolderBtn: {
    backgroundColor: '#4CAF50',
  },
  detailsExtractBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Poppins-Medium',
    fontWeight: '600',
  },
  // File Details Modal Styles (New UI)
  detailModalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  detailModalTitle: {
    fontSize: 18,
    fontFamily: 'Poppins-SemiBold',
    fontWeight: '700',
    color: '#333333',
    marginBottom: 4,
  },
  detailModalSubtitle: {
    fontSize: 13,
    fontFamily: 'Poppins-Regular',
    color: '#666666',
    marginBottom: 20,
    textAlign: 'center',
  },
  detailInfoBoxNew: {
    flexDirection: 'row',
    backgroundColor: '#F4F5F7',
    borderRadius: 16,
    padding: 16,
    width: '100%',
    alignItems: 'center',
    marginBottom: 24,
  },
  detailInfoIcon: {
    marginRight: 16,
  },
  detailInfoTextContainer: {
    flex: 1,
  },
  detailInfoSizeText: {
    fontSize: 13,
    fontFamily: 'Poppins-Medium',
    color: '#333333',
    marginBottom: 4,
  },
  detailInfoPathText: {
    fontSize: 11,
    fontFamily: 'Poppins-Regular',
    color: '#888888',
  },
  detailActionBtn: {
    backgroundColor: '#4CAF50',
    borderRadius: 30,
    paddingVertical: 14,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
    elevation: 3,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  detailActionBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'Poppins-Medium',
    fontWeight: '600',
  },
  lottieModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lottieCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  lottieAnimation: {
    width: 140,
    height: 140,
  },
  successModalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    width: '100%',
    paddingHorizontal: 24,
    paddingVertical: 28,
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  successBadgeCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#43A047',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    elevation: 4,
    shadowColor: '#2E7D32',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  successCheckmark: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 36,
  },
  successModalTitle: {
    fontSize: 20,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
    color: '#2D3748',
    marginBottom: 6,
    textAlign: 'center',
  },
  successArchiveName: {
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
    color: '#4A5568',
    marginBottom: 16,
    textAlign: 'center',
  },
  successPathBox: {
    width: '100%',
    backgroundColor: '#F4F6F8',
    borderRadius: 16,
    padding: 14,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  successPathLabel: {
    fontSize: 11,
    fontFamily: 'Poppins-Medium',
    color: '#718096',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  successPathText: {
    fontSize: 12.5,
    fontFamily: 'Poppins-Regular',
    color: '#004D1E',
    lineHeight: 18,
  },
  successDoneBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default CategoryListScreen;
