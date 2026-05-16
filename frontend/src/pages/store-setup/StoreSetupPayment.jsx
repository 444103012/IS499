



import React, { useEffect, useState } from 'react';
import { useStoreSetup, PAYMENT_PROVIDERS } from '../../context/StoreSetupContext';
import axiosInstance from '../../api/axios';

const providerDisplayName = {
  bankTransfer: 'Bank Transfer',
  mada: 'Mada',
  stcPay: 'STC Pay',
  applePay: 'Apple Pay',
};
const providerLocalLogo = {
  bankTransfer: '/Bank.png',
  mada: '/Mada.png',
  stcPay: '/STCBank.png',
  applePay: '/ApplePay.png',
};
// Adjust logo sizes here per provider.
const providerLogoSizeClass = {
  bankTransfer: 'h-9 w-16',
  mada: 'h-10 w-24',
  stcPay: 'h-10 w-24',
  applePay: 'h-9 w-24',
};
const PLAN_RANK = { basic: 0, pro: 1, advanced: 2 };

export default function StoreSetupPayment({ isRTL, t, onNext, onBack }) {
  const {
    storeId,
    selectedPlan,
    selectedPaymentIds,
    togglePayment,
    bankTransfer,
    setBankTransfer,
  } = useStoreSetup();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lockedProvider, setLockedProvider] = useState(null);
  const [subscriptionPlan, setSubscriptionPlan] = useState(null);
  const selectedPlanId = subscriptionPlan || selectedPlan || 'basic';

  const isAllowed = (provider) => PLAN_RANK[selectedPlanId] >= PLAN_RANK[provider.minPlan];
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
    PAYMENT_PROVIDERS.forEach((provider) => {
      if (!isAllowed(provider) && selectedPaymentIds.includes(provider.id)) {
        togglePayment(provider.id);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- drop providers disallowed on plan downgrade
  }, [selectedPlanId]);

  const handleNext = async () => {
    if (!storeId) return;
    if (selectedPaymentIds.length < 1) {
      setError(t('onboarding.payment.atLeastOneRequired'));
      return;
    }
    setLoading(true);
    setError('');
    try {
      const providers = [];
      for (const id of selectedPaymentIds) {
        if (id === 'bankTransfer') {
          providers.push({
            provider_name: 'Bank Transfer',
            credentials: {
              bank_name: bankTransfer.bank_name,
              account_name: bankTransfer.account_name,
              iban: bankTransfer.iban,
              notes: bankTransfer.notes,
            },
          });
        } else {
          providers.push({
            provider_name: providerDisplayName[id] || id,
            credentials: {},
          });
        }
      }
      await axiosInstance.post('/api/store-setup/payment', { store_id: storeId, providers });
      onNext();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to save payment');
    } finally {
      setLoading(false);
    }
  };

  const bankSelected = selectedPaymentIds.includes('bankTransfer');

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className={`max-w-2xl mx-auto ${isRTL ? 'text-right' : 'text-left'}`}>
      <h2 className={`text-xl font-bold text-storelaunch-dark mb-6 ${isRTL ? 'text-right' : 'text-left'}`}>
        {t('onboarding.payment.title')}
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {PAYMENT_PROVIDERS.map((p) => {
          const name = isRTL ? p.nameAr : p.nameEn;
          const selected = selectedPaymentIds.includes(p.id);
          const locked = !isAllowed(p);
          return (
            <div
              key={p.id}
              onClick={() => (locked ? setLockedProvider(p) : togglePayment(p.id))}
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
                {providerLocalLogo[p.id] ? (
                  <img
                    src={providerLocalLogo[p.id]}
                    alt={name}
                    className={`${providerLogoSizeClass[p.id] || 'h-9 w-24'} object-contain`}
                  />
                ) : p.logoType === 'icon' ? (
                  <svg className="w-8 h-8 text-storelaunch-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M6 15h.01M10 15h2m-7 4h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                ) : (
                  <img
                    src={p.logoUrl}
                    alt={name}
                    className={`${providerLogoSizeClass[p.id] || 'h-9 w-24'} object-contain`}
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
                    onChange={() => !locked && togglePayment(p.id)}
                  />
                  {selected ? t('dashboard.storeManagement.payments.enabled') : t('dashboard.storeManagement.payments.disabled')}
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
      {bankSelected && (
        <div className="mt-6 p-4 rounded-xl border border-gray-200 bg-gray-50 space-y-3">
          <h3 className="font-semibold text-storelaunch-dark">{isRTL ? 'تفاصيل التحويل البنكي' : 'Bank Transfer Details'}</h3>
          <div>
            <label className="block text-sm font-medium text-storelaunch-dark mb-1">{isRTL ? 'اسم البنك' : 'Bank Name'}</label>
            <input type="text" value={bankTransfer.bank_name} onChange={(e) => setBankTransfer((prev) => ({ ...prev, bank_name: e.target.value }))} className={`w-full p-2 border border-gray-300 rounded-md ${isRTL ? 'text-right' : 'text-left'}`} />
          </div>
          <div>
            <label className="block text-sm font-medium text-storelaunch-dark mb-1">{isRTL ? 'اسم صاحب الحساب' : 'Account Holder Name'}</label>
            <input type="text" value={bankTransfer.account_name} onChange={(e) => setBankTransfer((prev) => ({ ...prev, account_name: e.target.value }))} className={`w-full p-2 border border-gray-300 rounded-md ${isRTL ? 'text-right' : 'text-left'}`} />
          </div>
          <div>
            <label className="block text-sm font-medium text-storelaunch-dark mb-1">IBAN</label>
            <input type="text" value={bankTransfer.iban} onChange={(e) => setBankTransfer((prev) => ({ ...prev, iban: e.target.value }))} className={`w-full p-2 border border-gray-300 rounded-md ${isRTL ? 'text-right' : 'text-left'}`} />
          </div>
          <div>
            <label className="block text-sm font-medium text-storelaunch-dark mb-1">{isRTL ? 'ملاحظات إضافية' : 'Additional Notes'}</label>
            <textarea value={bankTransfer.notes} onChange={(e) => setBankTransfer((prev) => ({ ...prev, notes: e.target.value }))} rows={2} className={`w-full p-2 border border-gray-300 rounded-md resize-none ${isRTL ? 'text-right' : 'text-left'}`} />
          </div>
        </div>
      )}
      {error && <p className={`mt-2 text-sm text-red-600 ${isRTL ? 'text-right' : 'text-left'}`}>{error}</p>}
      {lockedProvider && (
        <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center p-4" onClick={() => setLockedProvider(null)}>
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()} dir={isRTL ? 'rtl' : 'ltr'}>
            <div className="flex items-center gap-2 text-amber-600 mb-3">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>
              <h3 className="text-lg font-semibold">{t('dashboard.storeManagement.locked.title')}</h3>
            </div>
            <p className="text-sm text-gray-700 mb-5">
              {t('dashboard.storeManagement.locked.availableInPlan', { plan: requiredPlanLabel(lockedProvider.minPlan) })}
            </p>
            <button type="button" onClick={() => setLockedProvider(null)} className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
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
