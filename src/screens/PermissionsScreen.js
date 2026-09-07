import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, AppState, Animated } from 'react-native';
import { permissionsService } from '../services/permissionsService';
import { storageService } from '../services/storageService';

export const PermissionsScreen = ({ navigation }) => {
  const [checking, setChecking] = useState(false);
  const isNavigatingRef = useRef(false);
  const contentFadeAnim = useRef(new Animated.Value(1)).current;

  const checkAndNavigate = useCallback(async () => {
    if (isNavigatingRef.current) return;

    try {
      const isGranted = await permissionsService.checkStoragePermission();
      if (isGranted) {
        isNavigatingRef.current = true;
        // Keep content hidden to eliminate flicker completely
        contentFadeAnim.setValue(0);
        const hasLaunched = await storageService.getHasLaunched();
        if (hasLaunched) {
          navigation.replace('Home');
        } else {
          navigation.replace('Onboarding');
        }
      } else {
        // Only show content if permission is genuinely missing
        Animated.timing(contentFadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }).start();
      }
    } catch (error) {
      console.error('Permission check error:', error);
      Animated.timing(contentFadeAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [navigation, contentFadeAnim]);

  useEffect(() => {
    // Initial check on mount
    checkAndNavigate();

    // Listen for AppState changes in real-time (when user returns from Settings)
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        checkAndNavigate();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [checkAndNavigate]);

  const handleGrantPermission = async () => {
    setChecking(true);
    try {
      const granted = await permissionsService.requestStoragePermission();
      if (granted) {
        isNavigatingRef.current = true;
        contentFadeAnim.setValue(0);
        const hasLaunched = await storageService.getHasLaunched();
        if (hasLaunched) {
          navigation.replace('Home');
        } else {
          navigation.replace('Onboarding');
        }
      }
    } catch (error) {
      console.error('Error requesting permission:', error);
      Animated.timing(contentFadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } finally {
      setChecking(false);
    }
  };

  return (
    <View style={styles.outerContainer}>
      <Animated.View style={[styles.container, { opacity: contentFadeAnim }]}>
        <Text style={styles.title}>Storage Access Required</Text>
        <Text style={styles.description}>
          Zip App requires All Files Access to scan, compress, and extract files across your device.
        </Text>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.grantButton, checking && styles.disabledButton]}
            onPress={handleGrantPermission}
            disabled={checking}
            activeOpacity={0.8}
          >
            <Text style={styles.grantButtonText}>
              {checking ? 'Checking...' : 'Grant Permission'}
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    color: '#000000',
    fontSize: 20,
    fontFamily: 'Poppins-Medium',
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    color: '#000000',
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 240,
  },
  grantButton: {
    backgroundColor: '#000000',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    opacity: 0.6,
  },
  grantButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'Poppins-Medium',
  },
});

export default PermissionsScreen;
