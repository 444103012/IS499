




import React, { useState } from 'react';
import { useOnboarding, THEMES, THEME_TIERS } from '../../context/OnboardingContext';
import axiosInstance from '../../api/axios';
import { getNormalizedStoreBranding } from '../../utils/storeBranding';

function themeTierToMinPlan(tier) {
  return THEME_TIERS[tier];
}

function isThemeEnabled(themeTier, selectedPlanId) {
  const minPlan = themeTierToMinPlan(themeTier);
  const order = ['basic', 'pro', 'advanced'];
  return order.indexOf(selectedPlanId) >= order.indexOf(minPlan);
}

export default function ChooseTheme({ isRTL, t, onNext, onBack }) {
  const { storeId, selectedPlan, selectedTheme, setSelectedTheme } = useOnboarding();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleNext = async () => {
    if (!selectedTheme || !storeId) return;
    setLoading(true);
    setError('');
    try {
      const normalizedBranding = getNormalizedStoreBranding(selectedTheme, {});
      await axiosInstance.post('/api/onboarding/select-theme', {
        store_id: storeId,
        theme: selectedTheme,
        branding: {
          productLayout: normalizedBranding.productLayout,
          layerColors: normalizedBranding.layerColors,
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
    <div dir={isRTL ? 'rtl' : 'ltr'} className={`max-w-4xl mx-auto ${isRTL ? 'text-right' : 'text-left'}`}>
      <h2 className={`text-xl font-bold text-storelaunch-dark mb-6 ${isRTL ? 'text-right' : 'text-left'}`}>
        {t('onboarding.chooseTheme.title')}
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {THEMES.map((theme) => {
          const enabled = selectedPlan ? isThemeEnabled(theme.tier, selectedPlan) : false;
          const name = isRTL ? theme.nameAr : theme.nameEn;
          const colors = theme.colors || [];
          return (
            <button
              key={theme.id}
              type="button"
              onClick={() => enabled && setSelectedTheme(theme.id)}
              disabled={!enabled}
              className={`
                relative p-4 rounded-xl border-2 text-left transition-all
                ${selectedTheme === theme.id ? 'border-storelaunch-green bg-green-50' : 'border-gray-200'}
                ${!enabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-storelaunch-green/50'}
              `}
            >
              {!enabled && (
                <div className={`absolute top-2 w-5 h-5 text-gray-400 ${isRTL ? 'left-2' : 'right-2'}`} aria-hidden>
                  <svg fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
              <div className={`font-bold text-storelaunch-dark ${isRTL ? 'text-right' : 'text-left'}`}>{name}</div>
              {}
              <div className={`flex gap-1.5 mt-2 flex-wrap ${isRTL ? 'justify-end' : ''}`}>
                {(colors.slice(0, 5)).map((c, i) => (
                  <span
                    key={i}
                    className="w-6 h-6 rounded-full border border-gray-200 shrink-0"
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              {}
              <div
                className="mt-3 h-14 rounded-lg border border-gray-200 overflow-hidden"
                style={{
                  background: colors.length ? `linear-gradient(135deg, ${colors[0]} 0%, ${colors[1] || colors[0]} 100%)` : '#f3f4f6',
                }}
              />
              {!enabled && (
                <div className={`text-xs text-gray-500 mt-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t('onboarding.chooseTheme.requiresPlan')} {theme.tier === 'standard' ? (isRTL ? 'المحترف' : 'Pro') : theme.tier === 'advanced' ? (isRTL ? 'المتقدم' : 'Advanced') : (isRTL ? 'الأساسي' : 'Basic')}
                </div>
              )}
            </button>
          );
        })}
      </div>
      {error && (
        <p className={`mt-2 text-sm text-red-600 ${isRTL ? 'text-right' : 'text-left'}`}>{error}</p>
      )}
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
          onClick={handleNext}
          disabled={!selectedTheme || !storeId || loading}
          className="px-6 py-2 bg-storelaunch-green text-white rounded-md font-medium disabled:opacity-50"
        >
          {loading ? (isRTL ? 'جاري الحفظ...' : 'Saving...') : t('onboarding.next')}
        </button>
      </div>
    </div>
  );
}
