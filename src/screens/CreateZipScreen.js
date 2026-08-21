import React, { useState } from 'react';
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
} from 'react-native';
import DocumentPicker from 'react-native-document-picker';
import { createZipArchive } from '../services/ZipService';

export const CreateZipScreen = ({ navigation }) => {
  const [archiveName, setArchiveName] = useState('');
  const [password, setPassword] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isCompressing, setIsCompressing] = useState(false);

  const handlePickFiles = async () => {
    try {
      const results = await DocumentPicker.pick({
        allowMultiSelection: true,
        type: [DocumentPicker.types.allFiles],
        copyTo: 'cachesDirectory',
      });

      if (results && results.length > 0) {
        // Merge or replace selected files
        setSelectedFiles((prev) => {
          const newMap = new Map();
          prev.forEach((f) => newMap.set(f.name + f.size, f));
          results.forEach((f) => newMap.set(f.name + f.size, f));
          return Array.from(newMap.values());
        });
      }
    } catch (err) {
      if (DocumentPicker.isCancel(err)) {
        // User cancelled file picker
      } else {
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
      Alert.alert(
        'Zip Created Successfully!',
        `Saved to: ${result.path}\n\nArchive Name: ${result.name}`,
        [
          {
            text: 'OK',
            onPress: () => {
              setArchiveName('');
              setPassword('');
              setSelectedFiles([]);
            },
          },
        ]
      );
    } catch (error) {
      console.error('Compression failed:', error);
      Alert.alert('Compression Error', error.message || 'Failed to create zip archive.');
    } finally {
      setIsCompressing(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const renderFileItem = ({ item, index }) => (
    <View style={styles.fileRow}>
      <View style={styles.fileInfo}>
        <Text style={styles.fileName} numberOfLines={1} ellipsizeMode="middle">
          {item.name}
        </Text>
        <Text style={styles.fileSize}>{formatFileSize(item.size)}</Text>
      </View>
      <TouchableOpacity
        style={styles.removeButton}
        activeOpacity={0.7}
        onPress={() => handleRemoveFile(index)}
        disabled={isCompressing}
      >
        <Text style={styles.removeButtonText}>Remove</Text>
      </TouchableOpacity>
    </View>
  );

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
            disabled={isCompressing}
          >
            <Text style={styles.backButtonText}>{'< Back'}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create New Zip</Text>
        </View>

        {/* Inputs */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>Archive Name</Text>
          <TextInput
            style={styles.textInput}
            placeholder="e.g. my_files.zip"
            placeholderTextColor="#888888"
            value={archiveName}
            onChangeText={setArchiveName}
            editable={!isCompressing}
            autoCapitalize="none"
          />

          <Text style={styles.inputLabel}>Optional Password</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Enter password (optional)"
            placeholderTextColor="#888888"
            value={password}
            onChangeText={setPassword}
            editable={!isCompressing}
            secureTextEntry={false}
            autoCapitalize="none"
          />
        </View>

        {/* File Picker Section */}
        <View style={styles.pickerSection}>
          <TouchableOpacity
            style={[styles.pickerButton, isCompressing && styles.disabledButton]}
            activeOpacity={0.7}
            onPress={handlePickFiles}
            disabled={isCompressing}
          >
            <Text style={styles.pickerButtonText}>Select Files to Compress</Text>
          </TouchableOpacity>

          <Text style={styles.subTitle}>
            Selected Files ({selectedFiles.length})
          </Text>
        </View>

        {/* Selected Files List */}
        <FlatList
          data={selectedFiles}
          keyExtractor={(item, index) => `${item.name}-${index}`}
          renderItem={renderFileItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No files selected yet.</Text>
            </View>
          }
        />

        {/* Action Button & Status */}
        <View style={styles.footerSection}>
          {isCompressing && (
            <Text style={styles.compressingText}>Compressing...</Text>
          )}

          <TouchableOpacity
            style={[
              styles.compressButton,
              isCompressing && styles.disabledButton,
            ]}
            activeOpacity={0.7}
            onPress={handleCompress}
            disabled={isCompressing}
          >
            <Text style={styles.compressButtonText}>
              {isCompressing ? 'Compressing...' : 'Compress Now'}
            </Text>
          </TouchableOpacity>
        </View>
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
  },
  inputSection: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 6,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#000000',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#000000',
    marginBottom: 12,
  },
  pickerSection: {
    marginBottom: 10,
  },
  pickerButton: {
    borderWidth: 1,
    borderColor: '#000000',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  pickerButtonText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#000000',
  },
  subTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 6,
  },
  listContent: {
    flexGrow: 1,
    paddingBottom: 16,
  },
  fileRow: {
    borderWidth: 1,
    borderColor: '#000000',
    backgroundColor: '#FFFFFF',
    padding: 10,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fileInfo: {
    flex: 1,
    marginRight: 8,
  },
  fileName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000000',
  },
  fileSize: {
    fontSize: 11,
    color: '#000000',
    marginTop: 2,
  },
  removeButton: {
    borderWidth: 1,
    borderColor: '#000000',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  removeButtonText: {
    fontSize: 11,
    color: '#000000',
    fontWeight: 'bold',
  },
  emptyContainer: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: '#888888',
  },
  footerSection: {
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#000000',
  },
  compressingText: {
    fontSize: 13,
    color: '#000000',
    textAlign: 'center',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  compressButton: {
    borderWidth: 1,
    borderColor: '#000000',
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compressButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000000',
  },
  disabledButton: {
    opacity: 0.5,
  },
});

export default CreateZipScreen;
