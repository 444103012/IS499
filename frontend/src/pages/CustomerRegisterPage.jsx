

import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation, useSearchParams, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../api/axios';

const CustomerRegisterPage = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { storeSlug } = useParams(); 
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [phoneError, setPhoneError] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const isRTL = i18n.language === 'ar';


  const storeHome = storeSlug ? `/${storeSlug}/customer` : '/shop';

  useEffect(() => {
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = i18n.language;
  }, [i18n.language, isRTL]);

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === 'ar' ? 'en' : 'ar');
  };

  const getRedirectPath = () => {
    const redirectFromQuery = searchParams.get('redirectTo');
    const redirectFromState = location.state?.from || location.state?.redirectTo;
    return redirectFromQuery || redirectFromState || storeHome;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setError('');
    if (name === 'phone') {
      const trimmed = value.trim();
      if (!trimmed) {
        setPhoneError(isRTL ? 'رقم الجوال مطلوب' : 'Phone number is required');
      } else {
        const phonePattern = /^(\+?\d{8,15})$/;
        if (!phonePattern.test(trimmed)) {
          setPhoneError(isRTL ? 'صيغة رقم الجوال غير صحيحة' : 'Invalid phone number format');
        } else {
          setPhoneError('');
        }
      }
    }
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
    const trimmedFirst = first_name?.trim();
    const trimmedLast = last_name?.trim();
    const trimmedEmail = email?.trim();
    const trimmedPhone = phone?.trim();

    if (!trimmedFirst || !trimmedLast || !trimmedEmail || !trimmedPhone || !password) {
      setError(t('customerAuth.missingFields'));
      return;
    }

    const phonePattern = /^(\+?\d{8,15})$/;
    if (!phonePattern.test(trimmedPhone)) {
      setPhoneError(isRTL ? 'صيغة رقم الجوال غير صحيحة' : 'Invalid phone number format');
      return;
    } else {
      setPhoneError('');
    }

    setLoading(true);
    try {
      const { data } = await axiosInstance.post('/api/customers/register', {
        first_name: trimmedFirst,
        last_name: trimmedLast,
        email: trimmedEmail,
        phone: trimmedPhone,
        password,
        preferred_lang: i18n.language,
      });

      localStorage.setItem('customer_token', data.token);
      localStorage.setItem('customer_id', String(data.customer_id));
      localStorage.setItem('user_type', 'customer');
      
      navigate(getRedirectPath(), { replace: true });
    } catch (err) {
      if (!err.response) {
       
        setError(
          isRTL
            ? 'تعذر الاتصال بالخادم. تأكد من تشغيل الخادم (Backend) على المنفذ 5000'
            : 'Cannot reach the server. Make sure the backend is running on port 5000.'
        );
      } else {
        const errorMsg = err.response.data?.error || err.message;
        if (errorMsg === 'Email already registered') {
          setError(t('customerAuth.duplicateEmail'));
        } else if (errorMsg === 'Phone already registered') {
          setError(t('customerAuth.duplicatePhone'));
        } else if (errorMsg === 'Weak password') {
          setError(t('customerAuth.weakPassword'));
        } else if (errorMsg === 'Missing required fields') {
          setError(t('customerAuth.missingFields'));
        } else if (errorMsg === 'Invalid phone format') {
          setPhoneError(isRTL ? 'صيغة رقم الجوال غير صحيحة' : 'Invalid phone number format');
        } else if (errorMsg === 'Registration failed') {
          
          setError(
            isRTL
              ? 'حدث خطأ غير متوقع أثناء التسجيل. يرجى المحاولة لاحقاً.'
              : 'An unexpected error occurred during registration. Please try again later.'
          );
        } else {
          setError(errorMsg);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-md p-6 border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <Link to={storeHome} className={`text-storelaunch-dark text-sm font-medium hover:text-storelaunch-green ${isRTL ? 'text-right' : 'text-left'}`}>
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
              {t('customerAuth.phone')}
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
            {phoneError && (
              <p className={`text-xs text-red-600 mt-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                {phoneError}
              </p>
            )}
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
          <Link
            to={storeSlug ? `/${storeSlug}/customer/login` : '/customer/login'}
            className="text-storelaunch-green font-medium hover:text-storelaunch-deep-green"
          >
            {t('customerAuth.signIn')}
          </Link>
        </p>
      </div>
    </div>
  );
};

export default CustomerRegisterPage;
