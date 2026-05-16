import { useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

/** Normalize i18n language codes (e.g. ar-SA → ar). */
export function normalizeLanguage(language) {
  return String(language || 'en').toLowerCase().startsWith('ar') ? 'ar' : 'en';
}

export function syncDocumentLanguage(language) {
  const lang = normalizeLanguage(language);
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.lang = lang;
}

/**
 * Keeps document dir/lang in sync with i18n on customer storefront pages.
 */
export default function useDocumentLanguage() {
  const { i18n } = useTranslation();
  const language = normalizeLanguage(i18n.language);
  const isRTL = language === 'ar';

  useEffect(() => {
    syncDocumentLanguage(i18n.language);
  }, [i18n.language]);

  const toggleLanguage = useCallback(() => {
    const next = language === 'ar' ? 'en' : 'ar';
    syncDocumentLanguage(next);
    i18n.changeLanguage(next);
    return next;
  }, [i18n, language]);

  return { isRTL, language, toggleLanguage, i18n };
}
