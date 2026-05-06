

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import CurrencyAmount from '../components/common/CurrencyAmount';
import { getPublicPlans } from '../services/platformPlansApi';

const LandingPage = () => {
  const { t, i18n } = useTranslation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [billingPeriod, setBillingPeriod] = useState('monthly');
  const [plans, setPlans] = useState([]);
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

  useEffect(() => {
    if (!isMobileMenuOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMobileMenuOpen]);

  
  const featuresList = [
    { titleKey: 'features.easyStore.title', descriptionKey: 'features.easyStore.description', icon: 'store' },
    { titleKey: 'features.customize.title', descriptionKey: 'features.customize.description', icon: 'palette' },
    { titleKey: 'features.inventory.title', descriptionKey: 'features.inventory.description', icon: 'inventory' },
  ];

  useEffect(() => {
    let active = true;
    getPublicPlans()
      .then((rows) => {
        if (!active) return;
        setPlans(Array.isArray(rows) ? rows : []);
      })
      .catch(() => {
        if (!active) return;
        setPlans([]);
      });
    return () => {
      active = false;
    };
  }, []);

  const plansForUi = plans.length > 0
    ? plans
    : [{ planId: 'basic', name: 'Basic', price: 0, features: [] }, { planId: 'pro', name: 'Pro', price: 69, features: [] }, { planId: 'advanced', name: 'Advanced', price: 199, features: [] }];

  return (
    <div className="min-h-screen bg-white" dir={isRTL ? 'rtl' : 'ltr'}>
      {}
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
                to="/login"
                className="px-4 py-2 bg-storelaunch-dark text-white text-sm rounded-lg hover:bg-storelaunch-teal font-medium"
              >
                {t('nav.login')}
              </Link>
            </div>

            {}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg p-2 text-storelaunch-dark transition-colors hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-storelaunch-green focus-visible:ring-offset-2"
              aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-navigation"
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

          {}
          {isMobileMenuOpen && (
            <div className="md:hidden fixed inset-0 z-50">
              <button
                type="button"
                className="absolute inset-0 bg-storelaunch-dark/40"
                aria-label="Close menu backdrop"
                onClick={() => setIsMobileMenuOpen(false)}
              />
              <div
                id="mobile-navigation"
                role="dialog"
                aria-modal="true"
                className={`relative mt-14 max-h-[calc(100dvh-3.5rem)] overflow-y-auto rounded-b-2xl border-t border-gray-100 bg-white px-4 pb-6 pt-4 shadow-xl sm:mt-16 sm:max-h-[calc(100dvh-4rem)] sm:px-6 ${isRTL ? 'text-right' : 'text-left'}`}
              >
                <a
                  href="#features"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex min-h-[44px] items-center rounded-lg px-2 text-storelaunch-dark transition-colors hover:bg-gray-50 hover:text-storelaunch-green focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-storelaunch-green focus-visible:ring-offset-2 font-medium"
                >
                  {t('nav.features')}
                </a>
                <a
                  href="#pricing"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="mt-1 flex min-h-[44px] items-center rounded-lg px-2 text-storelaunch-dark transition-colors hover:bg-gray-50 hover:text-storelaunch-green focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-storelaunch-green focus-visible:ring-offset-2 font-medium"
                >
                  {t('nav.pricing')}
                </a>
                <button
                  onClick={toggleLanguage}
                  className="mt-3 inline-flex min-h-[44px] w-full items-center justify-center rounded-lg bg-storelaunch-green px-4 py-2 font-medium text-white transition-colors hover:bg-storelaunch-deep-green focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-storelaunch-green focus-visible:ring-offset-2"
                  aria-label="Toggle language"
                >
                  {i18n.language === 'ar' ? t('nav.english') : t('nav.arabic')}
                </button>
                <Link
                  to="/login"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="mt-2 inline-flex min-h-[44px] w-full items-center justify-center rounded-lg bg-storelaunch-dark px-4 py-2 text-center font-medium text-white transition-colors hover:bg-storelaunch-teal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-storelaunch-green focus-visible:ring-offset-2"
                >
                  {t('nav.login')}
                </Link>
              </div>
            </div>
          )}
        </div>
      </nav>

      {}
      <section className="py-10 sm:py-16 md:py-20 px-4 sm:px-6 lg:px-8 bg-white overflow-x-hidden">
        <div className="max-w-6xl mx-auto">
          <div className={`grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center ${isRTL ? 'lg:grid-flow-dense' : ''}`}>
            <div className={`${isRTL ? 'lg:text-right' : 'lg:text-left'} order-2 lg:order-1`}>
              <h1 className={`text-[1.75rem] leading-[1.25] sm:text-4xl md:text-5xl font-bold text-storelaunch-dark mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                {t('hero.headline')}
              </h1>
              <p className={`text-gray-600 text-base sm:text-lg mb-6 max-w-[34ch] sm:max-w-xl leading-7 sm:leading-relaxed ${isRTL ? 'text-right ml-auto lg:ml-0' : 'text-left mr-auto lg:mr-0'}`}>
                {t('hero.subheadline')}
              </p>
              <div className={`flex flex-col sm:flex-row gap-3 ${isRTL ? 'sm:flex-row-reverse justify-start' : ''}`}>
                <Link to="/register" className="inline-flex min-h-[44px] w-full sm:w-auto justify-center px-6 sm:px-8 py-3 bg-storelaunch-green text-white rounded-lg font-semibold hover:bg-storelaunch-deep-green focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-storelaunch-green focus-visible:ring-offset-2">
                  {t('hero.ctaPrimary')}
                </Link>
              </div>
            </div>
            <div className="flex justify-center items-center order-1 lg:order-2 mb-2 sm:mb-4 lg:mb-0">
              <img src="/Full_Logo.png" alt="StoreLaunch" className="w-full max-w-[260px] sm:max-w-xs md:max-w-sm h-auto object-contain" />
            </div>
          </div>
        </div>
      </section>

      {}
      <section id="features" className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 lg:px-8 bg-gray-50 overflow-x-hidden">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-storelaunch-dark mb-2 text-center">
            {t('features.title')}
          </h2>
          <p className="text-gray-600 text-center mb-8 sm:mb-10 max-w-2xl mx-auto leading-7">
            {t('features.subtitle')}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
            {featuresList.map((feature, index) => (
              <div
                key={index}
                className={`bg-white p-5 sm:p-6 rounded-xl border border-gray-200 shadow-sm ${isRTL ? 'text-right' : 'text-left'}`}
              >
                <div className={`w-12 h-12 rounded-lg bg-storelaunch-green/10 flex items-center justify-center mb-3 sm:mb-4 text-storelaunch-green ${isRTL ? 'ml-auto' : ''}`}>
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
                <h3 className="text-lg font-bold text-storelaunch-dark mb-2 leading-snug">{t(feature.titleKey)}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{t(feature.descriptionKey)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {}
      <section id="pricing" className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 lg:px-8 bg-white overflow-x-hidden">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-storelaunch-dark mb-2 text-center">
            {t('pricing.title')}
          </h2>
          <p className="text-gray-600 text-center mb-6 sm:mb-8 leading-7">
            {t('pricing.subtitle')}
          </p>

          {}
          <div className={`flex items-center justify-center gap-2 sm:gap-3 mb-8 sm:mb-10 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <span className={`text-sm font-medium px-1 ${billingPeriod === 'monthly' ? 'text-storelaunch-dark' : 'text-gray-500'}`}>
              {t('pricing.monthly')}
            </span>
            <button
              type="button"
              onClick={() => setBillingPeriod(billingPeriod === 'monthly' ? 'yearly' : 'monthly')}
              className={`relative inline-flex h-9 w-16 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-storelaunch-green focus-visible:ring-offset-2 ${billingPeriod === 'monthly' ? 'bg-storelaunch-green' : 'bg-gray-300'}`}
              aria-label="Toggle billing period"
              aria-pressed={billingPeriod === 'yearly'}
            >
              <span
                className={`inline-block h-7 w-7 rounded-full bg-white shadow transition-transform ${billingPeriod === 'monthly' ? (isRTL ? 'translate-x-8' : 'translate-x-1') : (isRTL ? 'translate-x-1' : 'translate-x-8')}`}
              />
            </button>
            <span className={`text-sm font-medium px-1 ${billingPeriod === 'yearly' ? 'text-storelaunch-dark' : 'text-gray-500'}`}>
              {t('pricing.yearly')}
            </span>
            {billingPeriod === 'yearly' && (
              <span className="text-storelaunch-green text-xs font-semibold px-2 py-1 bg-storelaunch-green/10 rounded-full">
                {t('pricing.save')}
              </span>
            )}
          </div>

          {}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            {plansForUi.map((plan, index) => {
              const planKey = plan.planId || plan.slug || 'basic';
              const planData = t(`pricing.plans.${planKey}`, { returnObjects: true });
              const price = billingPeriod === 'monthly'
                ? Number(plan.price || 0)
                : (planKey === 'basic' ? Number(plan.price || 0) : Number((plan.price || 0) * 12));
              const period = billingPeriod === 'monthly'
                ? (isRTL ? '/شهر' : '/month')
                : (planKey === 'basic' ? '' : (isRTL ? '/سنة' : '/year'));
              const features = Array.isArray(plan.features) && plan.features.length > 0
                ? plan.features
                : Object.values(planData.features || {});

              return (
                <div
                  key={index}
                  className="relative bg-white rounded-xl border border-gray-200 p-5 sm:p-6 shadow-md"
                >
                  <h3 className={`text-xl font-bold text-storelaunch-dark mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {plan.name || planData.name || planKey}
                  </h3>
                  <p className={`text-gray-600 text-sm mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>{planData.description || ''}</p>
                  <div className={`mb-5 ${isRTL ? 'text-right' : 'text-left'}`}>
                    <span className="text-3xl font-bold text-storelaunch-dark">
                      <CurrencyAmount value={price} isRTL={isRTL} size="xl" />
                    </span>
                    <span className="text-gray-600 ml-1">{period}</span>
                  </div>
                  <ul className={`space-y-2.5 mb-6 min-h-[180px] ${isRTL ? 'text-right' : 'text-left'}`}>
                    {features.map((feature, idx) => (
                      <li key={idx} className={`flex items-start gap-2 text-sm text-gray-700 leading-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <svg className="w-4 h-4 text-storelaunch-green flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    to="/register"
                    className="block w-full min-h-[44px] py-3 rounded-lg font-semibold text-sm text-center bg-storelaunch-dark text-white hover:bg-storelaunch-teal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-storelaunch-green focus-visible:ring-offset-2"
                  >
                    {planKey === 'advanced' ? t('nav.getStarted') : (planData.cta || t('hero.ctaPrimary'))}
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {}
      <footer className="bg-storelaunch-dark text-white py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 text-center sm:text-left">
          <span className="text-lg font-bold leading-none">StoreLaunch</span>
          <p className="text-gray-300 text-sm leading-relaxed">StoreLaunch </p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
