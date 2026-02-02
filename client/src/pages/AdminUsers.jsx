import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../api';

export default function AdminUsers() {
  const { t } = useTranslation();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api('/admin/users').then(setUsers).catch(() => setUsers([])).finally(() => setLoading(false));
  }, []);

  const toggleActive = (id, isActive) => {
    api(`/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify({ isActive: !isActive }) })
      .then((updated) => setUsers((prev) => prev.map((u) => (u.id === id ? updated : u))))
      .catch(alert);
  };

  if (loading) return <div className="max-w-4xl mx-auto px-4 py-8">Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link to="/admin" className="text-sky-600 hover:underline mb-4 inline-block">← {t('admin')}</Link>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">{t('users')}</h1>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left p-3 font-medium text-slate-700">Email</th>
              <th className="text-left p-3 font-medium text-slate-700">Name</th>
              <th className="text-left p-3 font-medium text-slate-700">Role</th>
              <th className="text-left p-3 font-medium text-slate-700">Status</th>
              <th className="w-24 p-3" />
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-slate-100">
                <td className="p-3">{u.email}</td>
                <td className="p-3">{u.full_name || '-'}</td>
                <td className="p-3">{u.role}</td>
                <td className="p-3">{u.is_active ? 'Active' : 'Disabled'}</td>
                <td className="p-3">
                  <button
                    type="button"
                    onClick={() => toggleActive(u.id, u.is_active)}
                    className={`text-sm px-2 py-1 rounded ${u.is_active ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}
                  >
                    {u.is_active ? t('suspend') : t('restore')}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
