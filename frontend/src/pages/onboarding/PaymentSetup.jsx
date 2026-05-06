



import React, { useState } from 'react';
import { useOnboarding, PAYMENT_PROVIDERS } from '../../context/OnboardingContext';
import axiosInstance from '../../api/axios';

export default function PaymentSetup({ isRTL, t, onNext, onBack }) {
  const { storeId, payment, updatePayment } = useOnboarding();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleProviderChange = (e) => {
    updatePayment({ provider: e.target.value, credentials: {} });
    setError('');
  };

  const handleCredentialChange = (key, value) => {
    updatePayment({
      credentials: { ...payment.credentials, [key]: value },
    });
    setError('');
  };

  const handleNext = async () => {
    if (!storeId) return;
    setLoading(true);
    setError('');
    try {
      const providerName = payment.provider;
      if (providerName) {
        const nameMap = { mada: 'Mada', stc_pay: 'STC Pay', apple_pay: 'Apple Pay' };
        await axiosInstance.post('/api/onboarding/payment', {
          store_id: storeId,
          provider_name: nameMap[providerName] || providerName,
          credentials: payment.credentials || {},
        });
      }
      onNext();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to save payment provider');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className={`max-w-lg mx-auto ${isRTL ? 'text-right' : 'text-left'}`}>
      <h2 className={`text-xl font-bold text-storelaunch-dark mb-6 ${isRTL ? 'text-right' : 'text-left'}`}>
        {t('onboarding.payment.title')}
      </h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-storelaunch-dark mb-1">
            {t('onboarding.payment.provider')}
          </label>
          <select
            value={payment.provider}
            onChange={handleProviderChange}
            className={`w-full p-2 border border-gray-300 rounded-md ${isRTL ? 'text-right' : 'text-left'}`}
          >
            <option value="">{t('onboarding.payment.chooseProvider')}</option>
            {PAYMENT_PROVIDERS.map((p) => (
              <option key={p.id} value={p.id}>
                {isRTL ? p.nameAr : p.nameEn}
              </option>
            ))}
          </select>
        </div>
        {payment.provider && (
          <>
            <div>
              <label className="block text-sm font-medium text-storelaunch-dark mb-1">
                {t('onboarding.payment.apiKey')}
              </label>
              <input
                type="text"
                value={payment.credentials?.apiKey || ''}
                onChange={(e) => handleCredentialChange('apiKey', e.target.value)}
                placeholder={t('onboarding.payment.apiKeyPlaceholder')}
                className={`w-full p-2 border border-gray-300 rounded-md ${isRTL ? 'text-right' : 'text-left'}`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-storelaunch-dark mb-1">
                {t('onboarding.payment.secretKey')}
              </label>
              <input
                type="password"
                value={payment.credentials?.secretKey || ''}
                onChange={(e) => handleCredentialChange('secretKey', e.target.value)}
                placeholder={t('onboarding.payment.secretPlaceholder')}
                className={`w-full p-2 border border-gray-300 rounded-md ${isRTL ? 'text-right' : 'text-left'}`}
              />
            </div>
          </>
        )}
      </div>
      {error && (
        <p className={`mt-2 text-sm text-red-600 ${isRTL ? 'text-right' : 'text-left'}`}>{error}</p>
      )}
      <div className={`mt-8 flex justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
        <button
          type="button"
          onClick={onBack}
          className="px-6 py-2 border border-gray-300 text-storelaunch-dark rounded-md font-medium"
        >
          {t('onboarding.back')}
        </button>
        <button
          type="button"
          onClick={handleNext}
          disabled={loading}
          className="px-6 py-2 bg-storelaunch-green text-white rounded-md font-medium disabled:opacity-50"
        >
          {loading ? (isRTL ? 'جاري الحفظ...' : 'Saving...') : t('onboarding.next')}
        </button>
      </div>
    </div>
  );
}
