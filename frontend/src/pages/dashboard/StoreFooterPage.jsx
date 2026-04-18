import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../../api/axios';

const StoreFooterPage = () => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [footer, setFooter] = useState({});

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const { data } = await axiosInstance.get('/api/store');
        if (!cancelled) {
          setFooter(data.settings?.footer || {});
        }
      } catch {
        if (!cancelled) {
          setToast({ type: 'error', message: t('dashboard.storeManagement.toast.saveError') });
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

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await axiosInstance.put('/api/store/footer', { footer });
      showToast('success', t('dashboard.storeManagement.toast.saveSuccess'));
    } catch {
      showToast('error', t('dashboard.storeManagement.toast.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const updateField = (key, value) => {
    setFooter((prev) => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="p-4 text-gray-500" dir={isRTL ? 'rtl' : 'ltr'}>
        {t('dashboard.productForm.loadingProduct')}
      </div>
    );
  }

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
          {t('dashboard.storeManagement.footer.sectionTitle')}
        </h2>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-md p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('dashboard.storeManagement.footer.about')}
          </label>
          <textarea
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm min-h-[80px]"
            value={footer.about || ''}
            onChange={(e) => updateField('about', e.target.value)}
          />
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-800">
            {t('dashboard.storeManagement.footer.socialLinks')}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {['instagram', 'tiktok', 'snapchat', 'twitter', 'whatsapp', 'facebook'].map((key) => (
              <div key={key}>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  {t(`dashboard.storeManagement.footer.${key}`)}
                </label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs"
                  value={footer[key] || ''}
                  onChange={(e) => updateField(key, e.target.value)}
                />
              </div>
            ))}
          </div>
        </div>

        <div>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-storelaunch-green text-white rounded-lg text-sm font-medium hover:bg-storelaunch-deep-green disabled:opacity-50"
          >
            {t('dashboard.storeManagement.actions.saveChanges')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StoreFooterPage;

