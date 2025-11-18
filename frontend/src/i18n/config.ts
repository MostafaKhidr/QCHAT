import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './en.json';
import ar from './ar.json';

// Get saved language or default to 'en'
const savedLanguage = localStorage.getItem('qchat-language') || 'en';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: en,
      },
      ar: {
        translation: ar,
      },
    },
    lng: savedLanguage,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    react: {
      useSuspense: false, // Disable suspense for SSR compatibility
    },
  });

// Apply RTL direction for Arabic
const applyDirection = (language: string) => {
  const dir = language === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.setAttribute('dir', dir);
  document.documentElement.setAttribute('lang', language);
};

// Apply initial direction
applyDirection(savedLanguage);

// Listen for language changes
i18n.on('languageChanged', (lng) => {
  localStorage.setItem('qchat-language', lng);
  applyDirection(lng);
});

export default i18n;
