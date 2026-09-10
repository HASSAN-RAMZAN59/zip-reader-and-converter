import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  StatusBar,
  Alert,
  DeviceEventEmitter,
  ScrollView,
  Modal,
  AppState,
} from 'react-native';
import RNFS from 'react-native-fs';

import { scanDeviceStorage } from '../services/FileScanner';
import { permissionsService } from '../services/permissionsService';

// Import SVG Assets
import RefreshIcon from '../assets/home/refresh.svg';
import SettingsIcon from '../assets/home/settings.svg';
import FolderZipIcon from '../assets/home/folder_zip.svg';
import DeviceStorageIllustration from '../assets/home/Group 1000007537.svg';
import AvailableSpaceIcon from '../assets/home/Group 1.svg';
import CompressedIcon from '../assets/home/Background.svg';
import ExtractedIcon from '../assets/home/Background (1).svg';
import DocumentsIcon from '../assets/home/Background (2).svg';
import ImagesIcon from '../assets/home/Background (3).svg';
import AudioIcon from '../assets/home/Background (4).svg';
import VideoIcon from '../assets/home/Background (5).svg';
import APKIcon from '../assets/home/Background (6).svg';
import DownloadsIcon from '../assets/home/Background (7).svg';
import PermissionIllustration from '../assets/permission/Group 1000007537.svg';
import LottieView from 'lottie-react-native';
import LoadingAnimation from '../assets/Loading.json';

const CATEGORY_UI = [
  { id: 'Compressed', title: 'Compressed', icon: CompressedIcon },
  { id: 'Extracted', title: 'Extracted', icon: ExtractedIcon },
  { id: 'Documents', title: 'Documents', icon: DocumentsIcon },
  { id: 'Images', title: 'Images', icon: ImagesIcon },
  { id: 'Audios', title: 'Audio', icon: AudioIcon },
  { id: 'Videos', title: 'Video', icon: VideoIcon },
  { id: 'APK', title: 'APK', icon: APKIcon },
  { id: 'Download', title: 'Downloads', icon: DownloadsIcon },
];

