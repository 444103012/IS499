import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../api';

export default function StoreSettings() {
  const { t } = useTranslation();
  const { storeId } = useParams();
  const [store, setStore] = useState(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api(`/stores/${storeId}`)
      .then((s) => {
        setStore(s);
        setName(s.name || '');
        setDescription(s.description || '');
      })
      .catch(() => setStore(null))
      .finally(() => setLoading(false));
  }, [storeId]);

  const handleSave = (e) => {
    e.preventDefault();
    setSaving(true);
    api(`/stores/${storeId}`, {
      method: 'PUT',
      body: JSON.stringify({ name, description }),
    })
      .then(setStore)
      .catch(alert)
      .finally(() => setSaving(false));
  };

  if (loading) return <div className="max-w-4xl mx-auto px-4 py-8">Loading...</div>;
  if (!store) return <div className="max-w-4xl mx-auto px-4 py-8">Store not found</div>;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">{t('settings')}</h1>
      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">{t('storeName')}</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">{t('storeDescription')}</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500"
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-500 disabled:opacity-50"
        >
          {saving ? '...' : t('save')}
        </button>
      </form>
    </div>
  );
}
