import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import './LandingPage.css';

/*
  LOGO INSTRUCTIONS (Arabic/English):
  To add your own logo:
  1. Place your logo image in: frontend/public/ (e.g. logo.png)
  2. Replace the logo img src below with your filename.
  3. Adjust size in LandingPage.css: .logo-wrap .logo-img { height: ...; max-width: ...; }
*/
function LandingPage() {
  const { t } = useLanguage();
  return (
    <main className="landing" role="main">
      <div className="landing-inner">
        <div className="logo-wrap">
          <img src={process.env.PUBLIC_URL + '/Logo1.png'} alt="StoreLaunch" className="logo-img" />
        </div>

        <h1 className="landing-title">{t('landing.title')}</h1>
        <p className="landing-subtitle">{t('landing.subtitle')}</p>

        <div className="options">
          <Link
            to="/register/store-owner"
            className="option-card"
            aria-label={t('landing.storeOwnerAria')}
          >
            <div className="option-icon-wrap">
              <StoreOwnerIcon className="option-icon" />
            </div>
            <span className="option-label">{t('landing.storeOwner')}</span>
            <span className="option-desc">{t('landing.storeOwnerDesc')}</span>
          </Link>

          <Link
            to="/register/customer"
            className="option-card"
            aria-label={t('landing.customerAria')}
          >
            <div className="option-icon-wrap">
              <CustomerIcon className="option-icon" />
            </div>
            <span className="option-label">{t('landing.customer')}</span>
            <span className="option-desc">{t('landing.customerDesc')}</span>
          </Link>
        </div>
      </div>
    </main>
  );
}

function StoreOwnerIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function CustomerIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  );
}

export default LandingPage;
