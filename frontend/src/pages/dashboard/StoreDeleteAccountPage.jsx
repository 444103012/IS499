import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../../api/axios';

const StoreDeleteAccountPage = () => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [store, setStore] = useState(null);
  const [deleteAccountConfirm, setDeleteAccountConfirm] = useState('');
  const isDeactivated = store?.status === 'Suspended';

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const { data } = await axiosInstance.get('/api/store');
        if (!cancelled) {
          setStore(data.store);
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

  const handleDeactivate = async () => {
    if (deleteAccountConfirm !== 'DEACTIVATE') {
      showToast('error', t('dashboard.storeManagement.toast.deactivateError'));
      return;
    }
    setSaving(true);
    try {
      await axiosInstance.put('/api/store', {
        name: store?.name || '',
        description: store?.description || '',
        store_type: store?.store_type || '',
        status: 'Suspended',
      });
      showToast('success', t('dashboard.storeManagement.toast.deactivateSuccess'));
      setDeleteAccountConfirm('');
      const { data } = await axiosInstance.get('/api/store');
      setStore(data.store);
    } catch {
      showToast('error', t('dashboard.storeManagement.toast.deactivateError'));
    } finally {
      setSaving(false);
    }
  };

  const handleReactivate = async () => {
    setSaving(true);
    try {
      await axiosInstance.put('/api/store', {
        name: store?.name || '',
        description: store?.description || '',
        store_type: store?.store_type || '',
        status: 'Active',
      });
      showToast('success', t('dashboard.storeManagement.toast.reactivateSuccess'));
      const { data } = await axiosInstance.get('/api/store');
      setStore(data.store);
    } catch {
      showToast('error', t('dashboard.storeManagement.toast.reactivateError'));
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
          {t('dashboard.storeManagement.deleteAccount.sectionTitle')}
        </h2>
      </div>

      <div className="space-y-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-2">
          <h3 className="text-red-700 font-semibold text-sm">
            {t('dashboard.storeManagement.deleteAccount.suspend')}
          </h3>
          <p className="text-sm text-red-700">
            {t('dashboard.storeManagement.deleteAccount.suspendDescription')}
          </p>
        </div>
        {isDeactivated ? (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
            <h3 className="text-amber-800 font-semibold text-sm">
              {t('dashboard.storeManagement.deleteAccount.reactivate')}
            </h3>
            <p className="text-sm text-amber-800">
              {t('dashboard.storeManagement.deleteAccount.reactivateDescription')}
            </p>
            <button
              type="button"
              onClick={handleReactivate}
              disabled={saving}
              className="mt-2 px-4 py-2 bg-storelaunch-green text-white rounded-lg text-sm font-medium hover:bg-storelaunch-deep-green disabled:opacity-50"
            >
              {t('dashboard.storeManagement.deleteAccount.reactivate')}
            </button>
          </div>
        ) : (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-3">
            <h3 className="text-red-700 font-semibold text-sm">
              {t('dashboard.storeManagement.deleteAccount.deactivate')}
            </h3>
            <p className="text-sm text-red-700">
              {t('dashboard.storeManagement.deleteAccount.deactivateDescription')}
            </p>
            <label className="block text-sm font-medium text-red-700 mb-1">
              {t('dashboard.storeManagement.deleteAccount.confirmDeactivate')}
            </label>
            <input
              type="text"
              className="w-full border border-red-300 rounded-lg px-3 py-2 text-sm bg-white"
              value={deleteAccountConfirm}
              onChange={(e) => setDeleteAccountConfirm(e.target.value.toUpperCase())}
              placeholder="DEACTIVATE"
            />
            <button
              type="button"
              onClick={handleDeactivate}
              disabled={saving || deleteAccountConfirm !== 'DEACTIVATE'}
              className="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
            >
              {t('dashboard.storeManagement.deleteAccount.deactivate')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default StoreDeleteAccountPage;