export const HomeScreen = ({ navigation }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [checkingPermission, setCheckingPermission] = useState(false);

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

  const [storageInfo, setStorageInfo] = useState({
    usedStr: '0 GB',
    totalStr: '0 GB',
    availableStr: '0 GB',
    fillPercentage: '0%',
  });

  const fetchStorageInfo = useCallback(async () => {
    try {
      const info = await RNFS.getFSInfo();
      const total = info.totalSpace;
      const free = info.freeSpace;
      const used = total - free;

      const toGB = (bytes) => (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
      
      const usedStr = toGB(used);
      const totalStr = toGB(total);
      const availableStr = toGB(free);
      
      const fillPercent = total > 0 ? (used / total) * 100 : 0;
      const fillPercentage = `${Math.min(100, Math.max(0, fillPercent))}%`;

      setStorageInfo({
        usedStr,
        totalStr,
        availableStr,
        fillPercentage,
      });
    } catch (error) {
      console.error('Error fetching storage info:', error);
    }
  }, []);

  const runFileScan = useCallback(async () => {
    setIsScanning(true);
    try {
      const results = await scanDeviceStorage();
      setCategorizedData(results);
    } catch (error) {
      console.error('Scan failed:', error);
      // Fail silently if permission is denied, it will prompt on click
    } finally {
      setIsScanning(false);
    }
  }, []);

  const hasInitialScanRun = useRef(false);

  // Run only once on initial mount
  useEffect(() => {
    const init = async () => {
      const isGranted = await permissionsService.checkStoragePermission();
      if (isGranted) {
        if (!hasInitialScanRun.current) {
          hasInitialScanRun.current = true;
          runFileScan();
          fetchStorageInfo();
        }
      }
    };
    init();
  }, [runFileScan, fetchStorageInfo]);

  // Listen for real-time extraction & creation events
  useEffect(() => {
    const extractionSub = DeviceEventEmitter.addListener(
      'EXTRACTION_SUCCESS',
      async () => {
        const isGranted = await permissionsService.checkStoragePermission();
        if (isGranted) {
          runFileScan();
          fetchStorageInfo();
        }
      }
    );

    const zipCreatedSub = DeviceEventEmitter.addListener(
      'ZIP_CREATED',
      async () => {
        const isGranted = await permissionsService.checkStoragePermission();
        if (isGranted) {
          runFileScan();
          fetchStorageInfo();
        }
      }
    );

    return () => {
      extractionSub.remove();
      zipCreatedSub.remove();
    };
  }, [runFileScan, fetchStorageInfo]);

  // Listen for AppState changes to detect permission grant from settings
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      if (nextAppState === 'active') {
        const isGranted = await permissionsService.checkStoragePermission();
        if (isGranted) {
          setShowPermissionModal(false);
          if (!hasInitialScanRun.current) {
            hasInitialScanRun.current = true;
            runFileScan();
            fetchStorageInfo();
          }
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, [runFileScan, fetchStorageInfo]);

  const requirePermission = async (action) => {
    const isGranted = await permissionsService.checkStoragePermission();
    if (isGranted) {
      action();
    } else {
      setShowPermissionModal(true);
    }
  };

  const handleCategoryPress = (categoryName) => {
    const files = categorizedData[categoryName] || [];
    navigation.navigate('CategoryList', {
      categoryName,
      files,
    });
  };

  const handleCreateZip = () => {
    navigation.navigate('CreateZip');
  };

  const handleGrantPermission = async () => {
    setCheckingPermission(true);
    try {
      const granted = await permissionsService.requestStoragePermission();
      if (granted) {
        setShowPermissionModal(false);
        runFileScan();
        fetchStorageInfo();
      }
    } catch (error) {
      console.error('Error requesting permission:', error);
    } finally {
      setCheckingPermission(false);
    }
  };

  const renderCategoryItem = ({ item }) => {
    const count = categorizedData[item.id] ? categorizedData[item.id].length : 0;
    const IconComponent = item.icon;

    return (
      <TouchableOpacity
        style={styles.categoryItem}
        activeOpacity={0.7}
        onPress={() => requirePermission(() => handleCategoryPress(item.id))}
      >
        <IconComponent width={40} height={40} />
        <View style={styles.categoryTextContainer}>
          <Text style={styles.categoryTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.categoryCount}>
            {isScanning ? '...' : `${count} items`}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.topHeader}>
          <View>
            <Text style={styles.topHeaderTitle}>My Files</Text>
            <Text style={styles.topHeaderSubtitle}>Manage your archives and files</Text>
          </View>
          <View style={styles.headerIcons}>
            <TouchableOpacity onPress={() => requirePermission(() => { runFileScan(); fetchStorageInfo(); })} disabled={isScanning} activeOpacity={0.7} style={styles.iconButton}>
              <RefreshIcon width={24} height={24} style={[isScanning && styles.disabledIcon]} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => {}} activeOpacity={0.7} style={styles.iconButton}>
              <SettingsIcon width={24} height={24} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Device Storage Card */}
        <View style={styles.storageCard}>
          <View style={styles.storageCardLeft}>
            <Text style={styles.storageTitle}>Device Storage</Text>
            <Text style={styles.storageText}>
              <Text style={styles.storageUsed}>{storageInfo.usedStr}</Text> <Text style={styles.storageTotal}>/ {storageInfo.totalStr}</Text>
            </Text>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: storageInfo.fillPercentage }]} />
            </View>
            <View style={styles.availableRow}>
              <AvailableSpaceIcon width={12} height={12} />
              <Text style={styles.availableText}>{storageInfo.availableStr} Available</Text>
            </View>
            <TouchableOpacity style={styles.createZipBtn} onPress={() => requirePermission(handleCreateZip)} activeOpacity={0.8}>
              <Text style={styles.createZipBtnText}>Create Zip File</Text>
              <FolderZipIcon width={20} height={20} style={{ marginLeft: 6 }} />
            </TouchableOpacity>
          </View>
          <View style={styles.storageCardRight}>
            <DeviceStorageIllustration width={140} height={120} />
          </View>
        </View>

        {/* Categories Section */}
        <Text style={styles.categoriesSectionTitle}>Categories</Text>
        
        <FlatList
          data={CATEGORY_UI}
          keyExtractor={(item) => item.id}
          renderItem={renderCategoryItem}
          numColumns={2}
          scrollEnabled={false}
          contentContainerStyle={styles.gridContainer}
          columnWrapperStyle={styles.row}
        />

        {/* Permission Modal */}
        <Modal
          visible={showPermissionModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowPermissionModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.permissionModalBox}>
              <PermissionIllustration width={140} height={120} style={styles.permissionIll} />
              
              <Text style={styles.permissionTitle}>Storage Permission !</Text>
              <Text style={styles.permissionDesc}>
                Allow Document Reader to access all your Documents on this Device ?
              </Text>
              
              <TouchableOpacity
                style={[styles.permissionAllowBtn, checkingPermission && styles.disabledIcon]}
                activeOpacity={0.8}
                onPress={handleGrantPermission}
                disabled={checkingPermission}
              >
                <Text style={styles.permissionAllowBtnText}>
                  {checkingPermission ? 'Checking...' : 'Allow'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Refresh Lottie Loading Modal */}
        <Modal
          visible={isScanning}
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

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  topHeaderTitle: {
    fontSize: 24,
    fontFamily: 'Poppins-SemiBold',
    fontWeight: '700',
    color: '#333333',
    marginBottom: 2,
  },
  topHeaderSubtitle: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    color: '#666666',
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    marginLeft: 16,
  },
  disabledIcon: {
    opacity: 0.4,
  },
  storageCard: {
    backgroundColor: '#0F7B39',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    overflow: 'hidden',
    position: 'relative',
  },
  storageCardLeft: {
    flex: 1,
    zIndex: 2,
    paddingRight: 110,
  },
  storageTitle: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  storageText: {
    fontSize: 12,
    color: '#E0E0E0',
    fontFamily: 'Poppins-Regular',
    marginBottom: 8,
  },
  storageUsed: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  storageTotal: {
    color: '#A8D5BA',
  },
  progressBarBg: {
    height: 4,
    backgroundColor: '#309054',
    borderRadius: 2,
    marginBottom: 8,
    width: '90%',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
  },
  availableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  availableText: {
    color: '#FFFFFF',
    fontSize: 11,
    marginLeft: 6,
    fontFamily: 'Poppins-Regular',
  },
  createZipBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  createZipBtnText: {
    color: '#0F7B39',
    fontSize: 13,
    fontFamily: 'Poppins-SemiBold',
    fontWeight: '600',
  },
  storageCardRight: {
    position: 'absolute',
    right: -20,
    bottom: 0,
    zIndex: 1,
  },
  categoriesSectionTitle: {
    fontSize: 16,
    fontFamily: 'Poppins-Medium',
    color: '#333333',
    marginBottom: 16,
  },
  gridContainer: {
    paddingBottom: 8,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  categoryItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F4F5F7',
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 5,
  },
  categoryTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  categoryTitle: {
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
    color: '#333333',
    marginBottom: 2,
  },
  categoryCount: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    color: '#888888',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  permissionModalBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    width: '100%',
    padding: 32,
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  permissionIll: {
    marginBottom: 24,
  },
  permissionTitle: {
    fontSize: 20,
    fontFamily: 'Poppins-SemiBold',
    fontWeight: '700',
    color: '#333333',
    marginBottom: 12,
    textAlign: 'center',
  },
  permissionDesc: {
    fontSize: 13,
    fontFamily: 'Poppins-Regular',
    color: '#666666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
    paddingHorizontal: 10,
  },
  permissionAllowBtn: {
    backgroundColor: '#43A047',
    borderRadius: 30,
    paddingVertical: 14,
    width: '100%',
    alignItems: 'center',
  },
  permissionAllowBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'Poppins-SemiBold',
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
});

export default HomeScreen;
