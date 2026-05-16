





import React, { useEffect, useState, Suspense } from 'react';
import { Link, useNavigate, Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../api/axios';
import DashboardSidebar from '../components/DashboardSidebar';
import DashboardRouteLoading from '../components/dashboard/DashboardRouteLoading';
import { clearAccessCache } from '../utils/storeAccessCache';
import { shouldShowGoLiveCta } from '../utils/shouldShowGoLiveCta';
import { isDisplayStandalone } from '../utils/pwaLaunch';

const PWA_INSTALL_HINT_KEY = 'storelaunch_pwa_install_hint_dismissed';

const API_BASE = process.env.REACT_APP_API_URL || process.env.REACT_APP_BASE_URL || '';

const prefetchDashboardChunks = () => {
  const chunks = [
    () => import('./dashboard/DashboardHome'),
    () => import('./dashboard/OrdersList'),
    () => import('./dashboard/ProductsList'),
    () => import('./dashboard/SettingsPage'),
    () => import('./dashboard/StoreManagementPage'),
    () => import('./dashboard/ReportsPage'),
  ];
  const schedule =
    typeof window !== 'undefined' && window.requestIdleCallback
      ? (cb) => window.requestIdleCallback(cb, { timeout: 2000 })
      : (cb) => window.setTimeout(cb, 50);
  schedule(() => {
    Promise.all(chunks.map((fn) => fn())).catch(() => {});
  });
};

const StoreOwnerDashboardLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const [setupGuardReady, setSetupGuardReady] = useState(false);
  const [storeName, setStoreName] = useState(null);
  const [storeLogo, setStoreLogo] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [goLiveStatus, setGoLiveStatus] = useState(null);
  const [storeId, setStoreId] = useState(null);
  const [showPwaInstallHint, setShowPwaInstallHint] = useState(false);

  useEffect(() => {
    document.documentElement.lang = i18n.language;
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
  }, [i18n.language, isRTL]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await axiosInstance.get('/api/store-setup/status');
        const step = data.setup_step != null ? Number(data.setup_step) : 0;
        if (step < 6) {
          if (!cancelled) navigate('/store-setup', { replace: true });
          return;
        }
        if (!cancelled) {
          if (data.store_name) setStoreName(data.store_name);
          if (data.store_id) setStoreId(data.store_id);
          const logo = data.store_logo && typeof data.store_logo === 'string' ? data.store_logo.trim() : null;
          if (logo) setStoreLogo(logo);
        }
      } catch {
        if (!cancelled) navigate('/store-setup', { replace: true });
      } finally {
        if (!cancelled) setSetupGuardReady(true);
      }
    })();
    return () => { cancelled = true; };
  }, [navigate]);

  useEffect(() => {
    let cancelled = false;
    if (!setupGuardReady) return undefined;

    (async () => {
      try {
        const { data } = await axiosInstance.get('/api/store/go-live-status');
        if (!cancelled) setGoLiveStatus(data);
      } catch {
        if (!cancelled) setGoLiveStatus(null);
      }
    })();

    return () => { cancelled = true; };
  // Re-fetch on navigation so header hides Go Live immediately after going live.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setupGuardReady, location.pathname]);

  useEffect(() => {
    if (!setupGuardReady) return undefined;
    prefetchDashboardChunks();
    return undefined;
  }, [setupGuardReady]);


  useEffect(() => {
    if (!setupGuardReady || isDisplayStandalone()) return;
    try {
      if (localStorage.getItem(PWA_INSTALL_HINT_KEY)) return;
    } catch {
      return;
    }
    setShowPwaInstallHint(true);
  }, [setupGuardReady]);

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!mobileSidebarOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setMobileSidebarOpen(false);
    };
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [mobileSidebarOpen]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('store_owner_id');
    clearAccessCache();
    navigate('/login');
  };

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === 'ar' ? 'en' : 'ar');
  };

  const logoUrl = storeLogo && storeLogo.trim()
    ? (storeLogo.startsWith('http') ? storeLogo : `${API_BASE.replace(/\/$/, '')}/${storeLogo.replace(/^\//, '')}`)
    : null;

  const showGoLiveButton = shouldShowGoLiveCta(goLiveStatus);

  const dismissPwaInstallHint = () => {
    setShowPwaInstallHint(false);
    try {
      localStorage.setItem(PWA_INSTALL_HINT_KEY, '1');
    } catch {
      /* ignore */
    }
  };

  const mainContent = !setupGuardReady ? (
    <DashboardRouteLoading />
  ) : (
    <Suspense fallback={<DashboardRouteLoading />}>
      <Outlet />
    </Suspense>
  );

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className="min-h-screen bg-gray-100 flex overflow-x-hidden">
      <DashboardSidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((c) => !c)}
        isRTL={isRTL}
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-gray-200 shadow-md px-3 sm:px-6 py-3 flex flex-wrap lg:flex-nowrap justify-between items-start lg:items-center shrink-0 rounded-bl-xl rounded-br-xl gap-2">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              aria-label={t('dashboard.menu.menu')}
              className="lg:hidden inline-flex items-center justify-center w-11 h-11 rounded-lg border border-gray-300 text-storelaunch-dark hover:bg-gray-50 transition-colors shrink-0"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            {logoUrl ? (
              <img
                src={logoUrl}
                alt=""
                className="h-10 w-10 sm:h-14 sm:w-14 rounded-full object-cover border-2 border-gray-200 shrink-0"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.style.display = 'none';
                  const fallback = e.target.nextElementSibling;
                  if (fallback) fallback.style.display = 'flex';
                }}
              />
            ) : null}
            <span
              className="h-10 w-10 sm:h-14 sm:w-14 rounded-full bg-storelaunch-green/20 flex items-center justify-center shrink-0"
              style={{ display: logoUrl ? 'none' : 'flex' }}
              aria-hidden={!!logoUrl}
            >
              <svg className="w-6 h-6 sm:w-8 sm:h-8 text-storelaunch-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </span>
            <h1 className="text-storelaunch-dark font-bold text-base sm:text-lg truncate">
              {storeName || t('dashboard.title')}
            </h1>
            {showGoLiveButton ? (
              <button
                type="button"
                title={t('dashboard.goLive.tooltip', 'Publish your store and start selling')}
                onClick={() => navigate('/dashboard/go-live')}
                className="hidden lg:inline-flex px-4 py-1.5 text-sm font-semibold text-white bg-storelaunch-green rounded-lg hover:bg-storelaunch-deep-green transition-all duration-200"
              >
                {t('dashboard.goLive.label', 'Go Live')}
              </button>
            ) : null}
          </div>
          <div className={`flex items-center gap-2 shrink-0 w-full lg:w-auto ${isRTL ? 'justify-start' : 'justify-end'}`}>
            {showGoLiveButton ? (
              <button
                type="button"
                title={t('dashboard.goLive.tooltip', 'Publish your store and start selling')}
                aria-label={t('dashboard.goLive.label', 'Go Live')}
                onClick={() => navigate('/dashboard/go-live')}
                className="inline-flex lg:hidden items-center justify-center min-h-11 min-w-11 px-2.5 border border-storelaunch-green/30 text-storelaunch-green rounded-lg hover:bg-storelaunch-green/10 transition-all duration-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3l14 9-14 9 4-9-4-9z" />
                </svg>
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => {
                const targetStoreId = goLiveStatus?.storeId || storeId;
                if (targetStoreId) navigate(`/store-preview/${targetStoreId}`);
              }}
              title={t('pwa.viewPreview', 'Preview store')}
              aria-label={t('pwa.viewPreview', 'Preview store')}
              className="hidden lg:inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-storelaunch-dark border border-gray-300 rounded-lg hover:bg-gray-50 transition-all duration-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              {t('pwa.viewPreview', 'Preview')}
            </button>
            <button
              type="button"
              onClick={() => {
                const targetStoreId = goLiveStatus?.storeId || storeId;
                if (targetStoreId) navigate(`/store-preview/${targetStoreId}`);
              }}
              title={t('pwa.viewPreview', 'Preview store')}
              aria-label={t('pwa.viewPreview', 'Preview store')}
              className="inline-flex lg:hidden items-center justify-center min-h-11 min-w-11 px-2.5 border border-gray-300 text-storelaunch-dark rounded-lg hover:bg-gray-50 transition-all duration-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </button>
            <button
              type="button"
              onClick={toggleLanguage}
              className="min-h-11 px-2.5 sm:px-3 py-2 text-xs sm:text-sm font-medium text-storelaunch-dark border border-storelaunch-dark rounded-lg hover:bg-storelaunch-green/10 transition-all duration-200 max-w-[8.5rem] sm:max-w-none truncate"
            >
              {i18n.language === 'ar' ? t('dashboard.switchToEnglish') : t('dashboard.switchToArabic')}
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="min-h-11 px-3 sm:px-4 py-2 bg-storelaunch-dark text-white rounded-lg text-xs sm:text-sm font-medium hover:bg-storelaunch-teal transition-all duration-200"
            >
              {t('dashboard.logout')}
            </button>
          </div>
        </header>
        <main className="p-3 sm:p-6 flex-1 overflow-auto overflow-x-hidden">
          {showPwaInstallHint && (
            <div
              role="note"
              className={`mb-4 flex flex-col gap-3 rounded-lg border border-storelaunch-green/25 bg-storelaunch-green/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${isRTL ? 'text-right' : 'text-left'}`}
            >
              <p className="text-sm text-storelaunch-dark leading-relaxed">{t('pwa.installHint')}</p>
              <button
                type="button"
                onClick={dismissPwaInstallHint}
                className="shrink-0 self-start sm:self-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-storelaunch-dark hover:bg-gray-50"
              >
                {t('pwa.installHintDismiss')}
              </button>
            </div>
          )}
          {mainContent}
        </main>
      </div>
    </div>
  );
};

export default StoreOwnerDashboardLayout;
