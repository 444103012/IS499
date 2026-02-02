import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../api';

export default function MyOrders() {
  const { t } = useTranslation();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api('/orders/my')
      .then(setOrders)
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="max-w-4xl mx-auto px-4 py-8">Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">{t('orderHistory')}</h1>
      {orders.length === 0 ? (
        <p className="text-slate-600">{t('noOrders')}</p>
      ) : (
        <div className="space-y-4">
          {orders.map((o) => (
            <Link
              key={o.id}
              to={`/orders/${o.id}`}
              className="block p-4 bg-white rounded-xl border border-slate-200 hover:shadow-md hover:border-sky-200 transition"
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium text-slate-900">#{o.id.slice(0, 8)} · {o.store_name}</p>
                  <p className="text-sm text-slate-600">{o.total} {t('sar')} · {o.status}</p>
                  <p className="text-xs text-slate-500">{new Date(o.created_at).toLocaleDateString()}</p>
                </div>
                <span className="text-sky-600 text-sm font-medium">{t('trackOrder')} →</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
