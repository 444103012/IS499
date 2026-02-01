import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../api';

export default function StoreOrders() {
  const { t } = useTranslation();
  const { storeId } = useParams();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api(`/orders/store/${storeId}`)
      .then(setOrders)
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, [storeId]);

  const updateStatus = (orderId, status) => {
    api(`/orders/store/${storeId}/${orderId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    })
      .then((updated) => setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o))))
      .catch(alert);
  };

  if (loading) return <div className="max-w-4xl mx-auto px-4 py-8">Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">{t('orders')}</h1>
      {orders.length === 0 ? (
        <p className="text-slate-600">{t('noOrders')}</p>
      ) : (
        <div className="space-y-4">
          {orders.map((o) => (
            <div
              key={o.id}
              className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-4"
            >
              <div>
                <p className="font-medium text-slate-900">#{o.id.slice(0, 8)}</p>
                <p className="text-sm text-slate-600">{o.customer_name || o.guest_email || 'Guest'}</p>
                <p className="text-sm text-slate-600">{o.total} {t('sar')} · {o.status}</p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={o.status}
                  onChange={(e) => updateStatus(o.id, e.target.value)}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm"
                >
                  <option value="pending">pending</option>
                  <option value="confirmed">confirmed</option>
                  <option value="processing">processing</option>
                  <option value="shipped">shipped</option>
                  <option value="delivered">delivered</option>
                  <option value="cancelled">cancelled</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
