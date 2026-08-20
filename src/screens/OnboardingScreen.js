import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  Button,
  StyleSheet,
  FlatList,
  Dimensions,
} from 'react-native';
import { storageService } from '../services/storageService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const ONBOARDING_SLIDES = [
  {
    id: '1',
    text: 'Welcome & Introduction - Fastest Zip & File Manager',
  },
  {
    id: '2',
    text: 'Features Highlight - Compress any format & Extract instantly',
  },
  {
    id: '3',
    text: 'Security Highlight - Secure your files with Password Protection',
  },
];

export const OnboardingScreen = ({ navigation }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef(null);

  const handleScroll = (event) => {
    const slideIndex = Math.round(
      event.nativeEvent.contentOffset.x / SCREEN_WIDTH
    );
    if (slideIndex !== currentIndex && slideIndex >= 0 && slideIndex < ONBOARDING_SLIDES.length) {
      setCurrentIndex(slideIndex);
    }
  };

  const handleNext = () => {
    if (currentIndex < ONBOARDING_SLIDES.length - 1) {
      const nextIndex = currentIndex + 1;
      flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
      setCurrentIndex(nextIndex);
    }
  };

  const handleBack = () => {
    if (currentIndex > 0) {
      const prevIndex = currentIndex - 1;
      flatListRef.current?.scrollToIndex({ index: prevIndex, animated: true });
      setCurrentIndex(prevIndex);
    }
  };

  const handleGetStarted = async () => {
    await storageService.setHasLaunched(true);
    navigation.reset({
      index: 0,
      routes: [{ name: 'Home' }],
    });
  };

  const renderSlide = ({ item }) => (
    <View style={styles.slide}>
      <Text style={styles.text}>{item.text}</Text>
    </View>
  );

  const isLastSlide = currentIndex === ONBOARDING_SLIDES.length - 1;

  return (
    <View style={styles.container}>
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

      <View style={styles.footer}>
        <Text style={styles.indicatorText}>
          {currentIndex + 1} / {ONBOARDING_SLIDES.length}
        </Text>

        <View style={styles.buttonRow}>
          {currentIndex > 0 && (
            <Button title="Back" onPress={handleBack} color="#000000" />
          )}

          <View style={styles.flexSpacer} />

          {!isLastSlide ? (
            <Button title="Next" onPress={handleNext} color="#000000" />
          ) : (
            <Button title="Get Started" onPress={handleGetStarted} color="#000000" />
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  flatList: {
    flex: 1,
  },
  slide: {
    width: SCREEN_WIDTH,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  text: {
    color: '#000000',
    fontSize: 20,
    textAlign: 'center',
    lineHeight: 28,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    alignItems: 'center',
  },
  indicatorText: {
    color: '#000000',
    fontSize: 14,
    marginBottom: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  flexSpacer: {
    flex: 1,
  },
});

export default OnboardingScreen;
