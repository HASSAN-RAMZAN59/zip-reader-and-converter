import React, { useState, useRef } from 'react';
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

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const ONBOARDING_SLIDES = [
  {
    id: '1',
    title: 'Create ZIP Files',
    subtitle: 'Compress multiple files into a single ZIP archive easily.',
  },
  {
    id: '2',
    title: 'Extract Anywhere',
    subtitle: 'Easily unzip and extract files right on your device anytime.',
  },
  {
    id: '3',
    title: 'Secure & Share',
    subtitle: 'Protect files with passwords and share archives seamlessly.',
  },
];

export const OnboardingScreen = ({ navigation }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef(null);

  const handleScroll = (event) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / SCREEN_WIDTH);
    if (index >= 0 && index < ONBOARDING_SLIDES.length) {
      setCurrentIndex(index);
    }
  };

  const handleNext = () => {
    if (currentIndex < ONBOARDING_SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
      setCurrentIndex(currentIndex + 1);
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

  const renderSlideIllustration = (id) => {
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

  const renderSlide = ({ item }) => (
    <View style={styles.slide}>
      {/* 3D Graphic Illustration */}
      {renderSlideIllustration(item.id)}

      {/* Slide Text Content */}
      <View style={styles.textContent}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.subtitle}>{item.subtitle}</Text>
      </View>
    </View>
  );

  const isLastSlide = currentIndex === ONBOARDING_SLIDES.length - 1;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Top Header Bar with Skip Button */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.skipButton}
          onPress={handleGetStarted}
          activeOpacity={0.8}
        >
          <Text style={styles.skipButtonText}>Skip</Text>
        </TouchableOpacity>
      </View>

      {/* Carousel Slides */}
      <FlatList
        ref={flatListRef}
        data={ONBOARDING_SLIDES}
        renderItem={renderSlide}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
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
    paddingHorizontal: 20,
    paddingTop: 10,
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
    height: 330,
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
  textContent: {
    alignItems: 'center',
    paddingHorizontal: 32,
    marginTop: 24,
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
