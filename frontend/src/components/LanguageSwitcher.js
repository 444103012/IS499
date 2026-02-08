import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import './LanguageSwitcher.css';

export default function LanguageSwitcher() {
  const { locale, setLocale } = useLanguage();

  return (
    <div className="language-switcher" role="group" aria-label="Language">
      <button
        type="button"
        className={`lang-btn ${locale === 'en' ? 'lang-btn-active' : ''}`}
        onClick={() => setLocale('en')}
        aria-pressed={locale === 'en'}
        aria-label="English"
      >
        EN
      </button>
      <span className="lang-sep" aria-hidden="true">|</span>
      <button
        type="button"
        className={`lang-btn ${locale === 'ar' ? 'lang-btn-active' : ''}`}
        onClick={() => setLocale('ar')}
        aria-pressed={locale === 'ar'}
        aria-label="العربية"
      >
        عربي
      </button>
    </div>
  );
}
