import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants/storageKeys';

export const storageService = {
  /**
   * Check if the app has been launched before.
   * @returns {Promise<boolean>} True if previously launched, false otherwise.
   */
  async getHasLaunched() {
    try {
      const value = await AsyncStorage.getItem(STORAGE_KEYS.HAS_LAUNCHED);
      return value === 'true';
    } catch (error) {
      console.error('Error reading hasLaunched from AsyncStorage:', error);
      return false;
    }
  },

  /**
   * Save the hasLaunched flag to AsyncStorage.
   * @param {boolean} launched
   * @returns {Promise<void>}
   */
  async setHasLaunched(launched = true) {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.HAS_LAUNCHED, String(launched));
    } catch (error) {
      console.error('Error writing hasLaunched to AsyncStorage:', error);
    }
  },
};
