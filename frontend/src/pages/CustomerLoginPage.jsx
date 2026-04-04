import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../api/axios';

const CustomerLoginPage = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const isRTL = i18n.language === 'ar';

  useEffect(() => {
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = i18n.language;
  }, [i18n.language, isRTL]);

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === 'ar' ? 'en' : 'ar');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!emailOrPhone?.trim() || !password) {
      setError(t('customerAuth.missingFields'));
      return;
    }

    setLoading(true);
    try {
      const { data } = await axiosInstance.post('/api/customers/login', {
        emailOrPhone: emailOrPhone.trim(),
        password,
      });

      localStorage.setItem('customer_token', data.token);
      localStorage.setItem('customer_id', String(data.customer_id));
      localStorage.setItem('user_type', 'customer');
      
      if (data.customer?.preferred_lang) {
        i18n.changeLanguage(data.customer.preferred_lang);
      }
      
      navigate('/');
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message;
      if (errorMsg === 'Invalid credentials') {
        setError(t('customerAuth.invalidCredentials'));
      } else if (errorMsg === 'Account suspended') {
        setError(t('customerAuth.accountSuspended'));
      } else if (errorMsg === 'Missing required fields') {
        setError(t('customerAuth.missingFields'));
      } else if (errorMsg === 'NetworkError') {
        setError(isRTL ? 'تعذر الاتصال بالخادم. تأكد من تشغيل الخادم (Backend) على المنفذ 5000' : 'Cannot reach the server. Make sure the backend is running on port 5000.');
      } else {
        setError(isRTL ? 'حدث خطأ. يرجى المحاولة لاحقاً' : 'An error occurred. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-md p-6 border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <Link to="/shop" className={`text-storelaunch-dark text-sm font-medium hover:text-storelaunch-green ${isRTL ? 'text-right' : 'text-left'}`}>
            {isRTL ? '← ' : ''}{t('customerAuth.backToHome')}{isRTL ? '' : ' →'}
          </Link>
          <button
            type="button"
            onClick={toggleLanguage}
            className="px-3 py-1.5 bg-storelaunch-green text-white text-sm rounded-md hover:bg-storelaunch-deep-green font-medium transition-colors"
          >
            {i18n.language === 'ar' ? t('customerAuth.switchToEnglish') : t('customerAuth.switchToArabic')}
          </button>
        </div>
        
        <h1 className={`text-storelaunch-dark text-xl font-bold mb-6 ${isRTL ? 'text-right' : 'text-left'}`}>
          {t('customerAuth.customerLoginTitle')}
        </h1>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <label htmlFor="emailOrPhone" className="block text-storelaunch-dark text-sm font-medium mb-1">
              {t('customerAuth.emailOrPhone')}
            </label>
            <input
              id="emailOrPhone"
              type="text"
              value={emailOrPhone}
              onChange={(e) => { setEmailOrPhone(e.target.value); setError(''); }}
              placeholder={t('customerAuth.emailOrPhone')}
              required
              className={`w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-storelaunch-green focus:border-transparent ${isRTL ? 'text-right' : 'text-left'}`}
            />
          </div>
          
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <label htmlFor="password" className="block text-storelaunch-dark text-sm font-medium mb-1">
              {t('customerAuth.password')}
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              placeholder={t('customerAuth.password')}
              required
              className={`w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-storelaunch-green focus:border-transparent ${isRTL ? 'text-right' : 'text-left'}`}
            />
          </div>
          
          {error && (
            <div className={`p-3 bg-red-50 border border-red-200 rounded-md ${isRTL ? 'text-right' : 'text-left'}`}>
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
          
          <button
            type="submit"
            disabled={loading}
            className="w-full p-3 bg-storelaunch-green text-white rounded-md font-medium hover:bg-storelaunch-deep-green disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (isRTL ? 'جاري تسجيل الدخول...' : 'Signing in...') : t('customerAuth.loginButton')}
          </button>
        </form>
        
        <p className={`text-sm text-gray-600 mt-4 ${isRTL ? 'text-right' : 'text-left'}`}>
          {t('customerAuth.noAccount')}{' '}
          <Link to="/customer/register" className="text-storelaunch-green font-medium hover:text-storelaunch-deep-green">
            {t('customerAuth.createAccount')}
          </Link>
        </p>
      </div>
    </div>
  );
};

export default CustomerLoginPage;
