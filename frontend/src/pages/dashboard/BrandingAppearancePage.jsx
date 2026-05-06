import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../../api/axios';
import { THEMES } from '../../context/StoreSetupContext';
import CurrencyAmount from '../../components/common/CurrencyAmount';

const PLAN_RANK = { basic: 0, pro: 1, advanced: 2 };

const layoutOptions = [
  {
    id: 'grid-classic',
    nameEn: 'Classic Grid',
    nameAr: 'شبكة كلاسيكية',
    descriptionEn: 'Balanced cards in a standard storefront grid.',
    descriptionAr: 'بطاقات متوازنة في شبكة عرض كلاسيكية.',
    minPlan: 'basic',
  },
  {
    id: 'compact-list',
    nameEn: 'Compact List',
    nameAr: 'قائمة مدمجة',
    descriptionEn: 'Dense list rows for fast product browsing.',
    descriptionAr: 'صفوف مدمجة لتصفح سريع للمنتجات.',
    minPlan: 'pro',
  },
];

const themeMeta = {
  default: {
    subtitleEn: 'Clean and familiar storefront experience.',
    subtitleAr: 'تجربة متجر بسيطة ومألوفة.',
    styleEn: 'Balanced spacing',
    styleAr: 'مسافات متوازنة',
  },
  minimal: {
    subtitleEn: 'Lightweight style with calm neutral tones.',
    subtitleAr: 'طابع بسيط بألوان هادئة ومحايدة.',
    styleEn: 'Minimal visual noise',
    styleAr: 'بساطة بصرية عالية',
  },
  modern: {
    subtitleEn: 'Fresh modern look with bold highlights.',
    subtitleAr: 'مظهر حديث بإبرازات واضحة.',
    styleEn: 'Contemporary contrast',
    styleAr: 'تباين عصري',
  },
  classic: {
    subtitleEn: 'Light Najdi-inspired beige palette with modern calm.',
    subtitleAr: 'لوحة بيج فاتحة مستوحاة من الطابع النجدي بلمسة حديثة.',
    styleEn: 'Najdi modern beige',
    styleAr: 'نجدي حديث بلون بيج',
  },
};

const colorSections = [
  { key: 'topBar', labelEn: 'Top Bar', labelAr: 'الشريط العلوي' },
  { key: 'buttons', labelEn: 'Buttons', labelAr: 'الأزرار' },
  { key: 'buttonText', labelEn: 'Button Text', labelAr: 'نص الزر' },
  { key: 'background', labelEn: 'Background', labelAr: 'الخلفية' },
  { key: 'text', labelEn: 'Text', labelAr: 'النص' },
  { key: 'priceLabels', labelEn: 'Price Labels', labelAr: 'تسعير المنتجات' },
  { key: 'badges', labelEn: 'Tags', labelAr: 'الوسوم' },
  { key: 'badgeText', labelEn: 'Tags Text', labelAr: 'نص الوسوم' },
  { key: 'productCard', labelEn: 'Product Card Background', labelAr: 'خلفية بطاقة المنتج' },
];

const themeRequiredPlans = {
  default: 'basic',
  minimal: 'pro',
  modern: 'pro',
  classic: 'advanced',
};

const colorSectionMinPlan = {
  topBar: 'pro',
  buttons: 'pro',
  buttonText: 'pro',
  text: 'pro',
  background: 'advanced',
  priceLabels: 'advanced',
  badges: 'advanced',
  badgeText: 'advanced',
  productCard: 'advanced',
};

const planNames = {
  basic: { en: 'Free', ar: 'مجاني' },
  pro: { en: 'Pro', ar: 'المحترف' },
  advanced: { en: 'Advanced', ar: 'المتقدم' },
};

const productCardDefaults = {
  default: '#FFFFFF',
  minimal: '#F8FAFC',
  modern: '#FFFFFF',
  classic: '#FFFFFF',
};

