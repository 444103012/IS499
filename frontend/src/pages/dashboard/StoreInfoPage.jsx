import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../../api/axios';

const STORE_NAME_MIN_LENGTH = 3;
const STORE_NAME_MAX_LENGTH = 40;

const StoreInfoPage = () => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState('');
  const [toast, setToast] = useState(null);
  const [store, setStore] = useState(null);
  const [info, setInfo] = useState({});

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const { data } = await axiosInstance.get('/api/store');
        if (!cancelled) {
          setStore(data.store);
          const rawInfo = data.settings?.info && typeof data.settings.info === 'object' ? data.settings.info : {};
          const { contactEmail, contactPhone, address, ...restInfo } = rawInfo;
          setInfo(restInfo);
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

  const handleLogoFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      setLogoFile(null);
      setLogoPreview('');
      return;
    }
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      showToast('error', t('dashboard.storeManagement.storeInfo.logoInvalidType'));
      event.target.value = '';
      setLogoFile(null);
      setLogoPreview('');
      return;
    }
    const maxBytes = 5 * 1024 * 1024;
    if (file.size > maxBytes) {
      showToast('error', t('dashboard.storeManagement.storeInfo.logoInvalidSize'));
      event.target.value = '';
      setLogoFile(null);
      setLogoPreview('');
      return;
    }
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleLogoUpload = async () => {
    if (!logoFile) {
      showToast('error', t('dashboard.storeManagement.storeInfo.logoSelectFirst'));
      return;
    }
    setUploadingLogo(true);
    const formData = new FormData();
    formData.append('logo', logoFile);
    try {
      const { data } = await axiosInstance.putForm('/api/store/logo', formData);
      setStore((prev) => ({ ...(prev || {}), logo: data.logo }));
      setLogoFile(null);
      setLogoPreview('');
      showToast('success', t('dashboard.storeManagement.storeInfo.logoUploadSuccess'));
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('Logo upload failed', err?.response?.data ?? err?.message ?? err);
      const serverMsg =
        err?.response?.data?.error ||
        (typeof err?.response?.data === 'string' ? err.response.data : null);
      const detail = serverMsg || err?.message;
      const base = t('dashboard.storeManagement.storeInfo.logoUploadError');
      const hint =
        process.env.NODE_ENV !== 'production' && detail
          ? ` — ${String(detail).length > 160 ? `${String(detail).slice(0, 160)}…` : detail}`
          : '';
      showToast('error', `${base}${hint}`);
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSave = async () => {
    if (!store) return;
    const trimmedStoreName = store.name?.trim() || '';
    if (trimmedStoreName.length < STORE_NAME_MIN_LENGTH || trimmedStoreName.length > STORE_NAME_MAX_LENGTH) {
      showToast('error', t('dashboard.storeManagement.storeInfo.storeNameLength'));
      return;
    }
    setSaving(true);
    try {
      const persistInfo = { ...info };
      delete persistInfo.contactEmail;
      delete persistInfo.contactPhone;
      delete persistInfo.address;
      await axiosInstance.put('/api/store', {
        name: trimmedStoreName,
        description: store.description,
        store_type: store.store_type,
        status: store.status,
        info: persistInfo,
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

  const trimmedStoreName = store.name?.trim() || '';
  const hasValidStoreName = trimmedStoreName.length >= STORE_NAME_MIN_LENGTH && trimmedStoreName.length <= STORE_NAME_MAX_LENGTH;

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
          {t('dashboard.storeManagement.storeInfo.sectionTitle')}
        </h2>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-md p-6 space-y-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-12 w-12 rounded-lg bg-gray-100 border border-gray-200 overflow-hidden">
            {(logoPreview || store.logo) && (
              <img src={logoPreview || store.logo} alt="" className="h-full w-full object-cover" />
            )}
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">{store.name}</p>
            <p className="text-xs text-gray-500">
              {t('dashboard.storeManagement.storeInfo.sectionTitle')}
            </p>
          </div>
        </div>
        <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('dashboard.storeManagement.storeInfo.changeLogo')}
          </label>
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            <input
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              onChange={handleLogoFileChange}
              className="w-full text-sm text-gray-700 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-white file:text-gray-700 file:shadow-sm file:cursor-pointer"
            />
            <button
              type="button"
              onClick={handleLogoUpload}
              disabled={uploadingLogo}
              className="w-full sm:w-auto px-4 py-2 bg-storelaunch-green text-white rounded-lg text-sm font-medium hover:bg-storelaunch-deep-green disabled:opacity-50"
            >
              {uploadingLogo
                ? t('dashboard.storeManagement.storeInfo.uploadingLogo')
                : t('dashboard.storeManagement.storeInfo.changeLogoButton')}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {t('dashboard.storeManagement.storeInfo.logoHint')}
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('dashboard.storeManagement.storeInfo.storeUrl')}
            </label>
            <input
              type="text"
              readOnly
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-800 cursor-not-allowed"
              value={
                store.domain_name
                  ? `storelaunch.site/${store.domain_name}`
                  : '—'
              }
            />
            <p className="text-xs text-gray-500 mt-1">
              {t('dashboard.storeManagement.storeInfo.storeUrlHint')}
            </p>
            <button
              type="button"
              onClick={() => navigate('/dashboard/store/domain')}
              className="mt-2 text-sm font-medium text-[#0E8F96] hover:underline"
            >
              {t('dashboard.storeManagement.storeInfo.storeUrlEditLink')}
            </button>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('dashboard.storeManagement.storeInfo.storeName')}
            </label>
            <input
              type="text"
              minLength={STORE_NAME_MIN_LENGTH}
              maxLength={STORE_NAME_MAX_LENGTH}
              className={`w-full border rounded-lg px-3 py-2 text-sm ${
                trimmedStoreName && !hasValidStoreName ? 'border-red-400 focus:ring-red-400' : 'border-gray-300'
              }`}
              value={store.name || ''}
              onChange={(e) => setStore({ ...store, name: e.target.value })}
            />
            <p className={`mt-1 text-xs ${trimmedStoreName && !hasValidStoreName ? 'text-red-600' : 'text-gray-500'}`}>
              {t('dashboard.storeManagement.storeInfo.storeNameLength')}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('dashboard.storeManagement.storeInfo.businessCategory')}
            </label>
            <input
              type="text"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              value={info.businessCategory || ''}
              onChange={(e) =>
                setInfo((prev) => ({ ...prev, businessCategory: e.target.value }))
              }
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('dashboard.storeManagement.storeInfo.storeDescription')}
            </label>
            <textarea
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm min-h-[80px]"
              value={store.description || ''}
              onChange={(e) => setStore({ ...store, description: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('dashboard.storeManagement.storeInfo.createdAt')}
            </label>
            <p className="text-sm text-gray-600">
              {store.created_at
                ? new Date(store.created_at).toLocaleDateString()
                : '—'}
            </p>
          </div>
        </div>
        <div>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !hasValidStoreName}
            className="px-4 py-2 bg-storelaunch-green text-white rounded-lg text-sm font-medium hover:bg-storelaunch-deep-green disabled:opacity-50"
          >
            {t('dashboard.storeManagement.actions.saveChanges')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StoreInfoPage;

