import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../../api/axios';

const PLAN_RANK = { basic: 0, pro: 1, advanced: 2 };

const DomainSettingsPage = () => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [store, setStore] = useState(null);
  const [plan, setPlan] = useState('basic');
  const [storeSlug, setStoreSlug] = useState('');
  const [slugError, setSlugError] = useState('');
  const baseDomain = 'storelaunch.site';

  // Domain editing requires Advanced plan (mirrors SubscriptionPage "Custom Domain" feature).
  const isDomainPlanAllowed = PLAN_RANK[plan] >= PLAN_RANK['advanced'];

  // Domain editing allowed only on Pending (pre-launch) or Active stores.
  const storeStatus = store?.status || 'Pending';
  const isStatusAllowed = ['Pending', 'Active'].includes(storeStatus);

  const isLocked = !isDomainPlanAllowed || !isStatusAllowed;

  const normalizeSlug = (value) =>
    String(value || '')
      .normalize('NFC')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9\u0600-\u06FF\u0750-\u077F-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const [{ data: storeData }, { data: subData }] = await Promise.all([
          axiosInstance.get('/api/store'),
          axiosInstance.get('/api/subscription'),
        ]);
        if (!cancelled) {
          setStore(storeData.store);
          setStoreSlug(normalizeSlug(storeData?.store?.domain_name || ''));
          setPlan(subData?.plan || 'basic');
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t]);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const handleSave = async () => {
    if (isLocked) return;
    const normalized = normalizeSlug(storeSlug);
    if (normalized.length < 3 || normalized.length > 40) {
      setSlugError(t('dashboard.storeManagement.domain.slugLengthError'));
      return;
    }
    if (!/^[a-z0-9\u0600-\u06FF\u0750-\u077F][a-z0-9\u0600-\u06FF\u0750-\u077F-]*[a-z0-9\u0600-\u06FF\u0750-\u077F]$/.test(normalized)) {
      setSlugError(t('dashboard.storeManagement.domain.slugPatternError'));
      return;
    }

    setSlugError('');
    setSaving(true);
    try {
      await axiosInstance.put('/api/store/domain', { slug: normalized });
      setStore((prev) => ({ ...(prev || {}), domain_name: normalized }));
      setStoreSlug(normalized);
      showToast('success', t('dashboard.storeManagement.toast.saveSuccess'));
    } catch (err) {
      const errCode = err?.response?.data?.error;
      if (errCode === 'DOMAIN_EDIT_NOT_ALLOWED') {
        showToast('error', t('dashboard.storeManagement.domain.lockedSuspended'));
      } else {
        showToast('error', err?.response?.data?.message || t('dashboard.storeManagement.toast.saveError'));
      }
    } finally {
      setSaving(false);
    }
  };

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

  const savedSlug = normalizeSlug(store.domain_name || '');

  return (
    <div className="space-y-4 sm:space-y-6 max-w-full" dir={isRTL ? 'rtl' : 'ltr'}>
      {toast && (
        <div
          className={`fixed top-4 ${isRTL ? 'left-4' : 'right-4'} z-50 px-4 py-3 rounded-lg shadow-lg text-white ${
            toast.type === 'error' ? 'bg-red-500' : 'bg-storelaunch-green'
          }`}
        >
          {toast.message}
        </div>
      )}

      <div className={`flex items-center gap-2 sm:gap-3 mb-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <button
          type="button"
          onClick={() => navigate('/dashboard/store')}
          className="inline-flex items-center gap-1 min-h-11 px-2 text-sm text-storelaunch-dark hover:underline rounded-lg focus:outline-none focus:ring-2 focus:ring-storelaunch-green/30"
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
        <h2 className="text-storelaunch-dark font-bold text-xl sm:text-2xl">
          {t('dashboard.storeManagement.domain.sectionTitle')}
        </h2>
      </div>

      {/* Plan gate banner */}
      {!isDomainPlanAllowed && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
          </svg>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-amber-800">
              {t('dashboard.storeManagement.domain.lockedPlan')}
            </p>
            <button
              type="button"
              onClick={() => navigate('/dashboard/subscription')}
              className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-amber-700 underline underline-offset-2 hover:text-amber-900"
            >
              {t('dashboard.storeManagement.domain.upgradeCta')}
              {isRTL ? (
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                </svg>
              ) : (
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Status lock banner (suspended / inactive) */}
      {isDomainPlanAllowed && !isStatusAllowed && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
          <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm-1-9h2v4h-2V9zm0-3h2v2h-2V6z" clipRule="evenodd" />
          </svg>
          <p className="text-sm text-red-700">
            {t('dashboard.storeManagement.domain.lockedSuspended')}
          </p>
        </div>
      )}

      <div className={`bg-white border border-gray-200 rounded-xl shadow-md p-4 sm:p-6 space-y-4 ${isLocked ? 'opacity-75' : ''}`}>
        {isLocked ? (
          /* Read-only preview when editing is not permitted */
          <div className="space-y-3">
            <p className="text-sm font-medium text-gray-700">
              {t('dashboard.storeManagement.domain.currentSlugLabel')}
            </p>
            <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg">
              <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M12 3a9 9 0 100 18 9 9 0 000-18z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M3 12h18M12 3c2.5 2.5 2.5 9.5 0 12-2.5-2.5-2.5-9.5 0-12z" />
              </svg>
              <span className="font-mono text-sm text-gray-800 break-all" dir="ltr">
                {`${baseDomain}/${savedSlug || 'your-store'}`}
              </span>
            </div>
          </div>
        ) : (
          /* Editable form when plan and status allow */
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('dashboard.storeManagement.domain.baseUrl')}
                </label>
                <input
                  type="text"
                  className="w-full min-h-11 border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-gray-50"
                  value={`${baseDomain}/`}
                  readOnly
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('dashboard.storeManagement.domain.storeSlug')}
                </label>
                <input
                  type="text"
                  dir="auto"
                  className="w-full min-h-11 border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-storelaunch-green/40"
                  value={storeSlug}
                  placeholder={t('dashboard.storeManagement.domain.slugPlaceholder')}
                  onChange={(e) => {
                    setSlugError('');
                    setStoreSlug(normalizeSlug(e.target.value));
                  }}
                />
                {slugError && <p className="text-xs text-red-600 mt-1">{slugError}</p>}
              </div>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-800 mb-1">
                {t('dashboard.storeManagement.domain.slugRulesTitle')}
              </h4>
              <p className="text-sm text-gray-600">
                {t('dashboard.storeManagement.domain.slugRulesHelp')}
              </p>
              <p className="text-sm text-storelaunch-dark mt-2">
                {t('dashboard.storeManagement.domain.previewLabel')}:{' '}
                <span className="font-semibold" dir="ltr">{`${baseDomain}/${storeSlug || 'your-store'}`}</span>
              </p>
            </div>
            <div>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="w-full sm:w-auto min-h-11 px-4 py-2.5 bg-storelaunch-green text-white rounded-lg text-sm font-medium hover:bg-storelaunch-deep-green disabled:opacity-50"
              >
                {t('dashboard.storeManagement.actions.saveChanges')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DomainSettingsPage;
