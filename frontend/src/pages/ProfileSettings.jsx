

import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../api/axios';

const ProfileSettings = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { storeSlug } = useParams();
  const isRTL = i18n.language === 'ar';

  const storefrontHome = storeSlug ? `/${storeSlug}/customer` : '/shop';
  const loginPath = storeSlug ? `/${storeSlug}/customer/login` : '/customer/login';

  const [profile, setProfile] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
  });
  const [loading, setLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState('');
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
      navigate(loginPath, { state: { from: storeSlug ? `/${storeSlug}/customer/settings` : '/customer/settings' }, replace: true });
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
      } catch (err) {
        if (!cancelled) {
          if (err.response?.status === 401) {
            navigate(loginPath, { state: { from: storeSlug ? `/${storeSlug}/customer/settings` : '/customer/settings' }, replace: true });
            return;
          }
         
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [navigate, loginPath, storeSlug]);

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
    setProfileError('');
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileError('');
    setProfileSaving(true);
    try {
      await axiosInstance.put('/api/customers/profile', profile);
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
    if (newPassword.length < 8) {
      setPasswordError(isRTL ? 'كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل.' : 'New password must be at least 8 characters.');
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
                required
                placeholder="+966501234567"
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
              <p className="text-gray-500 text-xs mt-1">{isRTL ? '8 أحرف على الأقل' : 'At least 8 characters'}</p>
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
