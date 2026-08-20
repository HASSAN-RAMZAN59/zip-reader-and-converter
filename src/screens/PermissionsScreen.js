import React, { useEffect, useState } from 'react';
import { View, Text, Button, StyleSheet, Alert } from 'react-native';
import { permissionsService } from '../services/permissionsService';

export const PermissionsScreen = ({ navigation }) => {
  const [permissionStatus, setPermissionStatus] = useState('checking');

  useEffect(() => {
    checkPermissionOnMount();
  }, []);

  const checkPermissionOnMount = async () => {
    const isGranted = await permissionsService.checkStoragePermission();
    if (isGranted) {
      navigation.replace('Onboarding');
    } else {
      setPermissionStatus('denied');
    }
  };

  const handleGrantPermission = async () => {
    const isGranted = await permissionsService.requestStoragePermission();
    if (isGranted) {
      navigation.replace('Onboarding');
    } else {
      Alert.alert(
        'Permission Required',
        'Storage permission is necessary for Zip App to scan, manage, and extract zip files on your device.',
        [{ text: 'OK' }]
      );
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Storage Access Required</Text>
      <Text style={styles.description}>
        Zip App requires All Files Access (MANAGE_EXTERNAL_STORAGE) to scan, compress, and extract files across your device.
      </Text>

      <View style={styles.buttonContainer}>
        <Button
          title="Grant Permission"
          onPress={handleGrantPermission}
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
