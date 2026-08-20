import { Platform, PermissionsAndroid } from 'react-native';
import { check, request, PERMISSIONS, RESULTS, openSettings } from 'react-native-permissions';

export const permissionsService = {
  /**
   * Check if external storage / all files permission is granted.
   * @returns {Promise<boolean>}
   */
  async checkStoragePermission() {
    if (Platform.OS !== 'android') {
      return true;
    }

    try {
      const androidVersion = parseInt(Platform.Version, 10);

      if (androidVersion >= 30) {
        // Android 11+ (API 30+) requires MANAGE_EXTERNAL_STORAGE
        if (PERMISSIONS.ANDROID.MANAGE_EXTERNAL_STORAGE) {
          const status = await check(PERMISSIONS.ANDROID.MANAGE_EXTERNAL_STORAGE);
          return status === RESULTS.GRANTED;
        }
        // Fallback check via PermissionsAndroid if needed
        return await PermissionsAndroid.check(
          'android.permission.MANAGE_EXTERNAL_STORAGE'
        );
      } else {
        // Android 10 and below
        const readStatus = await check(PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE);
        const writeStatus = await check(PERMISSIONS.ANDROID.WRITE_EXTERNAL_STORAGE);
        return readStatus === RESULTS.GRANTED && writeStatus === RESULTS.GRANTED;
      }
    } catch (error) {
      console.error('Error checking storage permission:', error);
      return false;
    }
  },

  /**
   * Request external storage / MANAGE_EXTERNAL_STORAGE permission.
   * @returns {Promise<boolean>} True if granted, false otherwise.
   */
  async requestStoragePermission() {
    if (Platform.OS !== 'android') {
      return true;
    }

    try {
      const androidVersion = parseInt(Platform.Version, 10);

      if (androidVersion >= 30) {
        // Android 11+ (API 30+): MANAGE_EXTERNAL_STORAGE (All Files Access)
        let status;
        if (PERMISSIONS.ANDROID.MANAGE_EXTERNAL_STORAGE) {
          status = await request(PERMISSIONS.ANDROID.MANAGE_EXTERNAL_STORAGE);
        } else {
          status = await PermissionsAndroid.request(
            'android.permission.MANAGE_EXTERNAL_STORAGE',
            {
              title: 'All Files Access Permission',
              message:
                'Zip App requires access to all files to scan, compress, and extract zip archives on your device.',
              buttonPositive: 'Grant Permission',
            }
          );
        }

        if (status === RESULTS.GRANTED || status === PermissionsAndroid.RESULTS.GRANTED) {
          return true;
        }

        // If blocked or unavailable directly via dialog, direct user to app settings
        if (status === RESULTS.BLOCKED || status === RESULTS.DENIED) {
          await openSettings();
        }
        return false;
      } else {
        // Android 10 (API 29) and below
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
        ]);

        const isReadGranted =
          granted[PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE] ===
          PermissionsAndroid.RESULTS.GRANTED;
        const isWriteGranted =
          granted[PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE] ===
          PermissionsAndroid.RESULTS.GRANTED;

        return isReadGranted && isWriteGranted;
      }
    } catch (error) {
      console.error('Error requesting storage permission:', error);
      return false;
    }
  },
};
