import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { storageService } from '../services/storageService';
import { permissionsService } from '../services/permissionsService';

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
        const remainingTime = Math.max(0, 1800 - elapsedTime);

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
        }, 1800);
      }
    };

    checkAppLaunchStatus();

    return () => {
      isMounted = false;
    };
  }, [navigation]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Zip App Splash</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    color: '#000000',
    fontSize: 24,
    fontWeight: 'bold',
  },
});

export default SplashScreen;
