import { Platform, PermissionsAndroid, Linking, NativeModules } from 'react-native';

const { ManageStorageModule } = NativeModules;

export const permissionsService = {
  /**
   * Check if storage / all-files permission is granted.
   * @returns {Promise<boolean>}
   */
  async checkStoragePermission() {
    if (Platform.OS !== 'android') {
      return true;
    }

    try {
      const androidVersion = parseInt(String(Platform.Version), 10);

      // 1. Android 11+ (API 30+): Check Environment.isExternalStorageManager() via Native Module
      if (androidVersion >= 30) {
        if (ManageStorageModule && ManageStorageModule.isExternalStorageManager) {
          const isGranted = await ManageStorageModule.isExternalStorageManager();
          return Boolean(isGranted);
        }
      }

      // 2. Android <= 10: Check standard READ/WRITE storage permissions
      const isReadGranted = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE
      );
      const isWriteGranted = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE
      );

      return isReadGranted && isWriteGranted;
    } catch (error) {
      console.error('Error checking storage permission:', error);
      return false;
    }
  },

  /**
   * Request storage permission:
   * - On Android <= 10: Triggers standard Native OS Dialog popup.
   * - On Android 11+ (API 30+): Triggers the exact OS "All Files Access" toggle screen for Zip App.
   * @returns {Promise<boolean>}
   */
  async requestStoragePermission() {
    if (Platform.OS !== 'android') {
      return true;
    }

    try {
      const androidVersion = parseInt(String(Platform.Version), 10);

      if (androidVersion >= 30) {
        // Android 11, 12, 13, 14, 15+:
        if (ManageStorageModule && ManageStorageModule.requestManageStoragePermission) {
          const isGranted = await ManageStorageModule.requestManageStoragePermission();
          return Boolean(isGranted);
        }
        await this.openAllFilesAccessSettings();
        return false;
      } else {
        // Android 10 and below: Trigger standard In-App OS Dialog Popup
        const statuses = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
        ]);

        const isGranted =
          statuses[PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE] ===
            PermissionsAndroid.RESULTS.GRANTED &&
          statuses[PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE] ===
            PermissionsAndroid.RESULTS.GRANTED;

        if (isGranted) {
          return true;
        }

        // If permanently blocked, open settings
        const isNeverAskAgain =
          statuses[PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE] ===
            PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN ||
          statuses[PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE] ===
            PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN;

        if (isNeverAskAgain) {
          await this.openAppSettings();
        }

        return false;
      }
    } catch (error) {
      console.error('Error requesting storage permission:', error);
      await this.openAppSettings();
      return false;
    }
  },

  /**
   * Open the direct Android system "All Files Access" toggle screen for Zip App.
   */
  async openAllFilesAccessSettings() {
    try {
      if (Platform.OS === 'android') {
        const androidVersion = parseInt(String(Platform.Version), 10);
        if (androidVersion >= 30) {
          try {
            await Linking.sendIntent(
              'android.settings.MANAGE_APP_ALL_FILES_ACCESS_PERMISSION',
              [{ key: 'package', value: 'package:com.zipapp' }]
            );
            return;
          } catch (e1) {
            try {
              await Linking.sendIntent(
                'android.settings.MANAGE_ALL_FILES_ACCESS_PERMISSION'
              );
              return;
            } catch (e2) {}
          }
        }
      }
      await this.openAppSettings();
    } catch (err) {
      await this.openAppSettings();
    }
  },

  /**
   * Open standard app settings.
   */
  async openAppSettings() {
    try {
      if (Linking.openSettings) {
        await Linking.openSettings();
      }
    } catch (err) {
      console.error('Error opening settings:', err);
    }
  },
};




