
import React, { createContext, useContext, useState } from 'react';

const OnboardingContext = createContext(null);

const initialStoreDetails = {
  storeName: '',
  storeLogo: null,
  storeLogoPreview: null,
  storeType: '',
  storeDescription: '',
};

const initialPayment = {
  provider: '',
  credentials: {},
};

const initialShipping = {
  carrier: '',
  credentials: {},
};

export const PLANS = {
  basic: { id: 'basic', nameEn: 'Basic', nameAr: 'الأساسي', price: 0 },
  pro: { id: 'pro', nameEn: 'Pro', nameAr: 'المحترف', price: 69 },
  advanced: { id: 'advanced', nameEn: 'Advanced', nameAr: 'المتقدم', price: 199 },
};


export const THEME_TIERS = { default: 'basic', standard: 'pro', advanced: 'advanced' };

export const THEMES = [
  { id: 'default', nameEn: 'Default', nameAr: 'الافتراضي', tier: 'default', colors: ['#1FAE77', '#0A3C5A', '#FFFFFF', '#F3F4F6'] },
  { id: 'minimal', nameEn: 'Minimal', nameAr: 'بسيط', tier: 'standard', colors: ['#FFFFFF', '#000000', '#F5F5F5', '#737373'] },
  { id: 'modern', nameEn: 'Modern', nameAr: 'حديث', tier: 'standard', colors: ['#0E8F96', '#1F2937', '#F9FAFB', '#6B7280'] },
  { id: 'classic', nameEn: 'Classic', nameAr: 'كلاسيكي', tier: 'standard', colors: ['#92400E', '#FEF3C7', '#78350F', '#FCD34D'] },
  { id: 'premium', nameEn: 'Premium', nameAr: 'بريميوم', tier: 'advanced', colors: ['#1E3A5F', '#C9A227', '#2C5282', '#E2E8F0'] },
  { id: 'luxe', nameEn: 'Luxe', nameAr: 'فاخر', tier: 'advanced', colors: ['#0C7A5C', '#1E293B', '#D4AF37', '#F8FAFC'] },
];

export const PAYMENT_PROVIDERS = [
  { id: 'mada', nameEn: 'Mada', nameAr: 'مدى' },
  { id: 'stc_pay', nameEn: 'STC Pay', nameAr: 'STC Pay' },
  { id: 'apple_pay', nameEn: 'Apple Pay', nameAr: 'Apple Pay' },
];

export const SHIPPING_CARRIERS = [
  { id: 'smsa', nameEn: 'SMSA', nameAr: 'SMSA' },
  { id: 'aramex', nameEn: 'Aramex', nameAr: 'أرامكس' },
  { id: 'spl', nameEn: 'SPL', nameAr: 'SPL' },
  { id: 'dhl', nameEn: 'DHL', nameAr: 'DHL' },
];

export const STORE_TYPES = [
  { id: 'fashion', nameEn: 'Fashion', nameAr: 'أزياء' },
  { id: 'electronics', nameEn: 'Electronics', nameAr: 'إلكترونيات' },
  { id: 'food', nameEn: 'Food', nameAr: 'طعام' },
  { id: 'beauty', nameEn: 'Beauty', nameAr: 'جمال' },
  { id: 'general', nameEn: 'General', nameAr: 'عام' },
  { id: 'other', nameEn: 'Other', nameAr: 'أخرى' },
];

export function OnboardingProvider({ children }) {
  const [storeId, setStoreId] = useState(null);
  const [storeDetails, setStoreDetails] = useState(initialStoreDetails);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [selectedTheme, setSelectedTheme] = useState(null);
  const [payment, setPayment] = useState(initialPayment);
  const [shipping, setShipping] = useState(initialShipping);

  const updateStoreDetails = (updates) => {
    setStoreDetails((prev) => ({ ...prev, ...updates }));
  };

  const updatePayment = (updates) => {
    setPayment((prev) => ({ ...prev, ...updates }));
  };

  const updateShipping = (updates) => {
    setShipping((prev) => ({ ...prev, ...updates }));
  };

  const value = {
    storeId,
    setStoreId,
    storeDetails,
    updateStoreDetails,
    selectedPlan,
    setSelectedPlan,
    selectedTheme,
    setSelectedTheme,
    payment,
    updatePayment,
    shipping,
    updateShipping,
  };

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error('useOnboarding must be used within OnboardingProvider');
  return ctx;
}
