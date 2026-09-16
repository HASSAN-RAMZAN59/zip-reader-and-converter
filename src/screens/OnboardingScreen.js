import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Dimensions,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { storageService } from '../services/storageService';
import Svg, { Defs, LinearGradient as SvgGradient, RadialGradient, Stop, Rect, Filter, FeDropShadow } from 'react-native-svg';

// Slide 1 SVG Assets
import ObjectsBg from '../assets/boardings/1/OBJECTS.svg';
import FolderWithZips from '../assets/boardings/1/Icon (1).svg';
import StackedDocs from '../assets/boardings/1/3d-render-two-stacked-documents-one-yellow-one-purple-showing-lines-text 1.svg';
import GalleryIcon from '../assets/boardings/1/3d-realistic-gallery-icon-vector-illustration 1.svg';

// Slide 2 SVG Asset
import SmartScanIllustration from '../assets/boardings/2/Group 1000007574.svg';

// Slide 3 SVG Assets
import PlantLeft from '../assets/boardings/3/Group 1000007545.svg';
import MainScreenPhone from '../assets/boardings/3/Main Screen.svg';
import PlantRight from '../assets/boardings/3/Group 1000007544.svg';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const ONBOARDING_SLIDES = [
  {
    id: '1',
    title: 'Create ZIP Files',
    subtitle: 'Compress multiple files into a single ZIP archive easily.',
  },
  {
    id: '2',
    title: 'Smart Scan Zips',
    subtitle: 'Quickly scan your device and find all ZIP archives in seconds.',
  },
  {
    id: '3',
    title: 'Manage Everything',
    subtitle: 'Organize, mange and access your files with powerful tools.',
  },
];

export const SlideItem = React.memo(({ item }) => {
  const renderIllustration = () => {
    if (item.id === '2') {
      return (
        <View style={styles.illustrationContainer}>
          <SmartScanIllustration
            width={SCREEN_WIDTH * 0.86}
            height={325}
            preserveAspectRatio="xMidYMid meet"
          />
        </View>
      );
    }

    if (item.id === '3') {
      return (
        <View style={styles.illustrationContainer}>
          {/* Green Glow aura behind phone */}
          <View style={styles.slide3PhoneGlowWrapper}>
            <Svg height="460" width="370" style={styles.slide3PhoneGlowSvg}>
              <Defs>
                <RadialGradient id="phoneGlowGrad" cx="50%" cy="40%" r="55%" fx="50%" fy="40%">
                  <Stop offset="0%" stopColor="#52D868" stopOpacity="0.9" />
                  <Stop offset="35%" stopColor="#42C657" stopOpacity="0.65" />
                  <Stop offset="65%" stopColor="#2EAA48" stopOpacity="0.3" />
                  <Stop offset="100%" stopColor="#138235" stopOpacity="0" />
                </RadialGradient>
              </Defs>
              <Rect x="0" y="0" width="370" height="460" rx="80" fill="url(#phoneGlowGrad)" />
            </Svg>
          </View>

          {/* Green curved pedestal/ground */}
          <View style={styles.slide3Ground} />

          {/* Central Main Screen Device */}
          <View style={styles.slide3MainScreen}>
            <MainScreenPhone width={321} height={439} preserveAspectRatio="xMidYMid meet" />
          </View>

          {/* Left Potted Plant (overlaps phone screen from left) */}
          <View style={styles.slide3PlantLeft}>
            <PlantLeft width={116} height={191} preserveAspectRatio="xMidYMid meet" />
          </View>

          {/* Right Potted Plant (overlaps phone screen from right) */}
          <View style={styles.slide3PlantRight}>
            <PlantRight width={116} height={191} preserveAspectRatio="xMidYMid meet" />
          </View>
        </View>
      );
    }

    // Slide 1
    return (
      <View style={styles.illustrationContainer}>
        {/* Background Foliage, Clouds & Objects */}
        <ObjectsBg
          width={SCREEN_WIDTH}
          height={320}
          preserveAspectRatio="xMidYMid meet"
        />

        {/* 3D Gallery Icon (Top Left above folder) */}
        <View style={styles.floatingGallery}>
          <GalleryIcon width={72} height={72} />
        </View>

        {/* 3D Stacked Documents (Top Right above folder) */}
        <View style={styles.floatingDocs}>
          <StackedDocs width={80} height={80} />
        </View>

        {/* Central Green Folder with Zipper & PDF/PNG files (Foreground) */}
        <View style={styles.mainFolder}>
          <FolderWithZips width={230} height={238} />
        </View>
      </View>
    );
  };

  return (
    <View style={styles.slide}>
      {renderIllustration()}
      <View style={styles.textContent}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.subtitle}>{item.subtitle}</Text>
      </View>
    </View>
  );
});

