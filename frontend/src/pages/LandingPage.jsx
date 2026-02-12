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
      {/* Navbar */}
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

      {/* Hero Section */}
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
                <Link to="/register" className="inline-flex justify-center px-6 py-3 bg-storelaunch-green text-white rounded-lg font-semibold hover:bg-storelaunch-deep-green">
                  {t('hero.ctaPrimary')}
                </Link>
                <a href="#features" className="inline-flex justify-center px-6 py-3 bg-white text-storelaunch-dark border-2 border-storelaunch-dark rounded-lg font-semibold hover:bg-storelaunch-dark hover:text-white">
                  {t('hero.ctaSecondary')}
                </a>
              </div>
            </div>
            <div className="flex justify-center items-center">
              <img src="/Full_Logo.png" alt="StoreLaunch" className="w-80 h-130 object-contain" />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section - 3 features only */}
      <section id="features" className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-storelaunch-dark mb-2 text-center">
            {t('features.title')}
          </h2>
          <p className="text-gray-600 text-center mb-10 max-w-2xl mx-auto">
            {t('features.subtitle')}
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

      {/* Pricing Section - 3 plans */}
      <section id="pricing" className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-storelaunch-dark mb-2 text-center">
            {t('pricing.title')}
          </h2>
          <p className="text-gray-600 text-center mb-6">
            {t('pricing.subtitle')}
          </p>

          <div className={`flex items-center justify-center gap-3 mb-10 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <span className={`text-sm font-medium ${billingPeriod === 'monthly' ? 'text-storelaunch-dark' : 'text-gray-500'}`}>
              {t('pricing.monthly')}
            </span>
            <button
              type="button"
              onClick={() => setBillingPeriod(billingPeriod === 'monthly' ? 'yearly' : 'monthly')}
              className={`relative inline-flex h-8 w-14 items-center rounded-full ${billingPeriod === 'monthly' ? 'bg-storelaunch-green' : 'bg-gray-300'}`}
            >
              <span
                className={`inline-block h-6 w-6 rounded-full bg-white shadow ${billingPeriod === 'monthly' ? (isRTL ? 'translate-x-8' : 'translate-x-1') : (isRTL ? 'translate-x-1' : 'translate-x-8')}`}
              />
            </button>
            <span className={`text-sm font-medium ${billingPeriod === 'yearly' ? 'text-storelaunch-dark' : 'text-gray-500'}`}>
              {t('pricing.yearly')}
            </span>
            {billingPeriod === 'yearly' && (
              <span className="text-storelaunch-green text-xs font-semibold px-2 py-1 bg-storelaunch-green/10 rounded-full">
                {t('pricing.save')}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {plans.map((plan, index) => {
              const planData = t(`pricing.plans.${plan.planKey}`, { returnObjects: true });
              const price = billingPeriod === 'monthly'
                ? (isRTL ? planData.priceAr : planData.price)
                : (plan.planKey === 'basic' ? (isRTL ? planData.priceAr : planData.price) : (isRTL ? planData.priceYearlyAr : planData.priceYearly));
              const period = billingPeriod === 'monthly'
                ? (isRTL ? '/شهر' : '/month')
                : (plan.planKey === 'basic' ? '' : (isRTL ? '/سنة' : '/year'));
              const features = Object.values(planData.features || {});

              return (
                <div
                  key={index}
                  className={`relative bg-white rounded-xl border p-6 shadow-md ${
                    plan.popular ? 'border-storelaunch-green border-2 ring-2 ring-storelaunch-green/20' : 'border-gray-200'
                  }`}
                >
                  <h3 className={`text-xl font-bold text-storelaunch-dark mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {planData.name}
                  </h3>
                  <p className={`text-gray-600 text-sm mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>{planData.description}</p>
                  <div className={`mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                    <span className="text-3xl font-bold text-storelaunch-dark">{price}</span>
                    <span className="text-gray-600 ml-1">{planData.currency}{period}</span>
                  </div>
                  <ul className={`space-y-2 mb-6 min-h-[180px] ${isRTL ? 'text-right' : 'text-left'}`}>
                    {features.map((feature, idx) => (
                      <li key={idx} className={`flex items-start gap-2 text-sm text-gray-700 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <svg className="w-4 h-4 text-storelaunch-green flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    to="/register"
                    className={`block w-full py-3 rounded-lg font-semibold text-sm text-center ${
                      plan.popular ? 'bg-storelaunch-green text-white hover:bg-storelaunch-deep-green' : 'bg-storelaunch-dark text-white hover:bg-storelaunch-teal'
                    }`}
                  >
                    {plan.planKey === 'advanced' ? t('nav.getStarted') : planData.cta}
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Footer - simple */}
      <footer className="bg-storelaunch-dark text-white py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-lg font-bold">StoreLaunch</span>
          <p className="text-gray-300 text-sm">© StoreLaunch 2025</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
