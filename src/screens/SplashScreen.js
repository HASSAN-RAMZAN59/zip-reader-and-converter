import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  StatusBar,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import SplashFolderIcon from '../assets/splash/Group 1000007538.svg';
import BottomWaveBg from '../assets/splash/Vector 14240.svg';
import { storageService } from '../services/storageService';
import { permissionsService } from '../services/permissionsService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const SplashScreen = ({ navigation }) => {
  useEffect(() => {
    let isMounted = true;

    const checkAppLaunchStatus = async () => {
      const startTime = Date.now();

      try {
        const [hasLaunched, isPermissionGranted] = await Promise.all([
          storageService.getHasLaunched(),
          permissionsService.checkStoragePermission(),
        ]);

        const elapsedTime = Date.now() - startTime;
        const remainingTime = Math.max(0, 2200 - elapsedTime);

        setTimeout(() => {
          if (!isMounted) return;

          if (!isPermissionGranted) {
            // Permission not granted -> show Permissions screen
            navigation.replace('Permissions');
          } else if (!hasLaunched) {
            // First time launch + permission granted -> show Onboarding
            navigation.replace('Onboarding');
          } else {
            // Subsequent launch + permission already granted -> directly to Home!
            navigation.replace('Home');
          }
        }, remainingTime);
      } catch (error) {
        console.error('Error during splash check:', error);
        setTimeout(() => {
          if (isMounted) {
            navigation.replace('Permissions');
          }
        }, 2200);
      }
    };

    checkAppLaunchStatus();

    return () => {
      isMounted = false;
    };
  }, [navigation]);

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />

      {/* Center Content */}
      <View style={styles.centerContent}>
        {/* Main Folder Icon */}
        <View style={styles.iconWrapper}>
          <SplashFolderIcon width={160} height={145} />
        </View>

        {/* Title */}
        <Text style={styles.title}>Zip Unzip</Text>

        {/* Subtitle */}
        <Text style={styles.subtitle}>Zip unzip your files just in one click.</Text>
      </View>

      {/* Bottom Wave Graphics & Logo */}
      <View style={styles.bottomArea} pointerEvents="none">
        {/* Background Subtle Mint Wave (Left & Right curves) */}
        <Svg
          width={SCREEN_WIDTH}
          height={180}
          viewBox="0 0 412 180"
          style={styles.backgroundWave}
          preserveAspectRatio="none"
        >
          {/* Left subtle wave */}
          <Path
            d="M-20 80 C60 85 110 145 160 180 L-20 180 Z"
            fill="#D5EDDA"
            opacity={0.55}
          />
          {/* Far left soft curve */}
          <Path
            d="M-30 130 C40 135 90 165 140 180 L-30 180 Z"
            fill="#C2E6C9"
            opacity={0.65}
          />
          {/* Right subtle wave */}
          <Path
            d="M250 180 C310 145 365 125 432 120 L432 180 Z"
            fill="#D5EDDA"
            opacity={0.6}
          />
        </Svg>

        {/* Main Green Hill SVG (Vector 14240.svg) */}
        <View style={styles.mainWaveContainer}>
          <BottomWaveBg
            width={SCREEN_WIDTH}
            height={115}
            preserveAspectRatio="none"
          />

          {/* Center Brand Logo (•≡ ZIP) */}
          <View style={styles.logoOverlay}>
            <View style={styles.logoRow}>
              {/* Dot & 3 Bars Icon */}
              <View style={styles.brandSymbol}>
                {/* Dot */}
                <View style={styles.brandDot} />
                {/* 3 Horizontal Bars */}
                <View style={styles.brandBars}>
                  <View style={styles.brandBar} />
                  <View style={styles.brandBar} />
                  <View style={styles.brandBar} />
                </View>
              </View>

              {/* ZIP Text */}
              <Text style={styles.brandText}>ZIP</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5FAF6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    marginBottom: 80, // slight optical lift above center
  },
  iconWrapper: {
    marginBottom: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 25,
    fontFamily: 'Poppins-Medium',
    color: '#1F2923',
    letterSpacing: 0.3,
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    fontFamily: 'Poppins-Regular',
    color: '#6E7D75',
    textAlign: 'center',
    lineHeight: 22,
  },
  bottomArea: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    width: '100%',
    height: 180,
    justifyContent: 'flex-end',
  },
  backgroundWave: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  mainWaveContainer: {
    width: '100%',
    height: 115,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  logoOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 24, // centers vertically inside the dome curve
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandSymbol: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 6,
  },
  brandDot: {
    width: 4.5,
    height: 4.5,
    borderRadius: 2.5,
    backgroundColor: '#FFFFFF',
    marginRight: 4,
    marginTop: 2,
  },
  brandBars: {
    justifyContent: 'center',
    gap: 2.8,
  },
  brandBar: {
    width: 17,
    height: 3.2,
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
  },
  brandText: {
    fontSize: 34,
    fontFamily: 'Poppins-Medium',
    color: '#FFFFFF',
    letterSpacing: 1.2,
    includeFontPadding: false,
  },
});

export default SplashScreen;

