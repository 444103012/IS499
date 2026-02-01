import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../api';
import { Package, ShoppingCart, Settings, CreditCard, Store } from 'lucide-react';

export default function Dashboard() {
  const { t } = useTranslation();
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api('/stores/my')
      .then(setStores)
      .catch(() => setStores([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="max-w-4xl mx-auto px-4 py-8">Loading...</div>;
  const store = stores[0];
  if (!store) return <div className="max-w-4xl mx-auto px-4 py-8">No store found. Complete registration.</div>;

  const links = [
    { to: `/dashboard/products/${store.id}`, icon: Package, label: t('products') },
    { to: `/dashboard/orders/${store.id}`, icon: ShoppingCart, label: t('orders') },
    { to: `/dashboard/settings/${store.id}`, icon: Settings, label: t('settings') },
    { to: `/dashboard/subscription/${store.id}`, icon: CreditCard, label: t('subscription') },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-slate-900 mb-2">{t('dashboard')}</h1>
      <p className="text-slate-600 mb-6">{store.name} · {store.slug}</p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {links.map(({ to, icon: Icon, label }) => (
          <Link
            key={to}
            to={to}
            className="flex items-center gap-3 p-4 bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-sky-200 transition"
          >
            <Icon className="w-8 h-8 text-sky-600" />
            <span className="font-medium text-slate-900">{label}</span>
          </Link>
        ))}
      </div>
      <div className="mt-8 p-4 bg-sky-50 rounded-xl border border-sky-100">
        <p className="text-sm text-sky-800">
          <strong>Store URL:</strong>{' '}
          <Link to={`/store/${store.slug}`} className="text-sky-600 hover:underline">
            /store/{store.slug}
          </Link>
          {' '}— Share this link so customers can browse your store.
        </p>
      </div>
    </div>
  );
}
