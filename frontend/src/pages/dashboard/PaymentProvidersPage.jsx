import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../../api/axios';

const PROVIDERS = [
  { key: 'bankTransfer', nameKey: 'bankTransfer', minPlan: 'basic', logoType: 'icon', logoUrl: '/Bank.png' },
  { key: 'mada', nameKey: 'mada', minPlan: 'pro', logoType: 'image', logoUrl: '/Mada.png' },
  { key: 'stcPay', nameKey: 'stcPay', minPlan: 'pro', logoType: 'image', logoUrl: '/STCBank.png' },
  { key: 'applePay', nameKey: 'applePay', minPlan: 'advanced', logoType: 'image', logoUrl: '/ApplePay.png' },
];
// Adjust logo sizes here per provider.
const providerLogoSizeClass = {
  bankTransfer: 'h-18 w-28',
  mada: 'h-17 w-24',
  stcPay: 'h-18 w-24',
  applePay: 'h-12 w-24',
};
const PLAN_RANK = { basic: 0, pro: 1, advanced: 2 };

const PaymentProvidersPage = () => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [payments, setPayments] = useState({});
  const [plan, setPlan] = useState('basic');
  const [lockedProvider, setLockedProvider] = useState(null);

  const isProviderAllowed = (provider) => PLAN_RANK[plan] >= PLAN_RANK[provider.minPlan];
  const requiredPlanLabel = (requiredPlan) =>
    requiredPlan === 'pro'
      ? t('dashboard.storeManagement.subscriptionPlans.pro')
      : t('dashboard.storeManagement.subscriptionPlans.advanced');
  const enabledProviderCount = Object.values(payments).filter((provider) => provider?.enabled).length;
  const lastProviderMessage = isRTL
    ? 'يجب أن يحتفظ المتجر بمزود دفع واحد على الأقل.'
    : 'The store must keep at least one payment provider enabled.';

  const normalizePayments = (raw = {}) =>
    PROVIDERS.reduce((acc, provider) => {
      acc[provider.key] = {
        enabled: !!raw?.[provider.key]?.enabled,
        status: raw?.[provider.key]?.status || 'notConnected',
        config: raw?.[provider.key]?.config || {},
      };
      return acc;
    }, {});

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const [{ data: providersData }, { data: subscriptionData }] = await Promise.all([
          axiosInstance.get('/api/store/payment-providers'),
          axiosInstance.get('/api/subscription'),
        ]);
        if (!cancelled) {
          setPlan(subscriptionData?.plan || 'basic');
          setPayments(normalizePayments(providersData?.payments || {}));
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

  const closeModal = () => {
    setLockedProvider(null);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await axiosInstance.put('/api/store/payment-providers', { payments });
      showToast('success', t('dashboard.storeManagement.toast.saveSuccess'));
    } catch (err) {
      if (err.response?.status === 403 && err.response?.data?.requiredPlan) {
        showToast(
          'error',
          t('dashboard.storeManagement.locked.availableInPlan', {
            plan: requiredPlanLabel(err.response.data.requiredPlan),
          }),
        );
      } else {
        showToast('error', err.response?.data?.message || err.response?.data?.error || t('dashboard.storeManagement.toast.saveError'));
      }
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

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {PROVIDERS.map((p) => {
            const state = payments[p.key] || {};
            const enabled = !!state.enabled;
            const locked = !isProviderAllowed(p);
            return (
              <div
                key={p.key}
                className={`relative rounded-xl shadow-md p-6 border transition ${
                  locked
                    ? 'bg-gray-100 border-gray-200 opacity-85'
                    : 'bg-white border-gray-200 hover:shadow-lg'
                }`}
                onClick={() => locked && setLockedProvider(p)}
              >
                {locked && (
                  <div className="absolute inset-0 rounded-xl bg-white/55 pointer-events-none" />
                )}
                {locked && (
                  <div className={`absolute top-3 z-20 text-gray-500 ${isRTL ? 'left-3' : 'right-3'}`}>
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>
                  </div>
                )}
                <div className="relative z-10">
                  <div className="h-14 mb-4 rounded-lg bg-white border border-gray-200 flex items-center justify-center">
                    {p.logoType === 'icon' ? (
                      <svg className="w-8 h-8 text-storelaunch-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M6 15h.01M10 15h2m-7 4h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    ) : p.logoType === 'image' ? (
                      <img
                        src={p.logoUrl}
                        alt={t(`dashboard.storeManagement.providers.${p.nameKey}`)}
                        className={`${providerLogoSizeClass[p.key] || 'h-9 w-24'} object-contain`}
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : null}
                  </div>
                </div>
                <div className="relative z-10 flex items-center justify-between gap-3">
                  <span className="font-medium text-sm text-gray-900">{t(`dashboard.storeManagement.providers.${p.nameKey}`)}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      enabled ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {enabled
                      ? t('dashboard.storeManagement.payments.enabled')
                      : t('dashboard.storeManagement.payments.disabled')}
                  </span>
                </div>
                <div className="relative z-10 mt-4 flex items-center justify-between gap-3">
                  <label className="flex items-center gap-2 text-xs text-gray-700">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300"
                      checked={enabled}
                      disabled={locked}
                      onChange={(e) => {
                        if (!e.target.checked && enabledProviderCount <= 1) {
                          showToast('error', lastProviderMessage);
                          return;
                        }
                        setPayments((prev) => ({
                          ...prev,
                          [p.key]: { ...(prev[p.key] || {}), enabled: e.target.checked },
                        }));
                      }}
                    />
                    {enabled
                      ? t('dashboard.storeManagement.payments.enabled')
                      : t('dashboard.storeManagement.payments.disabled')}
                  </label>
                </div>
                {locked && (
                  <div className={`relative z-10 mt-3 flex items-center gap-2 text-xs text-amber-700 ${isRTL ? 'justify-end' : ''}`}>
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>
                    <span>{t('dashboard.storeManagement.locked.upgradeToUnlock')}</span>
                  </div>
                )}
              </div>
            );
          })}
      </div>
      <div className="mt-1">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-storelaunch-green text-white rounded-lg text-sm font-medium hover:bg-storelaunch-deep-green disabled:opacity-50"
        >
          {t('dashboard.storeManagement.actions.saveChanges')}
        </button>
      </div>

      {lockedProvider && (
        <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center p-4" onClick={closeModal}>
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()} dir={isRTL ? 'rtl' : 'ltr'}>
            <div className="flex items-center gap-2 text-amber-600 mb-3">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>
              <h3 className="text-lg font-semibold">{t('dashboard.storeManagement.locked.title')}</h3>
            </div>
            <p className="text-sm text-gray-700 mb-5">
              {t('dashboard.storeManagement.locked.availableInPlan', {
                plan: requiredPlanLabel(lockedProvider.minPlan),
              })}
            </p>
            <button type="button" onClick={closeModal} className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
              {t('dashboard.storeManagement.payments.cancel')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentProvidersPage;

