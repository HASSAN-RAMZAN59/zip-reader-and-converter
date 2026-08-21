import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  StatusBar,
  Alert,
} from 'react-native';
import { scanDeviceStorage } from '../services/FileScanner';

const CATEGORIES = [
  'Compressed',
  'Extracted',
  'Documents',
  'Videos',
  'Images',
  'Audios',
  'APK',
  'Download',
];

export const HomeScreen = ({ navigation }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [categorizedData, setCategorizedData] = useState({
    Compressed: [],
    Extracted: [],
    Documents: [],
    Videos: [],
    Images: [],
    Audios: [],
    APK: [],
    Download: [],
  });

  const runFileScan = useCallback(async () => {
    setIsScanning(true);
    try {
      const results = await scanDeviceStorage();
      setCategorizedData(results);
    } catch (error) {
      console.error('Scan failed:', error);
      Alert.alert('Scan Error', 'Failed to scan device files.');
    } finally {
      setIsScanning(false);
    }
  }, []);

  useEffect(() => {
    runFileScan();
  }, [runFileScan]);

  const handleCategoryPress = (categoryName) => {
    const files = categorizedData[categoryName] || [];
    navigation.navigate('CategoryList', {
      categoryName,
      files,
    });
  };

  const handleCreateZip = () => {
    Alert.alert('Create Zip', 'Create New Zip functionality will be available in the next phase.');
  };

  const renderCategoryCard = ({ item }) => {
    const count = categorizedData[item] ? categorizedData[item].length : 0;

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => handleCategoryPress(item)}
      >
        <Text style={styles.cardTitle} numberOfLines={1}>
          {item}
        </Text>
        <Text style={styles.cardCount}>
          {isScanning ? '...' : count}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.headerSection}>
          <Text style={styles.headerTitle}>Categories</Text>
          {isScanning && (
            <Text style={styles.scanningText}>Scanning device...</Text>
          )}
        </View>

        {/* 4x2 Category Grid */}
        <FlatList
          data={CATEGORIES}
          keyExtractor={(item) => item}
          renderItem={renderCategoryCard}
          numColumns={4}
          scrollEnabled={false}
          contentContainerStyle={styles.gridContainer}
          columnWrapperStyle={styles.row}
        />

        {/* Quick Actions Section */}
        <View style={styles.quickActionsSection}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>

          <TouchableOpacity
            style={[styles.actionButton, isScanning && styles.buttonDisabled]}
            activeOpacity={0.7}
            disabled={isScanning}
            onPress={runFileScan}
          >
            <Text style={styles.actionButtonText}>
              {isScanning ? 'Scanning In Progress...' : 'Smart Scan Zips'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            activeOpacity={0.7}
            onPress={handleCreateZip}
          >
            <Text style={styles.actionButtonText}>Create New Zip</Text>
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
  headerSection: {
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000000',
  },
  scanningText: {
    fontSize: 12,
    color: '#000000',
    fontStyle: 'italic',
  },
  gridContainer: {
    paddingBottom: 8,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  card: {
    flex: 1,
    aspectRatio: 1,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#000000',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 4,
  },
  cardCount: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#000000',
    textAlign: 'center',
  },
  quickActionsSection: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 14,
  },
  actionButton: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#000000',
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000000',
  },
});

export default HomeScreen;
