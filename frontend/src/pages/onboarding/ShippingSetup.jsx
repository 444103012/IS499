



import React, { useState } from 'react';
import { useOnboarding, SHIPPING_CARRIERS } from '../../context/OnboardingContext';
import axiosInstance from '../../api/axios';

export default function ShippingSetup({ isRTL, t, onNext, onBack }) {
  const { storeId, shipping, updateShipping } = useOnboarding();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCarrierChange = (e) => {
    updateShipping({ carrier: e.target.value, credentials: {} });
    setError('');
  };

  const handleCredentialChange = (key, value) => {
    updateShipping({
      credentials: { ...shipping.credentials, [key]: value },
    });
    setError('');
  };

  const handleNext = async () => {
    if (!storeId) return;
    setLoading(true);
    setError('');
    try {
      const carrierName = shipping.carrier;
      if (carrierName) {
        const nameMap = { smsa: 'SMSA', aramex: 'Aramex', spl: 'SPL', dhl: 'DHL' };
        await axiosInstance.post('/api/onboarding/shipping', {
          store_id: storeId,
          carrier_name: nameMap[carrierName] || carrierName,
          credentials: shipping.credentials || {},
        });
      }
      onNext();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to save shipping provider');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className={`max-w-lg mx-auto ${isRTL ? 'text-right' : 'text-left'}`}>
      <h2 className={`text-xl font-bold text-storelaunch-dark mb-6 ${isRTL ? 'text-right' : 'text-left'}`}>
        {t('onboarding.shipping.title')}
      </h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-storelaunch-dark mb-1">
            {t('onboarding.shipping.carrier')}
          </label>
          <select
            value={shipping.carrier}
            onChange={handleCarrierChange}
            className={`w-full p-2 border border-gray-300 rounded-md ${isRTL ? 'text-right' : 'text-left'}`}
          >
            <option value="">{t('onboarding.shipping.chooseCarrier')}</option>
            {SHIPPING_CARRIERS.map((c) => (
              <option key={c.id} value={c.id}>
                {isRTL ? c.nameAr : c.nameEn}
              </option>
            ))}
          </select>
        </div>
        {shipping.carrier && (
          <>
            <div>
              <label className="block text-sm font-medium text-storelaunch-dark mb-1">
                {t('onboarding.shipping.apiKey')}
              </label>
              <input
                type="text"
                value={shipping.credentials?.apiKey || ''}
                onChange={(e) => handleCredentialChange('apiKey', e.target.value)}
                placeholder={t('onboarding.shipping.apiKeyPlaceholder')}
                className={`w-full p-2 border border-gray-300 rounded-md ${isRTL ? 'text-right' : 'text-left'}`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-storelaunch-dark mb-1">
                {t('onboarding.shipping.password')}
              </label>
              <input
                type="password"
                value={shipping.credentials?.password || ''}
                onChange={(e) => handleCredentialChange('password', e.target.value)}
                placeholder={t('onboarding.shipping.passwordPlaceholder')}
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
