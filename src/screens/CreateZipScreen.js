import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  SafeAreaView,
  StatusBar,
  Modal,
  Image,
  ActivityIndicator,
  DeviceEventEmitter,
} from 'react-native';
import DocumentPicker from 'react-native-document-picker';
import { createZipArchive } from '../services/ZipService';
import { GradientButton } from '../components/GradientButton';

// Import SVG Assets
import CompressedIcon from '../assets/home/Background.svg';
import DocumentsIcon from '../assets/home/Background (2).svg';
import ImagesIcon from '../assets/home/Background (3).svg';
import AudioIcon from '../assets/home/Background (4).svg';
import VideoIcon from '../assets/home/Background (5).svg';
import APKIcon from '../assets/home/Background (6).svg';
import DefaultFileIcon from '../assets/home/Background (1).svg';
import AudioRecordIcon from '../assets/fi_1834342.svg';

const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.heic', '.gif', '.bmp', '.svg'];
const VIDEO_EXTENSIONS = ['.mp4', '.mkv', '.avi', '.mov', '.3gp', '.webm', '.flv'];
const AUDIO_EXTENSIONS = ['.mp3', '.wav', '.aac', '.m4a', '.flac', '.ogg'];
const COMPRESSED_EXTENSIONS = ['.zip', '.rar', '.7z', '.tar', '.gz'];
const DOCUMENT_EXTENSIONS = ['.pdf', '.doc', '.docx', '.txt', '.xls', '.xlsx', '.ppt', '.pptx'];

const getExtension = (fileName = '') => {
  if (!fileName || typeof fileName !== 'string') return '';
  const lastDot = fileName.lastIndexOf('.');
  if (lastDot === -1) return '';
  return fileName.substring(lastDot).toLowerCase();
};

const FileItemIcon = ({ item }) => {
  const name = item?.name || '';
  const ext = getExtension(name);

  if (IMAGE_EXTENSIONS.includes(ext)) {
    if (item?.path) {
      const uri = item.path.startsWith('file://') ? item.path : `file://${item.path}`;
      return (
        <Image
          source={{ uri }}
          style={styles.itemThumbnail}
          resizeMode="cover"
        />
      );
    }
    return <ImagesIcon width={40} height={40} />;
  }

  if (VIDEO_EXTENSIONS.includes(ext)) {
    return <VideoIcon width={40} height={40} />;
  }

  if (AUDIO_EXTENSIONS.includes(ext)) {
    return <AudioRecordIcon width={40} height={40} />;
  }

  if (COMPRESSED_EXTENSIONS.includes(ext)) {
    return <CompressedIcon width={40} height={40} />;
  }

  if (DOCUMENT_EXTENSIONS.includes(ext)) {
    return <DocumentsIcon width={40} height={40} />;
  }

  if (ext === '.apk') {
    return <APKIcon width={40} height={40} />;
  }

  return <DefaultFileIcon width={40} height={40} />;
};

