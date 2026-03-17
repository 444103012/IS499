import React, { useState } from 'react';
import { useStoreSetup, SHIPPING_CARRIERS } from '../../context/StoreSetupContext';
import axiosInstance from '../../api/axios';

const carrierDisplayName = { smsa: 'SMSA', aramex: 'Aramex', spl: 'SPL', dhl: 'DHL', digital_only: 'Digital Only' };

export default function StoreSetupShipping({ isRTL, t, onNext, onBack }) {
  const { storeId, selectedShippingIds, toggleShipping, shippingCredentials, setShippingCredential } = useStoreSetup();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleNext = async () => {
    if (!storeId) return;
    setLoading(true);
    setError('');
    try {
      const providers = [];
      for (const id of selectedShippingIds) {
        if (id === 'digital_only') {
          providers.push({ carrier_name: 'Digital Only', credentials: {} });
        } else {
          const creds = shippingCredentials[id] || {};
          providers.push({
            carrier_name: carrierDisplayName[id] || id,
            credentials: { apiKey: creds.apiKey, password: creds.password },
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

  const hasDigitalOnly = selectedShippingIds.includes('digital_only');
  const carrierIds = SHIPPING_CARRIERS.filter((c) => !c.isDigitalOnly).map((c) => c.id);

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className={`max-w-2xl mx-auto ${isRTL ? 'text-right' : 'text-left'}`}>
      <h2 className={`text-xl font-bold text-storelaunch-dark mb-6 ${isRTL ? 'text-right' : 'text-left'}`}>
        {t('onboarding.shipping.title')}
      </h2>
      <div className="space-y-3">
        {SHIPPING_CARRIERS.map((c) => {
          const name = isRTL ? c.nameAr : c.nameEn;
          const selected = selectedShippingIds.includes(c.id);
          return (
            <div
              key={c.id}
              onClick={() => toggleShipping(c.id)}
              className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                selected ? 'border-storelaunch-green bg-green-50' : 'border-gray-200 hover:border-gray-300'
              } ${isRTL ? 'flex-row-reverse' : ''}`}
            >
              <span className="text-2xl w-10 text-center">{c.logo}</span>
              <span className="flex-1 font-medium text-storelaunch-dark">{name}</span>
              <input type="checkbox" checked={selected} onChange={() => {}} className="w-5 h-5 rounded border-gray-300 text-storelaunch-green" />
            </div>
          );
        })}
      </div>
      {selectedShippingIds.filter((id) => id !== 'digital_only').length > 0 && !hasDigitalOnly && (
        <div className="mt-4 space-y-3">
          {selectedShippingIds.filter((id) => id !== 'digital_only').map((id) => {
            const creds = shippingCredentials[id] || {};
            return (
              <div key={id} className="p-4 rounded-lg border border-gray-200 bg-white">
                <h4 className="font-medium text-storelaunch-dark mb-2">{carrierDisplayName[id]}</h4>
                <input type="text" placeholder={t('onboarding.shipping.apiKeyPlaceholder')} value={creds.apiKey || ''} onChange={(e) => setShippingCredential(id, 'apiKey', e.target.value)} className={`w-full p-2 border border-gray-300 rounded-md mb-2 ${isRTL ? 'text-right' : 'text-left'}`} />
                <input type="password" placeholder={t('onboarding.shipping.passwordPlaceholder')} value={creds.password || ''} onChange={(e) => setShippingCredential(id, 'password', e.target.value)} className={`w-full p-2 border border-gray-300 rounded-md ${isRTL ? 'text-right' : 'text-left'}`} />
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
