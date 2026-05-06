


import React, { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import axiosInstance from '../../api/axios';
import CurrencyAmount from '../../components/common/CurrencyAmount';
import { shouldShowGoLiveCta } from '../../utils/shouldShowGoLiveCta';

const DashboardSalesChart = lazy(() => import('./DashboardSalesChart'));

const CardIcon = ({ icon, className }) => {
  const c = `w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${className || ''}`;
  if (icon === 'sales') return (
    <span className={c}>
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    </span>
  );
  if (icon === 'orders') return (
    <span className={c}>
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    </span>
  );
  if (icon === 'products') return (
    <span className={c}>
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    </span>
  );
  if (icon === 'customers') return (
    <span className={c}>
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    </span>
  );
  return null;
};

const DashboardHome = () => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  const [analytics, setAnalytics] = useState(null);
  const [productCount, setProductCount] = useState(null);
  const [customerCount, setCustomerCount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recentOrders, setRecentOrders] = useState([]);
  const [goLiveStatus, setGoLiveStatus] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const fetchAll = async () => {
      setLoading(true);
      const [analyticsRes, countsRes, ordersRes, goLiveRes] = await Promise.allSettled([
        axiosInstance.get('/api/orders/analytics/summary'),
        axiosInstance.get('/api/store/dashboard-counts'),
        axiosInstance.get('/api/orders?limit=5&page=1'),
        axiosInstance.get('/api/store/go-live-status'),
      ]);
      if (cancelled) return;

      if (analyticsRes.status === 'fulfilled') setAnalytics(analyticsRes.value.data);
      if (countsRes.status === 'fulfilled') {
        const d = countsRes.value.data || {};
        setProductCount(typeof d.product_count === 'number' ? d.product_count : null);
        setCustomerCount(typeof d.customer_count === 'number' ? d.customer_count : null);
      }
      if (ordersRes.status === 'fulfilled') setRecentOrders(ordersRes.value.data.orders || []);
      if (goLiveRes.status === 'fulfilled') setGoLiveStatus(goLiveRes.value.data);
      setLoading(false);
    };
    fetchAll();
    return () => { cancelled = true; };
  }, []);

  const salesChartData = useMemo(() => {
    if (!analytics?.sales_by_date) return [];
    return analytics.sales_by_date.map(r => ({
      dateLabel: r.date ? new Date(r.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '',
      total_sales: Number(r.total_sales || 0),
      orders_count: r.orders_count || 0,
    }));
  }, [analytics]);

  const totalSales = analytics?.total_sales ?? null;
  const totalOrders = analytics?.total_orders ?? null;

  const badgeFulfillment = (v) => {
    const s = (v || '').toLowerCase();
    if (s === 'delivered') return 'bg-green-100 text-green-800';
    if (s === 'shipped') return 'bg-indigo-100 text-indigo-800';
    if (s === 'cancelled') return 'bg-red-100 text-red-800';
    return 'bg-blue-100 text-blue-800';
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString(undefined, { dateStyle: 'short' }) : '—';

  return (
    <div className="space-y-5 sm:space-y-6 max-w-full overflow-x-hidden" dir={isRTL ? 'rtl' : 'ltr'}>
      <div>
        <h2 className="text-storelaunch-dark font-bold text-xl sm:text-2xl mb-1">{t('dashboard.menu.dashboard')}</h2>
        <p className="text-gray-600 text-sm">{t('dashboard.home.welcome')}</p>
      </div>

      {shouldShowGoLiveCta(goLiveStatus) && (
        <div className="bg-gradient-to-r from-storelaunch-green to-storelaunch-deep-green text-white rounded-xl shadow-md p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-lg font-bold">{isRTL ? 'جاهز للانطلاق؟' : 'Ready to go live?'}</p>
            <p className="text-sm text-white/90">
              {isRTL
                ? 'متجرك جاهز. راجعه أولاً ثم انشره لبدء البيع.'
                : 'Your store is set up and ready. Review it, then publish to start selling.'}
            </p>
          </div>
          <Link
            to="/dashboard/go-live"
            className="w-full sm:w-auto min-h-11 shrink-0 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white text-storelaunch-dark rounded-lg text-sm font-semibold hover:bg-gray-100 transition-colors"
          >
            <span>{isRTL ? 'انطلق الآن' : 'Go Live Now'}</span>
          </Link>
        </div>
      )}

      {}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {}
        <Link
          to="/dashboard/reports"
          className={`bg-white border border-gray-200 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 p-5 flex flex-col gap-2 hover:border-storelaunch-green/30`}
        >
          <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <CardIcon icon="sales" className="bg-storelaunch-green/15 text-storelaunch-dark" />
            <div className="min-w-0 flex-1">
              <p className="text-gray-500 text-xs font-medium">{t('dashboard.reports.totalSales', 'Total Sales')}</p>
              <p className="text-xl font-semibold text-gray-900 mt-0.5">
                {loading ? '…' : totalSales !== null ? <CurrencyAmount value={totalSales} isRTL={isRTL} /> : '—'}
              </p>
            </div>
          </div>
        </Link>

        {}
        <Link
          to="/dashboard/orders"
          className={`bg-white border border-gray-200 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 p-5 flex flex-col gap-2 hover:border-amber-300`}
        >
          <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <CardIcon icon="orders" className="bg-amber-100 text-amber-800" />
            <div className="min-w-0 flex-1">
              <p className="text-gray-500 text-xs font-medium">{t('dashboard.home.ordersLabel', 'Total Orders')}</p>
              <p className="text-xl font-semibold text-gray-900 mt-0.5">
                {loading ? '…' : totalOrders !== null ? totalOrders.toLocaleString() : '—'}
              </p>
            </div>
          </div>
        </Link>

        {}
        <Link
          to="/dashboard/products"
          className={`bg-white border border-gray-200 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 p-5 flex flex-col gap-2 hover:border-blue-300`}
        >
          <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <CardIcon icon="products" className="bg-blue-100 text-blue-800" />
            <div className="min-w-0 flex-1">
              <p className="text-gray-500 text-xs font-medium">{t('dashboard.home.productsLabel', 'Products')}</p>
              <p className="text-xl font-semibold text-gray-900 mt-0.5">
                {loading ? '…' : productCount !== null ? productCount : '—'}
              </p>
            </div>
          </div>
          <p className="text-gray-400 text-xs">{t('dashboard.home.productsSub', 'Active listings')}</p>
        </Link>

        {}
        <Link
          to="/dashboard/store/customers"
          className={`bg-white border border-gray-200 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 p-5 flex flex-col gap-2 hover:border-purple-300`}
        >
          <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <CardIcon icon="customers" className="bg-purple-100 text-purple-800" />
            <div className="min-w-0 flex-1">
              <p className="text-gray-500 text-xs font-medium">{isRTL ? 'العملاء' : 'Customers'}</p>
              <p className="text-xl font-semibold text-gray-900 mt-0.5">
                {loading ? '…' : customerCount !== null ? customerCount : '—'}
              </p>
            </div>
          </div>
          <p className="text-gray-400 text-xs">{isRTL ? 'إجمالي العملاء' : 'Total customers'}</p>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {}
        <div className="bg-white border border-gray-200 rounded-xl shadow-md p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-storelaunch-dark font-semibold text-lg">
              {isRTL ? 'آخر الطلبات' : 'Recent Orders'}
            </h3>
            <Link to="/dashboard/orders" className="text-sm text-storelaunch-green hover:underline font-medium">
              {isRTL ? 'عرض الكل' : 'View all'} →
            </Link>
          </div>
          {loading ? (
            <div className="text-gray-400 text-sm">{isRTL ? 'جاري التحميل...' : 'Loading...'}</div>
          ) : recentOrders.length === 0 ? (
            <div className="text-gray-400 text-sm">{isRTL ? 'لا توجد طلبات بعد' : 'No orders yet'}</div>
          ) : (
            <div className="space-y-2">
              {recentOrders.map(o => (
                <Link
                  key={o.order_id}
                  to={`/dashboard/orders/${o.order_id}`}
                  className="flex items-start sm:items-center justify-between gap-2 p-3 rounded-lg hover:bg-gray-50 border border-gray-100 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">#{o.order_id} — {o.customer_name}</p>
                    <p className="text-xs text-gray-500">{formatDate(o.order_date)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${badgeFulfillment(o.fulfillment_status)}`}>
                      {o.fulfillment_status}
                    </span>
                    <span className="text-sm font-semibold text-gray-900"><CurrencyAmount value={o.total_amount || 0} isRTL={isRTL} /></span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {}
        <div className="bg-white border border-gray-200 rounded-xl shadow-md p-4 sm:p-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-storelaunch-dark font-semibold text-lg">
                {isRTL ? 'المبيعات خلال آخر 30 يوم' : 'Sales — Last 30 Days'}
              </h3>
              <p className="text-gray-500 text-xs mt-0.5">
                {isRTL ? 'إجمالي المبيعات اليومية' : 'Daily revenue trend'}
              </p>
            </div>
            <Link to="/dashboard/reports" className="text-sm text-storelaunch-green hover:underline font-medium">
              {isRTL ? 'عرض التقارير' : 'View Reports'} →
            </Link>
          </div>
          <div style={{ height: 220 }} className="overflow-x-auto">
            {!loading && salesChartData.length > 0 ? (
              <Suspense
                fallback={(
                  <div className="h-full min-h-[200px] flex items-center justify-center text-sm text-gray-400">
                    {isRTL ? 'جاري تحميل الرسم…' : 'Loading chart…'}
                  </div>
                )}
              >
                <DashboardSalesChart data={salesChartData} isRTL={isRTL} />
              </Suspense>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-gray-400">
                {isRTL ? 'لا توجد بيانات كافية لعرض الرسم' : 'Not enough data to show chart'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardHome;