export const CreateZipScreen = ({ route, navigation }) => {
  const initialFiles = route?.params?.initialFiles || [];
  const defaultNameParam = route?.params?.defaultName || 'My_Archive.zip';

  const [archiveName, setArchiveName] = useState(defaultNameParam);
  const [password, setPassword] = useState('');
  const [selectedFiles, setSelectedFiles] = useState(initialFiles);
  const [isCompressing, setIsCompressing] = useState(false);

  // Custom Success Modal State
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [successData, setSuccessData] = useState(null);

  useEffect(() => {
    if (route?.params?.initialFiles && route.params.initialFiles.length > 0) {
      setSelectedFiles(route.params.initialFiles);
    }
    if (route?.params?.defaultName) {
      setArchiveName(route.params.defaultName);
    }
  }, [route?.params?.initialFiles, route?.params?.defaultName]);

  const handlePickFiles = async () => {
    try {
      const results = await DocumentPicker.pick({
        allowMultiSelection: true,
        type: [DocumentPicker.types.allFiles],
        copyTo: 'cachesDirectory',
      });

      if (results && results.length > 0) {
        setSelectedFiles((prev) => {
          const newMap = new Map();
          prev.forEach((f) => newMap.set((f.name || '') + (f.size || 0), f));
          results.forEach((f) => newMap.set((f.name || '') + (f.size || 0), f));
          return Array.from(newMap.values());
        });
      }
    } catch (err) {
      if (!DocumentPicker.isCancel(err)) {
        console.error('DocumentPicker error:', err);
        Alert.alert('Error', 'Failed to pick files.');
      }
    }
  };

  const handleRemoveFile = (indexToRemove) => {
    setSelectedFiles((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleCompress = async () => {
    const trimmedName = archiveName.trim();
    if (!trimmedName) {
      Alert.alert('Missing Name', 'Please enter an Archive Name.');
      return;
    }

    if (selectedFiles.length === 0) {
      Alert.alert('No Files Selected', 'Please select at least one file to compress.');
      return;
    }

    setIsCompressing(true);

    try {
      const result = await createZipArchive(selectedFiles, trimmedName, password);

      DeviceEventEmitter.emit('ZIP_CREATED', result);

      setSuccessData({
        title: 'Zip Created Successfully!',
        name: result.name || trimmedName,
        path: result.path,
      });
      setSuccessModalVisible(true);
    } catch (error) {
      console.error('Compression failed:', error);
      Alert.alert('Compression Error', error.message || 'Failed to create zip archive.');
    } finally {
      setIsCompressing(false);
    }
  };

  const formatFileSize = (bytes) => {
    const num = Number(bytes);
    if (!num || isNaN(num) || num <= 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(num) / Math.log(k));
    const val = num / Math.pow(k, i);
    return (val % 1 === 0 ? val.toFixed(0) : val.toFixed(1)) + ' ' + sizes[i];
  };

  const formattedFileCount = String(selectedFiles.length).padStart(2, '0');

  const renderFileItem = ({ item, index }) => (
    <View style={styles.fileRow}>
      <View style={styles.iconContainer}>
        <FileItemIcon item={item} />
      </View>

      <View style={styles.fileInfo}>
        <Text style={styles.fileName} numberOfLines={1} ellipsizeMode="middle">
          {item.name || 'Unnamed File'}
        </Text>
        <Text style={styles.fileSize}>{formatFileSize(item.size)}</Text>
      </View>

      <TouchableOpacity
        style={styles.removeButton}
        activeOpacity={0.7}
        onPress={() => handleRemoveFile(index)}
        disabled={isCompressing}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Text style={styles.removeButtonText}>✕</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={styles.container}>
        
        {/* Top Header */}
        <View style={styles.topHeader}>
          <TouchableOpacity
            style={styles.backBtn}
            activeOpacity={0.7}
            onPress={() => navigation.goBack()}
            disabled={isCompressing}
          >
            <Text style={styles.backBtnIcon}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create New Zip</Text>
        </View>

        {/* Content Area */}
        <FlatList
          data={selectedFiles}
          keyExtractor={(item, index) => `${item.name}-${index}`}
          renderItem={renderFileItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={styles.formContainer}>
              {/* Archive Name */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Archive Name</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="My_Archive.zip"
                  placeholderTextColor="#A0AEC0"
                  value={archiveName}
                  onChangeText={setArchiveName}
                  editable={!isCompressing}
                  autoCapitalize="none"
                />
              </View>

              {/* Optional Password */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Optional Password</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter password (optional )"
                  placeholderTextColor="#A0AEC0"
                  value={password}
                  onChangeText={setPassword}
                  editable={!isCompressing}
                  secureTextEntry={false}
                  autoCapitalize="none"
                />
              </View>

              {/* Selected Files Section Header */}
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>
                  Selected Files ( {formattedFileCount} )
                </Text>
              </View>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No files selected yet.</Text>
              <TouchableOpacity
                style={styles.emptyAddBtn}
                onPress={handlePickFiles}
                activeOpacity={0.8}
              >
                <Text style={styles.emptyAddBtnText}>+ Select Files</Text>
              </TouchableOpacity>
            </View>
          }
        />

        {/* Bottom Action Footer */}
        <View style={styles.bottomBar}>
          {isCompressing && (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color="#0F7B39" />
              <Text style={styles.compressingText}>Compressing files...</Text>
            </View>
          )}

          <View style={styles.buttonRow}>
            <GradientButton
              style={[styles.pillBtn, isCompressing && styles.disabledBtn]}
              onPress={handlePickFiles}
              disabled={isCompressing}
              title="Add More"
            />

            <GradientButton
              style={[styles.pillBtn, isCompressing && styles.disabledBtn]}
              onPress={handleCompress}
              disabled={isCompressing}
              title={isCompressing ? 'Compressing...' : 'Compress Now'}
            />
          </View>
          </View>
        </View>

        {/* Custom Success UI Modal */}
        <Modal
          visible={successModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => {
            setSuccessModalVisible(false);
            navigation.goBack();
          }}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.successModalCard}>
              <View style={styles.successBadgeCircle}>
                <Text style={styles.successCheckmark}>✓</Text>
              </View>

              <Text style={styles.successModalTitle}>
                {successData?.title || 'Success!'}
              </Text>

              {successData?.name ? (
                <Text style={styles.successArchiveName} numberOfLines={1}>
                  {successData.name}
                </Text>
              ) : null}

              <View style={styles.successPathBox}>
                <Text style={styles.successPathLabel}>Saved Location:</Text>
                <Text style={styles.successPathText} numberOfLines={3}>
                  {successData?.path || ''}
                </Text>
              </View>

              <GradientButton
                style={styles.successDoneBtn}
                onPress={() => {
                  setSuccessModalVisible(false);
                  navigation.goBack();
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
    backgroundColor: '#FFFFFF',
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  backBtn: {
    marginRight: 12,
    padding: 4,
  },
  backBtnIcon: {
    fontSize: 28,
    lineHeight: 28,
    color: '#333333',
    fontWeight: '400',
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: 'Poppins-SemiBold',
    fontWeight: '700',
    color: '#2D3748',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  formContainer: {
    marginTop: 8,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
    fontWeight: '600',
    color: '#4A5568',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#F2F4F7',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#2D3748',
  },
  sectionHeaderRow: {
    marginTop: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    fontWeight: '600',
    color: '#4A5568',
  },
  fileRow: {
    backgroundColor: '#F2F4F7',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  itemThumbnail: {
    width: 40,
    height: 40,
    borderRadius: 10,
  },
  fileInfo: {
    flex: 1,
    marginRight: 12,
  },
  fileName: {
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
    fontWeight: '500',
    color: '#2D3748',
  },
  fileSize: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    color: '#718096',
    marginTop: 2,
  },
  removeButton: {
    padding: 6,
  },
  removeButtonText: {
    fontSize: 14,
    color: '#4A5568',
    fontWeight: '600',
  },
  emptyContainer: {
    paddingVertical: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#A0AEC0',
    marginBottom: 12,
  },
  emptyAddBtn: {
    backgroundColor: '#E2E8F0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  emptyAddBtnText: {
    fontSize: 13,
    fontFamily: 'Poppins-Medium',
    color: '#4A5568',
  },
  bottomBar: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  compressingText: {
    fontSize: 13,
    fontFamily: 'Poppins-Medium',
    color: '#0F7B39',
    marginLeft: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  pillBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 5,
    elevation: 3,
    shadowColor: '#2E7D32',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  greenBtn: {
    backgroundColor: '#43A047',
  },
  pillBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'Poppins-SemiBold',
    fontWeight: '600',
  },
  disabledBtn: {
    opacity: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
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
  },
});

export default CreateZipScreen;

