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
import { useFocusEffect } from '@react-navigation/native';
import Svg, { Defs, LinearGradient as SvgGradient, Stop, Rect, Path } from 'react-native-svg';

import { scanDeviceStorage } from '../services/FileScanner';
import { permissionsService } from '../services/permissionsService';

// Import SVG Assets
import RefreshIcon from '../assets/home/refresh.svg';
import SettingsIcon from '../assets/home/settings.svg';
import FolderZipIcon from '../assets/home/folder_zip.svg';
import DeviceStorageIllustration from '../assets/Group 1000007577.svg';
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
import { GradientButton } from '../components/GradientButton';

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
    usedVal: '0.0',
    totalVal: '0.0',
    availableVal: '0.0',
    fillPercentage: '0%',
  });

  const fetchStorageInfo = useCallback(async () => {
    try {
      const info = await RNFS.getFSInfo();
      const total = info.totalSpace;
      const free = info.freeSpace;
      const used = total - free;

      const toGBNum = (bytes) => (bytes / (1024 * 1024 * 1024)).toFixed(1);

      const usedVal = toGBNum(used);
      const totalVal = toGBNum(total);
      const availableVal = toGBNum(free);

      const fillPercent = total > 0 ? (used / total) * 100 : 0;
      const fillPercentage = `${Math.min(100, Math.max(0, fillPercent))}%`;

      setStorageInfo({
        usedVal,
        totalVal,
        availableVal,
        fillPercentage,
      });
    } catch (error) {
      console.error('Error fetching storage info:', error);
    }
  }, []);

  const runFileScan = useCallback(async (showLoader = false) => {
    if (showLoader) {
      setIsScanning(true);
    }
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
          runFileScan(true);
          fetchStorageInfo();
        }
      }
    };
    init();
  }, [runFileScan, fetchStorageInfo]);

  const pendingRefreshRef = useRef(false);

  // Listen for real-time extraction & creation events
  useEffect(() => {
    const extractionSub = DeviceEventEmitter.addListener(
      'EXTRACTION_SUCCESS',
      () => {
        pendingRefreshRef.current = true;
      }
    );

    const zipCreatedSub = DeviceEventEmitter.addListener(
      'ZIP_CREATED',
      () => {
        pendingRefreshRef.current = true;
      }
    );

    return () => {
      extractionSub.remove();
      zipCreatedSub.remove();
    };
  }, []);

  // When returning to HomeScreen after extraction/creation, auto-refresh with Lottie loader!
  useFocusEffect(
    useCallback(() => {
      permissionsService.checkStoragePermission().then((isGranted) => {
        if (isGranted) {
          if (!hasInitialScanRun.current) {
            hasInitialScanRun.current = true;
            runFileScan(true);
            fetchStorageInfo();
          } else if (pendingRefreshRef.current) {
            pendingRefreshRef.current = false;
            runFileScan(true);
            fetchStorageInfo();
          }
        }
      });
    }, [runFileScan, fetchStorageInfo])
  );

  // Listen for AppState changes to detect permission grant from settings or background return
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      if (nextAppState === 'active') {
        const isGranted = await permissionsService.checkStoragePermission();
        if (isGranted) {
          setShowPermissionModal(false);
          if (!hasInitialScanRun.current) {
            hasInitialScanRun.current = true;
            runFileScan(true);
            fetchStorageInfo();
          } else if (pendingRefreshRef.current) {
            pendingRefreshRef.current = false;
            runFileScan(true);
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
        hasInitialScanRun.current = true;
        runFileScan(true);
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
            <TouchableOpacity onPress={() => requirePermission(() => { runFileScan(true); fetchStorageInfo(); })} disabled={isScanning} activeOpacity={0.7} style={styles.iconButton}>
              <RefreshIcon width={24} height={24} style={[isScanning && styles.disabledIcon]} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { }} activeOpacity={0.7} style={styles.iconButton}>
              <SettingsIcon width={24} height={24} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Device Storage Card */}
        <View style={styles.storageCard}>
          {/* Card SVG Gradient & Organic Wave Background */}
          <Svg style={StyleSheet.absoluteFillObject} width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 100 100">
            <Defs>
              <SvgGradient id="storageCardGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <Stop offset="0%" stopColor="#009A3E" stopOpacity="1" />
                <Stop offset="45%" stopColor="#007D32" stopOpacity="1" />
                <Stop offset="100%" stopColor="#004D1E" stopOpacity="1" />
              </SvgGradient>
              <SvgGradient id="storageWaveGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor="#005D24" stopOpacity="0.85" />
                <Stop offset="100%" stopColor="#003B15" stopOpacity="0.98" />
              </SvgGradient>
            </Defs>
            <Rect x="0" y="0" width="100" height="100" fill="url(#storageCardGrad)" />
            <Path d="M 0 42 C 25 32, 60 55, 100 38 L 100 100 L 0 100 Z" fill="url(#storageWaveGrad)" />
          </Svg>

          <View style={styles.storageCardContent}>
            <View style={styles.storageCardLeft}>
              <Text style={styles.storageTitle}>Device Storage</Text>

              <Text style={styles.storageText} numberOfLines={1}>
                <Text style={styles.storageUsed}>{storageInfo.usedVal} GB used</Text>
                <Text style={styles.storageTotal}> / {storageInfo.totalVal} GB Total</Text>
              </Text>

              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: storageInfo.fillPercentage }]} />
              </View>

              <View style={styles.availableRow}>
                <AvailableSpaceIcon width={12} height={12} />
                <Text style={styles.availableText}>{storageInfo.availableVal} GB Available</Text>
              </View>

              <TouchableOpacity style={styles.createZipBtn} onPress={() => requirePermission(handleCreateZip)} activeOpacity={0.8}>
                <Text style={styles.createZipBtnText}>Create Zip File</Text>
                <FolderZipIcon width={16} height={16} style={{ marginLeft: 6 }} />
              </TouchableOpacity>
            </View>

            <View style={styles.storageCardRight}>
              <DeviceStorageIllustration width={126} height={102} />
            </View>
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

              <GradientButton
                style={[styles.permissionAllowBtn, checkingPermission && styles.disabledIcon]}
                onPress={handleGrantPermission}
                disabled={checkingPermission}
                title={checkingPermission ? 'Checking...' : 'Allow'}
              />
            </View>
          </View>
        </Modal>

        {/* Refresh Lottie Loading Modal */}
        <Modal
          visible={isScanning}
          transparent={true}
          animationType="fade"
          onRequestClose={() => { }}
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
    width: '100%',
    aspectRatio: 359 / 159,
    borderRadius: 20,
    backgroundColor: '#004D1E',
    marginBottom: 20,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  storageCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    height: '100%',
    zIndex: 2,
    position: 'relative',
  },
  storageCardLeft: {
    flex: 1,
    paddingRight: 100,
    justifyContent: 'center',
    zIndex: 2,
  },
  storageCardRight: {
    position: 'absolute',
    right: 16,
    bottom: 50,
    zIndex: 1,
  },
  storageTitle: {
    fontSize: 16,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  storageText: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    marginBottom: 6,
  },
  storageUsed: {
    color: '#FFFFFF',
    fontFamily: 'Poppins-SemiBold',
    fontWeight: '700',
  },
  storageTotal: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontFamily: 'Poppins-Regular',
    fontWeight: '400',
  },
  progressBarBg: {
    height: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 3,
    marginBottom: 6,
    width: '82%',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 3,
  },
  availableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  availableText: {
    color: '#FFFFFF',
    fontSize: 10.5,
    marginLeft: 6,
    fontFamily: 'Poppins-Medium',
    fontWeight: '500',
  },
  createZipBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  createZipBtnText: {
    color: '#004D1E',
    fontSize: 12,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
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
