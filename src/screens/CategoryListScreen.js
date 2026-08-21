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
} from 'react-native';
import RNFS from 'react-native-fs';
import DocumentPicker from 'react-native-document-picker';
import { extractZipArchive, checkArchiveEncrypted } from '../services/ZipService';

const COMPRESSED_EXTENSIONS = ['.zip', '.rar', '.7z'];

export const CategoryListScreen = ({ route, navigation }) => {
  const { categoryName = 'Files', files = [] } = route.params || {};

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [password, setPassword] = useState('');
  const [isEncrypted, setIsEncrypted] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractingStatus, setExtractingStatus] = useState('');

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const isArchiveFile = (fileName = '') => {
    const lower = fileName.toLowerCase();
    return COMPRESSED_EXTENSIONS.some((ext) => lower.endsWith(ext));
  };

  const handleFilePress = async (item) => {
    if (isArchiveFile(item.name) || categoryName === 'Compressed') {
      setSelectedFile(item);
      setPassword('');
      setIsEncrypted(false);
      setModalVisible(true);

      // Auto-detect if archive is password protected
      try {
        const encrypted = await checkArchiveEncrypted(item.path);
        setIsEncrypted(encrypted);
      } catch (err) {
        setIsEncrypted(false);
      }
    } else {
      Alert.alert(
        item.name,
        `Path: ${item.path}\nSize: ${formatFileSize(item.size)}`
      );
    }
  };

  const closeModal = () => {
    if (!isExtracting) {
      setModalVisible(false);
      setSelectedFile(null);
      setPassword('');
      setIsEncrypted(false);
    }
  };

  const getArchiveBaseName = (fileName = '') => {
    return fileName.replace(/\.[^/.]+$/, '');
  };

  const performExtraction = async (destinationDirectory) => {
    if (!selectedFile) return;

    if (isEncrypted && !password.trim()) {
      Alert.alert('Password Required', 'This archive is password protected. Please enter the password.');
      return;
    }

    setIsExtracting(true);
    setExtractingStatus('Extracting... Please wait');

    try {
      const result = await extractZipArchive(
        selectedFile.path,
        destinationDirectory,
        password
      );

      // Trigger event listener on HomeScreen
      DeviceEventEmitter.emit('EXTRACTION_SUCCESS', result);

      // Invoke optional callback if passed
      if (typeof route.params?.onExtractSuccess === 'function') {
        route.params.onExtractSuccess(result);
      }

      setModalVisible(false);
      setSelectedFile(null);
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
        error.message || 'Failed to extract archive. Please verify if password is correct or if file is corrupted.'
      );
    } finally {
      setIsExtracting(false);
      setExtractingStatus('');
    }
  };

  // Button 1: "Extract Here" (extracts to the archive's parent folder)
  const handleExtractHere = () => {
    if (!selectedFile) return;
    const parentDir = selectedFile.path.substring(
      0,
      selectedFile.path.lastIndexOf('/')
    );
    const baseName = getArchiveBaseName(selectedFile.name);
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

  // Button 3: "Choose Custom Destination Folder..."
  const handleExtractToCustomFolder = async () => {
    if (!selectedFile) return;

    try {
      const dirResult = await DocumentPicker.pickDirectory();
      if (dirResult && dirResult.uri) {
        const chosenPath = convertSafUriToPath(dirResult.uri);
        if (chosenPath) {
          const baseName = getArchiveBaseName(selectedFile.name);
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
      if (DocumentPicker.isCancel(err)) {
        // User cancelled folder picker
      } else {
        console.error('Directory picker error:', err);
        Alert.alert('Error', 'Failed to pick custom folder.');
      }
    }
  };

  const renderFileItem = ({ item }) => {
    const isArchive = isArchiveFile(item.name) || categoryName === 'Compressed';

    return (
      <TouchableOpacity
        style={styles.fileItem}
        activeOpacity={0.7}
        onPress={() => handleFilePress(item)}
      >
        <View style={styles.fileDetails}>
          <Text style={styles.fileName} numberOfLines={1} ellipsizeMode="middle">
            {item.name}
          </Text>
          {item.size !== undefined && (
            <Text style={styles.fileSize}>{formatFileSize(item.size)}</Text>
          )}
        </View>
        {isArchive && (
          <View style={styles.archiveBadge}>
            <Text style={styles.archiveBadgeText}>ZIP</Text>
          </View>
        )}
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
            {categoryName} ({files.length})
          </Text>
        </View>

        {/* File List */}
        <FlatList
          data={files}
          keyExtractor={(item, index) => item.path || `${item.name}-${index}`}
          renderItem={renderFileItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No files found in this category.</Text>
            </View>
          }
        />

        {/* Extraction Action Modal */}
        <Modal
          visible={modalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={closeModal}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Archive Extraction</Text>
              <Text style={styles.modalSubtitle} numberOfLines={2}>
                {selectedFile ? selectedFile.name : ''}
              </Text>

              {/* Password input shown ONLY if archive is encrypted */}
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

              {/* Loading Indicator */}
              {isExtracting && (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#000000" />
                  <Text style={styles.loadingText}>{extractingStatus}</Text>
                </View>
              )}

              {/* Action Buttons */}
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
                onPress={closeModal}
                disabled={isExtracting}
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
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fileDetails: {
    flex: 1,
    marginRight: 8,
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
  archiveBadge: {
    borderWidth: 1,
    borderColor: '#000000',
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  archiveBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
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
});

export default CategoryListScreen;
