import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../../api/axios';

const FOOTER_KEYS = [
  'about',
  'contactEmail',
  'contactPhone',
  'address',
  'instagram',
  'tiktok',
  'snapchat',
  'twitter',
  'whatsapp',
  'facebook',
];

function toStr(v) {
  if (v == null || typeof v === 'object') return '';
  return String(v);
}

function normalizeFooter(raw) {
  const src = raw && typeof raw === 'object' ? raw : {};
  return Object.fromEntries(FOOTER_KEYS.map((k) => [k, toStr(src[k])]));
}

const StoreFooterPage = () => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [footer, setFooter] = useState(() => normalizeFooter({}));

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data } = await axiosInstance.get('/api/store');
        if (!cancelled) {
          const foot = data.settings?.footer && typeof data.settings.footer === 'object' ? data.settings.footer : {};
          const inf = data.settings?.info && typeof data.settings.info === 'object' ? data.settings.info : {};
          setFooter(
            normalizeFooter({
              ...foot,
              contactEmail: foot.contactEmail ?? inf.contactEmail,
              contactPhone: foot.contactPhone ?? inf.contactPhone,
              address: foot.address ?? inf.address,
            })
          );
        }
      } catch {
        if (!cancelled) showToast('error', isRTL ? 'فشل تحميل البيانات' : 'Failed to load data');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isRTL]);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await axiosInstance.put('/api/store/footer', { footer: normalizeFooter(footer) });
      showToast('success', isRTL ? 'تم الحفظ بنجاح' : 'Saved successfully');
    } catch (err) {
      const msg =
        err?.response?.data?.error ||
        (isRTL ? 'فشل الحفظ، حاول مجدداً' : 'Failed to save, please try again');
      showToast('error', msg);
    } finally {
      setSaving(false);
    }
  };

  const setFooterField = (key, value) =>
    setFooter((prev) => ({ ...prev, [key]: String(value) }));

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-gray-400" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="w-6 h-6 border-2 border-gray-200 border-t-storelaunch-green rounded-full animate-spin mr-3" />
        {isRTL ? 'جارٍ التحميل…' : 'Loading…'}
      </div>
    );
  }

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {toast && (
        <div
          className={`fixed top-4 ${isRTL ? 'left-4' : 'right-4'} z-50 px-4 py-3 rounded-lg shadow-lg text-white text-sm ${
            toast.type === 'error' ? 'bg-red-500' : 'bg-storelaunch-green'
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className={`flex items-center gap-3 mb-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <button
          type="button"
          onClick={() => navigate('/dashboard/store')}
          className="inline-flex items-center gap-1 text-sm text-storelaunch-dark hover:underline"
        >
          <svg className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M15 19l-7-7 7-7" />
          </svg>
          {t('dashboard.storeManagement.back')}
        </button>
        <h2 className="text-storelaunch-dark font-bold text-2xl">
          {t('dashboard.storeManagement.footer.sectionTitle')}
        </h2>
      </div>

      {/* Contact info */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-md p-6 space-y-4">
        <h3 className="text-sm font-semibold text-gray-800">
          {isRTL ? 'معلومات التواصل' : 'Contact Information'}
        </h3>
        <p className="text-xs text-gray-500">
          {isRTL
            ? 'تظهر هذه المعلومات في تذييل المتجر أمام الزبائن.'
            : 'This information is displayed in the storefront footer for customers.'}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              {isRTL ? 'البريد الإلكتروني' : 'Contact Email'}
            </label>
            <input
              type="email"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-storelaunch-green/40"
              value={footer.contactEmail}
              onChange={(e) => setFooterField('contactEmail', e.target.value)}
              placeholder="store@example.com"
              dir="ltr"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              {isRTL ? 'رقم الهاتف' : 'Contact Phone'}
            </label>
            <input
              type="tel"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-storelaunch-green/40"
              value={footer.contactPhone}
              onChange={(e) => setFooterField('contactPhone', e.target.value)}
              placeholder="+966 5x xxx xxxx"
              dir="ltr"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            {isRTL ? 'عنوان المتجر' : 'Store Address'}
          </label>
          <textarea
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm min-h-[64px] focus:outline-none focus:ring-2 focus:ring-storelaunch-green/40"
            value={footer.address}
            onChange={(e) => setFooterField('address', e.target.value)}
            placeholder={isRTL ? 'الرياض، المملكة العربية السعودية' : 'Riyadh, Saudi Arabia'}
          />
        </div>
      </div>

      {/* About & social */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-md p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('dashboard.storeManagement.footer.about')}
          </label>
          <textarea
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm min-h-[80px] focus:outline-none focus:ring-2 focus:ring-storelaunch-green/40"
            value={footer.about}
            onChange={(e) => setFooterField('about', e.target.value)}
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
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-storelaunch-green/40"
                  value={footer[key]}
                  onChange={(e) => setFooterField(key, e.target.value)}
                  placeholder="https://..."
                  dir="ltr"
                />
              </div>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-storelaunch-green text-white rounded-lg text-sm font-medium hover:bg-storelaunch-deep-green disabled:opacity-50 transition-colors"
        >
          {saving
            ? (isRTL ? 'جارٍ الحفظ…' : 'Saving…')
            : t('dashboard.storeManagement.actions.saveChanges')}
        </button>
      </div>
    </div>
  );
};

export default StoreFooterPage;
