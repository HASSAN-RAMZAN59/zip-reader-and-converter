import React, { useState } from 'react';
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
} from 'react-native';
import DocumentPicker from 'react-native-document-picker';
import { extractZipArchive, checkArchiveEncrypted } from '../services/ZipService';

const COMPRESSED_EXTENSIONS = ['.zip', '.rar', '.7z', '.tar', '.gz'];
const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.heic', '.heif', '.gif', '.bmp', '.svg'];

const getExtension = (fileName = '') => {
  if (!fileName || typeof fileName !== 'string') return '';
  const lastDot = fileName.lastIndexOf('.');
  if (lastDot === -1) return '';
  return fileName.substring(lastDot).toLowerCase();
};

export const CategoryListScreen = ({ route, navigation }) => {
  const { categoryName = 'Files', files = [] } = route.params || {};

  // Safe file list filtering
  const validFiles = Array.isArray(files)
    ? files.filter((f) => f && typeof f === 'object' && f.name)
    : [];

  // Extraction Modal State
  const [extractModalVisible, setExtractModalVisible] = useState(false);
  const [selectedArchive, setSelectedArchive] = useState(null);
  const [password, setPassword] = useState('');
  const [isEncrypted, setIsEncrypted] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractingStatus, setExtractingStatus] = useState('');

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

  const isImageFile = (fileName = '') => {
    const ext = getExtension(fileName);
    return IMAGE_EXTENSIONS.includes(ext);
  };

  const handleFilePress = async (item) => {
    if (!item) return;

    if (isArchiveFile(item.name) || categoryName === 'Compressed') {
      setSelectedArchive(item);
      setPassword('');
      setIsEncrypted(false);
      setExtractModalVisible(true);

      try {
        const encrypted = await checkArchiveEncrypted(item.path);
        setIsEncrypted(encrypted);
      } catch (err) {
        setIsEncrypted(false);
      }
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
        await NativeModules.ManageStorageModule.openFile(filePath, null);
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

  const closeExtractModal = () => {
    if (!isExtracting) {
      setExtractModalVisible(false);
      setSelectedArchive(null);
      setPassword('');
      setIsEncrypted(false);
    }
  };

  const getArchiveBaseName = (fileName = '') => {
    return (fileName || '').replace(/\.[^/.]+$/, '');
  };

  const performExtraction = async (destinationDirectory) => {
    if (!selectedArchive) return;

    if (isEncrypted && !password.trim()) {
      Alert.alert(
        'Password Required',
        'This archive is password protected. Please enter the password.'
      );
      return;
    }

    setIsExtracting(true);
    setExtractingStatus('Extracting... Please wait');

    try {
      const result = await extractZipArchive(
        selectedArchive.path,
        destinationDirectory,
        password
      );

      DeviceEventEmitter.emit('EXTRACTION_SUCCESS', result);
      if (typeof route.params?.onExtractSuccess === 'function') {
        route.params.onExtractSuccess(result);
      }

      setExtractModalVisible(false);
      setSelectedArchive(null);
      setPassword('');
      setIsEncrypted(false);

      Alert.alert(
        'Success',
        `Archive extracted successfully!\n\nLocation: ${result.extractedPath}`
      );
    } catch (error) {
      console.error('Extraction error:', error);
      const errMsg = String(error.message || error || '').toLowerCase();
      if (errMsg.includes('password') || errMsg.includes('encrypted')) {
        setIsEncrypted(true);
      }
      Alert.alert(
        'Extraction Error',
        error.message ||
          'Failed to extract archive. Please verify if password is correct or if file is corrupted.'
      );
    } finally {
      setIsExtracting(false);
      setExtractingStatus('');
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
    performExtraction(targetDir);
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
          performExtraction(targetDir);
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

  const renderFileItem = ({ item, index }) => {
    if (!item) return null;

    const isImgCategory = categoryName === 'Images';

    return (
      <TouchableOpacity
        style={styles.fileItem}
        activeOpacity={0.7}
        onPress={() => handleFilePress(item)}
      >
        {/* Only render Image component when inside Images category */}
        {isImgCategory && item.path ? (
          <Image
            source={{ uri: 'file://' + item.path }}
            style={styles.thumbnailImage}
            resizeMode="cover"
            onError={() => {}}
          />
        ) : null}

        {/* File Info */}
        <View style={styles.fileDetails}>
          <Text style={styles.fileName} numberOfLines={1} ellipsizeMode="middle">
            {item.name || 'Unnamed File'}
          </Text>
          <Text style={styles.fileSize}>{formatFileSize(item.size)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            activeOpacity={0.7}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>{'< Back'}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {categoryName} ({validFiles.length})
          </Text>
        </View>

        {/* File List */}
        <FlatList
          data={validFiles}
          keyExtractor={(item, index) =>
            item?.path ? `${item.path}-${index}` : `file-${index}`
          }
          renderItem={renderFileItem}
          contentContainerStyle={styles.listContent}
          initialNumToRender={15}
          maxToRenderPerBatch={20}
          windowSize={7}
          removeClippedSubviews={true}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No files found in this category.</Text>
            </View>
          }
        />

        {/* 1. Extraction Action Modal */}
        <Modal
          visible={extractModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={closeExtractModal}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Archive Extraction</Text>
              <Text style={styles.modalSubtitle} numberOfLines={2}>
                {selectedArchive ? selectedArchive.name : ''}
              </Text>

              {isEncrypted ? (
                <View style={styles.passwordSection}>
                  <Text style={styles.inputLabel}>Password Protected Archive</Text>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Enter archive password"
                    placeholderTextColor="#888888"
                    value={password}
                    onChangeText={setPassword}
                    editable={!isExtracting}
                    secureTextEntry={false}
                    autoCapitalize="none"
                  />
                </View>
              ) : null}

              {isExtracting && (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#000000" />
                  <Text style={styles.loadingText}>{extractingStatus}</Text>
                </View>
              )}

              <TouchableOpacity
                style={[styles.modalButton, isExtracting && styles.disabledButton]}
                activeOpacity={0.7}
                onPress={handleExtractHere}
                disabled={isExtracting}
              >
                <Text style={styles.modalButtonText}>Extract Here</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, isExtracting && styles.disabledButton]}
                activeOpacity={0.7}
                onPress={handleExtractToCustomFolder}
                disabled={isExtracting}
              >
                <Text style={styles.modalButtonText}>
                  Choose Custom Destination Folder...
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.cancelButton,
                  isExtracting && styles.disabledButton,
                ]}
                activeOpacity={0.7}
                onPress={closeExtractModal}
                disabled={isExtracting}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* 2. Image Full Preview Modal */}
        <Modal
          visible={imageModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setImageModalVisible(false)}
        >
          <View style={styles.previewModalOverlay}>
            <View style={styles.previewModalContent}>
              <View style={styles.previewHeader}>
                <Text style={styles.previewTitle} numberOfLines={1}>
                  {previewImage ? previewImage.name : ''}
                </Text>
                <Text style={styles.previewMeta}>
                  {previewImage ? formatFileSize(previewImage.size) : ''}
                </Text>
              </View>

              {previewImage && previewImage.path ? (
                <Image
                  source={{ uri: 'file://' + previewImage.path }}
                  style={styles.fullPreviewImage}
                  resizeMode="contain"
                />
              ) : null}

              <View style={styles.previewFooter}>
                <TouchableOpacity
                  style={styles.modalButton}
                  activeOpacity={0.7}
                  onPress={() => {
                    if (previewImage && previewImage.path) {
                      openWithSystemApp(previewImage.path);
                    }
                  }}
                >
                  <Text style={styles.modalButtonText}>Open in Gallery / Full Screen</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.cancelButton}
                  activeOpacity={0.7}
                  onPress={() => setImageModalVisible(false)}
                >
                  <Text style={styles.cancelButtonText}>Close Preview</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* 3. File Detail & System Opener Modal (Videos, Audios, Docs, APK) */}
        <Modal
          visible={detailModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setDetailModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>File Details</Text>
              <Text style={styles.modalSubtitle} numberOfLines={2}>
                {selectedDetailFile ? selectedDetailFile.name : ''}
              </Text>

              <View style={styles.detailInfoBox}>
                <Text style={styles.detailText}>
                  Size: {selectedDetailFile ? formatFileSize(selectedDetailFile.size) : ''}
                </Text>
                <Text style={styles.detailText} numberOfLines={3}>
                  Path: {selectedDetailFile ? selectedDetailFile.path : ''}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.modalButton}
                activeOpacity={0.7}
                onPress={() => {
                  if (selectedDetailFile && selectedDetailFile.path) {
                    setDetailModalVisible(false);
                    openWithSystemApp(selectedDetailFile.path);
                  }
                }}
              >
                <Text style={styles.modalButtonText}>Open File</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelButton}
                activeOpacity={0.7}
                onPress={() => setDetailModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
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
    fontWeight: 'bold',
    color: '#000000',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
    flex: 1,
  },
  listContent: {
    paddingBottom: 24,
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
  thumbnailImage: {
    width: 44,
    height: 44,
    borderWidth: 1,
    borderColor: '#000000',
    marginRight: 12,
    backgroundColor: '#F0F0F0',
  },
  fileDetails: {
    flex: 1,
  },
  fileName: {
    fontSize: 14,
    color: '#000000',
    fontWeight: '500',
    marginBottom: 2,
  },
  fileSize: {
    fontSize: 12,
    color: '#000000',
  },
  emptyContainer: {
    paddingVertical: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#000000',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#000000',
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 6,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#000000',
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: '500',
  },
  passwordSection: {
    marginBottom: 10,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 6,
  },
  passwordInput: {
    borderWidth: 1,
    borderColor: '#000000',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#000000',
    marginBottom: 14,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  loadingText: {
    fontSize: 13,
    color: '#000000',
    marginLeft: 8,
    fontStyle: 'italic',
  },
  modalButton: {
    borderWidth: 1,
    borderColor: '#000000',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  modalButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000000',
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: '#000000',
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  cancelButtonText: {
    fontSize: 14,
    color: '#000000',
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.5,
  },
  previewModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  previewModalContent: {
    width: '100%',
    maxHeight: '85%',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#000000',
    padding: 16,
  },
  previewHeader: {
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
    paddingBottom: 8,
    marginBottom: 12,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000000',
  },
  previewMeta: {
    fontSize: 12,
    color: '#000000',
    marginTop: 2,
  },
  fullPreviewImage: {
    width: '100%',
    height: 300,
    backgroundColor: '#000000',
    marginBottom: 14,
  },
  previewFooter: {
    marginTop: 6,
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
    color: '#000000',
    marginBottom: 4,
  },
});

export default CategoryListScreen;
