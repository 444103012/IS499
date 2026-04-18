import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../../api/axios';

const PROVIDERS = [
  { key: 'mada', labelKey: 'Mada' },
  { key: 'stcPay', labelKey: 'STC Pay' },
  { key: 'applePay', labelKey: 'Apple Pay' },
  { key: 'stripe', labelKey: 'Stripe' },
];

const PaymentProvidersPage = () => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [payments, setPayments] = useState({});
  const [activeProvider, setActiveProvider] = useState(null);
  const [modalConfig, setModalConfig] = useState({ merchantId: '', apiKey: '', secretKey: '' });

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const { data } = await axiosInstance.get('/api/store');
        if (!cancelled) {
          setPayments(data.settings?.payments || {});
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

  const openModal = (key) => {
    const current = payments[key]?.config || {};
    setActiveProvider(key);
    setModalConfig({
      merchantId: current.merchantId || '',
      apiKey: current.apiKey || '',
      secretKey: current.secretKey || '',
    });
  };

  const closeModal = () => {
    setActiveProvider(null);
  };

  const saveModal = () => {
    if (!activeProvider) return;
    setPayments((prev) => ({
      ...prev,
      [activeProvider]: {
        ...(prev[activeProvider] || {}),
        config: { ...modalConfig },
        status: 'connected',
      },
    }));
    closeModal();
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await axiosInstance.put('/api/store/payment-providers', { payments });
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
          {t('dashboard.storeManagement.payments.sectionTitle')}
        </h2>
      </div>
      <p className="text-gray-600 text-sm mb-2">
        {t('dashboard.storeManagement.payments.description')}
      </p>

      <div className="bg-white border border-gray-200 rounded-xl shadow-md p-6">
        <div className="space-y-3">
          {PROVIDERS.map((p) => {
            const state = payments[p.key] || {};
            const enabled = !!state.enabled;
            const status = state.status === 'connected' ? 'connected' : 'notConnected';
            return (
              <div
                key={p.key}
                className="flex flex-wrap items-center justify-between gap-3 border border-gray-100 rounded-lg px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span className="font-medium text-sm text-gray-900">
                    {p.labelKey}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      status === 'connected'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {t(
                      `dashboard.storeManagement.payments.${
                        status === 'connected' ? 'connected' : 'notConnected'
                      }`,
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-xs text-gray-700">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300"
                      checked={enabled}
                      onChange={(e) =>
                        setPayments((prev) => ({
                          ...prev,
                          [p.key]: { ...(prev[p.key] || {}), enabled: e.target.checked },
                        }))
                      }
                    />
                    {enabled
                      ? t('dashboard.storeManagement.payments.enabled')
                      : t('dashboard.storeManagement.payments.disabled')}
                  </label>
                  <button
                    type="button"
                    onClick={() => openModal(p.key)}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50"
                  >
                    {t('dashboard.storeManagement.payments.configure')}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6">
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

      {activeProvider && (
        <div
          className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center p-4"
          onClick={closeModal}
        >
          <div
            className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
            dir={isRTL ? 'rtl' : 'ltr'}
          >
            <h3 className="text-lg font-semibold text-storelaunch-dark mb-4">
              {t('dashboard.storeManagement.payments.configure')} {activeProvider}
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('dashboard.storeManagement.payments.merchantId')}
                </label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  value={modalConfig.merchantId}
                  onChange={(e) =>
                    setModalConfig((prev) => ({ ...prev, merchantId: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('dashboard.storeManagement.payments.apiKey')}
                </label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  value={modalConfig.apiKey}
                  onChange={(e) =>
                    setModalConfig((prev) => ({ ...prev, apiKey: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('dashboard.storeManagement.payments.secretKey')}
                </label>
                <input
                  type="password"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  value={modalConfig.secretKey}
                  onChange={(e) =>
                    setModalConfig((prev) => ({ ...prev, secretKey: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className={`flex gap-3 mt-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <button
                type="button"
                onClick={saveModal}
                className="flex-1 px-4 py-2 bg-storelaunch-green text-white rounded-lg text-sm font-medium hover:bg-storelaunch-deep-green"
              >
                {t('dashboard.storeManagement.payments.save')}
              </button>
              <button
                type="button"
                onClick={closeModal}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                {t('dashboard.storeManagement.payments.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentProvidersPage;

