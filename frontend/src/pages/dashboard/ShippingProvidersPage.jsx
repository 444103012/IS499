import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../../api/axios';

const CARRIERS = [
  { key: 'noShippingNeeded', nameKey: 'noShippingNeeded', minPlan: 'basic', logoType: 'icon' },
  { key: 'smsa', nameKey: 'smsa', minPlan: 'advanced', logoType: 'image', logoUrl: '/SMSA.png' },
  { key: 'aramex', nameKey: 'aramex', minPlan: 'advanced', logoType: 'image', logoUrl: '/Aramex.png' },
  { key: 'spl', nameKey: 'spl', minPlan: 'pro', logoType: 'image', logoUrl: '/SPL.png' },
];
// Adjust logo sizes here per carrier.
const carrierLogoSizeClass = {
  smsa: 'h-14 w-25',
  aramex: 'h-11 w-26',
  spl: 'h-20 w-24',
};
const PLAN_RANK = { basic: 0, pro: 1, advanced: 2 };

const ShippingProvidersPage = () => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [shipping, setShipping] = useState({});
  const [plan, setPlan] = useState('basic');
  const [lockedCarrier, setLockedCarrier] = useState(null);

  const isProviderAllowed = (carrier) => PLAN_RANK[plan] >= PLAN_RANK[carrier.minPlan];
  const requiredPlanLabel = (requiredPlan) =>
    requiredPlan === 'pro'
      ? t('dashboard.storeManagement.subscriptionPlans.pro')
      : t('dashboard.storeManagement.subscriptionPlans.advanced');
  const enabledProviderCount = Object.values(shipping).filter((provider) => provider?.enabled).length;
  const lastProviderMessage = isRTL
    ? 'يجب أن يحتفظ المتجر بمزود شحن واحد على الأقل.'
    : 'The store must keep at least one shipping provider enabled.';
  const normalizeShipping = (raw = {}) =>
    CARRIERS.reduce((acc, carrier) => {
      acc[carrier.key] = {
        enabled: !!raw?.[carrier.key]?.enabled,
        zones: Array.isArray(raw?.[carrier.key]?.zones) ? raw[carrier.key].zones : [],
      };
      return acc;
    }, {});

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const [{ data: providersData }, { data: subscriptionData }] = await Promise.all([
          axiosInstance.get('/api/store/shipping-providers'),
          axiosInstance.get('/api/subscription'),
        ]);
        if (!cancelled) {
          setPlan(subscriptionData?.plan || 'basic');
          setShipping(normalizeShipping(providersData?.shipping || {}));
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

  const updateCarrier = (key, updater) => {
    setShipping((prev) => {
      const current = prev[key] || {};
      return {
        ...prev,
        [key]: updater(current),
      };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await axiosInstance.put('/api/store/shipping-providers', { shipping });
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
          {t('dashboard.storeManagement.shipping.sectionTitle')}
        </h2>
      </div>
      <p className="text-gray-600 text-sm mb-2">
        {t('dashboard.storeManagement.shipping.description')}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {CARRIERS.map((c) => {
          const carrier = shipping[c.key] || {};
          const enabled = !!carrier.enabled;
          const locked = !isProviderAllowed(c);
          return (
            <div
              key={c.key}
              className={`relative rounded-xl shadow-md p-6 border space-y-3 ${
                locked
                  ? 'bg-gray-100 border-gray-200 opacity-85'
                  : 'bg-white border-gray-200 hover:shadow-lg'
              }`}
              onClick={() => locked && setLockedCarrier(c)}
            >
              {locked && (
                <div className="absolute inset-0 rounded-xl bg-white/55 pointer-events-none" />
              )}
              {locked && (
                <div className={`absolute top-3 z-20 text-gray-500 ${isRTL ? 'left-3' : 'right-3'}`}>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>
                </div>
              )}
              <div className="relative z-10 h-14 rounded-lg bg-white border border-gray-200 flex items-center justify-center">
                {c.logoType === 'icon' ? (
                  <svg className="w-8 h-8 text-storelaunch-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V7a2 2 0 00-2-2h-3V3H9v2H6a2 2 0 00-2 2v6m16 0H4m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5" />
                  </svg>
                ) : c.logoType === 'image' ? (
                  <img
                    src={c.logoUrl}
                    alt={t(`dashboard.storeManagement.providers.${c.nameKey}`)}
                    className={`${carrierLogoSizeClass[c.key] || 'h-9 w-24'} object-contain`}
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : (
                  <span className={`font-semibold ${c.key === 'aramex' ? 'text-red-600 text-xl' : c.key === 'spl' ? 'text-emerald-700 text-xl' : 'text-blue-700 text-xl'}`}>
                    {c.logoText}
                  </span>
                )}
              </div>
              <div className="relative z-10 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="font-medium text-sm text-gray-900">{t(`dashboard.storeManagement.providers.${c.nameKey}`)}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${enabled ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                    {enabled
                      ? t('dashboard.storeManagement.shipping.enabled')
                      : t('dashboard.storeManagement.shipping.disabled')}
                  </span>
                </div>
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
                      updateCarrier(c.key, (carrierState) => ({
                        ...carrierState,
                        enabled: e.target.checked,
                      }));
                    }}
                  />
                  {enabled
                    ? t('dashboard.storeManagement.shipping.enabled')
                    : t('dashboard.storeManagement.shipping.disabled')}
                </label>
              </div>

              <div className="relative z-10">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    {t('dashboard.storeManagement.shipping.provider')}
                  </label>
                  <input
                    type="text"
                    disabled
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs bg-gray-50"
                    value={t(`dashboard.storeManagement.providers.${c.nameKey}`)}
                    readOnly
                  />
                </div>
              </div>
              {locked && (
                <div className={`relative z-10 mt-1 flex items-center gap-2 text-xs text-amber-700 ${isRTL ? 'justify-end' : ''}`}>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>
                  <span>{t('dashboard.storeManagement.locked.upgradeToUnlock')}</span>
                </div>
              )}
            </div>
          );
        })}
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
      {lockedCarrier && (
        <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center p-4" onClick={() => setLockedCarrier(null)}>
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()} dir={isRTL ? 'rtl' : 'ltr'}>
            <div className="flex items-center gap-2 text-amber-600 mb-3">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>
              <h3 className="text-lg font-semibold">{t('dashboard.storeManagement.locked.title')}</h3>
            </div>
            <p className="text-sm text-gray-700 mb-5">
              {t('dashboard.storeManagement.locked.availableInPlan', {
                plan: requiredPlanLabel(lockedCarrier.minPlan),
              })}
            </p>
            <button type="button" onClick={() => setLockedCarrier(null)} className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
              {t('dashboard.storeManagement.payments.cancel')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShippingProvidersPage;

