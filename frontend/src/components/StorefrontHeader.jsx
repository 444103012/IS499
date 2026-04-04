import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const StorefrontHeader = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const isRTL = i18n.language === 'ar';

  const toggleLanguage = () => {
    const newLang = i18n.language === 'ar' ? 'en' : 'ar';
    i18n.changeLanguage(newLang);
    document.documentElement.dir = newLang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = newLang;
  };

  const isCustomerLoggedIn = () => {
    return !!localStorage.getItem('customer_token');
  };

  const handleLogout = () => {
    localStorage.removeItem('customer_token');
    localStorage.removeItem('customer_id');
    localStorage.removeItem('user_type');
    navigate('/');
    setIsMobileMenuOpen(false);
  };

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`flex justify-between items-center h-14 md:h-16 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <Link to="/shop" className="flex items-center">
            <img src="/Name_only.png" alt="StoreLaunch" className="h-8 md:h-10 w-auto object-contain" />
          </Link>

          <div className={`hidden md:flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Link
              to="/shop"
              className="text-storelaunch-dark hover:text-storelaunch-green text-sm font-medium transition-colors"
            >
              {t('storefront.title')}
            </Link>

            <button
              onClick={toggleLanguage}
              className="px-4 py-2 bg-storelaunch-green text-white text-sm rounded-lg hover:bg-storelaunch-deep-green font-medium transition-colors"
            >
              {i18n.language === 'ar' ? t('nav.english') : t('nav.arabic')}
            </button>

            {isCustomerLoggedIn() ? (
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-storelaunch-dark text-white text-sm rounded-lg hover:bg-storelaunch-teal font-medium transition-colors"
              >
                {isRTL ? 'تسجيل الخروج' : 'Logout'}
              </button>
            ) : (
              <>
                <Link
                  to="/customer/login"
                  className="text-storelaunch-dark hover:text-storelaunch-green text-sm font-medium transition-colors"
                >
                  {isRTL ? 'تسجيل الدخول' : 'Login'}
                </Link>
                <Link
                  to="/customer/register"
                  className="px-4 py-2 bg-storelaunch-dark text-white text-sm rounded-lg hover:bg-storelaunch-teal font-medium transition-colors"
                >
                  {isRTL ? 'إنشاء حساب' : 'Sign Up'}
                </Link>
              </>
            )}
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
            <Link
              to="/shop"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block py-2 text-storelaunch-dark hover:text-storelaunch-green font-medium"
            >
              {t('storefront.title')}
            </Link>

            <button
              onClick={toggleLanguage}
              className="w-full mt-2 px-4 py-2 bg-storelaunch-green text-white rounded-lg font-medium hover:bg-storelaunch-deep-green transition-colors"
            >
              {i18n.language === 'ar' ? t('nav.english') : t('nav.arabic')}
            </button>

            {isCustomerLoggedIn() ? (
              <button
                onClick={handleLogout}
                className="w-full mt-2 px-4 py-2 bg-storelaunch-dark text-white rounded-lg font-medium hover:bg-storelaunch-teal transition-colors"
              >
                {isRTL ? 'تسجيل الخروج' : 'Logout'}
              </button>
            ) : (
              <>
                <Link
                  to="/customer/login"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block mt-2 px-4 py-2 bg-white text-storelaunch-dark border-2 border-storelaunch-dark rounded-lg font-medium text-center hover:bg-storelaunch-dark hover:text-white transition-colors"
                >
                  {isRTL ? 'تسجيل الدخول' : 'Login'}
                </Link>
                <Link
                  to="/customer/register"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block mt-2 px-4 py-2 bg-storelaunch-dark text-white rounded-lg font-medium text-center hover:bg-storelaunch-teal transition-colors"
                >
                  {isRTL ? 'إنشاء حساب' : 'Sign Up'}
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};

export default StorefrontHeader;
