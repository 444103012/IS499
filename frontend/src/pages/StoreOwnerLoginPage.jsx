/**
 * StoreOwnerLoginPage.jsx - Store Owner Login (IS498 Table 7)
 * -----------------------------------------------------------
 * EN: Page at /login. Implements Store Owner Login use case: store owner enters email and password,
 *     we call POST /api/store-owners/login. On success we save token and store_owner_id in localStorage
 *     and redirect to /dashboard (SO-002). Supports Arabic/English (IS498 Table 31 Switch Language).
 * AR: الصفحة على /login. تنفذ حالة استخدام تسجيل دخول التاجر: إدخال البريد وكلمة المرور،
 *     استدعاء POST /api/store-owners/login. عند النجاح نحفظ الرمز وstore_owner_id في localStorage
 *     ونحوّل إلى /dashboard. تدعم العربية/الإنجليزية (جدول 31 تغيير اللغة).
 */

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../api/axios';

// EN: Map backend English error keys to Arabic so Arabic UI shows Arabic messages. AR: ترجمة رسائل الخطأ للعربية عند واجهة عربية.
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

  // EN: Sync document direction (rtl/ltr) and lang attribute with selected language for accessibility. AR: مزامنة اتجاه الصفحة ولغة المستند مع اللغة المختارة.
  useEffect(() => {
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = i18n.language;
  }, [i18n.language, isRTL]);

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === 'ar' ? 'en' : 'ar');
  };

  /** EN: On form submit: validate → call login API → save token & id → redirect to dashboard, or show error. AR: عند الإرسال: التحقق ثم استدعاء API تسجيل الدخول ثم حفظ الرمز والتحويل، أو عرض الخطأ. */
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

      // EN: Save token and store_owner_id so ProtectedRoute and future API calls can use them. AR: حفظ الرمز وstore_owner_id لاستخدامهما في المسارات المحمية وطلبات API.
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
