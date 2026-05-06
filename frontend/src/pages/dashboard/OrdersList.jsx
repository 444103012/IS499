



import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../../api/axios';
import CurrencyAmount from '../../components/common/CurrencyAmount';

const PAYMENT_OPTIONS = ['', 'Paid', 'Pending', 'Failed'];
const FULFILLMENT_OPTIONS = ['', 'Pending', 'Processing', 'Packed', 'Shipped', 'Delivered', 'Cancelled'];
const SORT_OPTIONS = [
  { value: '', labelKey: 'sortNewest' },
  { value: 'date_asc', labelKey: 'sortOldest' },
  { value: 'total_desc', labelKey: 'sortTotalHigh' },
  { value: 'total_asc', labelKey: 'sortTotalLow' },
];

const badgeClass = (type, value) => {
  const v = (value || '').toLowerCase();
  if (type === 'payment') {
    if (v === 'paid') return 'bg-green-100 text-green-800';
    if (v === 'pending') return 'bg-yellow-100 text-yellow-800';
    if (v === 'failed') return 'bg-red-100 text-red-800';
  }
  if (type === 'fulfillment') {
    if (v === 'pending') return 'bg-slate-100 text-slate-800';
    if (v === 'processing') return 'bg-blue-100 text-blue-800';
    if (v === 'packed') return 'bg-slate-100 text-slate-800';
    if (v === 'shipped') return 'bg-indigo-100 text-indigo-800';
    if (v === 'delivered') return 'bg-green-100 text-green-800';
    if (v === 'cancelled') return 'bg-red-100 text-red-800';
  }
  return 'bg-gray-100 text-gray-800';
};

