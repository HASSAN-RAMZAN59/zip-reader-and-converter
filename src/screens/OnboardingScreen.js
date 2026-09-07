import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Dimensions,
} from 'react-native';
import { storageService } from '../services/storageService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const ONBOARDING_SLIDES = [
  {
    id: '1',
    text: 'Compress your files into zip archives quickly and efficiently.',
  },
  {
    id: '2',
    text: 'Easily unzip and extract files right on your device anytime.',
  },
  {
    id: '3',
    text: 'Manage and share your archives seamlessly with one tap.',
  },
];

export const OnboardingScreen = ({ navigation }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef(null);

  const handleScroll = (event) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / SCREEN_WIDTH);
    setCurrentIndex(index);
  };

  const handleNext = () => {
    if (currentIndex < ONBOARDING_SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleBack = () => {
    if (currentIndex > 0) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex - 1,
        animated: true,
      });
      setCurrentIndex(currentIndex - 1);
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
          {currentIndex > 0 ? (
            <TouchableOpacity style={styles.navButtonSecondary} onPress={handleBack} activeOpacity={0.7}>
              <Text style={styles.navButtonSecondaryText}>Back</Text>
            </TouchableOpacity>
          ) : (
            <View />
          )}

          <View style={styles.flexSpacer} />

          {!isLastSlide ? (
            <TouchableOpacity style={styles.navButtonPrimary} onPress={handleNext} activeOpacity={0.7}>
              <Text style={styles.navButtonPrimaryText}>Next</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.navButtonPrimary} onPress={handleGetStarted} activeOpacity={0.7}>
              <Text style={styles.navButtonPrimaryText}>Get Started</Text>
            </TouchableOpacity>
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
    fontSize: 18,
    fontFamily: 'Poppins-Regular',
    textAlign: 'center',
    lineHeight: 26,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    alignItems: 'center',
  },
  indicatorText: {
    color: '#000000',
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
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
  navButtonPrimary: {
    backgroundColor: '#000000',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 6,
  },
  navButtonPrimaryText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
  },
  navButtonSecondary: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  navButtonSecondaryText: {
    color: '#000000',
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
  },
});

export default OnboardingScreen;
