
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import axiosInstance from '../../api/axios';

const formatCurrency = (value) => {
  if (value == null || Number.isNaN(Number(value))) return '—';
  const n = Number(value);
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatFullCurrency = (value) => {
  if (value == null || Number.isNaN(Number(value))) return '—';
  return Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const SAMPLE_ANALYTICS = {
  total_sales: 28450.75,
  total_orders: 47,
  sales_by_date: (() => {
    const days = [];
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dayStr = d.toISOString().slice(0, 10);
      const sales = Math.round((800 + Math.random() * 1200) * 100) / 100;
      const orders = Math.floor(1 + Math.random() * 4);
      days.push({ date: dayStr, total_sales: sales, orders_count: orders });
    }
    return days;
  })(),
  best_selling_products: [
    { product_id: 1, product_name: 'Classic White T-Shirt', units_sold: 128 },
    { product_id: 2, product_name: 'Wireless Earbuds Pro', units_sold: 94 },
    { product_id: 3, product_name: 'Leather Crossbody Bag', units_sold: 67 },
    { product_id: 4, product_name: 'Organic Face Cream', units_sold: 52 },
    { product_id: 5, product_name: 'Stainless Steel Bottle', units_sold: 41 },
  ],
};

const ReportsPage = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [useSampleData, setUseSampleData] = useState(false);
  const [summary, setSummary] = useState({
    total_sales: 0,
    total_orders: 0,
    sales_by_date: [],
    best_selling_products: [],
  });

  const loadSummary = async ({ showLoading = true } = {}) => {
    if (showLoading) setLoading(true);
    setError(null);
    try {
      const { data } = await axiosInstance.get('/api/orders/analytics/summary');
      setSummary({
        total_sales: data.total_sales || 0,
        total_orders: data.total_orders || 0,
        sales_by_date: Array.isArray(data.sales_by_date) ? data.sales_by_date.slice(-30) : [],
        best_selling_products: Array.isArray(data.best_selling_products)
          ? data.best_selling_products.slice(0, 5)
          : [],
      });
    } catch {
     
      setError(t('dashboard.reports.analyticsUnavailable', 'Analytics unavailable right now.'));
      setSummary({
        total_sales: 0,
        total_orders: 0,
        sales_by_date: [],
        best_selling_products: [],
      });
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!cancelled) await loadSummary({ showLoading: true });
      } catch {
       
      }
    })();

    return () => {
      cancelled = true;
    };
  }, );

  const salesChartData = useMemo(
    () =>
      (summary.sales_by_date || []).map((row) => ({
        dateLabel: row.date ? new Date(row.date).toLocaleDateString() : '',
        total_sales: Number(row.total_sales || 0),
        orders_count: row.orders_count || 0,
      })),
    [summary.sales_by_date],
  );

  const bestSellersChartData = useMemo(
    () =>
      (summary.best_selling_products || []).map((row) => ({
        name: row.product_name || 'Product',
        units_sold: Number(row.units_sold || 0),
      })),
    [summary.best_selling_products],
  );

  const displaySummary = useSampleData ? SAMPLE_ANALYTICS : summary;
  const salesChartDataDisplay = useSampleData
    ? SAMPLE_ANALYTICS.sales_by_date.map((row) => ({
        dateLabel: row.date ? new Date(row.date).toLocaleDateString() : '',
        total_sales: Number(row.total_sales || 0),
        orders_count: row.orders_count || 0,
      }))
    : salesChartData;
  const bestSellersChartDataDisplay = useSampleData
    ? SAMPLE_ANALYTICS.best_selling_products.map((row) => ({
        name: row.product_name || 'Product',
        units_sold: Number(row.units_sold || 0),
      }))
    : bestSellersChartData;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-storelaunch-dark font-bold text-2xl mb-1">
            {t('dashboard.reports.title', 'Reports & Analytics')}
          </h2>
          <p className="text-gray-600 text-sm">
            {t(
              'dashboard.reports.subtitle',
              'Track your store performance with real-time sales and orders insights.',
            )}
          </p>
        </div>
        {useSampleData ? (
          <button
            type="button"
            onClick={() => setUseSampleData(false)}
            className="px-4 py-2 text-sm font-medium text-amber-800 bg-amber-100 border border-amber-300 rounded-lg hover:bg-amber-200 transition-colors"
          >
            {t('dashboard.reports.loadRealData', 'Load real data')}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setUseSampleData(true)}
            className="px-4 py-2 text-sm font-medium text-storelaunch-dark border border-storelaunch-dark rounded-lg hover:bg-storelaunch-green/10 transition-colors"
          >
            {t('dashboard.reports.previewSampleData', 'Preview with sample data')}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl shadow-md p-5 flex items-center gap-4">
          <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-storelaunch-green/15 text-storelaunch-dark">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-gray-500 text-sm font-medium">
              {t('dashboard.reports.totalSales', 'Total Sales')}
            </p>
            <p className="text-xl font-semibold text-gray-900 mt-0.5">
              {loading && !useSampleData ? '…' : `${formatCurrency(displaySummary.total_sales)} SAR`}
            </p>
            <p className="text-gray-400 text-xs mt-0.5">
              {t('dashboard.reports.totalSalesHint', 'All time store revenue')}
            </p>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl shadow-md p-5 flex items-center gap-4">
          <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-amber-100 text-amber-800">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-gray-500 text-sm font-medium">
              {t('dashboard.reports.totalOrders', 'Total Orders')}
            </p>
            <p className="text-xl font-semibold text-gray-900 mt-0.5">
              {loading && !useSampleData ? '…' : displaySummary.total_orders.toLocaleString()}
            </p>
            <p className="text-gray-400 text-xs mt-0.5">
              {t('dashboard.reports.totalOrdersHint', 'Completed and in-progress orders')}
            </p>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl shadow-md p-5 flex items-center gap-4">
          <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-blue-100 text-blue-800">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
              />
            </svg>
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-gray-500 text-sm font-medium">
              {t('dashboard.reports.bestSellersCount', 'Best sellers (top 5)')}
            </p>
            <p className="text-xl font-semibold text-gray-900 mt-0.5">
              {loading && !useSampleData ? '…' : (displaySummary.best_selling_products || []).length}
            </p>
            <p className="text-gray-400 text-xs mt-0.5">
              {t('dashboard.reports.bestSellersHint', 'Based on units sold')}
            </p>
          </div>
        </div>
      </div>

      {useSampleData ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl shadow-sm px-4 py-2.5 text-sm text-amber-800 flex items-center justify-between gap-3">
          <span>{t('dashboard.reports.sampleDataNotice', 'Showing sample data for preview. Charts and table reflect virtual test data.')}</span>
        </div>
      ) : null}

      {error && !useSampleData ? (
        <div className="bg-white border border-gray-200 rounded-xl shadow-md px-4 py-3 text-sm flex items-center justify-between gap-3">
          <span className="text-gray-600">{error}</span>
          <button
            type="button"
            onClick={() => loadSummary({ showLoading: false })}
            className="px-3 py-1.5 text-sm font-medium text-storelaunch-dark border border-storelaunch-dark rounded-lg hover:bg-storelaunch-green/10 transition-all duration-200"
          >
            {t('dashboard.reports.retry', 'Retry')}
          </button>
        </div>
      ) : null}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl shadow-md p-6 xl:col-span-2 flex flex-col min-h-[260px]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-storelaunch-dark font-semibold text-lg">
                {t('dashboard.reports.salesOverTime', 'Sales over last 30 days')}
              </h3>
              <p className="text-gray-500 text-xs">
                {t(
                  'dashboard.reports.salesOverTimeHint',
                  'Daily total sales and order volume.',
                )}
              </p>
            </div>
          </div>
          <div className="flex-1 min-h-[180px]">
            {salesChartDataDisplay.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                {loading && !useSampleData
                  ? t('dashboard.reports.loadingChart', 'Loading chart…')
                  : t('dashboard.reports.noSalesData', 'No sales data yet.')}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salesChartDataDisplay} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="dateLabel"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: '#E5E7EB' }}
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) => formatCurrency(v)}
                    tickLine={false}
                    axisLine={{ stroke: '#E5E7EB' }}
                  />
                  <Tooltip
                    formatter={(value, name) => {
                      if (name === 'total_sales') {
                        return [`${formatFullCurrency(value)} SAR`, 'Sales'];
                      }
                      if (name === 'orders_count') {
                        return [value, 'Orders'];
                      }
                      return [value, name];
                    }}
                    labelFormatter={(label) => label}
                    contentStyle={{ fontSize: 12 }}
                  />
                  <Bar
                    dataKey="total_sales"
                    name="total_sales"
                    fill="#1FAE77"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={32}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl shadow-md p-6 flex flex-col min-h-[260px]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-storelaunch-dark font-semibold text-lg">
                {t('dashboard.reports.bestSellingProducts', 'Best selling products')}
              </h3>
              <p className="text-gray-500 text-xs">
                {t('dashboard.reports.bestSellingProductsHint', 'Top performers by units sold.')}
              </p>
            </div>
          </div>
          <div className="flex-1 min-h-[180px]">
            {bestSellersChartDataDisplay.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                {loading && !useSampleData
                  ? t('dashboard.reports.loadingChart', 'Loading chart…')
                  : t('dashboard.reports.noBestSellersData', 'No best seller data yet.')}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={bestSellersChartDataDisplay}
                  layout="vertical"
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: '#E5E7EB' }}
                  />
                  <YAxis
                    dataKey="name"
                    type="category"
                    tick={{ fontSize: 11 }}
                    width={120}
                    tickLine={false}
                    axisLine={{ stroke: '#E5E7EB' }}
                  />
                  <Tooltip
                    formatter={(value) => [value, t('dashboard.reports.unitsSold', 'Units sold')]}
                    contentStyle={{ fontSize: 12 }}
                  />
                  <Bar
                    dataKey="units_sold"
                    fill="#0E8F96"
                    radius={[0, 4, 4, 0]}
                    maxBarSize={26}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-md p-6">
        <h3 className="text-storelaunch-dark font-semibold text-lg mb-2">
          {t('dashboard.reports.summaryTable', 'Best selling products (table view)')}
        </h3>
        <p className="text-gray-600 text-sm mb-4">
          {t(
            'dashboard.reports.summaryTableHint',
            'Review your top products by total units sold.',
          )}
        </p>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500">
                <th className="text-left py-2 pr-4 font-medium">
                  {t('dashboard.reports.product', 'Product')}
                </th>
                <th className="text-right py-2 px-4 font-medium whitespace-nowrap">
                  {t('dashboard.reports.unitsSold', 'Units sold')}
                </th>
              </tr>
            </thead>
            <tbody>
              {loading && !useSampleData ? (
                <tr>
                  <td
                    className="py-4 text-center text-gray-400 text-sm"
                    colSpan={2}
                  >
                    {t('dashboard.reports.loadingTable', 'Loading data…')}
                  </td>
                </tr>
              ) : (displaySummary.best_selling_products || []).length === 0 ? (
                <tr>
                  <td
                    className="py-4 text-center text-gray-400 text-sm"
                    colSpan={2}
                  >
                    {t('dashboard.reports.noBestSellersData', 'No best seller data yet.')}
                  </td>
                </tr>
              ) : (
                displaySummary.best_selling_products.map((row) => (
                  <tr key={row.product_id} className="border-b border-gray-100 last:border-0">
                    <td className="py-2 pr-4 text-gray-900">
                      {row.product_name || t('dashboard.reports.unnamedProduct', 'Product')}
                    </td>
                    <td className="py-2 px-4 text-right text-gray-900 whitespace-nowrap">
                      {Number(row.units_sold || 0).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;
