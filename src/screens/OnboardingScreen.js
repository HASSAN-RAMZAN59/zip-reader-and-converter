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
          <View style={styles.slide3PhoneGlow} />

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
          <FolderWithZips width={248} height={253} />
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
    backgroundColor: '#44A63B',
    paddingVertical: 6,
    paddingHorizontal: 18,
    borderRadius: 18,
    shadowColor: '#1B5E20',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
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
  slide3PhoneGlow: {
    position: 'absolute',
    top: 8,
    alignSelf: 'center',
    width: 268,
    height: 345,
    borderRadius: 36,
    backgroundColor: 'rgba(76, 175, 80, 0.18)',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 2,
    zIndex: 1,
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
    fontFamily: 'Poppins-Medium',
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
    backgroundColor: '#4CAF50',
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2E7D32',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
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
