import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { OnboardingProvider } from '../context/OnboardingContext';
import OnboardingProgressBar from '../components/OnboardingProgressBar';
import StoreDetails from './onboarding/StoreDetails';
import ChoosePlan from './onboarding/ChoosePlan';
import ChooseTheme from './onboarding/ChooseTheme';
import PaymentSetup from './onboarding/PaymentSetup';
import ShippingSetup from './onboarding/ShippingSetup';
import ReviewFinish from './onboarding/ReviewFinish';

const TOTAL_STEPS = 6;

function OnboardingContent() {
  const { step } = useParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const stepNum = Math.min(TOTAL_STEPS, Math.max(1, parseInt(step || '1', 10) || 1));

  useEffect(() => {
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = i18n.language;
  }, [i18n.language, isRTL]);

  useEffect(() => {
    if (!step || step !== String(stepNum)) {
      navigate(`/onboarding/${stepNum}`, { replace: true });
    }
  }, [step, stepNum, navigate]);

  const goTo = (next) => {
    const n = Math.min(TOTAL_STEPS, Math.max(1, next));
    navigate(`/onboarding/${n}`);
  };

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === 'ar' ? 'en' : 'ar');
  };

  const stepComponents = [
    StoreDetails,
    ChoosePlan,
    ChooseTheme,
    PaymentSetup,
    ShippingSetup,
    ReviewFinish,
  ];
  const StepComponent = stepComponents[stepNum - 1];

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className={`flex ${isRTL ? 'justify-start' : 'justify-end'} mb-4`}>
          <button
            type="button"
            onClick={toggleLanguage}
            className="px-3 py-1.5 bg-storelaunch-green text-white text-sm rounded-md font-medium"
          >
            {i18n.language === 'ar' ? 'EN' : 'AR'}
          </button>
        </div>
        <OnboardingProgressBar currentStep={stepNum} isRTL={isRTL} />
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 md:p-8">
          <StepComponent
            isRTL={isRTL}
            t={t}
            onNext={() => goTo(stepNum + 1)}
            onBack={() => goTo(stepNum - 1)}
          />
        </div>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <OnboardingProvider>
      <OnboardingContent />
    </OnboardingProvider>
  );
}
