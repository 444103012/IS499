import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../api/axios';
import { validateRegisterForm, mapRegisterApiError } from '../validation/register';
import RegisterPasswordBlock from '../components/register/RegisterPasswordBlock';
import RegisterFieldGroup from '../components/register/RegisterFieldGroup';

const NS = 'auth';

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
  const [fieldErrors, setFieldErrors] = useState({});
  const [bannerKey, setBannerKey] = useState('');
  const [bannerDevDetail, setBannerDevDetail] = useState('');
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [multiErrorSummary, setMultiErrorSummary] = useState(false);
  const [loading, setLoading] = useState(false);
  const isRTL = i18n.language === 'ar';
  const focusFieldRef = useRef(null);

  useEffect(() => {
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = i18n.language;
  }, [i18n.language, isRTL]);

  useLayoutEffect(() => {
    const id = focusFieldRef.current;
    if (!id) return;
    focusFieldRef.current = null;
    requestAnimationFrame(() => {
      const el = document.getElementById(id);
      if (!el) return;
      el.focus({ preventScroll: true });
      el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    });
  }, [fieldErrors]);

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === 'ar' ? 'en' : 'ar');
  };

  const clearFieldError = (name) => {
    setFieldErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
    setBannerKey('');
    setBannerDevDetail('');
    setMultiErrorSummary(false);
  };

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    clearFieldError(e.target.name);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBannerKey('');
    setBannerDevDetail('');
    setFieldErrors({});
    setSubmitAttempted(false);
    setMultiErrorSummary(false);

    const { fieldErrors: nextFieldErrors, firstInvalidField } = validateRegisterForm(form, NS);
    if (firstInvalidField) {
      focusFieldRef.current = firstInvalidField;
      setFieldErrors(nextFieldErrors);
      setSubmitAttempted(true);
      setMultiErrorSummary(Object.keys(nextFieldErrors).length > 1);
      return;
    }

    const { first_name, last_name, email, phone, password } = form;
    const trimmedFirstName = first_name.trim();
    const trimmedLastName = last_name.trim();
    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();

    setLoading(true);
    try {
      const { data } = await axiosInstance.post('/api/store-owners/register', {
        first_name: trimmedFirstName,
        last_name: trimmedLastName,
        email: trimmedEmail,
        phone: trimmedPhone,
        password,
      });

      localStorage.setItem('token', data.token);
      localStorage.setItem('store_owner_id', String(data.store_owner_id));
      navigate('/store-setup');
    } catch (err) {
      if (!err.response) {
        setBannerKey(`${NS}.registerApi.NETWORK_ERROR`);
        setBannerDevDetail('');
        return;
      }
      const errorMsg = err.response.data?.error || err.message;
      const detail = err.response.data?.detail;
      setBannerKey(mapRegisterApiError(errorMsg, NS));
      setBannerDevDetail(process.env.NODE_ENV === 'development' && detail ? String(detail) : '');
    } finally {
      setLoading(false);
    }
  };

  const fieldError = (name) => fieldErrors[name];

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-md p-6 border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <Link to="/" className={`text-storelaunch-dark text-sm font-medium ${isRTL ? 'text-right' : 'text-left'}`}>
            {isRTL ? '← ' : ''}
            {t('auth.backToHome')}
            {isRTL ? '' : ' →'}
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
        <form noValidate onSubmit={handleSubmit} className="space-y-4">
          <RegisterFieldGroup
            fieldId="first_name"
            name="first_name"
            value={form.first_name}
            onChange={handleChange}
            labelKey="auth.firstName"
            errorKey={fieldError('first_name')}
            autoComplete="given-name"
            alignClass={isRTL ? 'text-right' : 'text-left'}
          />
          <RegisterFieldGroup
            fieldId="last_name"
            name="last_name"
            value={form.last_name}
            onChange={handleChange}
            labelKey="auth.lastName"
            errorKey={fieldError('last_name')}
            autoComplete="family-name"
            alignClass={isRTL ? 'text-right' : 'text-left'}
          />
          <RegisterFieldGroup
            fieldId="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            labelKey="auth.email"
            errorKey={fieldError('email')}
            type="text"
            inputMode="email"
            autoComplete="email"
            alignClass={isRTL ? 'text-right' : 'text-left'}
          />
          <RegisterFieldGroup
            fieldId="phone"
            name="phone"
            value={form.phone}
            onChange={handleChange}
            labelKey="auth.phone"
            errorKey={fieldError('phone')}
            type="tel"
            autoComplete="tel"
            alignClass={isRTL ? 'text-right' : 'text-left'}
          />

          <RegisterPasswordBlock
            ns={NS}
            password={form.password}
            confirmPassword={form.confirmPassword}
            onFieldChange={handleChange}
            fieldErrors={fieldErrors}
            submitAttempted={submitAttempted}
            isRTL={isRTL}
          />

          {multiErrorSummary && (
            <p
              className={`text-sm text-amber-900 bg-amber-50 border border-amber-100 rounded-md px-3 py-2 ${isRTL ? 'text-right' : 'text-left'}`}
              role="status"
            >
              {t(`${NS}.validation.multiErrorSummary`)}
            </p>
          )}

          {bannerKey && (
            <div className={`p-3 bg-red-50 border border-red-200 rounded-md ${isRTL ? 'text-right' : 'text-left'}`}>
              <p className="text-sm text-red-600" role="alert">
                {t(bannerKey)}
                {bannerDevDetail ? ` (${bannerDevDetail})` : ''}
              </p>
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full p-2 bg-storelaunch-green text-white rounded-md font-medium disabled:opacity-70"
          >
            {loading ? t('auth.creating') : t('auth.registerButton')}
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
