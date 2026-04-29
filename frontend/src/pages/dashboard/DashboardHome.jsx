
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import axiosInstance from '../../api/axios';

const CardIcon = ({ icon, className }) => {
  const c = `w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${className || ''}`;
  if (icon === 'sales') {
    return (
      <span className={c}>
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </span>
    );
  }
  if (icon === 'orders') {
    return (
      <span className={c}>
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      </span>
    );
  }
  if (icon === 'products') {
    return (
      <span className={c}>
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      </span>
    );
  }
  return null;
};

const DashboardHome = () => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const [productCount, setProductCount] = useState(null);

  useEffect(() => {
    axiosInstance.get('/api/store/products').then(({ data }) => setProductCount((data.products || []).length)).catch(() => setProductCount(0));
  }, []);

  const stats = [
    {
      key: 'sales',
      label: t('dashboard.home.salesLabel'),
      value: '—',
      sub: t('dashboard.home.salesSub'),
      icon: 'sales',
      color: 'bg-storelaunch-green/15 text-storelaunch-dark',
      link: '/dashboard/reports',
    },
    {
      key: 'orders',
      label: t('dashboard.home.ordersLabel'),
      value: '—',
      sub: t('dashboard.home.ordersSub'),
      icon: 'orders',
      color: 'bg-amber-100 text-amber-800',
      link: '/dashboard/orders',
    },
    {
      key: 'products',
      label: t('dashboard.home.productsLabel'),
      value: productCount !== null ? productCount : '…',
      sub: t('dashboard.home.productsSub'),
      icon: 'products',
      color: 'bg-blue-100 text-blue-800',
      link: '/dashboard/products',
    },
  ];

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      <div>
        <h2 className="text-storelaunch-dark font-bold text-2xl mb-1">{t('dashboard.menu.dashboard')}</h2>
        <p className="text-gray-600 text-sm">{t('dashboard.home.welcome')}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((stat) => (
          <Link
            key={stat.key}
            to={stat.link}
            className={`bg-white border border-gray-200 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 p-5 flex items-center gap-4 hover:border-storelaunch-green/30 ${isRTL ? 'flex-row-reverse text-right' : ''}`}
          >
            <CardIcon icon={stat.icon} className={stat.color} />
            <div className="min-w-0 flex-1">
              <p className="text-gray-500 text-sm font-medium">{stat.label}</p>
              <p className="text-xl font-semibold text-gray-900 mt-0.5">{stat.value}</p>
              <p className="text-gray-400 text-xs mt-0.5">{stat.sub}</p>
            </div>
            <svg className="w-5 h-5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d={isRTL ? 'M15 19l-7-7 7-7' : 'M9 5l7 7-7 7'}
              />
            </svg>
          </Link>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-md p-6">
        <h3 className="text-storelaunch-dark font-semibold text-lg mb-2">{t('dashboard.home.quickActionsTitle')}</h3>
        <p className="text-gray-600 text-sm mb-4">{t('dashboard.home.quickActionsDescription')}</p>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/dashboard/products/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-storelaunch-green text-white rounded-lg text-sm font-medium hover:bg-storelaunch-deep-green transition-all duration-200"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            {t('dashboard.home.quickActionsAddProduct')}
          </Link>
          <Link
            to="/dashboard/products"
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all duration-200"
          >
            {t('dashboard.home.quickActionsViewProducts')}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default DashboardHome;
