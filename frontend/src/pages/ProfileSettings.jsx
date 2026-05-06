







import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../api/axios';
import { buildStorefrontPath } from '../utils/storefrontRoutes';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
const PHONE_REGEX = /^05\d{8}$/;

const ProfileSettings = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { storeSlug } = useParams();
  const isRTL = i18n.language === 'ar';

  const storefrontHome = storeSlug ? buildStorefrontPath(storeSlug) : '/';
  const loginPath = storeSlug ? buildStorefrontPath(storeSlug, 'login') : '/customer/login';
  const settingsPath = storeSlug ? buildStorefrontPath(storeSlug, 'settings') : '/customer/settings';

  const [profile, setProfile] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
  });
  const [loading, setLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [address, setAddress] = useState({
    full_name: '',
    phone: '',
    address1: '',
    city: '',
    region: '',
    postal_code: '',
    country: 'SA',
  });
  const [addressSaving, setAddressSaving] = useState(false);
  const [addressError, setAddressError] = useState('');
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast((prev) => ({ ...prev, show: false })), 4000);
  };

  
  useEffect(() => {
    if (!localStorage.getItem('customer_token')) {
      navigate(loginPath, { state: { from: settingsPath }, replace: true });
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data } = await axiosInstance.get('/api/customers/profile');
        if (cancelled) return;
        const c = data?.customer ?? {};
        
        setProfile({
          first_name: String(c.first_name ?? '').trim(),
          last_name: String(c.last_name ?? '').trim(),
          email: String(c.email ?? '').trim(),
          phone: String(c.phone ?? '').trim(),
        });
        try {
          const addressRes = await axiosInstance.get('/api/customers/address');
          const saved = addressRes?.data?.address;
          if (saved && typeof saved === 'object') {
            setAddress({
              full_name: String(saved.full_name ?? '').trim(),
              phone: String(saved.phone ?? '').trim(),
              address1: String(saved.address1 ?? '').trim(),
              city: String(saved.city ?? '').trim(),
              region: String(saved.region ?? '').trim(),
              postal_code: String(saved.postal_code ?? '').trim(),
              country: String(saved.country ?? 'SA').trim() || 'SA',
            });
          }
        } catch (_) {
          // keep empty/default address when none is saved yet
        }
      } catch (err) {
        if (!cancelled) {
          if (err.response?.status === 401) {
            navigate(loginPath, { state: { from: settingsPath }, replace: true });
            return;
          }
          
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [navigate, loginPath, settingsPath]);

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
    setProfileError('');
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileError('');
    const trimmedEmail = profile.email.trim();
    const trimmedPhone = profile.phone.trim();
    if (!EMAIL_REGEX.test(trimmedEmail)) {
      alert(isRTL ? 'يرجى إدخال بريد إلكتروني صالح' : 'Please enter a valid email address');
      return;
    }
    if (!PHONE_REGEX.test(trimmedPhone)) {
      alert(
        isRTL
          ? 'رقم الجوال يجب أن يبدأ بـ 05 ويتكون من 10 أرقام'
          : 'Phone number must start with 05 and be exactly 10 digits'
      );
      return;
    }
    setProfileSaving(true);
    try {
      await axiosInstance.put('/api/customers/profile', {
        ...profile,
        email: trimmedEmail,
        phone: trimmedPhone,
      });
      showToast(isRTL ? 'تم تحديث الملف الشخصي بنجاح' : 'Profile updated successfully');
    } catch (err) {
      const msg = err.response?.data?.error || err.message;
      if (err.response?.status === 409 || msg === 'Email already exists' || msg === 'Email already registered') {
        setProfileError(isRTL ? 'البريد الإلكتروني مستخدم بالفعل من قبل حساب آخر.' : 'This email is already used by another account.');
      } else {
        setProfileError(msg || 'Failed to update profile');
      }
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordError('');
    if (!PASSWORD_REGEX.test(newPassword)) {
      alert(
        isRTL
          ? 'كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل وتحتوي على حرف واحد ورقم واحد على الأقل'
          : 'New password must be at least 8 characters and include at least one letter and one number.'
      );
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError(isRTL ? 'كلمة المرور الجديدة وتأكيدها غير متطابقتين.' : 'New password and confirmation do not match.');
      return;
    }
    setPasswordSaving(true);
    try {
      await axiosInstance.put('/api/customers/password', {
        currentPassword,
        newPassword,
      });
      showToast(isRTL ? 'تم تحديث كلمة المرور بنجاح' : 'Password updated successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      const msg = err.response?.data?.error || err.message;
      if (msg === 'Current password is incorrect') {
        setPasswordError(isRTL ? 'كلمة المرور الحالية غير صحيحة.' : 'Current password is incorrect.');
      } else {
        setPasswordError(msg || 'Failed to update password');
      }
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleAddressChange = (e) => {
    const { name, value } = e.target;
    setAddress((prev) => ({ ...prev, [name]: value }));
    setAddressError('');
  };

  const handleAddressSubmit = async (e) => {
    e.preventDefault();
    setAddressError('');
    setAddressSaving(true);
    try {
      await axiosInstance.put('/api/customers/address', address);
      showToast(isRTL ? 'تم حفظ العنوان بنجاح' : 'Address saved successfully');
    } catch (err) {
      setAddressError(err.response?.data?.error || err.message || 'Failed to save address');
    } finally {
      setAddressSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-storelaunch-teal mx-auto" />
      </div>
    );
  }

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <Link
            to={storefrontHome}
            className="text-storelaunch-dark text-sm font-medium hover:text-storelaunch-teal transition-colors"
          >
            {isRTL ? '← العودة للمتجر' : '← Back to store'}
          </Link>
        </div>

        <h1 className="text-storelaunch-dark font-bold text-2xl mb-6">
          {isRTL ? 'الملف الشخصي والإعدادات' : 'Profile & Settings'}
        </h1>

        {}
        <div className="bg-white border border-gray-200 rounded-xl shadow-md p-6 mb-6">
          <h2 className="text-storelaunch-dark font-semibold text-lg mb-4">
            {isRTL ? 'المعلومات الشخصية' : 'Personal information'}
          </h2>
          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <div className={isRTL ? 'text-right' : 'text-left'}>
              <label htmlFor="first_name" className="block text-storelaunch-dark text-sm font-medium mb-1">
                {t('customerAuth.firstName')}
              </label>
              <input
                id="first_name"
                name="first_name"
                type="text"
                value={profile.first_name}
                onChange={handleProfileChange}
                required
                className={`w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-storelaunch-teal focus:border-storelaunch-teal hover:border-storelaunch-teal/60 transition-all duration-200 ${isRTL ? 'text-right' : 'text-left'}`}
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
                value={profile.last_name}
                onChange={handleProfileChange}
                required
                className={`w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-storelaunch-teal focus:border-storelaunch-teal hover:border-storelaunch-teal/60 transition-all duration-200 ${isRTL ? 'text-right' : 'text-left'}`}
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
                value={profile.email}
                onChange={handleProfileChange}
                required
                className={`w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-storelaunch-teal focus:border-storelaunch-teal hover:border-storelaunch-teal/60 transition-all duration-200 ${isRTL ? 'text-right' : 'text-left'}`}
              />
            </div>
            <div className={isRTL ? 'text-right' : 'text-left'}>
              <label htmlFor="phone" className="block text-storelaunch-dark text-sm font-medium mb-1">
                {t('customerAuth.phone')}
              </label>
              <input
                id="phone"
                name="phone"
                type="text"
                value={profile.phone}
                onChange={handleProfileChange}
                onInvalid={(e) => e.target.setCustomValidity('Phone number must contain exactly 10 digits')}
                onInput={(e) => e.target.setCustomValidity('')}
                required
                placeholder="05XXXXXXXX"
                pattern="05[0-9]{8}"
                title="Phone number must contain exactly 10 digits"
                className={`w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-storelaunch-teal focus:border-storelaunch-teal hover:border-storelaunch-teal/60 transition-all duration-200 ${isRTL ? 'text-right' : 'text-left'}`}
              />
            </div>
            {profileError && (
              <div className={`p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
                {profileError}
              </div>
            )}
            <button
              type="submit"
              disabled={profileSaving}
              className="px-4 py-2 bg-storelaunch-dark text-white rounded-lg text-sm font-medium hover:bg-storelaunch-teal transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {profileSaving ? (isRTL ? 'جاري الحفظ...' : 'Saving...') : (isRTL ? 'حفظ التغييرات' : 'Save changes')}
            </button>
          </form>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl shadow-md p-6 mb-6">
          <h2 className="text-storelaunch-dark font-semibold text-lg mb-4">
            {isRTL ? 'العنوان' : 'Address'}
          </h2>
          <form onSubmit={handleAddressSubmit} className="space-y-4">
            <div className={isRTL ? 'text-right' : 'text-left'}>
              <label htmlFor="full_name" className="block text-storelaunch-dark text-sm font-medium mb-1">
                {isRTL ? 'الاسم الكامل' : 'Full Name'}
              </label>
              <input id="full_name" name="full_name" value={address.full_name} onChange={handleAddressChange} required className={`w-full border border-gray-300 rounded-lg px-3 py-2 text-sm ${isRTL ? 'text-right' : 'text-left'}`} />
            </div>
            <div className={isRTL ? 'text-right' : 'text-left'}>
              <label htmlFor="address_phone" className="block text-storelaunch-dark text-sm font-medium mb-1">
                {isRTL ? 'الهاتف' : 'Phone'}
              </label>
              <input id="address_phone" name="phone" value={address.phone} onChange={handleAddressChange} className={`w-full border border-gray-300 rounded-lg px-3 py-2 text-sm ${isRTL ? 'text-right' : 'text-left'}`} />
            </div>
            <div className={isRTL ? 'text-right' : 'text-left'}>
              <label htmlFor="address1" className="block text-storelaunch-dark text-sm font-medium mb-1">
                {isRTL ? 'العنوان - سطر 1' : 'Address Line 1'}
              </label>
              <input id="address1" name="address1" value={address.address1} onChange={handleAddressChange} required className={`w-full border border-gray-300 rounded-lg px-3 py-2 text-sm ${isRTL ? 'text-right' : 'text-left'}`} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className={isRTL ? 'text-right' : 'text-left'}>
                <label htmlFor="city" className="block text-storelaunch-dark text-sm font-medium mb-1">
                  {isRTL ? 'المدينة' : 'City'}
                </label>
                <input id="city" name="city" value={address.city} onChange={handleAddressChange} required className={`w-full border border-gray-300 rounded-lg px-3 py-2 text-sm ${isRTL ? 'text-right' : 'text-left'}`} />
              </div>
              <div className={isRTL ? 'text-right' : 'text-left'}>
                <label htmlFor="region" className="block text-storelaunch-dark text-sm font-medium mb-1">
                  {isRTL ? 'المنطقة / المحافظة' : 'Region/Province'}
                </label>
                <input id="region" name="region" value={address.region} onChange={handleAddressChange} className={`w-full border border-gray-300 rounded-lg px-3 py-2 text-sm ${isRTL ? 'text-right' : 'text-left'}`} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className={isRTL ? 'text-right' : 'text-left'}>
                <label htmlFor="postal_code" className="block text-storelaunch-dark text-sm font-medium mb-1">
                  {isRTL ? 'الرمز البريدي' : 'Postal Code'}
                </label>
                <input id="postal_code" name="postal_code" value={address.postal_code} onChange={handleAddressChange} className={`w-full border border-gray-300 rounded-lg px-3 py-2 text-sm ${isRTL ? 'text-right' : 'text-left'}`} />
              </div>
              <div className={isRTL ? 'text-right' : 'text-left'}>
                <label htmlFor="country" className="block text-storelaunch-dark text-sm font-medium mb-1">
                  {isRTL ? 'الدولة' : 'Country'}
                </label>
                <input id="country" name="country" value={address.country} onChange={handleAddressChange} required className={`w-full border border-gray-300 rounded-lg px-3 py-2 text-sm ${isRTL ? 'text-right' : 'text-left'}`} />
              </div>
            </div>
            {addressError ? (
              <div className={`p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
                {addressError}
              </div>
            ) : null}
            <button
              type="submit"
              disabled={addressSaving}
              className="px-4 py-2 bg-storelaunch-dark text-white rounded-lg text-sm font-medium hover:bg-storelaunch-teal transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {addressSaving ? (isRTL ? 'جاري الحفظ...' : 'Saving...') : (isRTL ? 'حفظ العنوان' : 'Save Address')}
            </button>
          </form>
        </div>

        {}
        <div className="bg-white border border-gray-200 rounded-xl shadow-md p-6">
          <h2 className="text-storelaunch-dark font-semibold text-lg mb-4">
            {isRTL ? 'الأمان' : 'Security'}
          </h2>
          <p className="text-gray-600 text-sm mb-4">
            {isRTL ? 'غيّر كلمة المرور. يجب إدخال كلمة المرور الحالية للتحقق.' : 'Change your password. You must enter your current password to verify.'}
          </p>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div className={isRTL ? 'text-right' : 'text-left'}>
              <label htmlFor="currentPassword" className="block text-storelaunch-dark text-sm font-medium mb-1">
                {isRTL ? 'كلمة المرور الحالية' : 'Current password'}
              </label>
              <input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => { setCurrentPassword(e.target.value); setPasswordError(''); }}
                required
                className={`w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-storelaunch-teal focus:border-storelaunch-teal hover:border-storelaunch-teal/60 transition-all duration-200 ${isRTL ? 'text-right' : 'text-left'}`}
              />
            </div>
            <div className={isRTL ? 'text-right' : 'text-left'}>
              <label htmlFor="newPassword" className="block text-storelaunch-dark text-sm font-medium mb-1">
                {isRTL ? 'كلمة المرور الجديدة' : 'New password'}
              </label>
              <input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => { setNewPassword(e.target.value); setPasswordError(''); }}
                required
                minLength={8}
                className={`w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-storelaunch-teal focus:border-storelaunch-teal hover:border-storelaunch-teal/60 transition-all duration-200 ${isRTL ? 'text-right' : 'text-left'}`}
              />
              <p className="text-gray-500 text-xs mt-1">{isRTL ? '8 أحرف على الأقل وتحتوي على حرف ورقم' : 'At least 8 characters with at least one letter and one number'}</p>
            </div>
            <div className={isRTL ? 'text-right' : 'text-left'}>
              <label htmlFor="confirmPassword" className="block text-storelaunch-dark text-sm font-medium mb-1">
                {t('customerAuth.confirmPassword')}
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setPasswordError(''); }}
                required
                className={`w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-storelaunch-teal focus:border-storelaunch-teal hover:border-storelaunch-teal/60 transition-all duration-200 ${isRTL ? 'text-right' : 'text-left'}`}
              />
            </div>
            {passwordError && (
              <div className={`p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
                {passwordError}
              </div>
            )}
            <button
              type="submit"
              disabled={passwordSaving}
              className="px-4 py-2 bg-storelaunch-dark text-white rounded-lg text-sm font-medium hover:bg-storelaunch-teal transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {passwordSaving ? (isRTL ? 'جاري التحديث...' : 'Updating...') : (isRTL ? 'تحديث كلمة المرور' : 'Update password')}
            </button>
          </form>
        </div>

        {}
        {toast.show && (
          <div
            className={`fixed bottom-6 ${isRTL ? 'left-4' : 'right-4'} z-50 px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium ${
              toast.type === 'error' ? 'bg-red-500' : 'bg-storelaunch-teal'
            }`}
          >
            {toast.message}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileSettings;
