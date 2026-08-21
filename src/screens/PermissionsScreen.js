import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, Button, StyleSheet, AppState } from 'react-native';
import { permissionsService } from '../services/permissionsService';
import { storageService } from '../services/storageService';

export const PermissionsScreen = ({ navigation }) => {
  const [checking, setChecking] = useState(false);
  const isNavigatingRef = useRef(false);

  const checkAndNavigate = useCallback(async () => {
    if (isNavigatingRef.current) return;

    try {
      const isGranted = await permissionsService.checkStoragePermission();
      if (isGranted) {
        isNavigatingRef.current = true;
        const hasLaunched = await storageService.getHasLaunched();
        if (hasLaunched) {
          navigation.replace('Home');
        } else {
          navigation.replace('Onboarding');
        }
      }
    } catch (error) {
      console.error('Error checking permission in PermissionsScreen:', error);
    }
  }, [navigation]);

  useEffect(() => {
    // Initial check on mount
    checkAndNavigate();

    // Listen for AppState changes in real-time (e.g. when user returns from Settings or OS dialog)
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
    if (checking || isNavigatingRef.current) return;
    setChecking(true);

    try {
      const isGranted = await permissionsService.requestStoragePermission();
      if (isGranted) {
        await checkAndNavigate();
      }
    } catch (error) {
      console.error('Error handling grant permission:', error);
    } finally {
      setChecking(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Storage Access Required</Text>
      <Text style={styles.description}>
        Zip App requires All Files Access to scan, compress, and extract files across your device.
      </Text>

      <View style={styles.buttonContainer}>
        <Button
          title={checking ? 'Checking...' : 'Grant Permission'}
          onPress={handleGrantPermission}
          disabled={checking}
          color="#000000"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
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
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    color: '#000000',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 20,
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 240,
  },
});

export default PermissionsScreen;

