import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../api';
import { Users, Store, ShoppingCart, DollarSign } from 'lucide-react';

export default function AdminDashboard() {
  const { t } = useTranslation();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api('/admin/stats').then(setStats).catch(() => setStats({ users: 0, stores: 0, orders: 0, revenue: 0 }));
  }, []);

  if (!stats) return <div className="max-w-4xl mx-auto px-4 py-8">Loading...</div>;

  const cards = [
    { label: 'Users', value: stats.users, icon: Users, to: '/admin/users' },
    { label: 'Stores', value: stats.stores, icon: Store, to: '/admin/stores' },
    { label: 'Orders', value: stats.orders, icon: ShoppingCart },
    { label: 'Revenue (SAR)', value: stats.revenue, icon: DollarSign },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">{t('admin')} {t('dashboard')}</h1>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(({ label, value, icon: Icon, to }) => (
          to ? (
            <Link key={label} to={to} className="flex items-center gap-4 p-4 bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md">
              <Icon className="w-8 h-8 text-sky-600" />
              <div>
                <p className="text-2xl font-bold text-slate-900">{value}</p>
                <p className="text-sm text-slate-600">{label}</p>
              </div>
            </Link>
          ) : (
            <div key={label} className="flex items-center gap-4 p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
              <Icon className="w-8 h-8 text-sky-600" />
              <div>
                <p className="text-2xl font-bold text-slate-900">{value}</p>
                <p className="text-sm text-slate-600">{label}</p>
              </div>
            </div>
          )
        ))}
      </div>
    </div>
  );
}
