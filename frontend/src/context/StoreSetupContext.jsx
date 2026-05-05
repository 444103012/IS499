



import React, { createContext, useContext, useState, useCallback } from 'react';

const StoreSetupContext = createContext(null);

/** localStorage draft for step 1 before a store row exists (key suffix = store_owner_id). */
export function storeSetupStep1DraftKey(storeOwnerId) {
  return `sl_store_setup_step1_${storeOwnerId}`;
}

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
  { id: 'default', nameEn: 'Default', nameAr: 'الافتراضي', tier: 'default', colors: ['#1FAE77', '#0A3C5A', '#FFFFFF', '#0C7A5C', '#0E8F96'] },
  { id: 'minimal', nameEn: 'Minimal', nameAr: 'بسيط', tier: 'standard', colors: ['#64748B', '#334155', '#FFFFFF', '#111827'] },
  { id: 'modern', nameEn: 'Modern', nameAr: 'حديث', tier: 'standard', colors: ['#14B8A6', '#0F172A', '#ECFEFF', '#0F172A'] },
  { id: 'classic', nameEn: 'Najdi Sand', nameAr: 'نجدي رملي', tier: 'standard', colors: ['#B08968', '#6B4F3A', '#FAF3E8', '#3E2F23'] },
];

export const PAYMENT_PROVIDERS = [
  { id: 'bankTransfer', nameEn: 'Bank Transfer', nameAr: 'التحويل البنكي', minPlan: 'basic', logoType: 'icon' },
  { id: 'mada', nameEn: 'Mada', nameAr: 'مدى', minPlan: 'pro', logoType: 'image', logoUrl: 'https://logo.clearbit.com/mada.com.sa' },
  { id: 'stcPay', nameEn: 'STC Pay', nameAr: 'STC Pay', minPlan: 'pro', logoType: 'image', logoUrl: 'https://logo.clearbit.com/stcpay.com.sa' },
  { id: 'applePay', nameEn: 'Apple Pay', nameAr: 'Apple Pay', minPlan: 'advanced', logoType: 'image', logoUrl: 'https://logo.clearbit.com/apple.com' },
];

export const SHIPPING_CARRIERS = [
  { id: 'noShippingNeeded', nameEn: 'Digital Products', nameAr: 'منتجات رقمية', minPlan: 'basic', logoType: 'icon' },
  { id: 'smsa', nameEn: 'SMSA', nameAr: 'SMSA', minPlan: 'advanced', logoType: 'image', logoUrl: 'https://logo.clearbit.com/smsaexpress.com' },
  { id: 'aramex', nameEn: 'Aramex', nameAr: 'أرامكس', minPlan: 'advanced', logoType: 'image', logoUrl: 'https://logo.clearbit.com/aramex.com' },
  { id: 'spl', nameEn: 'SPL (Saudi Post)', nameAr: 'سبل (البريد السعودي)', minPlan: 'pro', logoType: 'image', logoUrl: 'https://logo.clearbit.com/splonline.com.sa' },
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
  const [themeBrandingSeed, setThemeBrandingSeed] = useState(null);
  const [selectedPaymentIds, setSelectedPaymentIds] = useState([]);
  const [paymentCredentials, setPaymentCredentials] = useState({});
  const [bankTransfer, setBankTransfer] = useState({ bank_name: '', account_name: '', iban: '', notes: '' });
  const [selectedShippingIds, setSelectedShippingIds] = useState([]);
  const [shippingCredentials, setShippingCredentials] = useState({});

  const updateStoreDetails = useCallback((updates) => {
    setStoreDetails((prev) => ({ ...prev, ...updates }));
  }, []);

  const clearThemeBrandingSeed = useCallback(() => setThemeBrandingSeed(null), []);

  const hydrateFromResume = useCallback((resume) => {
    if (!resume || typeof resume !== 'object') return;
    if (resume.store_details && typeof resume.store_details === 'object') {
      const d = resume.store_details;
      setStoreDetails({
        storeName: d.name != null ? String(d.name) : '',
        storeType: d.store_type != null ? String(d.store_type) : '',
        storeDescription: d.description != null ? String(d.description) : '',
        storeLogo: null,
        storeLogoPreview: d.logo_url ? String(d.logo_url) : null,
      });
    }
    if (resume.plan_type) setSelectedPlan(String(resume.plan_type).trim().toLowerCase());
    if (resume.theme) setSelectedTheme(String(resume.theme).trim().toLowerCase());
    if (resume.branding && typeof resume.branding === 'object') {
      const hasLc =
        resume.branding.layerColors && typeof resume.branding.layerColors === 'object';
      const pl = resume.branding.productLayout;
      if (hasLc || pl) {
        setThemeBrandingSeed({
          productLayout: pl || 'grid-classic',
          layerColors: hasLc ? resume.branding.layerColors : null,
        });
      }
    }
    if (Array.isArray(resume.payment_selected_ids) && resume.payment_selected_ids.length) {
      setSelectedPaymentIds([...new Set(resume.payment_selected_ids)]);
    }
    if (resume.bank_transfer && typeof resume.bank_transfer === 'object') {
      const b = resume.bank_transfer;
      setBankTransfer({
        bank_name: b.bank_name != null ? String(b.bank_name) : '',
        account_name: b.account_name != null ? String(b.account_name) : '',
        iban: b.iban != null ? String(b.iban) : '',
        notes: b.notes != null ? String(b.notes) : '',
      });
    }
    if (Array.isArray(resume.shipping_selected_ids) && resume.shipping_selected_ids.length) {
      setSelectedShippingIds([...new Set(resume.shipping_selected_ids)]);
    }
  }, []);

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
    themeBrandingSeed,
    clearThemeBrandingSeed,
    hydrateFromResume,
    selectedPaymentIds,
    setSelectedPaymentIds,
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
