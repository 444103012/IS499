import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import './LandingPage.css';

function LandingPage() {
  const { t } = useLanguage();
  return (
    <main className="landing" role="main">
      <div className="landing-hero">
        <div className="landing-content">
          <div className="logo-wrap">
            <img src={process.env.PUBLIC_URL + '/Logo1.png'} alt="StoreLaunch" className="logo-img" />
          </div>

          <h1 className="landing-title">{t('landing.title')}</h1>
          <p className="landing-subtitle">{t('landing.subtitle')}</p>
          <p className="landing-description">{t('landing.description')}</p>

          <div className="landing-features">
            <div className="feature-item">
              <FeatureIcon className="feature-icon" />
              <h3 className="feature-title">{t('landing.feature1Title')}</h3>
              <p className="feature-desc">{t('landing.feature1Desc')}</p>
            </div>
            <div className="feature-item">
              <FeatureIcon className="feature-icon" />
              <h3 className="feature-title">{t('landing.feature2Title')}</h3>
              <p className="feature-desc">{t('landing.feature2Desc')}</p>
            </div>
            <div className="feature-item">
              <FeatureIcon className="feature-icon" />
              <h3 className="feature-title">{t('landing.feature3Title')}</h3>
              <p className="feature-desc">{t('landing.feature3Desc')}</p>
            </div>
          </div>

          <div className="landing-cta">
            <Link
              to="/register/store-owner"
              className="cta-button"
              aria-label={t('landing.ctaAria')}
            >
              {t('landing.ctaButton')}
              <ArrowIcon className="cta-arrow" />
            </Link>
            <p className="cta-subtext">{t('landing.ctaSubtext')}</p>
          </div>
        </div>
      </div>
    </main>
  );
}

function FeatureIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function ArrowIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

export default LandingPage;
