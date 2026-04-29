import React, { useEffect, useState } from 'react';
import { useNavigate, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../api/axios';
import DashboardSidebar from '../components/DashboardSidebar';
import { API_BASE_URL } from '../config/api';

const StoreOwnerDashboardLayout = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const [setupGuardReady, setSetupGuardReady] = useState(false);
  const [storeName, setStoreName] = useState(null);
  const [storeLogo, setStoreLogo] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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
          const logo = data.store_logo && typeof data.store_logo === 'string' ? data.store_logo.trim() : null;
          if (logo) setStoreLogo(logo);
        }
      } catch {
        if (!cancelled) navigate('/store-setup', { replace: true });
      }
      if (!cancelled) setSetupGuardReady(true);
    })();
    return () => { cancelled = true; };
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('store_owner_id');
    navigate('/login');
  };

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === 'ar' ? 'en' : 'ar');
  };

  const logoUrl = storeLogo && storeLogo.trim()
    ? (storeLogo.startsWith('http') ? storeLogo : `${API_BASE_URL}/${storeLogo.replace(/^\//, '')}`)
    : null;

  if (!setupGuardReady) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p className="text-storelaunch-dark font-medium">Loading...</p>
      </div>
    );
  }

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className="min-h-screen bg-gray-100 flex">
      <DashboardSidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((c) => !c)}
        isRTL={isRTL}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-gray-200 shadow-md px-4 sm:px-6 py-3 flex justify-between items-center shrink-0 rounded-bl-xl rounded-br-xl">
          <div className="flex items-center gap-4 min-w-0">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt=""
                className="h-14 w-14 rounded-full object-cover border-2 border-gray-200 shrink-0"
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
              className="h-14 w-14 rounded-full bg-storelaunch-green/20 flex items-center justify-center shrink-0"
              style={{ display: logoUrl ? 'none' : 'flex' }}
              aria-hidden={!!logoUrl}
            >
              <svg className="w-8 h-8 text-storelaunch-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </span>
            <h1 className="text-storelaunch-dark font-bold text-lg truncate">
              {storeName || t('dashboard.title')}
            </h1>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={toggleLanguage}
              className="px-3 py-1.5 text-sm font-medium text-storelaunch-dark border border-storelaunch-dark rounded-lg hover:bg-storelaunch-green/10 transition-all duration-200"
            >
              {i18n.language === 'ar' ? t('dashboard.switchToEnglish') : t('dashboard.switchToArabic')}
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="px-4 py-2 bg-storelaunch-dark text-white rounded-lg text-sm font-medium hover:bg-storelaunch-teal transition-all duration-200"
            >
              {t('dashboard.logout')}
            </button>
          </div>
        </header>
        <main className="p-4 sm:p-6 flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default StoreOwnerDashboardLayout;
