import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import LanguageSwitcher from './LanguageSwitcher';
import './AppLayout.css';

export default function AppLayout({ children }) {
  const { t } = useLanguage();
  return (
    <div className="app-layout">
      <header className="app-header">
        <div className="app-header-inner">
          <Link to="/login" className="header-login-btn">
            {t('common.logIn')}
          </Link>
          <LanguageSwitcher />
        </div>
      </header>
      {children}
    </div>
  );
}
