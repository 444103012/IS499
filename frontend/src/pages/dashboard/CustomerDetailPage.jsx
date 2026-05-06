import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../../api/axios';
import CurrencyAmount from '../../components/common/CurrencyAmount';

const badgePayment = (v) => {
  const s = (v || '').toLowerCase();
  if (s === 'paid') return 'bg-green-100 text-green-800';
  if (s === 'pending') return 'bg-yellow-100 text-yellow-800';
  if (s === 'failed') return 'bg-red-100 text-red-800';
  return 'bg-gray-100 text-gray-800';
};

const badgeFulfillment = (v) => {
  const s = (v || '').toLowerCase();
  if (s === 'processing' || s === 'pending') return 'bg-blue-100 text-blue-800';
  if (s === 'packed') return 'bg-slate-100 text-slate-800';
  if (s === 'shipped') return 'bg-indigo-100 text-indigo-800';
  if (s === 'delivered') return 'bg-green-100 text-green-800';
  if (s === 'cancelled') return 'bg-red-100 text-red-800';
  return 'bg-gray-100 text-gray-800';
};

const CustomerDetailPage = () => {
  const { customerId: customerIdParam } = useParams();
  const customerId = parseInt(customerIdParam, 10);
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [payload, setPayload] = useState(null);

  const load = useCallback(async () => {
    if (Number.isNaN(customerId)) {
      setError(t('dashboard.customersManagement.invalidCustomerId'));
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data } = await axiosInstance.get(`/api/customers/${customerId}`);
      setPayload(data);
    } catch (err) {
      setPayload(null);
      setError(err.response?.data?.error || err.message || t('dashboard.customersManagement.loadDetailError'));
    } finally {
      setLoading(false);
    }
  }, [customerId, t]);

  useEffect(() => {
    load();
  }, [load]);

  const formatDateTime = (d) =>
    d ? new Date(d).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' }) : '—';
  const formatDate = (d) => (d ? new Date(d).toLocaleDateString(undefined, { dateStyle: 'short' }) : '—');

  const customer = payload?.customer;
  const summary = payload?.summary;
  const orders = payload?.orders || [];

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className={`flex flex-wrap items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <button
          type="button"
          onClick={() => navigate('/dashboard/store/customers')}
          className="inline-flex items-center gap-1 text-sm text-storelaunch-dark hover:underline"
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
          {t('dashboard.customersManagement.backToList')}
        </button>
      </div>

      <h1 className="text-storelaunch-dark font-bold text-2xl">
        {t('dashboard.customersManagement.detailTitle')}
      </h1>

      {loading && (
        <div className="p-4 text-gray-500 text-sm">{t('dashboard.customersManagement.loadingDetail')}</div>
      )}

      {!loading && error && (
        <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm">{error}</div>
      )}

      {!loading && !error && customer && (
        <>
          <div className="bg-white border border-gray-200 rounded-xl shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {t('dashboard.customersManagement.profileSection')}
            </h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-gray-500 font-medium">{t('dashboard.ordersPage.tableCustomer')}</dt>
                <dd className="text-gray-900 mt-0.5">
                  {[customer.first_name, customer.last_name].filter(Boolean).join(' ') || '—'}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500 font-medium">Email</dt>
                <dd className="text-gray-900 mt-0.5 break-all">{customer.email || '—'}</dd>
              </div>
              <div>
                <dt className="text-gray-500 font-medium">{t('dashboard.settings.profile.phone')}</dt>
                <dd className="text-gray-900 mt-0.5">{customer.phone || '—'}</dd>
              </div>
            </dl>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-gray-200 rounded-xl shadow-md p-4">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                {t('dashboard.customersManagement.totalSpend')}
              </p>
              <p className="text-xl font-semibold text-gray-900 mt-1 tabular-nums">
                <CurrencyAmount value={summary?.total_spend ?? 0} isRTL={isRTL} />
              </p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl shadow-md p-4">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                {t('dashboard.customersManagement.ordersCount')}
              </p>
              <p className="text-xl font-semibold text-gray-900 mt-1 tabular-nums">
                {summary?.orders_count ?? 0}
              </p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl shadow-md p-4">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                {t('dashboard.customersManagement.lastPurchase')}
              </p>
              <p className="text-lg font-semibold text-gray-900 mt-1">{formatDateTime(summary?.last_order_at)}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl shadow-md p-4">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                {t('dashboard.customersManagement.firstPurchase')}
              </p>
              <p className="text-lg font-semibold text-gray-900 mt-1">{formatDate(summary?.first_order_at)}</p>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl shadow-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                {t('dashboard.customersManagement.purchaseHistory')}
              </h2>
              <p className="text-sm text-gray-500 mt-1">{t('dashboard.customersManagement.purchaseHistoryHint')}</p>
            </div>
            {orders.length === 0 ? (
              <div className="p-6 text-sm text-gray-500">{t('dashboard.customersManagement.noOrdersHistory')}</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className={`px-4 py-3 text-xs font-medium text-gray-600 ${isRTL ? 'text-right' : 'text-left'}`}>
                        {t('dashboard.ordersPage.tableOrderId')}
                      </th>
                      <th className={`px-4 py-3 text-xs font-medium text-gray-600 ${isRTL ? 'text-right' : 'text-left'}`}>
                        {t('dashboard.ordersPage.tableOrderDate')}
                      </th>
                      <th className={`px-4 py-3 text-xs font-medium text-gray-600 ${isRTL ? 'text-left' : 'text-right'}`}>
                        {t('dashboard.ordersPage.tableTotal')}
                      </th>
                      <th className={`px-4 py-3 text-xs font-medium text-gray-600 ${isRTL ? 'text-right' : 'text-left'}`}>
                        {t('dashboard.ordersPage.tablePayment')}
                      </th>
                      <th className={`px-4 py-3 text-xs font-medium text-gray-600 ${isRTL ? 'text-right' : 'text-left'}`}>
                        {t('dashboard.ordersPage.tableFulfillment')}
                      </th>
                      <th className={`px-4 py-3 text-xs font-medium text-gray-600 ${isRTL ? 'text-left' : 'text-right'}`}>
                        {t('dashboard.ordersPage.tableActions')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {orders.map((o) => (
                      <tr key={o.order_id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">#{o.order_id}</td>
                        <td className="px-4 py-3 text-gray-700">{formatDateTime(o.order_date)}</td>
                        <td className={`px-4 py-3 text-gray-900 tabular-nums ${isRTL ? 'text-left' : 'text-right'}`}>
                          <CurrencyAmount value={o.total_amount ?? 0} isRTL={isRTL} size="sm" />
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${badgePayment(o.payment_status)}`}>
                            {o.payment_status
                              ? t(`dashboard.ordersPage.status${o.payment_status}`)
                              : t('dashboard.ordersPage.statusPending')}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${badgeFulfillment(o.fulfillment_status)}`}>
                            {t(`dashboard.ordersPage.status${o.fulfillment_status || 'Processing'}`)}
                          </span>
                        </td>
                        <td className={`px-4 py-3 ${isRTL ? 'text-left' : 'text-right'}`}>
                          <button
                            type="button"
                            onClick={() => navigate(`/dashboard/orders/${o.order_id}`)}
                            className="text-[#0E8F96] hover:underline text-sm font-medium"
                          >
                            {t('dashboard.customersManagement.viewOrder')}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default CustomerDetailPage;
