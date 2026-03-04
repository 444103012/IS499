import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../api/axios';

const ERROR_MESSAGES_AR = {
  'Invalid email or password': 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
  'Missing required fields': 'يرجى إدخال البريد الإلكتروني وكلمة المرور',
  'Login failed': 'فشل تسجيل الدخول. يرجى المحاولة لاحقاً',
  'NetworkError': 'تعذر الاتصال بالخادم. تأكد من تشغيل الخادم (Backend) على المنفذ 5000',
};

const getErrorMessageAr = (message) => ERROR_MESSAGES_AR[message] || message || 'حدث خطأ. يرجى المحاولة لاحقاً';

const StoreOwnerLoginPage = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
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

    if (!email?.trim() || !password) {
      setError(isRTL ? 'يرجى إدخال البريد الإلكتروني وكلمة المرور' : 'Please enter email and password');
      return;
    }

    setLoading(true);
    try {
      const { data } = await axiosInstance.post('/api/store-owners/login', {
        email: email.trim(),
        password,
      });

      localStorage.setItem('token', data.token);
      localStorage.setItem('store_owner_id', String(data.store_owner_id));
      navigate('/dashboard');
    } catch (err) {
      const msg = err.response?.data?.error || err.message;
      setError(getErrorMessageAr(msg));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-md p-6 border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <Link to="/" className={`text-storelaunch-dark text-sm font-medium ${isRTL ? 'text-right' : 'text-left'}`}>
            {isRTL ? '← ' : ''}{t('auth.backToHome')}{isRTL ? '' : ' →'}
          </Link>
          <button
            type="button"
            onClick={toggleLanguage}
            className="px-3 py-1.5 bg-storelaunch-green text-white text-sm rounded-md font-medium"
          >
            {i18n.language === 'ar' ? t('auth.switchToEnglish') : t('auth.switchToArabic')}
          </button>
        </div>
        <h1 className={`text-storelaunch-dark text-xl font-bold mb-6 ${isRTL ? 'text-right' : 'text-left'}`}>
          {t('auth.loginTitle')}
        </h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <label htmlFor="email" className="block text-storelaunch-dark text-sm font-medium mb-1">
              {t('auth.email')}
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(''); }}
              placeholder={t('auth.email')}
              required
              className={`w-full p-2 border border-gray-300 rounded-md ${isRTL ? 'text-right' : 'text-left'}`}
            />
          </div>
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <label htmlFor="password" className="block text-storelaunch-dark text-sm font-medium mb-1">
              {t('auth.password')}
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              placeholder={t('auth.password')}
              required
              className={`w-full p-2 border border-gray-300 rounded-md ${isRTL ? 'text-right' : 'text-left'}`}
            />
          </div>
          {error && (
            <p className={`text-sm text-red-600 ${isRTL ? 'text-right' : 'text-left'}`}>{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full p-2 bg-storelaunch-green text-white rounded-md font-medium disabled:opacity-70"
          >
            {loading ? (isRTL ? 'جاري تسجيل الدخول...' : 'Signing in...') : t('auth.loginButton')}
          </button>
        </form>
        <p className={`text-sm text-gray-600 mt-4 ${isRTL ? 'text-right' : 'text-left'}`}>
          {t('auth.noAccount')}{' '}
          <Link to="/register" className="text-storelaunch-green font-medium">
            {t('auth.createAccount')}
          </Link>
        </p>
      </div>
    </div>
  );
};

export default StoreOwnerLoginPage;
