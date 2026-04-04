import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../api/axios';

const CustomerRegisterPage = () => {
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
      setError(t('customerAuth.passwordMismatch'));
      return;
    }

    if (form.password.length < 8) {
      setError(t('customerAuth.weakPassword'));
      return;
    }

    const { first_name, last_name, email, phone, password } = form;
    if (!first_name?.trim() || !last_name?.trim() || !email?.trim() || !password) {
      setError(t('customerAuth.missingFields'));
      return;
    }

    setLoading(true);
    try {
      const { data } = await axiosInstance.post('/api/customers/register', {
        first_name: first_name.trim(),
        last_name: last_name.trim(),
        email: email.trim(),
        phone: phone?.trim() || null,
        password,
        preferred_lang: i18n.language,
      });

      localStorage.setItem('customer_token', data.token);
      localStorage.setItem('customer_id', String(data.customer_id));
      localStorage.setItem('user_type', 'customer');
      
      navigate('/');
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message;
      if (errorMsg === 'Email already registered') {
        setError(t('customerAuth.duplicateEmail'));
      } else if (errorMsg === 'Phone already registered') {
        setError(t('customerAuth.duplicatePhone'));
      } else if (errorMsg === 'Weak password') {
        setError(t('customerAuth.weakPassword'));
      } else if (errorMsg === 'Missing required fields') {
        setError(t('customerAuth.missingFields'));
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
          {t('customerAuth.customerRegisterTitle')}
        </h1>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <label htmlFor="first_name" className="block text-storelaunch-dark text-sm font-medium mb-1">
              {t('customerAuth.firstName')}
            </label>
            <input
              id="first_name"
              name="first_name"
              type="text"
              value={form.first_name}
              onChange={handleChange}
              placeholder={t('customerAuth.firstName')}
              required
              className={`w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-storelaunch-green focus:border-transparent ${isRTL ? 'text-right' : 'text-left'}`}
            />
          </div>
          
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <label htmlFor="last_name" className="block text-storelaunch-dark text-sm font-medium mb-1">
              {t('customerAuth.lastName')}
            </label>
            <input
              id="last_name"
              name="last_name"
              type="text"
              value={form.last_name}
              onChange={handleChange}
              placeholder={t('customerAuth.lastName')}
              required
              className={`w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-storelaunch-green focus:border-transparent ${isRTL ? 'text-right' : 'text-left'}`}
            />
          </div>
          
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <label htmlFor="email" className="block text-storelaunch-dark text-sm font-medium mb-1">
              {t('customerAuth.email')}
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder={t('customerAuth.email')}
              required
              className={`w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-storelaunch-green focus:border-transparent ${isRTL ? 'text-right' : 'text-left'}`}
            />
          </div>
          
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <label htmlFor="phone" className="block text-storelaunch-dark text-sm font-medium mb-1">
              {t('customerAuth.phone')} <span className="text-gray-500 text-xs">({isRTL ? 'اختياري' : 'optional'})</span>
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              value={form.phone}
              onChange={handleChange}
              placeholder={t('customerAuth.phone')}
              className={`w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-storelaunch-green focus:border-transparent ${isRTL ? 'text-right' : 'text-left'}`}
            />
          </div>
          
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <label htmlFor="password" className="block text-storelaunch-dark text-sm font-medium mb-1">
              {t('customerAuth.password')}
            </label>
            <input
              id="password"
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              placeholder={t('customerAuth.password')}
              required
              minLength={8}
              className={`w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-storelaunch-green focus:border-transparent ${isRTL ? 'text-right' : 'text-left'}`}
            />
            <p className={`text-xs text-gray-500 mt-1 ${isRTL ? 'text-right' : 'text-left'}`}>
              {isRTL ? 'يجب أن تكون 8 أحرف على الأقل' : 'Must be at least 8 characters'}
            </p>
          </div>
          
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <label htmlFor="confirmPassword" className="block text-storelaunch-dark text-sm font-medium mb-1">
              {t('customerAuth.confirmPassword')}
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              value={form.confirmPassword}
              onChange={handleChange}
              placeholder={t('customerAuth.confirmPassword')}
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
            {loading ? (isRTL ? 'جاري الإنشاء...' : 'Creating...') : t('customerAuth.registerButton')}
          </button>
        </form>
        
        <p className={`text-sm text-gray-600 mt-4 ${isRTL ? 'text-right' : 'text-left'}`}>
          {t('customerAuth.hasAccount')}{' '}
          <Link to="/customer/login" className="text-storelaunch-green font-medium hover:text-storelaunch-deep-green">
            {t('customerAuth.signIn')}
          </Link>
        </p>
      </div>
    </div>
  );
};

export default CustomerRegisterPage;
