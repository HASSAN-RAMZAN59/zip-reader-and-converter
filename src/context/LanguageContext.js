import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TRANSLATIONS } from '../constants/translations';

const LANGUAGE_STORAGE_KEY = '@zip_app_language';

const LanguageContext = createContext({
  currentLanguage: 'en',
  changeLanguage: async () => {},
  t: (key, fallback = '') => fallback || key,
});

export const LanguageProvider = ({ children }) => {
  const [currentLanguage, setCurrentLanguage] = useState('en');

  useEffect(() => {
    loadSavedLanguage();
  }, []);

  const loadSavedLanguage = async () => {
    try {
      const savedLang = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (savedLang && TRANSLATIONS[savedLang]) {
        setCurrentLanguage(savedLang);
      }
    } catch (error) {
      console.error('Error loading language from storage:', error);
    }
  };

  const changeLanguage = async (langCode) => {
    if (!TRANSLATIONS[langCode]) return;
    try {
      setCurrentLanguage(langCode);
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, langCode);
    } catch (error) {
      console.error('Error saving language to storage:', error);
    }
  };

  const t = (key, fallback = '') => {
    const langDict = TRANSLATIONS[currentLanguage] || TRANSLATIONS.en;
    if (langDict[key] !== undefined) {
      return langDict[key];
    }
    const defaultDict = TRANSLATIONS.en;
    if (defaultDict[key] !== undefined) {
      return defaultDict[key];
    }
    return fallback || key;
  };

  return (
    <LanguageContext.Provider value={{ currentLanguage, changeLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
