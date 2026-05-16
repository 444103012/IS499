



import React, { useEffect, useMemo, useState } from 'react';
import { useStoreSetup, THEMES } from '../../context/StoreSetupContext';
import axiosInstance from '../../api/axios';
import CurrencyAmount from '../../components/common/CurrencyAmount';

export default function StoreSetupTheme({ isRTL, t, onNext, onBack }) {
  const { storeId, selectedPlan, selectedTheme, setSelectedTheme, themeBrandingSeed, clearThemeBrandingSeed } =
    useStoreSetup();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
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
    if (!themeBrandingSeed) return;
    if (themeBrandingSeed.productLayout) {
      setSelectedLayout(themeBrandingSeed.productLayout);
    }
    if (themeBrandingSeed.layerColors && typeof themeBrandingSeed.layerColors === 'object') {
      setLayerColors((prev) => ({ ...prev, ...themeBrandingSeed.layerColors }));
    }
    clearThemeBrandingSeed();
  }, [themeBrandingSeed, clearThemeBrandingSeed]);

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
  const planOrder = ['basic', 'pro', 'advanced'];
  const planNames = {
    basic: { en: 'Free', ar: 'مجاني' },
    pro: { en: 'Pro', ar: 'المحترف' },
    advanced: { en: 'Advanced', ar: 'المتقدم' },
  };
  const selectedPlanId = selectedPlan || 'basic';
  const isFreePlan = selectedPlanId === 'basic';
  const canCustomizeColors = !isFreePlan;

  const isPlanAllowed = (requiredPlan) =>
    planOrder.indexOf(selectedPlanId) >= planOrder.indexOf(requiredPlan);

  const getRequiredPlanLabel = (requiredPlan) => (isRTL ? planNames[requiredPlan].ar : planNames[requiredPlan].en);
  const themeRequiredPlans = {
    default: 'basic',
    minimal: 'pro',
    modern: 'pro',
    classic: 'advanced',
  };
  const isThemeOptionEnabled = (themeId) => isPlanAllowed(themeRequiredPlans[themeId] || 'pro');
  const productCardDefaults = {
    default: '#FFFFFF',
    minimal: '#F8FAFC',
    modern: '#FFFFFF',
    classic: '#FFFFFF',
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

  useEffect(() => {
    const selectedThemeConfig = THEMES.find((theme) => theme.id === selectedTheme);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync palette when theme preset changes
  }, [selectedTheme]);

  useEffect(() => {
    const currentLayout = layoutOptions.find((layout) => layout.id === selectedLayout);
    if (!currentLayout || !isPlanAllowed(currentLayout.minPlan)) {
      const fallback = layoutOptions.find((layout) => isPlanAllowed(layout.minPlan));
      if (fallback) setSelectedLayout(fallback.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset layout when plan no longer allows it
  }, [selectedPlanId, selectedLayout]);

  useEffect(() => {
    if (selectedTheme) {
      if (isThemeOptionEnabled(selectedTheme)) return;
    }
    const firstEnabledTheme = THEMES.find((theme) => isThemeOptionEnabled(theme.id));
    if (firstEnabledTheme) setSelectedTheme(firstEnabledTheme.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- pick first theme allowed for plan
  }, [selectedPlanId, selectedTheme, setSelectedTheme]);

  const previewProducts = useMemo(
    () => [
      { id: 1, name: isRTL ? 'سماعات ابل ايربودز' : 'Apple Airpods', price: '549.00' },
      { id: 2, name: isRTL ? 'ساعة ذكية' : 'Smart Watch', price: '899.00' },
      { id: 3, name: isRTL ? 'لابتوب' : 'laptop', price: '1099.00' },
    ],
    [isRTL],
  );

  const handleNext = async () => {
    if (!selectedTheme || !storeId) return;
    setLoading(true);
    setError('');
    try {
      await axiosInstance.post('/api/store-setup/select-theme', {
        store_id: storeId,
        theme: selectedTheme,
        branding: {
          productLayout: selectedLayout,
          layerColors,
        },
      });
      onNext();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to save theme');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className={`max-w-6xl mx-auto ${isRTL ? 'text-right' : 'text-left'}`}>
      <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-4 md:p-5">
        <h2 className={`text-xl font-bold text-storelaunch-dark ${isRTL ? 'text-right' : 'text-left'}`}>
          {t('onboarding.chooseTheme.title')}
        </h2>
        <p className={`mt-1 text-sm text-gray-500 ${isRTL ? 'text-right' : 'text-left'}`}>
          {isRTL ? 'اختر شكل المتجر ونسق الألوان المناسب لباقتك.' : 'Pick your storefront style and colors based on your selected plan.'}
        </p>
      </div>

      <div className="space-y-6">
        <section className="rounded-2xl border border-gray-200 bg-white p-4 md:p-5">
          <h3 className={`text-sm font-semibold text-gray-700 mb-3 ${isRTL ? 'text-right' : 'text-left'}`}>
            {isRTL ? 'تخطيط عرض المنتجات' : 'Storefront Product Layout'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {layoutOptions.map((layout) => {
              const enabled = isPlanAllowed(layout.minPlan);
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
              const enabled = isThemeOptionEnabled(theme.id);
              const requiredPlan = themeRequiredPlans[theme.id] || 'pro';
              const name = isRTL ? theme.nameAr : theme.nameEn;
              const meta = themeMeta[theme.id] || themeMeta.default;
              const colors = theme.colors || [];
              return (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => enabled && setSelectedTheme(theme.id)}
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
                    {(colors.slice(0, 5)).map((c, i) => (
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
                const enabled = isPlanAllowed(minPlan);
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
      </div>
      {error && <p className={`mt-2 text-sm text-red-600 ${isRTL ? 'text-right' : 'text-left'}`}>{error}</p>}
      <div className={`mt-8 flex justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
        <button type="button" onClick={onBack} className="px-6 py-2 border border-gray-300 text-storelaunch-dark rounded-md font-medium">{t('onboarding.back')}</button>
        <button type="button" onClick={handleNext} disabled={!selectedTheme || !storeId || loading} className="px-6 py-2 bg-storelaunch-green text-white rounded-md font-medium disabled:opacity-50">
          {loading ? (isRTL ? 'جاري الحفظ...' : 'Saving...') : t('onboarding.next')}
        </button>
      </div>
    </div>
  );
}
