import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../api/axios';

const ERROR_MESSAGES_AR = {
  'Missing required fields': 'يرجى تعبئة جميع الحقول المطلوبة',
  'Email already registered': 'البريد الإلكتروني مسجل مسبقاً',
  'Registration failed': 'فشل إنشاء الحساب. يرجى المحاولة لاحقاً',
  'NetworkError': 'تعذر الاتصال بالخادم. تأكد من تشغيل الخادم (Backend) على المنفذ 5000',
};

const getErrorMessageAr = (message) => ERROR_MESSAGES_AR[message] || message || 'حدث خطأ. يرجى المحاولة لاحقاً';

const StoreOwnerRegisterPage = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
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

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      setError(t('auth.passwordMismatch'));
      return;
    }

    const { first_name, last_name, email, phone, password } = form;
    if (!first_name?.trim() || !last_name?.trim() || !email?.trim() || !phone?.trim() || !password) {
      setError(isRTL ? 'يرجى تعبئة جميع الحقول المطلوبة' : 'Please fill all required fields');
      return;
    }

    setLoading(true);
    try {
      const { data } = await axiosInstance.post('/api/store-owners/register', {
        first_name: first_name.trim(),
        last_name: last_name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password,
      });

      localStorage.setItem('token', data.token);
      localStorage.setItem('store_owner_id', String(data.store_owner_id));
      navigate('/dashboard');
    } catch (err) {
      const data = err.response?.data;
      const msg = data?.error || err.message;
      const detail = data?.detail;
      setError(detail ? `${getErrorMessageAr(msg)} (${detail})` : getErrorMessageAr(msg));
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
          {t('auth.registerTitle')}
        </h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <label htmlFor="first_name" className="block text-storelaunch-dark text-sm font-medium mb-1">
              {t('auth.firstName')}
            </label>
            <input
              id="first_name"
              name="first_name"
              type="text"
              value={form.first_name}
              onChange={handleChange}
              placeholder={t('auth.firstName')}
              required
              className={`w-full p-2 border border-gray-300 rounded-md ${isRTL ? 'text-right' : 'text-left'}`}
            />
          </div>
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <label htmlFor="last_name" className="block text-storelaunch-dark text-sm font-medium mb-1">
              {t('auth.lastName')}
            </label>
            <input
              id="last_name"
              name="last_name"
              type="text"
              value={form.last_name}
              onChange={handleChange}
              placeholder={t('auth.lastName')}
              required
              className={`w-full p-2 border border-gray-300 rounded-md ${isRTL ? 'text-right' : 'text-left'}`}
            />
          </div>
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <label htmlFor="email" className="block text-storelaunch-dark text-sm font-medium mb-1">
              {t('auth.email')}
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder={t('auth.email')}
              required
              className={`w-full p-2 border border-gray-300 rounded-md ${isRTL ? 'text-right' : 'text-left'}`}
            />
          </div>
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <label htmlFor="phone" className="block text-storelaunch-dark text-sm font-medium mb-1">
              {t('auth.phone')}
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              value={form.phone}
              onChange={handleChange}
              placeholder={t('auth.phone')}
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
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              placeholder={t('auth.password')}
              required
              className={`w-full p-2 border border-gray-300 rounded-md ${isRTL ? 'text-right' : 'text-left'}`}
            />
          </div>
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <label htmlFor="confirmPassword" className="block text-storelaunch-dark text-sm font-medium mb-1">
              {t('auth.confirmPassword')}
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              value={form.confirmPassword}
              onChange={handleChange}
              placeholder={t('auth.confirmPassword')}
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
            {loading ? (isRTL ? 'جاري الإنشاء...' : 'Creating...') : t('auth.registerButton')}
          </button>
        </form>
        <p className={`text-sm text-gray-600 mt-4 ${isRTL ? 'text-right' : 'text-left'}`}>
          {t('auth.hasAccount')}{' '}
          <Link to="/login" className="text-storelaunch-green font-medium">
            {t('auth.signIn')}
          </Link>
        </p>
      </div>
    </div>
  );
};

export default StoreOwnerRegisterPage;