const OrdersList = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 10;
  const [search, setSearch] = useState('');
  const [searchSubmitted, setSearchSubmitted] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [fulfillmentStatus, setFulfillmentStatus] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortBy, setSortBy] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (searchSubmitted) params.set('search', searchSubmitted);
      if (paymentStatus) params.set('payment_status', paymentStatus);
      if (fulfillmentStatus) params.set('fulfillment_status', fulfillmentStatus);
      if (dateFrom) params.set('date_from', dateFrom);
      if (dateTo) params.set('date_to', dateTo);
      if (sortBy) {
        if (sortBy === 'date_asc') params.set('sort', 'date_asc');
        else if (sortBy === 'total_desc') params.set('sort', 'total_desc');
        else if (sortBy === 'total_asc') params.set('sort', 'total_asc');
      }
      params.set('page', page);
      params.set('limit', limit);
      const { data } = await axiosInstance.get(`/api/orders?${params.toString()}`);
      setOrders(data.orders || []);
      setTotal(data.total ?? 0);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to load orders');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, fulfillmentStatus, page, paymentStatus, searchSubmitted, sortBy]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSearchSubmitted(search.trim());
    setPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const formatDate = (d) => (d ? new Date(d).toLocaleDateString(undefined, { dateStyle: 'short' }) : '—');
  const displayOrderNumber = (order) => order.store_order_seq || order.order_id;

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className="max-w-full overflow-x-hidden">
      <div className="mb-6">
        <h2 className="text-storelaunch-dark font-bold text-lg sm:text-xl">
          {t('dashboard.ordersPage.title')}
        </h2>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-md p-3 sm:p-4 mb-6">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3">
          <div className="w-full sm:flex-1 sm:min-w-[200px]">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('dashboard.ordersPage.searchPlaceholder')}
              className="w-full min-h-11 border border-gray-300 rounded-lg px-3 py-2.5 text-sm"
            />
          </div>
          <div className="relative flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setFiltersOpen((v) => !v)}
              className="min-h-11 px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-2"
            >
              {t('dashboard.ordersPage.filters')}
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
            <select
              value={sortBy}
              onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
              className="min-h-11 border border-gray-300 rounded-lg px-3 py-2.5 text-sm min-w-[120px]"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value || 'default'} value={opt.value}>
                  {t(`dashboard.ordersPage.${opt.labelKey}`)}
                </option>
              ))}
            </select>
            <button type="submit" className="min-h-11 px-4 py-2.5 bg-[#0A3C5A] text-white rounded-lg text-sm font-medium hover:opacity-90">
              {t('dashboard.ordersPage.searchButton')}
            </button>
          </div>
        </form>
        {filtersOpen && (
          <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">{t('dashboard.ordersPage.paymentStatusLabel')}</label>
              <select
                value={paymentStatus}
                onChange={(e) => { setPaymentStatus(e.target.value); setPage(1); }}
                className="w-full min-h-11 border border-gray-300 rounded-lg px-3 py-2.5 text-sm"
              >
                {PAYMENT_OPTIONS.map((o) => (
                  <option key={o || 'all'} value={o}>{o ? t(`dashboard.ordersPage.status${o}`) : t('dashboard.ordersPage.statusAll')}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">{t('dashboard.ordersPage.fulfillmentStatusLabel')}</label>
              <select
                value={fulfillmentStatus}
                onChange={(e) => { setFulfillmentStatus(e.target.value); setPage(1); }}
                className="w-full min-h-11 border border-gray-300 rounded-lg px-3 py-2.5 text-sm"
              >
                {FULFILLMENT_OPTIONS.map((o) => (
                  <option key={o || 'all'} value={o}>{o ? t(`dashboard.ordersPage.status${o}`) : t('dashboard.ordersPage.statusAll')}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">{t('dashboard.ordersPage.dateFromLabel')}</label>
              <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} className="w-full min-h-11 border border-gray-300 rounded-lg px-3 py-2.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">{t('dashboard.ordersPage.dateToLabel')}</label>
              <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} className="w-full min-h-11 border border-gray-300 rounded-lg px-3 py-2.5 text-sm" />
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-md overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">
            {t('dashboard.ordersPage.loading')}
          </div>
        ) : orders.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {t('dashboard.ordersPage.noOrders')}
          </div>
        ) : (
          <>
            <div className="md:hidden divide-y divide-gray-100">
              {orders.map((o) => (
                <div key={o.order_id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">#{displayOrderNumber(o)}</p>
                      <p className="text-sm text-gray-700 truncate">{o.customer_name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{formatDate(o.order_date)}</p>
                    </div>
                    <p className="text-sm font-semibold text-gray-900 shrink-0">
                      {o.total_amount != null ? (
                        <CurrencyAmount value={o.total_amount} isRTL={isRTL} size="sm" />
                      ) : (
                        '—'
                      )}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${badgeClass('payment', o.payment_status)}`}>
                      {o.payment_status
                        ? t(`dashboard.ordersPage.status${o.payment_status}`)
                        : t('dashboard.ordersPage.statusPending')}
                    </span>
                    <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${badgeClass('fulfillment', o.fulfillment_status)}`}>
                      {t(`dashboard.ordersPage.status${o.fulfillment_status || 'Processing'}`)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate(`/dashboard/orders/${o.order_id}`)}
                    className="w-full min-h-11 text-[#0E8F96] border border-[#0E8F96]/30 rounded-lg text-sm font-medium"
                  >
                    {t('dashboard.ordersPage.view')}
                  </button>
                </div>
              ))}
            </div>
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-[#0A3C5A]">
                  <tr>
                    <th className={`px-4 py-3 text-xs font-medium text-white uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`}>
                      {t('dashboard.ordersPage.tableOrderId')}
                    </th>
                    <th className={`px-4 py-3 text-xs font-medium text-white uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`}>
                      {t('dashboard.ordersPage.tableCustomer')}
                    </th>
                    <th className={`px-4 py-3 text-xs font-medium text-white uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`}>
                      {t('dashboard.ordersPage.tableOrderDate')}
                    </th>
                    <th className={`px-4 py-3 text-xs font-medium text-white uppercase tracking-wider ${isRTL ? 'text-left' : 'text-right'}`}>
                      {t('dashboard.ordersPage.tableTotal')}
                    </th>
                    <th className={`px-4 py-3 text-xs font-medium text-white uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`}>
                      {t('dashboard.ordersPage.tablePayment')}
                    </th>
                    <th className={`px-4 py-3 text-xs font-medium text-white uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`}>
                      {t('dashboard.ordersPage.tableFulfillment')}
                    </th>
                    <th className={`px-4 py-3 text-xs font-medium text-white uppercase tracking-wider ${isRTL ? 'text-left' : 'text-right'}`}>
                      {t('dashboard.ordersPage.tableActions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {orders.map((o) => (
                    <tr key={o.order_id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        #{displayOrderNumber(o)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {o.customer_name}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {formatDate(o.order_date)}
                      </td>
                      <td className={`px-4 py-3 text-sm text-gray-900 ${isRTL ? 'text-left' : 'text-right'}`}>
                        {o.total_amount != null ? (
                          <CurrencyAmount value={o.total_amount} isRTL={isRTL} size="sm" />
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${badgeClass('payment', o.payment_status)}`}>
                          {o.payment_status
                            ? t(`dashboard.ordersPage.status${o.payment_status}`)
                            : t('dashboard.ordersPage.statusPending')}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${badgeClass('fulfillment', o.fulfillment_status)}`}>
                          {t(`dashboard.ordersPage.status${o.fulfillment_status || 'Processing'}`)}
                        </span>
                      </td>
                      <td className={`px-4 py-3 ${isRTL ? 'text-left' : 'text-right'}`}>
                        <button
                          type="button"
                          onClick={() => navigate(`/dashboard/orders/${o.order_id}`)}
                          className="text-[#0E8F96] hover:underline text-sm font-medium"
                        >
                          {t('dashboard.ordersPage.view')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="px-4 py-3 border-t border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <p className="text-sm text-gray-600 text-center sm:text-left">
                  {t('dashboard.ordersPage.paginationShowing', {
                    from: (page - 1) * limit + 1,
                    to: Math.min(page * limit, total),
                    total,
                  })}
                </p>
                <div className="flex gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="flex-1 sm:flex-none min-h-11 px-3 py-1.5 border border-gray-300 rounded-lg text-sm disabled:opacity-50"
                  >
                    {t('dashboard.ordersPage.previous')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="flex-1 sm:flex-none min-h-11 px-3 py-1.5 border border-gray-300 rounded-lg text-sm disabled:opacity-50"
                  >
                    {t('dashboard.ordersPage.next')}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default OrdersList;
