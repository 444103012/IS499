import React, { useState } from 'react';
import { useStoreSetup } from '../../context/StoreSetupContext';
import axiosInstance from '../../api/axios';

const plans = [{ planKey: 'basic', popular: false }, { planKey: 'pro', popular: true }, { planKey: 'advanced', popular: false }];

export default function StoreSetupPlan({ isRTL, t, onNext, onBack }) {
  const { storeId, selectedPlan, setSelectedPlan } = useStoreSetup();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleNext = async () => {
    if (!selectedPlan || !storeId) return;
    setLoading(true);
    setError('');
    try {
      await axiosInstance.post('/api/store-setup/select-plan', { store_id: storeId, plan_type: selectedPlan });
      onNext();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to save plan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className={isRTL ? 'text-right' : 'text-left'}>
      <h2 className={`text-2xl sm:text-3xl font-bold text-storelaunch-dark mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
        {t('onboarding.choosePlan.title')}
      </h2>
      <p className={`text-gray-600 mb-6 ${isRTL ? 'text-right' : 'text-left'}`}>
        {t('pricing.subtitle')}
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
        {plans.map((plan, index) => {
          const planData = t(`pricing.plans.${plan.planKey}`, { returnObjects: true });
          const price = typeof planData === 'object' && planData !== null ? (isRTL ? (planData.priceAr ?? planData.price) : planData.price) : '';
          const currency = typeof planData === 'object' && planData !== null ? planData.currency : 'SAR';
          const period = isRTL ? '/شهر' : '/month';
          const features = typeof planData === 'object' && planData !== null && planData.features ? Object.values(planData.features) : [];
          const name = typeof planData === 'object' && planData !== null ? planData.name : plan.planKey;
          const description = typeof planData === 'object' && planData !== null ? planData.description : '';
          const isSelected = selectedPlan === plan.planKey;
          return (
            <button
              key={index}
              type="button"
              onClick={() => setSelectedPlan(plan.planKey)}
              className={`relative bg-white rounded-xl border p-6 shadow-md text-left transition-all w-full ${
                plan.popular ? 'border-storelaunch-green border-2 ring-2 ring-storelaunch-green/20' : 'border-gray-200'
              } ${isSelected ? 'ring-2 ring-storelaunch-green' : ''}`}
            >
              <h3 className={`text-xl font-bold text-storelaunch-dark mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>{name}</h3>
              <p className={`text-gray-600 text-sm mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>{description}</p>
              <div className={`mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                <span className="text-3xl font-bold text-storelaunch-dark">{price}</span>
                <span className="text-gray-600 ml-1">{currency}{plan.planKey === 'basic' ? '' : period}</span>
              </div>
              <ul className={`space-y-2 mb-6 min-h-[180px] ${isRTL ? 'text-right' : 'text-left'}`}>
                {features.map((feature, idx) => (
                  <li key={idx} className={`flex items-start gap-2 text-sm text-gray-700 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <svg className="w-4 h-4 text-storelaunch-green flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </button>
          );
        })}
      </div>
      {error && <p className={`mt-2 text-sm text-red-600 ${isRTL ? 'text-right' : 'text-left'}`}>{error}</p>}
      <div className={`mt-8 flex justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
        <button type="button" onClick={onBack} className="px-6 py-2 border border-gray-300 text-storelaunch-dark rounded-md font-medium">{t('onboarding.back')}</button>
        <button type="button" onClick={handleNext} disabled={!selectedPlan || !storeId || loading} className="px-6 py-2 bg-storelaunch-green text-white rounded-md font-medium disabled:opacity-50">
          {loading ? (isRTL ? 'جاري الحفظ...' : 'Saving...') : t('onboarding.next')}
        </button>
      </div>
    </div>
  );
}
