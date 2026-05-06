import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../../api/axios';
import CurrencyAmount from '../../components/common/CurrencyAmount';

const CustomersManagementPage = () => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const { data } = await axiosInstance.get('/api/customers');
        if (!cancelled) {
          setCustomers(data.customers || []);
        }
      } catch {
        if (!cancelled) {
          setToast({ type: 'error', message: t('dashboard.settings.toast.saveError') });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [t]);

  const filtered = customers.filter((c) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    const name = [c.first_name, c.last_name].filter(Boolean).join(' ').toLowerCase();
    return (
      name.includes(q) ||
      (c.email || '').toLowerCase().includes(q) ||
      (c.phone || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {toast && (
        <div
          className={`fixed top-4 ${isRTL ? 'left-4' : 'right-4'} z-50 px-4 py-3 rounded-lg shadow-lg text-white ${
            toast.type === 'error' ? 'bg-red-500' : 'bg-storelaunch-green'
          }`}
        >
          {toast.message}
        </div>
      )}

      <div className={`flex items-center gap-3 mb-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <button
          type="button"
          onClick={() => navigate('/dashboard/store')}
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
          {t('dashboard.storeManagement.back')}
        </button>
        <h2 className="text-storelaunch-dark font-bold text-2xl">
          {t('dashboard.customersManagement.title')}
        </h2>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-md p-6">
          <div className="flex flex-wrap items-end gap-3 mb-4">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('dashboard.customersManagement.searchLabel')}
              </label>
              <input
                type="text"
                placeholder={t('dashboard.customersManagement.searchPlaceholder')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {loading ? (
            <div className="p-4 text-gray-500 text-sm">
              {t('dashboard.customersManagement.loading')}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-4 text-gray-500 text-sm">
              {t('dashboard.customersManagement.noCustomers')}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className={`px-3 py-2 text-xs font-medium text-gray-600 ${isRTL ? 'text-right' : 'text-left'}`}>
                      {t('dashboard.ordersPage.tableCustomer')}
                    </th>
                    <th className={`px-3 py-2 text-xs font-medium text-gray-600 ${isRTL ? 'text-right' : 'text-left'}`}>
                      {t('dashboard.customersManagement.columnEmail')}
                    </th>
                    <th className={`px-3 py-2 text-xs font-medium text-gray-600 ${isRTL ? 'text-right' : 'text-left'}`}>
                      {t('dashboard.settings.profile.phone')}
                    </th>
                    <th className={`px-3 py-2 text-xs font-medium text-gray-600 ${isRTL ? 'text-right' : 'text-left'}`}>
                      {t('dashboard.customersManagement.ordersCount')}
                    </th>
                    <th className={`px-3 py-2 text-xs font-medium text-gray-600 ${isRTL ? 'text-left' : 'text-right'}`}>
                      {t('dashboard.customersManagement.totalSpend')}
                    </th>
                    <th className={`px-3 py-2 text-xs font-medium text-gray-600 ${isRTL ? 'text-left' : 'text-right'}`}>
                      {t('dashboard.customersManagement.lastPurchase')}
                    </th>
                    <th className={`px-3 py-2 text-xs font-medium text-gray-600 ${isRTL ? 'text-left' : 'text-right'}`}>
                      {t('dashboard.ordersPage.tableActions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filtered.map((c) => (
                    <tr key={c.customer_id} className="hover:bg-gray-50">
                      <td className="px-3 py-2">
                        {[c.first_name, c.last_name].filter(Boolean).join(' ') || '—'}
                      </td>
                      <td className="px-3 py-2 break-all max-w-[180px]">{c.email || '—'}</td>
                      <td className="px-3 py-2">{c.phone || '—'}</td>
                      <td className={`px-3 py-2 tabular-nums ${isRTL ? 'text-right' : 'text-left'}`}>
                        {c.orders_count || 0}
                      </td>
                      <td className={`px-3 py-2 tabular-nums ${isRTL ? 'text-left' : 'text-right'}`}>
                        <CurrencyAmount value={c.total_spend || 0} isRTL={isRTL} size="sm" />
                      </td>
                      <td className={`px-3 py-2 text-gray-700 whitespace-nowrap ${isRTL ? 'text-left' : 'text-right'}`}>
                        {c.last_order_at
                          ? new Date(c.last_order_at).toLocaleString(undefined, {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            })
                          : '—'}
                      </td>
                      <td className={`px-3 py-2 ${isRTL ? 'text-left' : 'text-right'}`}>
                        <button
                          type="button"
                          onClick={() => navigate(`/dashboard/store/customers/${c.customer_id}`)}
                          className="text-[#0E8F96] hover:underline font-medium"
                        >
                          {t('dashboard.customersManagement.viewProfile')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </div>
    </div>
  );
};

export default CustomersManagementPage;

