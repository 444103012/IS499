import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const LandingPage = () => {
  const { t, i18n } = useTranslation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [billingPeriod, setBillingPeriod] = useState('monthly');
  const isRTL = i18n.language === 'ar';

  const toggleLanguage = () => {
    const newLang = i18n.language === 'ar' ? 'en' : 'ar';
    i18n.changeLanguage(newLang);
    document.documentElement.dir = newLang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = newLang;
  };

  useEffect(() => {
    const currentLang = i18n.language || 'ar';
    const dir = currentLang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.dir = dir;
    document.documentElement.lang = currentLang;
  }, [i18n.language]);

  const featuresList = [
    { titleKey: 'features.easyStore.title', descriptionKey: 'features.easyStore.description', icon: 'store' },
    { titleKey: 'features.customize.title', descriptionKey: 'features.customize.description', icon: 'palette' },
    { titleKey: 'features.inventory.title', descriptionKey: 'features.inventory.description', icon: 'inventory' },
  ];

  const plans = [
    { planKey: 'basic', popular: false },
    { planKey: 'pro', popular: true },
    { planKey: 'advanced', popular: false },
  ];

  return (
    <div className="min-h-screen bg-white" dir={isRTL ? 'rtl' : 'ltr'}>
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`flex justify-between items-center h-14 md:h-16 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <img src="/Name_only.png" alt="StoreLaunch" className="h-8 md:h-10 w-auto object-contain" />

            <div className={`hidden md:flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <a href="#features" className="text-storelaunch-dark hover:text-storelaunch-green text-sm font-medium">
                {t('nav.features')}
              </a>
              <a href="#pricing" className="text-storelaunch-dark hover:text-storelaunch-green text-sm font-medium">
                {t('nav.pricing')}
              </a>
              <button
                onClick={toggleLanguage}
                className="px-4 py-2 bg-storelaunch-green text-white text-sm rounded-lg hover:bg-storelaunch-deep-green font-medium"
              >
                {i18n.language === 'ar' ? t('nav.english') : t('nav.arabic')}
              </button>
              <Link
                to="/register"
                className="px-4 py-2 bg-storelaunch-dark text-white text-sm rounded-lg hover:bg-storelaunch-teal font-medium"
              >
                {t('nav.getStarted')}
              </Link>
            </div>

            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 text-storelaunch-dark"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>

          {isMobileMenuOpen && (
            <div className={`md:hidden py-4 border-t border-gray-100 ${isRTL ? 'text-right' : 'text-left'}`}>
              <a href="#features" onClick={() => setIsMobileMenuOpen(false)} className="block py-2 text-storelaunch-dark hover:text-storelaunch-green font-medium">
                {t('nav.features')}
              </a>
              <a href="#pricing" onClick={() => setIsMobileMenuOpen(false)} className="block py-2 text-storelaunch-dark hover:text-storelaunch-green font-medium">
                {t('nav.pricing')}
              </a>
              <button onClick={toggleLanguage} className="w-full mt-2 px-4 py-2 bg-storelaunch-green text-white rounded-lg font-medium">
                {i18n.language === 'ar' ? t('nav.english') : t('nav.arabic')}
              </button>
              <Link to="/register" onClick={() => setIsMobileMenuOpen(false)} className="block mt-2 px-4 py-2 bg-storelaunch-dark text-white rounded-lg font-medium text-center">
                {t('nav.getStarted')}
              </Link>
            </div>
          )}
        </div>
      </nav>

      <section className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className={`grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center ${isRTL ? 'lg:grid-flow-dense' : ''}`}>
            <div className={isRTL ? 'lg:text-right' : 'lg:text-left'}>
              <h1 className={`text-3xl sm:text-4xl md:text-5xl font-bold text-storelaunch-dark mb-4 leading-tight ${isRTL ? 'text-right' : 'text-left'}`}>
                {t('hero.headline')}
              </h1>
              <p className={`text-gray-600 text-lg mb-6 max-w-xl leading-relaxed ${isRTL ? 'text-right ml-auto lg:ml-0' : 'text-left mr-auto lg:mr-0'}`}>
                {t('hero.subheadline')}
              </p>
              <div className={`flex flex-col sm:flex-row gap-3 ${isRTL ? 'sm:flex-row-reverse justify-start' : ''}`}>
                <Link to="/register" className="inline-flex justify-center px-8 py-3 bg-storelaunch-green text-white rounded-lg font-semibold hover:bg-storelaunch-deep-green w-full sm:w-auto">
                  {t('hero.ctaPrimary')}
                </Link>
              </div>
            </div>
            <div className="flex justify-center items-center">
              <img src="/Full_Logo.png" alt="StoreLaunch" className="w-80 h-130 object-contain" />
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-storelaunch-dark mb-2 text-center">
            {t('features.title')}
          </h2>
          <p className="text-gray-600 text-center mb-10 max-w-2xl mx-auto">
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {featuresList.map((feature, index) => (
              <div
                key={index}
                className={`bg-white p-6 rounded-xl border border-gray-200 shadow-sm ${isRTL ? 'text-right' : 'text-left'}`}
              >
                <div className={`w-12 h-12 rounded-lg bg-storelaunch-green/10 flex items-center justify-center mb-4 text-storelaunch-green ${isRTL ? 'ml-auto' : ''}`}>
                  {feature.icon === 'store' && (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                  )}
                  {feature.icon === 'palette' && (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                    </svg>
                  )}
                  {feature.icon === 'inventory' && (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  )}
                </div>
                <h3 className="text-lg font-bold text-storelaunch-dark mb-2">{t(feature.titleKey)}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{t(feature.descriptionKey)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-storelaunch-dark mb-2 text-center">
            {t('pricing.title')}
          </h2>
          <div className="text-center py-16">
          </div>
        </div>
      </section>

      <footer className="bg-storelaunch-dark text-white py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-lg font-bold">StoreLaunch</span>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
