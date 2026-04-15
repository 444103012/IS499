import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

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
    key: 'policies',
    route: '/dashboard/store/policies',
    icon: (className) => (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M7 4h10v16H7z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M9.5 8.5h5M9.5 12h5M9.5 15.5h3" />
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
  {
    key: 'danger',
    route: '/dashboard/store/danger',
    icon: (className) => (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M12 4l8 14H4z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M12 10v4m0 3h.01" />
      </svg>
    ),
  },
];

const StoreManagementPage = () => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const navigate = useNavigate();

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      <div>
        <h2 className="text-storelaunch-dark font-bold text-2xl mb-1">
          {t('dashboard.storeManagement.title')}
        </h2>
        <p className="text-gray-600 text-sm">
          {t('dashboard.storeManagement.hub.subtitle')}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map((card) => (
          <button
            key={card.key}
            type="button"
            onClick={() => navigate(card.route)}
            className="bg-white border border-gray-200 rounded-xl shadow-md hover:shadow-lg hover:border-storelaunch-green/40 hover:scale-[1.02] transition-all duration-200 p-6 flex flex-col items-center justify-between gap-4 text-center"
          >
            <div className="flex flex-col items-center gap-3">
              <div className="w-16 h-16 rounded-2xl bg-storelaunch-green/10 flex items-center justify-center text-storelaunch-green">
                {card.icon('w-8 h-8')}
              </div>
              <p className="text-sm font-semibold text-storelaunch-dark">
                {t(`dashboard.storeManagement.tabs.${card.key}`)}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default StoreManagementPage;
