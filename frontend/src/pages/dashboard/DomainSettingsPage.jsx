import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../../api/axios';

const DomainSettingsPage = () => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [store, setStore] = useState(null);
  const [storeSlug, setStoreSlug] = useState('');
  const [slugError, setSlugError] = useState('');
  const baseDomain = 'storelaunch.site';

  const normalizeSlug = (value) => value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const { data } = await axiosInstance.get('/api/store');
        if (!cancelled) {
          setStore(data.store);
          setStoreSlug(normalizeSlug(data?.store?.domain_name || ''));
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

  const handleSave = async () => {
    const normalized = normalizeSlug(storeSlug);
    if (normalized.length < 3 || normalized.length > 40) {
      setSlugError(t('dashboard.storeManagement.domain.slugLengthError'));
      return;
    }
    if (!/^[a-z0-9-]+$/.test(normalized)) {
      setSlugError(t('dashboard.storeManagement.domain.slugPatternError'));
      return;
    }

    setSlugError('');
    setSaving(true);
    try {
      await axiosInstance.put('/api/store/domain', { slug: normalized });
      setStore((prev) => ({ ...(prev || {}), domain_name: normalized }));
      setStoreSlug(normalized);
      showToast('success', t('dashboard.storeManagement.toast.saveSuccess'));
    } catch (err) {
      showToast('error', err?.response?.data?.error || t('dashboard.storeManagement.toast.saveError'));
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
    <div className="space-y-4 sm:space-y-6 max-w-full" dir={isRTL ? 'rtl' : 'ltr'}>
      {toast && (
        <div
          className={`fixed top-4 ${isRTL ? 'left-4' : 'right-4'} z-50 px-4 py-3 rounded-lg shadow-lg text-white ${
            toast.type === 'error' ? 'bg-red-500' : 'bg-storelaunch-green'
          }`}
        >
          {toast.message}
        </div>
      )}

      <div className={`flex items-center gap-2 sm:gap-3 mb-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <button
          type="button"
          onClick={() => navigate('/dashboard/store')}
          className="inline-flex items-center gap-1 min-h-11 px-2 text-sm text-storelaunch-dark hover:underline rounded-lg focus:outline-none focus:ring-2 focus:ring-storelaunch-green/30"
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
        <h2 className="text-storelaunch-dark font-bold text-xl sm:text-2xl">
          {t('dashboard.storeManagement.domain.sectionTitle')}
        </h2>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-md p-4 sm:p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('dashboard.storeManagement.domain.baseUrl')}
            </label>
            <input
              type="text"
              className="w-full min-h-11 border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-gray-50"
              value={`${baseDomain}/`}
              readOnly
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('dashboard.storeManagement.domain.storeSlug')}
            </label>
            <input
              type="text"
              className="w-full min-h-11 border border-gray-300 rounded-lg px-3 py-2.5 text-sm"
              value={storeSlug}
              placeholder={t('dashboard.storeManagement.domain.slugPlaceholder')}
              onChange={(e) => setStoreSlug(normalizeSlug(e.target.value))}
            />
            {slugError && <p className="text-xs text-red-600 mt-1">{slugError}</p>}
          </div>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-gray-800 mb-1">
            {t('dashboard.storeManagement.domain.slugRulesTitle')}
          </h4>
          <p className="text-sm text-gray-600">
            {t('dashboard.storeManagement.domain.slugRulesHelp')}
          </p>
          <p className="text-sm text-storelaunch-dark mt-2">
            {t('dashboard.storeManagement.domain.previewLabel')}:{' '}
            <span className="font-semibold">{`${baseDomain}/${storeSlug || 'your-store'}`}</span>
          </p>
        </div>
        <div>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="w-full sm:w-auto min-h-11 px-4 py-2.5 bg-storelaunch-green text-white rounded-lg text-sm font-medium hover:bg-storelaunch-deep-green disabled:opacity-50"
          >
            {t('dashboard.storeManagement.actions.saveChanges')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DomainSettingsPage;

