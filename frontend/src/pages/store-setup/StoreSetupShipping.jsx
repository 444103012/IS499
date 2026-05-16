



import React, { useEffect, useState } from 'react';
import { useStoreSetup, SHIPPING_CARRIERS } from '../../context/StoreSetupContext';
import axiosInstance from '../../api/axios';

const carrierDisplayName = { smsa: 'SMSA', aramex: 'Aramex', spl: 'SPL', noShippingNeeded: 'Digital Products' };
const carrierLocalLogo = {
  smsa: '/SMSA.png',
  aramex: '/Aramex.png',
  spl: '/SPL.png',
};
// Adjust logo sizes here per carrier.
const carrierLogoSizeClass = {
  smsa: 'h-14 w-25',
  aramex: 'h-11 w-26',
  spl: 'h-20 w-24',
};
const PLAN_RANK = { basic: 0, pro: 1, advanced: 2 };

export default function StoreSetupShipping({ isRTL, t, onNext, onBack }) {
  const { storeId, selectedPlan, selectedShippingIds, toggleShipping } = useStoreSetup();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lockedCarrier, setLockedCarrier] = useState(null);
  const [subscriptionPlan, setSubscriptionPlan] = useState(null);
  const selectedPlanId = subscriptionPlan || selectedPlan || 'basic';

  const isAllowed = (carrier) => PLAN_RANK[selectedPlanId] >= PLAN_RANK[carrier.minPlan];
  const requiredPlanLabel = (plan) => (plan === 'pro'
    ? t('dashboard.storeManagement.subscriptionPlans.pro')
    : t('dashboard.storeManagement.subscriptionPlans.advanced'));

  useEffect(() => {
    let cancelled = false;
    const loadPlan = async () => {
      try {
        const { data } = await axiosInstance.get('/api/subscription');
        if (!cancelled) setSubscriptionPlan(data?.plan || null);
      } catch {
        if (!cancelled) setSubscriptionPlan(null);
      }
    };
    loadPlan();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    SHIPPING_CARRIERS.forEach((carrier) => {
      if (!isAllowed(carrier) && selectedShippingIds.includes(carrier.id)) {
        toggleShipping(carrier.id);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- drop carriers disallowed on plan downgrade
  }, [selectedPlanId]);

  const handleNext = async () => {
    if (!storeId) return;
    if (selectedShippingIds.length < 1) {
      setError(t('onboarding.shipping.atLeastOneRequired'));
      return;
    }
    setLoading(true);
    setError('');
    try {
      const providers = [];
      for (const id of selectedShippingIds) {
        if (id === 'noShippingNeeded') {
          providers.push({ carrier_name: 'Digital Products', credentials: {} });
        } else {
          providers.push({
            carrier_name: carrierDisplayName[id] || id,
            credentials: {},
          });
        }
      }
      await axiosInstance.post('/api/store-setup/shipping', { store_id: storeId, providers });
      onNext();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to save shipping');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className={`max-w-2xl mx-auto ${isRTL ? 'text-right' : 'text-left'}`}>
      <h2 className={`text-xl font-bold text-storelaunch-dark mb-6 ${isRTL ? 'text-right' : 'text-left'}`}>
        {t('onboarding.shipping.title')}
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {SHIPPING_CARRIERS.map((c) => {
          const name = isRTL ? c.nameAr : c.nameEn;
          const selected = selectedShippingIds.includes(c.id);
          const locked = !isAllowed(c);
          return (
            <div
              key={c.id}
              onClick={() => (locked ? setLockedCarrier(c) : toggleShipping(c.id))}
              className={`relative rounded-xl shadow-md p-6 border transition ${
                locked ? 'bg-gray-100 border-gray-200 opacity-85 cursor-pointer' : 'bg-white border-gray-200 hover:shadow-lg cursor-pointer'
              }`}
            >
              {locked && <div className="absolute inset-0 rounded-xl bg-white/55 pointer-events-none" />}
              {locked && (
                <div className={`absolute top-3 z-20 text-gray-500 ${isRTL ? 'left-3' : 'right-3'}`}>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>
                </div>
              )}
              <div className="relative z-10 h-14 mb-4 rounded-lg bg-white border border-gray-200 flex items-center justify-center">
                {c.logoType === 'icon' ? (
                  <svg className="w-8 h-8 text-storelaunch-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V7a2 2 0 00-2-2h-3V3H9v2H6a2 2 0 00-2 2v6m16 0H4m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5" />
                  </svg>
                ) : (
                  <img
                    src={carrierLocalLogo[c.id] || c.logoUrl}
                    alt={name}
                    className={`${carrierLogoSizeClass[c.id] || 'h-9 w-24'} object-contain`}
                  />
                )}
              </div>
              <div className="relative z-10 flex items-center justify-between gap-3">
                <span className="font-medium text-sm text-gray-900">{name}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${selected ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}`}>
                  {selected ? t('dashboard.storeManagement.payments.connected') : t('dashboard.storeManagement.payments.notConnected')}
                </span>
              </div>
              <div className="relative z-10 mt-4">
                <label className={`flex items-center gap-2 text-xs text-gray-700 ${isRTL ? 'justify-end' : ''}`}>
                  <input
                    type="checkbox"
                    className="rounded border-gray-300"
                    checked={selected}
                    disabled={locked}
                    onChange={() => !locked && toggleShipping(c.id)}
                  />
                  {selected ? t('dashboard.storeManagement.shipping.enabled') : t('dashboard.storeManagement.shipping.disabled')}
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
      {error && <p className={`mt-2 text-sm text-red-600 ${isRTL ? 'text-right' : 'text-left'}`}>{error}</p>}
      {lockedCarrier && (
        <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center p-4" onClick={() => setLockedCarrier(null)}>
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()} dir={isRTL ? 'rtl' : 'ltr'}>
            <div className="flex items-center gap-2 text-amber-600 mb-3">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>
              <h3 className="text-lg font-semibold">{t('dashboard.storeManagement.locked.title')}</h3>
            </div>
            <p className="text-sm text-gray-700 mb-5">
              {t('dashboard.storeManagement.locked.availableInPlan', { plan: requiredPlanLabel(lockedCarrier.minPlan) })}
            </p>
            <button type="button" onClick={() => setLockedCarrier(null)} className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
              {t('dashboard.storeManagement.payments.cancel')}
            </button>
          </div>
        </div>
      )}
      <div className={`mt-8 flex justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
        <button type="button" onClick={onBack} className="px-6 py-2 border border-gray-300 text-storelaunch-dark rounded-md font-medium">{t('onboarding.back')}</button>
        <button type="button" onClick={handleNext} disabled={loading} className="px-6 py-2 bg-storelaunch-green text-white rounded-md font-medium disabled:opacity-50">
          {loading ? (isRTL ? 'جاري الحفظ...' : 'Saving...') : t('onboarding.next')}
        </button>
      </div>
    </div>
  );
}
