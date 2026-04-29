import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../../api/axios';

const API_BASE = process.env.REACT_APP_API_URL || '';

const BrandingAppearancePage = () => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [store, setStore] = useState(null);
  const [branding, setBranding] = useState({});

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const { data } = await axiosInstance.get('/api/store');
        if (!cancelled) {
          setStore(data.store);
          setBranding(data.settings?.branding || {});
        }
      } catch {
        if (!cancelled) {
          setToast({ type: 'error', message: t('dashboard.storeManagement.toast.saveError') });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [t]);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const handleLogoUpload = async (file) => {
    if (!file) return;
    const formData = new FormData();
    formData.append('logo', file);
    try {
      const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
      const res = await fetch(`${API_BASE}/api/store/logo`, {
        method: 'PUT',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Upload failed');
      }
      setStore((prev) => (prev ? { ...prev, logo: data.logo } : prev));
      setBranding((prev) => ({ ...prev, logo: data.logo }));
      showToast('success', t('dashboard.storeManagement.toast.saveSuccess'));
    } catch {
      showToast('error', t('dashboard.storeManagement.toast.saveError'));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await axiosInstance.put('/api/store/theme', {
        theme: store?.theme || branding.mode || 'light',
        branding,
      });
      showToast('success', t('dashboard.storeManagement.toast.saveSuccess'));
    } catch {
      showToast('error', t('dashboard.storeManagement.toast.saveError'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 text-gray-500" dir={isRTL ? 'rtl' : 'ltr'}>
        {t('dashboard.productForm.loadingProduct')}
      </div>
    );
  }

  if (!store) {
    return (
      <div className="p-4 text-gray-500" dir={isRTL ? 'rtl' : 'ltr'}>
        {t('dashboard.subscriptionPage.noStore')}
      </div>
    );
  }

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {toast && (
        <div
          className={`fixed top-4 ${isRTL ? 'left-4' : 'right-4'} z-50 px-4 py-3 rounded-lg shadow-lg text-white ${
            toast.type === 'error' ? 'bg-red-500' : 'bg-storelaunch-green'
          }`}
        >
          {toast.message}
        </div>
      )}

      <div className={`flex items-center gap-3 mb-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <button
          type="button"
          onClick={() => navigate('/dashboard/store')}
          className="inline-flex items-center gap-1 text-sm text-storelaunch-dark hover:underline"
        >
          {isRTL ? (
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M9 5l7 7-7 7" />
            </svg>
          ) : (
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M15 19l-7-7 7-7" />
            </svg>
          )}
          {t('dashboard.storeManagement.back')}
        </button>
        <h2 className="text-storelaunch-dark font-bold text-2xl">
          {t('dashboard.storeManagement.branding.sectionTitle')}
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl shadow-md p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('dashboard.storeManagement.branding.storeLogo')}
              </label>
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-lg bg-gray-100 border border-gray-200 overflow-hidden">
                  {store.logo && (
                    <img src={store.logo} alt="" className="h-full w-full object-cover" />
                  )}
                </div>
                <label className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50 cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleLogoUpload(file);
                      e.target.value = '';
                    }}
                  />
                  {t('dashboard.storeManagement.branding.uploadLogo')}
                </label>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('dashboard.storeManagement.branding.favicon')}
              </label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={branding.favicon || ''}
                onChange={(e) =>
                  setBranding((prev) => ({ ...prev, favicon: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('dashboard.storeManagement.branding.themeMode')}
              </label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={branding.mode || 'light'}
                onChange={(e) =>
                  setBranding((prev) => ({ ...prev, mode: e.target.value }))
                }
              >
                <option value="light">
                  {t('dashboard.storeManagement.branding.themeLight')}
                </option>
                <option value="dark">
                  {t('dashboard.storeManagement.branding.themeDark')}
                </option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('dashboard.storeManagement.branding.primaryColor')}
              </label>
              <input
                type="color"
                className="h-10 w-16 border border-gray-300 rounded"
                value={branding.primaryColor || '#0E8F96'}
                onChange={(e) =>
                  setBranding((prev) => ({ ...prev, primaryColor: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('dashboard.storeManagement.branding.typography')}
              </label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={branding.font || 'system'}
                onChange={(e) =>
                  setBranding((prev) => ({ ...prev, font: e.target.value }))
                }
              >
                <option value="system">System</option>
                <option value="rounded">Rounded</option>
                <option value="serif">Serif</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('dashboard.storeManagement.branding.layout')}
              </label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={branding.layout || 'full'}
                onChange={(e) =>
                  setBranding((prev) => ({ ...prev, layout: e.target.value }))
                }
              >
                <option value="boxed">
                  {t('dashboard.storeManagement.branding.layoutBoxed')}
                </option>
                <option value="full">
                  {t('dashboard.storeManagement.branding.layoutFull')}
                </option>
              </select>
            </div>
          </div>
          <div>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-storelaunch-green text-white rounded-lg text-sm font-medium hover:bg-storelaunch-deep-green disabled:opacity-50"
            >
              {t('dashboard.storeManagement.actions.saveChanges')}
            </button>
          </div>
        </div>
        <div>
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-gray-800 mb-1">
              {t('dashboard.storeManagement.branding.previewTitle')}
            </h3>
            <p className="text-xs text-gray-500 mb-3">
              {t('dashboard.storeManagement.branding.previewSubtitle')}
            </p>
            <div
              className="rounded-xl p-4 shadow-sm"
              style={{
                backgroundColor: branding.mode === 'dark' ? '#0A3C5A' : '#ffffff',
                color: branding.mode === 'dark' ? '#f9fafb' : '#111827',
              }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-lg bg-gray-200 overflow-hidden">
                  {store.logo && (
                    <img
                      src={store.logo}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold">
                    {store.name || 'Store'}
                  </p>
                  <p className="text-xs opacity-80">
                    {store.description || ''}
                  </p>
                </div>
              </div>
              <div
                className="h-2 rounded-full mb-2"
                style={{ backgroundColor: branding.primaryColor || '#0E8F96' }}
              />
              <div className="space-y-1">
                <div className="h-2 rounded-full bg-gray-200/70" />
                <div className="h-2 rounded-full bg-gray-200/70 w-2/3" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BrandingAppearancePage;

