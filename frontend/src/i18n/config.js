/**
 * Internationalization (i18n) Configuration
 * -----------------------------------------
 * This file sets up react-i18next so the app can show text in multiple languages
 * (English and Arabic). Translation strings live in ./locales/en.json and ./locales/ar.json.
 * The library can detect the user's language from localStorage and switch between languages.
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files: keys are the same, values are in each language
import arTranslations from './locales/ar.json';
import enTranslations from './locales/en.json';

// Initialize i18n: plug in React and the language detector, then set options
i18n
  .use(LanguageDetector)       // Detects language from browser/localStorage
  .use(initReactI18next)       // Connects i18n to React (useTranslation hook)
  .init({
    // Map language codes to their translation objects
    resources: {
      ar: {
        translation: arTranslations
      },
      en: {
        translation: enTranslations
      }
    },
    fallbackLng: 'en',        // If a key is missing in current language, use English
    lng: 'en',                // Default language on first load
    debug: false,             // Set true to see i18n logs in console
    interpolation: {
      escapeValue: false      // React already escapes; no need for i18n to escape
    },
    // How we detect/save language: prefer value stored in localStorage
    detection: {
      order: ['localStorage'],
      caches: ['localStorage']
    }
  });

export default i18n;
