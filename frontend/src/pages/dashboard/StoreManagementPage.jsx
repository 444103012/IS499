import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../../api/axios';

const cards = [
  {
    key: 'storeInfo',
    route: '/dashboard/store/info',
    icon: (className) => (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M3 9.75L4.5 4.5h15l1.5 5.25M4.5 9.75h15v9.75H4.5z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M9 14.25h6" />
      </svg>
    ),
  },
  {
    key: 'branding',
    route: '/dashboard/store/branding',
    icon: (className) => (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M4 16l8-8 4 4-8 8H4z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M14 6l2-2 4 4-2 2" />
      </svg>
    ),
  },
  {
    key: 'domain',
    route: '/dashboard/store/domain',
    icon: (className) => (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M12 3a9 9 0 100 18 9 9 0 000-18z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M3 12h18M12 3c2.5 2.5 2.5 9.5 0 12  -2.5-2.5-2.5-9.5 0-12z" />
      </svg>
    ),
  },
  {
    key: 'payments',
    route: '/dashboard/store/payments',
    icon: (className) => (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M3 10h18" />
      </svg>
    ),
  },
  {
    key: 'shipping',
    route: '/dashboard/store/shipping',
    icon: (className) => (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M3 7h11v10H3zM14 11h4l3 4v2h-7z" />
        <circle cx="7.5" cy="17" r="1.5" />
        <circle cx="17.5" cy="17" r="1.5" />
      </svg>
    ),
  },
  {
    key: 'customers',
    route: '/dashboard/store/customers',
    icon: (className) => (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M5 20v-1a4 4 0 014-4h2a4 4 0 014 4v1" />
        <circle cx="11" cy="9" r="3" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M17 11a3 3 0 100-6 3 3 0 000 6z" />
      </svg>
    ),
  },
  {
    key: 'footer',
    route: '/dashboard/store/footer',
    icon: (className) => (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <circle cx="12" cy="12" r="9" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M12 8v4m0 4h.01" />
      </svg>
    ),
  },
];

const StoreManagementPage = () => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const navigate = useNavigate();
  const [plan, setPlan] = useState('basic');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await axiosInstance.get('/api/subscription');
        if (!cancelled) setPlan(data?.plan || 'basic');
      } catch {
        if (!cancelled) setPlan('basic');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const PLAN_RANK = { basic: 0, pro: 1, advanced: 2 };
  const isDomainAllowed = PLAN_RANK[plan] >= PLAN_RANK['advanced'];

  return (
    <div className="space-y-5 sm:space-y-6 max-w-full" dir={isRTL ? 'rtl' : 'ltr'}>
      <div>
        <h2 className="text-storelaunch-dark font-bold text-xl sm:text-2xl mb-1">
          {t('dashboard.storeManagement.title')}
        </h2>
        <p className="text-gray-600 text-sm">
          {t('dashboard.storeManagement.hub.subtitle')}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {cards.map((card) => {
          const isDomainCard = card.key === 'domain';
          const locked = isDomainCard && !isDomainAllowed;
          return (
            <button
              key={card.key}
              type="button"
              onClick={() => navigate(card.route)}
              className={`relative min-h-[150px] bg-white border rounded-xl shadow-md transition-all duration-200 p-5 sm:p-6 flex flex-col items-center justify-between gap-4 text-center ${
                locked
                  ? 'border-amber-200 hover:shadow-md cursor-pointer opacity-90'
                  : 'border-gray-200 hover:shadow-lg hover:border-storelaunch-green/40 hover:scale-[1.02]'
              }`}
            >
              {locked && (
                <span className={`absolute top-3 ${isRTL ? 'left-3' : 'right-3'} inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700`}>
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                  {t('dashboard.storeManagement.subscriptionPlans.advanced')}
                </span>
              )}
              <div className="flex flex-col items-center gap-3">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${locked ? 'bg-amber-50 text-amber-500' : 'bg-storelaunch-green/10 text-storelaunch-green'}`}>
                  {card.icon('w-8 h-8')}
                </div>
                <p className="text-sm font-semibold text-storelaunch-dark">
                  {t(`dashboard.storeManagement.tabs.${card.key}`)}
                </p>
                {locked && (
                  <p className="text-xs font-medium text-amber-700">
                    {t('dashboard.storeManagement.domain.lockedPlan')}
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default StoreManagementPage;
