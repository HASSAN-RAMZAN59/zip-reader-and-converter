import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { storageService } from '../services/storageService';

export const SplashScreen = ({ navigation }) => {
  useEffect(() => {
    let isMounted = true;

    const checkAppLaunchStatus = async () => {
      const hasLaunched = await storageService.getHasLaunched();

      setTimeout(() => {
        if (!isMounted) return;

        if (hasLaunched) {
          navigation.replace('Home');
        } else {
          navigation.replace('Permissions');
        }
      }, 2500);
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
