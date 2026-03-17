import React, { useState } from 'react';
import { useStoreSetup, PAYMENT_PROVIDERS } from '../../context/StoreSetupContext';
import axiosInstance from '../../api/axios';

const providerDisplayName = { mada: 'Mada', stc_pay: 'STC Pay', apple_pay: 'Apple Pay', stripe: 'Stripe', bank_transfer: 'Bank Transfer' };

export default function StoreSetupPayment({ isRTL, t, onNext, onBack }) {
  const {
    storeId,
    selectedPaymentIds,
    togglePayment,
    paymentCredentials,
    setPaymentCredential,
    bankTransfer,
    setBankTransfer,
  } = useStoreSetup();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleNext = async () => {
    if (!storeId) return;
    setLoading(true);
    setError('');
    try {
      const providers = [];
      for (const id of selectedPaymentIds) {
        if (id === 'bank_transfer') {
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
          const creds = paymentCredentials[id] || {};
          providers.push({
            provider_name: providerDisplayName[id] || id,
            credentials: { apiKey: creds.apiKey, secretKey: creds.secretKey },
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

  const bankSelected = selectedPaymentIds.includes('bank_transfer');

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className={`max-w-2xl mx-auto ${isRTL ? 'text-right' : 'text-left'}`}>
      <h2 className={`text-xl font-bold text-storelaunch-dark mb-6 ${isRTL ? 'text-right' : 'text-left'}`}>
        {t('onboarding.payment.title')}
      </h2>
      <div className="space-y-3">
        {PAYMENT_PROVIDERS.map((p) => {
          const name = isRTL ? p.nameAr : p.nameEn;
          const selected = selectedPaymentIds.includes(p.id);
          return (
            <div
              key={p.id}
              onClick={() => togglePayment(p.id)}
              className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                selected ? 'border-storelaunch-green bg-green-50' : 'border-gray-200 hover:border-gray-300'
              } ${isRTL ? 'flex-row-reverse' : ''}`}
            >
              <span className="text-2xl w-10 text-center">{p.logo}</span>
              <span className="flex-1 font-medium text-storelaunch-dark">{name}</span>
              <input type="checkbox" checked={selected} onChange={() => {}} className="w-5 h-5 rounded border-gray-300 text-storelaunch-green" />
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
      {selectedPaymentIds.filter((id) => id !== 'bank_transfer').length > 0 && (
        <div className="mt-4 space-y-3">
          {selectedPaymentIds.filter((id) => id !== 'bank_transfer').map((id) => {
            const p = PAYMENT_PROVIDERS.find((x) => x.id === id);
            if (!p) return null;
            const creds = paymentCredentials[id] || {};
            return (
              <div key={id} className="p-4 rounded-lg border border-gray-200 bg-white">
                <h4 className="font-medium text-storelaunch-dark mb-2">{isRTL ? p.nameAr : p.nameEn}</h4>
                <input type="text" placeholder={t('onboarding.payment.apiKeyPlaceholder')} value={creds.apiKey || ''} onChange={(e) => setPaymentCredential(id, 'apiKey', e.target.value)} className={`w-full p-2 border border-gray-300 rounded-md mb-2 ${isRTL ? 'text-right' : 'text-left'}`} />
                <input type="password" placeholder={t('onboarding.payment.secretPlaceholder')} value={creds.secretKey || ''} onChange={(e) => setPaymentCredential(id, 'secretKey', e.target.value)} className={`w-full p-2 border border-gray-300 rounded-md ${isRTL ? 'text-right' : 'text-left'}`} />
              </div>
            );
          })}
        </div>
      )}
      {error && <p className={`mt-2 text-sm text-red-600 ${isRTL ? 'text-right' : 'text-left'}`}>{error}</p>}
      <div className={`mt-8 flex justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
        <button type="button" onClick={onBack} className="px-6 py-2 border border-gray-300 text-storelaunch-dark rounded-md font-medium">{t('onboarding.back')}</button>
        <button type="button" onClick={handleNext} disabled={loading} className="px-6 py-2 bg-storelaunch-green text-white rounded-md font-medium disabled:opacity-50">
          {loading ? (isRTL ? 'جاري الحفظ...' : 'Saving...') : t('onboarding.next')}
        </button>
      </div>
    </div>
  );
}
