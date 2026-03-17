import React, { createContext, useContext, useState } from 'react';

const StoreSetupContext = createContext(null);

const initialStoreDetails = {
  storeName: '',
  storeLogo: null,
  storeLogoPreview: null,
  storeType: '',
  storeDescription: '',
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
  { id: 'mada', nameEn: 'Mada', nameAr: 'مدى', logo: '💳' },
  { id: 'stc_pay', nameEn: 'STC Pay', nameAr: 'STC Pay', logo: '📱' },
  { id: 'apple_pay', nameEn: 'Apple Pay', nameAr: 'Apple Pay', logo: '🍎' },
  { id: 'stripe', nameEn: 'Stripe', nameAr: 'Stripe', logo: '💳' },
  { id: 'bank_transfer', nameEn: 'Bank Transfer', nameAr: 'تحويل بنكي', logo: '🏦', isBankTransfer: true },
];

export const SHIPPING_CARRIERS = [
  { id: 'smsa', nameEn: 'SMSA', nameAr: 'SMSA', logo: '📦' },
  { id: 'aramex', nameEn: 'Aramex', nameAr: 'أرامكس', logo: '📦' },
  { id: 'spl', nameEn: 'SPL', nameAr: 'SPL', logo: '📦' },
  { id: 'dhl', nameEn: 'DHL', nameAr: 'DHL', logo: '📦' },
  { id: 'digital_only', nameEn: 'No shipping needed (digital products only)', nameAr: 'لا شحن (منتجات رقمية فقط)', logo: '📲', isDigitalOnly: true },
];

export const STORE_TYPES = [
  { id: 'fashion', nameEn: 'Fashion', nameAr: 'أزياء' },
  { id: 'electronics', nameEn: 'Electronics', nameAr: 'إلكترونيات' },
  { id: 'food', nameEn: 'Food', nameAr: 'طعام' },
  { id: 'beauty', nameEn: 'Beauty', nameAr: 'جمال' },
  { id: 'general', nameEn: 'General', nameAr: 'عام' },
  { id: 'other', nameEn: 'Other', nameAr: 'أخرى' },
];

export function StoreSetupProvider({ children }) {
  const [storeId, setStoreId] = useState(null);
  const [storeDetails, setStoreDetails] = useState(initialStoreDetails);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [selectedTheme, setSelectedTheme] = useState(null);
  const [selectedPaymentIds, setSelectedPaymentIds] = useState([]);
  const [paymentCredentials, setPaymentCredentials] = useState({});
  const [bankTransfer, setBankTransfer] = useState({ bank_name: '', account_name: '', iban: '', notes: '' });
  const [selectedShippingIds, setSelectedShippingIds] = useState([]);
  const [shippingCredentials, setShippingCredentials] = useState({});

  const updateStoreDetails = (updates) => setStoreDetails((prev) => ({ ...prev, ...updates }));

  const togglePayment = (id) => {
    setSelectedPaymentIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const setPaymentCredential = (id, key, value) => {
    setPaymentCredentials((prev) => ({
      ...prev,
      [id]: { ...(prev[id] || {}), [key]: value },
    }));
  };

  const toggleShipping = (id) => {
    setSelectedShippingIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const setShippingCredential = (id, key, value) => {
    setShippingCredentials((prev) => ({
      ...prev,
      [id]: { ...(prev[id] || {}), [key]: value },
    }));
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
    selectedPaymentIds,
    togglePayment,
    paymentCredentials,
    setPaymentCredential,
    bankTransfer,
    setBankTransfer,
    selectedShippingIds,
    toggleShipping,
    shippingCredentials,
    setShippingCredential,
  };

  return (
    <StoreSetupContext.Provider value={value}>
      {children}
    </StoreSetupContext.Provider>
  );
}

export function useStoreSetup() {
  const ctx = useContext(StoreSetupContext);
  if (!ctx) throw new Error('useStoreSetup must be used within StoreSetupProvider');
  return ctx;
}
