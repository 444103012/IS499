import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { Link, useNavigate, useLocation, useSearchParams, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../api/axios';
import { buildStorefrontPath } from '../utils/storefrontRoutes';
import { validateRegisterForm, mapRegisterApiError } from '../validation/register';
import RegisterPasswordBlock from '../components/register/RegisterPasswordBlock';
import RegisterFieldGroup from '../components/register/RegisterFieldGroup';

const NS = 'customerAuth';

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
  const [fieldErrors, setFieldErrors] = useState({});
  const [bannerKey, setBannerKey] = useState('');
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [multiErrorSummary, setMultiErrorSummary] = useState(false);
  const [loading, setLoading] = useState(false);
  const isRTL = i18n.language === 'ar';
  const focusFieldRef = useRef(null);

  const storeHome = storeSlug ? buildStorefrontPath(storeSlug) : '/';

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

  const getRedirectPath = () => {
    const redirectFromQuery = searchParams.get('redirectTo');
    const redirectFromState = location.state?.from || location.state?.redirectTo;
    return redirectFromQuery || redirectFromState || storeHome;
  };

  const clearFieldError = (name) => {
    setFieldErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
    setBannerKey('');
    setMultiErrorSummary(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    clearFieldError(name);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBannerKey('');
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
    const trimmedFirst = first_name.trim();
    const trimmedLast = last_name.trim();
    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();

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
        setBannerKey(`${NS}.registerApi.NETWORK_ERROR`);
        return;
      }
      const errorMsg = err.response.data?.error || err.message;
      setBannerKey(mapRegisterApiError(errorMsg, NS));
    } finally {
      setLoading(false);
    }
  };

  const fieldError = (name) => fieldErrors[name];

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-md p-6 border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <Link
            to={storeHome}
            className={`text-storelaunch-dark text-sm font-medium hover:text-storelaunch-green ${isRTL ? 'text-right' : 'text-left'}`}
          >
            {isRTL ? '← ' : ''}
            {t('customerAuth.backToHome')}
            {isRTL ? '' : ' →'}
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

        <form noValidate onSubmit={handleSubmit} className="space-y-4">
          <RegisterFieldGroup
            fieldId="first_name"
            name="first_name"
            value={form.first_name}
            onChange={handleChange}
            labelKey="customerAuth.firstName"
            errorKey={fieldError('first_name')}
            autoComplete="given-name"
            alignClass={isRTL ? 'text-right' : 'text-left'}
          />
          <RegisterFieldGroup
            fieldId="last_name"
            name="last_name"
            value={form.last_name}
            onChange={handleChange}
            labelKey="customerAuth.lastName"
            errorKey={fieldError('last_name')}
            autoComplete="family-name"
            alignClass={isRTL ? 'text-right' : 'text-left'}
          />
          <RegisterFieldGroup
            fieldId="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            labelKey="customerAuth.email"
            errorKey={fieldError('email')}
            type="text"
            inputMode="text"
            autoComplete="email"
            dir="ltr"
            alignClass={isRTL ? 'text-right' : 'text-left'}
          />
          <RegisterFieldGroup
            fieldId="phone"
            name="phone"
            value={form.phone}
            onChange={handleChange}
            labelKey="customerAuth.phone"
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
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full p-3 bg-storelaunch-green text-white rounded-md font-medium hover:bg-storelaunch-deep-green disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? t('customerAuth.creating') : t('customerAuth.registerButton')}
          </button>
        </form>

        <p className={`text-sm text-gray-600 mt-4 ${isRTL ? 'text-right' : 'text-left'}`}>
          {t('customerAuth.hasAccount')}{' '}
          <Link
            to={storeSlug ? buildStorefrontPath(storeSlug, 'login') : '/customer/login'}
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
