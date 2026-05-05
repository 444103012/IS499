



import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useOnboarding, PLANS, THEMES, PAYMENT_PROVIDERS, SHIPPING_CARRIERS, STORE_TYPES } from '../../context/OnboardingContext';

const ONBOARDING_COMPLETED_KEY = 'onboarding_completed';

export default function ReviewFinish({ isRTL, t, onBack }) {
  const navigate = useNavigate();
  const {
    storeDetails,
    selectedPlan,
    selectedTheme,
    payment,
    shipping,
  } = useOnboarding();

  const planLabel = selectedPlan && (isRTL ? PLANS[selectedPlan].nameAr : PLANS[selectedPlan].nameEn);
  const themeObj = selectedTheme && THEMES.find((th) => th.id === selectedTheme);
  const themeLabel = themeObj && (isRTL ? themeObj.nameAr : themeObj.nameEn);
  const paymentObj = payment.provider && PAYMENT_PROVIDERS.find((p) => p.id === payment.provider);
  const paymentLabel = paymentObj && (isRTL ? paymentObj.nameAr : paymentObj.nameEn);
  const shippingObj = shipping.carrier && SHIPPING_CARRIERS.find((c) => c.id === shipping.carrier);
  const shippingLabel = shippingObj && (isRTL ? shippingObj.nameAr : shippingObj.nameEn);
  const storeTypeObj = storeDetails.storeType && STORE_TYPES.find((s) => s.id === storeDetails.storeType);
  const storeTypeLabel = storeTypeObj && (isRTL ? storeTypeObj.nameAr : storeTypeObj.nameEn);

  const handleFinish = () => {
    localStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true');
    navigate('/dashboard');
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
          <p>{paymentLabel || '—'}</p>
        </section>
        <section>
          <h3 className="font-semibold text-storelaunch-dark mb-2">{t('onboarding.review.shipping')}</h3>
          <p>{shippingLabel || '—'}</p>
        </section>
      </div>
      <div className={`mt-4 rounded-lg border border-storelaunch-green/30 bg-storelaunch-green/5 px-4 py-3 text-sm text-storelaunch-dark ${isRTL ? 'text-right' : 'text-left'}`}>
        {isRTL
          ? 'متجرك أصبح في وضع المعاينة. استخدم "View Store" لمراجعته ثم اضغط "Go Live" ليظهر للعملاء.'
          : 'Your store is now in preview mode. Use "View Store" to review it, then click "Go Live" to make it visible to customers.'}
      </div>
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
          onClick={handleFinish}
          className="px-6 py-2 bg-storelaunch-green text-white rounded-md font-medium"
        >
          {t('onboarding.review.finishSetup')}
        </button>
      </div>
    </div>
  );
}
