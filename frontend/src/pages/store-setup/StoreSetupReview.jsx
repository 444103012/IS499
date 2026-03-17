import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStoreSetup, PLANS, THEMES, PAYMENT_PROVIDERS, SHIPPING_CARRIERS, STORE_TYPES } from '../../context/StoreSetupContext';
import axiosInstance from '../../api/axios';

export default function StoreSetupReview({ isRTL, t, onBack }) {
  const navigate = useNavigate();
  const {
    storeDetails,
    selectedPlan,
    selectedTheme,
    selectedPaymentIds,
    bankTransfer,
    selectedShippingIds,
  } = useStoreSetup();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const planLabel = selectedPlan && (isRTL ? PLANS[selectedPlan].nameAr : PLANS[selectedPlan].nameEn);
  const themeObj = selectedTheme && THEMES.find((th) => th.id === selectedTheme);
  const themeLabel = themeObj && (isRTL ? themeObj.nameAr : themeObj.nameEn);
  const paymentLabels = selectedPaymentIds.map((id) => {
    const p = PAYMENT_PROVIDERS.find((x) => x.id === id);
    return p ? (isRTL ? p.nameAr : p.nameEn) : id;
  });
  const shippingLabels = selectedShippingIds.map((id) => {
    const c = SHIPPING_CARRIERS.find((x) => x.id === id);
    return c ? (isRTL ? c.nameAr : c.nameEn) : id;
  });
  const storeTypeObj = storeDetails.storeType && STORE_TYPES.find((s) => s.id === storeDetails.storeType);
  const storeTypeLabel = storeTypeObj && (isRTL ? storeTypeObj.nameAr : storeTypeObj.nameEn);

  const handleFinish = async () => {
    setLoading(true);
    setError('');
    try {
      await axiosInstance.post('/api/store-setup/finish');
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to finish');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className={`max-w-lg mx-auto ${isRTL ? 'text-right' : 'text-left'}`}>
      <h2 className={`text-xl font-bold text-storelaunch-dark mb-6 ${isRTL ? 'text-right' : 'text-left'}`}>
        {t('onboarding.review.title')}
      </h2>
      <div className="space-y-4 rounded-xl border border-gray-200 p-4 bg-gray-50">
        <section>
          <h3 className="font-semibold text-storelaunch-dark mb-2">{t('onboarding.review.storeDetails')}</h3>
          <p><span className="text-gray-600">{t('onboarding.storeDetails.storeName')}:</span> {storeDetails.storeName || '—'}</p>
          {storeDetails.storeType && <p><span className="text-gray-600">{t('onboarding.storeDetails.storeType')}:</span> {storeTypeLabel}</p>}
          {storeDetails.storeDescription && <p><span className="text-gray-600">{t('onboarding.storeDetails.storeDescription')}:</span> {storeDetails.storeDescription}</p>}
        </section>
        <section>
          <h3 className="font-semibold text-storelaunch-dark mb-2">{t('onboarding.review.plan')}</h3>
          <p>{planLabel || '—'}</p>
        </section>
        <section>
          <h3 className="font-semibold text-storelaunch-dark mb-2">{t('onboarding.review.theme')}</h3>
          <p>{themeLabel || '—'}</p>
        </section>
        <section>
          <h3 className="font-semibold text-storelaunch-dark mb-2">{t('onboarding.review.payment')}</h3>
          <p>{paymentLabels.length ? paymentLabels.join(', ') : '—'}</p>
        </section>
        <section>
          <h3 className="font-semibold text-storelaunch-dark mb-2">{t('onboarding.review.shipping')}</h3>
          <p>{shippingLabels.length ? shippingLabels.join(', ') : '—'}</p>
        </section>
      </div>
      {error && <p className={`mt-2 text-sm text-red-600 ${isRTL ? 'text-right' : 'text-left'}`}>{error}</p>}
      <div className={`mt-8 flex justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
        <button type="button" onClick={onBack} className="px-6 py-2 border border-gray-300 text-storelaunch-dark rounded-md font-medium">{t('onboarding.back')}</button>
        <button type="button" onClick={handleFinish} disabled={loading} className="px-6 py-2 bg-storelaunch-green text-white rounded-md font-medium disabled:opacity-50">
          {loading ? (isRTL ? 'جاري الإنهاء...' : 'Finishing...') : t('onboarding.review.finishSetup')}
        </button>
      </div>
    </div>
  );
}