export const OnboardingScreen = ({ navigation }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef(null);

  const handleScroll = useCallback((event) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / SCREEN_WIDTH);
    if (index >= 0 && index < ONBOARDING_SLIDES.length) {
      setCurrentIndex((prev) => (prev !== index ? index : prev));
    }
  }, []);

  const handleNext = () => {
    if (currentIndex < ONBOARDING_SLIDES.length - 1) {
      const nextIndex = currentIndex + 1;
      flatListRef.current?.scrollToIndex({
        index: nextIndex,
        animated: true,
      });
      setCurrentIndex(nextIndex);
    } else {
      handleGetStarted();
    }
  };

  const handleGetStarted = async () => {
    try {
      await storageService.setHasLaunched(true);
      navigation.replace('Home');
    } catch (error) {
      console.error('Error saving onboarding state:', error);
      navigation.replace('Home');
    }
  };

  const renderItem = useCallback(({ item }) => <SlideItem item={item} />, []);

  const getItemLayout = useCallback(
    (_, index) => ({
      length: SCREEN_WIDTH,
      offset: SCREEN_WIDTH * index,
      index,
    }),
    [],
  );

  const isLastSlide = currentIndex === ONBOARDING_SLIDES.length - 1;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Top Header Bar with Skip Button (Hidden on 3rd/last slide) */}
      <View style={styles.topBar}>
        {!isLastSlide ? (
          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleGetStarted}
            activeOpacity={0.8}
          >
            <Svg height="48" width="84" style={styles.skipSvgShadow}>
              <Defs>
                <SvgGradient id="skipBtnGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <Stop offset="0%" stopColor="#7CD549" stopOpacity="1" />
                  <Stop offset="100%" stopColor="#168B35" stopOpacity="1" />
                </SvgGradient>
                <Filter id="skipFeatherShadow" x="-30%" y="-30%" width="170%" height="170%">
                  <FeDropShadow dx="3.5" dy="4.5" stdDeviation="3.5" floodColor="#000000" floodOpacity="0.45" />
                </Filter>
              </Defs>
              <Rect
                x="6"
                y="6"
                width="68"
                height="32"
                rx="16"
                fill="url(#skipBtnGrad)"
                filter="url(#skipFeatherShadow)"
              />
            </Svg>
            <Text style={styles.skipButtonText}>Skip</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Carousel Slides */}
      <FlatList
        ref={flatListRef}
        data={ONBOARDING_SLIDES}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        getItemLayout={getItemLayout}
        initialNumToRender={3}
        maxToRenderPerBatch={3}
        windowSize={3}
        removeClippedSubviews={false}
        decelerationRate="fast"
        bounces={false}
        style={styles.flatList}
      />

      {/* Bottom Actions: Next Button & Pagination Dots */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.nextButton}
          onPress={handleNext}
          activeOpacity={0.85}
        >
          <Svg height="68" width={SCREEN_WIDTH * 0.6 + 16} style={styles.nextSvgShadow}>
            <Defs>
              <SvgGradient id="nextBtnGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <Stop offset="0%" stopColor="#7CD549" stopOpacity="1" />
                <Stop offset="100%" stopColor="#168B35" stopOpacity="1" />
              </SvgGradient>
              <Filter id="nextFeatherShadow" x="-30%" y="-30%" width="170%" height="170%">
                <FeDropShadow dx="3.5" dy="5" stdDeviation="4" floodColor="#000000" floodOpacity="0.45" />
              </Filter>
            </Defs>
            <Rect
              x="6"
              y="6"
              width={SCREEN_WIDTH * 0.6}
              height="52"
              rx="26"
              fill="url(#nextBtnGrad)"
              filter="url(#nextFeatherShadow)"
            />
          </Svg>
          <Text style={styles.nextButtonText}>
            {isLastSlide ? 'Get Started' : 'Next'}
          </Text>
        </TouchableOpacity>

        {/* Pagination Dots */}
        <View style={styles.paginationRow}>
          {ONBOARDING_SLIDES.map((_, index) => {
            const isActive = currentIndex === index;
            return (
              <View
                key={index}
                style={[
                  styles.dot,
                  isActive ? styles.activeDot : styles.inactiveDot,
                ]}
              />
            );
          })}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  topBar: {
    width: '100%',
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    minHeight: 44,
    zIndex: 10,
  },
  skipButton: {
    width: 68,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  skipSvgShadow: {
    position: 'absolute',
    top: -6,
    left: -6,
  },
  skipButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
  },
  flatList: {
    flex: 1,
  },
  slide: {
    width: SCREEN_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 10,
  },
  illustrationContainer: {
    width: SCREEN_WIDTH,
    height: 355,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  floatingGallery: {
    position: 'absolute',
    top: 48,
    left: SCREEN_WIDTH * 0.28,
    zIndex: 2,
  },
  floatingDocs: {
    position: 'absolute',
    top: 40,
    right: SCREEN_WIDTH * 0.25,
    zIndex: 2,
  },
  mainFolder: {
    position: 'absolute',
    bottom: 8,
    alignSelf: 'center',
    zIndex: 3,
  },
  slide3PhoneGlowWrapper: {
    position: 'absolute',
    top: -10,
    alignSelf: 'center',
    zIndex: 1,
  },
  slide3PhoneGlowSvg: {
    alignSelf: 'center',
  },
  slide3Ground: {
    position: 'absolute',
    bottom: 0,
    width: SCREEN_WIDTH,
    height: 36,
    backgroundColor: '#47A850',
    borderTopLeftRadius: SCREEN_WIDTH * 0.5,
    borderTopRightRadius: SCREEN_WIDTH * 0.5,
    zIndex: 2,
  },
  slide3MainScreen: {
    alignSelf: 'center',
    zIndex: 3,
  },
  slide3PlantLeft: {
    position: 'absolute',
    bottom: 8,
    left: 2,
    zIndex: 5,
  },
  slide3PlantRight: {
    position: 'absolute',
    bottom: 8,
    right: 2,
    zIndex: 5,
  },
  textContent: {
    alignItems: 'center',
    paddingHorizontal: 32,
    marginTop: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: 'Poppins-Bold',
    color: '#181E1A',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#65736C',
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 270,
  },
  footer: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  nextButton: {
    width: SCREEN_WIDTH * 0.6,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  nextSvgShadow: {
    position: 'absolute',
    top: -6,
    left: -6,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Poppins-Medium',
  },
  paginationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
    gap: 8,
  },
  dot: {
    height: 5,
    borderRadius: 2.5,
  },
  activeDot: {
    width: 26,
    backgroundColor: '#388E3C',
  },
  inactiveDot: {
    width: 5,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
});

export default OnboardingScreen;
