import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../api';

export default function AdminStores() {
  const { t } = useTranslation();
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api('/admin/stores').then(setStores).catch(() => setStores([])).finally(() => setLoading(false));
  }, []);

  const toggleSuspend = (id, isSuspended) => {
    api(`/admin/stores/${id}/suspend`, { method: 'PATCH', body: JSON.stringify({ suspended: !isSuspended }) })
      .then((updated) => setStores((prev) => prev.map((s) => (s.id === id ? { ...s, is_suspended: updated.is_suspended } : s))))
      .catch(alert);
  };

  if (loading) return <div className="max-w-4xl mx-auto px-4 py-8">Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link to="/admin" className="text-sky-600 hover:underline mb-4 inline-block">← {t('admin')}</Link>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">{t('moderateStores')}</h1>
      <div className="space-y-4">
        {stores.map((s) => (
          <div key={s.id} className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200">
            <div>
              <p className="font-medium text-slate-900">{s.name}</p>
              <p className="text-sm text-slate-600">{s.slug} · {s.owner_email}</p>
              <p className="text-xs text-slate-500">{s.is_suspended ? 'Suspended' : 'Active'}</p>
            </div>
            <div className="flex gap-2">
              <Link to={`/store/${s.slug}`} className="px-3 py-1.5 text-sm bg-slate-100 rounded-lg hover:bg-slate-200">View</Link>
              <button
                type="button"
                onClick={() => toggleSuspend(s.id, s.is_suspended)}
                className={`text-sm px-3 py-1.5 rounded ${s.is_suspended ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
              >
                {s.is_suspended ? t('restore') : t('suspend')}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