const BrandingAppearancePage = () => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [store, setStore] = useState(null);
  const [selectedPlanId, setSelectedPlanId] = useState('basic');
  const [selectedTheme, setSelectedTheme] = useState('default');
  const [selectedLayout, setSelectedLayout] = useState('grid-classic');
  const [layerColors, setLayerColors] = useState({
    topBar: '#0A3C5A',
    buttons: '#1FAE77',
    buttonText: '#FFFFFF',
    background: '#F9FAFB',
    text: '#111827',
    priceLabels: '#047857',
    badges: '#F59E0B',
    badgeText: '#FFFFFF',
    productCard: '#FFFFFF',
  });

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const [{ data }, { data: subscriptionData }] = await Promise.all([
          axiosInstance.get('/api/store'),
          axiosInstance.get('/api/subscription'),
        ]);
        if (!cancelled) {
          const branding = data.settings?.branding || {};
          const storeTheme = data.store?.theme || 'default';
          setStore(data.store);
          setSelectedPlanId(subscriptionData?.plan || 'basic');
          setSelectedTheme(storeTheme);
          setSelectedLayout(branding.productLayout || 'grid-classic');
          setLayerColors((prev) => ({
            ...prev,
            ...(branding.layerColors || {}),
            badgeText: '#FFFFFF',
            productCard: branding.layerColors?.productCard || productCardDefaults[storeTheme] || '#FFFFFF',
          }));
        }
      } catch {
        if (!cancelled) {
          setToast({ type: 'error', message: t('dashboard.storeManagement.toast.saveError') });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [t]);

  const applyThemeDefaults = (themeId) => {
    const selectedThemeConfig = THEMES.find((theme) => theme.id === themeId);
    if (!selectedThemeConfig) return;
    setLayerColors((prev) => ({
      ...prev,
      topBar: selectedThemeConfig.colors?.[1] || prev.topBar,
      buttons: selectedThemeConfig.colors?.[0] || prev.buttons,
      background: selectedThemeConfig.colors?.[2] || prev.background,
      text: selectedThemeConfig.colors?.[3] || prev.text,
      priceLabels: selectedThemeConfig.colors?.[0] || prev.priceLabels,
      badges: selectedThemeConfig.colors?.[1] || prev.badges,
      badgeText: '#FFFFFF',
      productCard: productCardDefaults[selectedThemeConfig.id] || '#FFFFFF',
    }));
  };

  useEffect(() => {
    const selectedLayoutConfig = layoutOptions.find((layout) => layout.id === selectedLayout);
    if (selectedLayoutConfig && PLAN_RANK[selectedPlanId] >= PLAN_RANK[selectedLayoutConfig.minPlan]) {
      return;
    }
    const fallback = layoutOptions.find((layout) => PLAN_RANK[selectedPlanId] >= PLAN_RANK[layout.minPlan]);
    if (fallback) setSelectedLayout(fallback.id);
  }, [selectedPlanId, selectedLayout]);

  useEffect(() => {
    const requiredPlan = themeRequiredPlans[selectedTheme] || 'pro';
    if (PLAN_RANK[selectedPlanId] >= PLAN_RANK[requiredPlan]) return;
    const firstEnabled = THEMES.find((theme) => PLAN_RANK[selectedPlanId] >= PLAN_RANK[themeRequiredPlans[theme.id] || 'pro']);
    if (firstEnabled) setSelectedTheme(firstEnabled.id);
  }, [selectedPlanId, selectedTheme]);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await axiosInstance.put('/api/store/theme', {
        theme: selectedTheme,
        branding: {
          productLayout: selectedLayout,
          layerColors,
        },
      });
      showToast('success', t('dashboard.storeManagement.toast.saveSuccess'));
    } catch {
      showToast('error', t('dashboard.storeManagement.toast.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const getRequiredPlanLabel = (requiredPlan) => (isRTL ? planNames[requiredPlan].ar : planNames[requiredPlan].en);
  const canCustomizeColors = selectedPlanId !== 'basic';
  const previewProducts = useMemo(
    () => [
      { id: 1, name: isRTL ? 'سماعات ابل ايربودز' : 'Apple Airpods', price: '549.00' },
      { id: 2, name: isRTL ? 'ساعة ذكية' : 'Smart Watch', price: '899.00' },
      { id: 3, name: isRTL ? 'لابتوب' : 'Laptop', price: '1099.00' },
    ],
    [isRTL],
  );

  if (loading) {
    return (
      <div className="p-4 text-gray-500" dir={isRTL ? 'rtl' : 'ltr'}>
        {t('dashboard.productForm.loadingProduct')}
      </div>
    );
  }

  if (!store) {
    return (
      <div className="p-4 text-gray-500" dir={isRTL ? 'rtl' : 'ltr'}>
        {t('dashboard.subscriptionPage.noStore')}
      </div>
    );
  }

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {toast && (
        <div
          className={`fixed top-4 ${isRTL ? 'left-4' : 'right-4'} z-50 px-4 py-3 rounded-lg shadow-lg text-white ${
            toast.type === 'error' ? 'bg-red-500' : 'bg-storelaunch-green'
          }`}
        >
          {toast.message}
        </div>
      )}

      {}
      <div className={`flex items-center gap-3 mb-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <button
          type="button"
          onClick={() => navigate('/dashboard/store')}
          className="inline-flex items-center gap-1 text-sm text-storelaunch-dark hover:underline"
        >
          {isRTL ? (
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M9 5l7 7-7 7" />
            </svg>
          ) : (
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M15 19l-7-7 7-7" />
            </svg>
          )}
          {t('dashboard.storeManagement.back')}
        </button>
        <h2 className="text-storelaunch-dark font-bold text-2xl">
          {t('dashboard.storeManagement.branding.sectionTitle')}
        </h2>
      </div>

      <div className="space-y-6">
        <section className="rounded-2xl border border-gray-200 bg-white p-4 md:p-5">
          <h3 className={`text-sm font-semibold text-gray-700 mb-3 ${isRTL ? 'text-right' : 'text-left'}`}>
            {isRTL ? 'تخطيط عرض المنتجات' : 'Storefront Product Layout'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {layoutOptions.map((layout) => {
              const enabled = PLAN_RANK[selectedPlanId] >= PLAN_RANK[layout.minPlan];
              return (
                <button
                  key={layout.id}
                  type="button"
                  onClick={() => enabled && setSelectedLayout(layout.id)}
                  disabled={!enabled}
                  className={`relative rounded-xl border p-3 transition ${
                    selectedLayout === layout.id
                      ? 'border-storelaunch-green bg-green-50'
                      : 'border-gray-200 hover:border-storelaunch-green/50'
                  } ${!enabled ? 'opacity-55 cursor-not-allowed' : ''}`}
                >
                  {!enabled && (
                    <div className={`absolute top-2 w-5 h-5 text-gray-400 ${isRTL ? 'left-2' : 'right-2'}`} aria-hidden>
                      <svg fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>
                    </div>
                  )}
                  <p className={`text-sm font-semibold text-storelaunch-dark ${isRTL ? 'text-right' : 'text-left'}`}>
                    {isRTL ? layout.nameAr : layout.nameEn}
                  </p>
                  <p className={`mt-1 text-xs text-gray-500 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {isRTL ? layout.descriptionAr : layout.descriptionEn}
                  </p>
                  {!enabled && (
                    <p className={`mt-2 text-xs text-gray-500 ${isRTL ? 'text-right' : 'text-left'}`}>
                      {t('onboarding.chooseTheme.requiresPlan')} {getRequiredPlanLabel(layout.minPlan)}
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-4 md:p-5">
          <div className={`mb-3 ${isRTL ? 'text-right' : 'text-left'}`}>
            <h3 className="text-sm font-semibold text-gray-700">
              {isRTL ? 'قوالب المتجر' : 'Store Themes'}
            </h3>
            <p className="mt-1 text-xs text-gray-500">
              {isRTL ? 'كل قالب يعرض طابعًا بصريًا مختلفًا مع نفس بنية المتجر.' : 'Each theme gives your storefront a distinct visual identity with the same core layout.'}
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {THEMES.map((theme) => {
              const requiredPlan = themeRequiredPlans[theme.id] || 'pro';
              const enabled = PLAN_RANK[selectedPlanId] >= PLAN_RANK[requiredPlan];
              const meta = themeMeta[theme.id] || themeMeta.default;
              const name = isRTL ? theme.nameAr : theme.nameEn;
              return (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => {
                    if (!enabled) return;
                    setSelectedTheme(theme.id);
                    applyThemeDefaults(theme.id);
                  }}
                  disabled={!enabled}
                  className={`relative p-4 rounded-xl border-2 transition-all ${
                    selectedTheme === theme.id ? 'border-storelaunch-green bg-green-50' : 'border-gray-200'
                  } ${!enabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-storelaunch-green/50'}`}
                >
                  {!enabled && (
                    <div className={`absolute top-2 w-5 h-5 text-gray-400 ${isRTL ? 'left-2' : 'right-2'}`} aria-hidden>
                      <svg fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>
                    </div>
                  )}
                  <div className={`flex items-center justify-between gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <div className={`font-bold text-storelaunch-dark ${isRTL ? 'text-right' : 'text-left'}`}>{name}</div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      requiredPlan === 'basic'
                        ? 'bg-emerald-100 text-emerald-700'
                        : requiredPlan === 'pro'
                          ? 'bg-sky-100 text-sky-700'
                          : 'bg-violet-100 text-violet-700'
                    }`}>
                      {requiredPlan === 'basic'
                        ? (isRTL ? 'مجاني' : 'Free')
                        : requiredPlan === 'pro'
                          ? (isRTL ? 'برو' : 'Pro')
                          : (isRTL ? 'متقدم' : 'Advanced')}
                    </span>
                  </div>
                  <p className={`mt-1 text-[11px] text-gray-500 leading-4 min-h-[32px] ${isRTL ? 'text-right' : 'text-left'}`}>
                    {isRTL ? meta.subtitleAr : meta.subtitleEn}
                  </p>
                  <div className={`mt-2 flex gap-1.5 flex-wrap ${isRTL ? 'justify-end' : ''}`}>
                    {(theme.colors || []).slice(0, 5).map((c, i) => (
                      <span key={i} className="w-6 h-6 rounded-full border border-gray-200 shrink-0" style={{ backgroundColor: c }} />
                    ))}
                  </div>
                  <div className={`mt-2 text-[11px] font-medium text-gray-600 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {isRTL ? meta.styleAr : meta.styleEn}
                  </div>
                  {!enabled && (
                    <div className={`text-xs text-gray-500 mt-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                      {t('onboarding.chooseTheme.requiresPlan')} {getRequiredPlanLabel(requiredPlan)}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          <section className={`xl:col-span-5 rounded-2xl border bg-white p-4 md:p-5 ${canCustomizeColors ? 'border-gray-200' : 'border-amber-200'}`}>
            <div className="flex items-start justify-between gap-3 mb-3">
              <h3 className={`text-sm font-semibold text-gray-700 ${isRTL ? 'text-right' : 'text-left'}`}>
                {isRTL ? 'ألوان المتجر حسب الطبقات' : 'Layered Store Colors'}
              </h3>
              {!canCustomizeColors && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>
                  {isRTL ? 'يتطلب المحترف' : 'Pro required'}
                </span>
              )}
            </div>
            {!canCustomizeColors && (
              <p className={`mb-3 text-xs text-amber-700 ${isRTL ? 'text-right' : 'text-left'}`}>
                {isRTL ? 'تخصيص الألوان المتقدم متاح في باقة المحترف والمتقدم.' : 'Advanced layered color customization is available on Pro and Advanced plans.'}
              </p>
            )}
            <div className="space-y-3">
              {colorSections.map((section) => {
                const minPlan = colorSectionMinPlan[section.key] || 'pro';
                const enabled = PLAN_RANK[selectedPlanId] >= PLAN_RANK[minPlan];
                return (
                  <div key={section.key} className="flex items-center justify-between gap-3 border border-gray-200 rounded-lg p-3">
                    <div className={isRTL ? 'text-right' : 'text-left'}>
                      <p className="text-sm font-medium text-storelaunch-dark">
                        {isRTL ? section.labelAr : section.labelEn}
                      </p>
                      {!enabled && (
                        <p className="text-xs text-amber-700 mt-0.5">
                          {t('onboarding.chooseTheme.requiresPlan')} {getRequiredPlanLabel(minPlan)}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={layerColors[section.key]}
                        onChange={(e) => setLayerColors((prev) => ({ ...prev, [section.key]: e.target.value }))}
                        disabled={!enabled}
                        className="h-9 w-12 p-0 border border-gray-200 rounded cursor-pointer bg-white disabled:cursor-not-allowed disabled:opacity-60"
                      />
                      <span className="text-xs text-gray-500 min-w-[64px] uppercase">{layerColors[section.key]}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <aside className="xl:col-span-7">
            <div className="xl:sticky xl:top-6 rounded-2xl border border-gray-200 bg-white p-4 md:p-5">
              <h3 className={`text-sm font-semibold text-gray-700 mb-3 ${isRTL ? 'text-right' : 'text-left'}`}>
                {isRTL ? 'معاينة مباشرة' : 'Live Mini Preview'}
              </h3>
              <div className="rounded-xl border border-gray-200 overflow-hidden" style={{ backgroundColor: layerColors.background }}>
                <div className="px-3 py-2 text-white text-xs font-semibold" style={{ backgroundColor: layerColors.topBar }}>
                  {isRTL ? 'واجهة متجرك للعملاء' : 'Your customer storefront'}
                </div>
                <div className="p-3">
                  <div className={`mb-3 rounded-md px-2 py-1 text-xs inline-flex`} style={{ backgroundColor: layerColors.badges, color: layerColors.badgeText }}>
                    {selectedLayout === 'grid-classic'
                      ? (isRTL ? 'التصنيف "الالكترونيات"' : 'Category "Electronics"')
                      : (isRTL ? 'قائمة مدمجة' : 'Compact List')}
                  </div>
                  <div className={`grid ${selectedLayout === 'compact-list' ? 'grid-cols-1' : 'grid-cols-2'} gap-2`}>
                    {previewProducts.map((product) => (
                      <div key={product.id} className="rounded-lg border border-gray-200 p-2" style={{ backgroundColor: layerColors.productCard }}>
                        <div className="h-16 rounded mb-2 border border-dashed border-gray-300 bg-gray-50 flex items-center justify-center text-gray-400">
                          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span>{isRTL ? 'مكان الصورة' : 'Product image'}</span>
                          </div>
                        </div>
                        <p className="text-xs font-medium truncate" style={{ color: layerColors.text }}>{product.name}</p>
                        <p className="text-xs font-semibold mt-1" style={{ color: layerColors.priceLabels }}>
                          <CurrencyAmount value={product.price} isRTL={isRTL} />
                        </p>
                        <button
                          type="button"
                          className="mt-2 w-full rounded text-xs font-medium py-1.5"
                          style={{ backgroundColor: layerColors.buttons, color: layerColors.buttonText }}
                        >
                          {isRTL ? 'أضف للسلة' : 'Add to cart'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>

        <div>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2.5 bg-storelaunch-green text-white rounded-lg text-sm font-medium hover:bg-storelaunch-green/90 disabled:opacity-50 transition-colors shadow-sm"
          >
            {saving
              ? (isRTL ? 'جاري الحفظ...' : 'Saving...')
              : t('dashboard.storeManagement.actions.saveChanges')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BrandingAppearancePage;
