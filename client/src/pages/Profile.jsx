import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import api from '../api';

export default function Profile() {
  const { t, i18n } = useTranslation();
  const { user, updateUser } = useAuth();
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [preferredLanguage, setPreferredLanguage] = useState(user?.preferred_language || i18n.language);
  const [saving, setSaving] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    setSaving(true);
    api('/auth/me', {
      method: 'PATCH',
      body: JSON.stringify({ fullName, preferredLanguage }),
    })
      .then((updated) => {
        updateUser(updated);
        i18n.changeLanguage(updated.preferred_language || preferredLanguage);
        setSaving(false);
      })
      .catch(() => setSaving(false));
  };

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">{t('profile')}</h1>
      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">{t('fullName')}</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">{t('email')}</label>
          <input type="text" value={user?.email || ''} readOnly className="w-full px-3 py-2 bg-slate-100 rounded-lg text-slate-600" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">{t('language')}</label>
          <select
            value={preferredLanguage}
            onChange={(e) => setPreferredLanguage(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500"
          >
            <option value="en">{t('english')}</option>
            <option value="ar">{t('arabic')}</option>
          </select>
        </div>
        <button type="submit" disabled={saving} className="w-full py-2.5 bg-sky-600 text-white rounded-lg hover:bg-sky-500 disabled:opacity-50">
          {saving ? '...' : t('save')}
        </button>
      </form>
    </div>
  );
}
