
import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { StoreSetupProvider, useStoreSetup } from '../context/StoreSetupContext';
import StoreSetupProgressBar from '../components/StoreSetupProgressBar';
import StoreSetupDetails from './store-setup/StoreSetupDetails';
import StoreSetupPlan from './store-setup/StoreSetupPlan';
import StoreSetupTheme from './store-setup/StoreSetupTheme';
import StoreSetupPayment from './store-setup/StoreSetupPayment';
import StoreSetupShipping from './store-setup/StoreSetupShipping';
import StoreSetupReview from './store-setup/StoreSetupReview';
import axiosInstance from '../api/axios';

const TOTAL_STEPS = 6;
const stepComponents = [
  StoreSetupDetails,
  StoreSetupPlan,
  StoreSetupTheme,
  StoreSetupPayment,
  StoreSetupShipping,
  StoreSetupReview,
];

function StoreSetupContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const { setStoreId, hydrateFromResume } = useStoreSetup();
  const [loading, setLoading] = useState(true);
  const latestPathRef = useRef(location.pathname);

  latestPathRef.current = location.pathname;

  
  const pathStep = location.pathname.replace(/^\/store-setup\/?/, '') || '';
  const stepFromUrl = parseInt(pathStep, 10);
  const stepNum = (!Number.isNaN(stepFromUrl) && stepFromUrl >= 1 && stepFromUrl <= TOTAL_STEPS)
    ? stepFromUrl
    : 1;

  useEffect(() => {
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = i18n.language;
  }, [i18n.language, isRTL]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await axiosInstance.get('/api/store-setup/status');
        if (cancelled) return;
        const backendStep = data.setup_step != null ? Number(data.setup_step) : 0;
        if (data.store_id) setStoreId(data.store_id);
        if (data.resume) hydrateFromResume(data.resume);
        if (backendStep === 6) {
          navigate('/dashboard', { replace: true });
          setLoading(false);
          return;
        }
        const resolved = Math.min(TOTAL_STEPS, backendStep + 1);
        const pathNow = (latestPathRef.current || '').replace(/^\/store-setup\/?/, '') || '';
        const currentStep = parseInt(pathNow, 10);
        const onBareRoute = pathNow === '' || Number.isNaN(currentStep) || currentStep < 1 || currentStep > TOTAL_STEPS;
        if (onBareRoute) {
          navigate(`/store-setup/${resolved}`, { replace: true });
        }
      } catch {
        if (!cancelled) {
          const pathNow = (latestPathRef.current || '').replace(/^\/store-setup\/?/, '') || '';
          const onBareRoute = pathNow === '' || !/^[1-6]$/.test(pathNow.trim());
          if (onBareRoute) navigate('/store-setup/1', { replace: true });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [setStoreId, hydrateFromResume, navigate]);

  const goTo = (next) => {
    const n = Math.min(TOTAL_STEPS, Math.max(1, next));
    navigate(`/store-setup/${n}`);
  };

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === 'ar' ? 'en' : 'ar');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-storelaunch-dark">{isRTL ? 'جاري التحميل...' : 'Loading...'}</p>
      </div>
    );
  }

  const StepComponent = stepComponents[stepNum - 1];
  const isPlanStep = stepNum === 2;
  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className="min-h-screen bg-gray-50">
      <div className={`mx-auto px-4 sm:px-6 lg:px-8 py-8 ${isPlanStep ? 'max-w-6xl' : 'max-w-3xl'}`}>
        <div className={`flex ${isRTL ? 'justify-start' : 'justify-end'} mb-4`}>
          <button type="button" onClick={toggleLanguage} className="px-3 py-1.5 bg-storelaunch-green text-white text-sm rounded-md font-medium">
            {i18n.language === 'ar' ? 'EN' : 'AR'}
          </button>
        </div>
        <StoreSetupProgressBar currentStep={stepNum} isRTL={isRTL} />
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 md:p-8">
          <StepComponent isRTL={isRTL} t={t} onNext={() => goTo(stepNum + 1)} onBack={() => goTo(stepNum - 1)} />
        </div>
      </div>
    </div>
  );
}

export default function StoreSetupPage() {
  return (
    <StoreSetupProvider>
      <StoreSetupContent />
    </StoreSetupProvider>
  );
}
