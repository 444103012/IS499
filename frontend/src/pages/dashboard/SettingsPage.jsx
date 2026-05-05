import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../../api/axios';

const SETTINGS_TABS = ['profile', 'business', 'language', 'store'];
const PHONE_REGEX = /^05\d{8}$/;

const SettingsPage = () => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    phone: '',
  });
  const [business, setBusiness] = useState({});
  const [languagePref, setLanguagePref] = useState(i18n.language || 'ar');
  const [storeRecord, setStoreRecord] = useState(null);
  const [dangerConfirm, setDangerConfirm] = useState('');
  const [storeActionSaving, setStoreActionSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const [{ data }, { data: storeData }] = await Promise.all([
          axiosInstance.get('/api/settings/profile'),
          axiosInstance.get('/api/store').catch(() => ({ data: { store: null } })),
        ]);
        if (!cancelled) {
          const businessSettings = data.business_settings || {};
          setProfile({
            name: data.first_name || '',
            email: data.email || '',
            phone: data.phone || '',
          });
          setBusiness({
            ...businessSettings,
            businessName: businessSettings.businessName || storeData.store?.name || '',
          });
          setLanguagePref(data.language_pref || i18n.language || 'ar');
          setStoreRecord(storeData.store || null);
        }
      } catch (err) {
        if (!cancelled) {
          setToast({ type: 'error', message: t('dashboard.settings.toast.saveError') });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [t, i18n.language]);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const saveProfile = async () => {
    const trimmedPhone = profile.phone.trim();
    if (!PHONE_REGEX.test(trimmedPhone)) {
      alert(
        isRTL
          ? 'رقم الجوال يجب أن يبدأ بـ 05 ويتكون من 10 أرقام'
          : 'Phone number must start with 05 and be exactly 10 digits'
      );
      return;
    }

    setSaving(true);
    try {
      await axiosInstance.put('/api/settings/profile', {
        name: profile.name,
        phone: trimmedPhone,
      });
      showToast('success', t('dashboard.settings.toast.saveSuccess'));
    } catch {
      showToast('error', t('dashboard.settings.toast.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const saveBusiness = async () => {
    setSaving(true);
    try {
      await axiosInstance.put('/api/settings/profile', {
        business_settings: business,
      });
      showToast('success', t('dashboard.settings.toast.saveSuccess'));
    } catch {
      showToast('error', t('dashboard.settings.toast.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const refreshStoreRecord = async () => {
    try {
      const { data: storeData } = await axiosInstance.get('/api/store');
      setStoreRecord(storeData?.store || null);
    } catch {
      setStoreRecord(null);
    }
  };

  const handleDeactivateStore = async () => {
    if (dangerConfirm !== 'DEACTIVATE' || !storeRecord) {
      showToast('error', t('dashboard.storeManagement.toast.deactivateError'));
      return;
    }
    setStoreActionSaving(true);
    try {
      await axiosInstance.put('/api/store', {
        name: storeRecord.name || '',
        description: storeRecord.description || '',
        store_type: storeRecord.store_type || '',
        status: 'Suspended',
      });
      showToast('success', t('dashboard.storeManagement.toast.deactivateSuccess'));
      setDangerConfirm('');
      await refreshStoreRecord();
    } catch {
      showToast('error', t('dashboard.storeManagement.toast.deactivateError'));
    } finally {
      setStoreActionSaving(false);
    }
  };

  const handleReactivateStore = async () => {
    if (!storeRecord) return;
    setStoreActionSaving(true);
    try {
      await axiosInstance.put('/api/store', {
        name: storeRecord.name || '',
        description: storeRecord.description || '',
        store_type: storeRecord.store_type || '',
        status: 'Active',
      });
      showToast('success', t('dashboard.storeManagement.toast.reactivateSuccess'));
      await refreshStoreRecord();
    } catch {
      showToast('error', t('dashboard.storeManagement.toast.reactivateError'));
    } finally {
      setStoreActionSaving(false);
    }
  };

  const saveLanguage = async () => {
    setSaving(true);
    try {
      await axiosInstance.put('/api/settings/language', {
        language: languagePref,
      });
      await i18n.changeLanguage(languagePref);
      document.documentElement.dir = languagePref === 'ar' ? 'rtl' : 'ltr';
      document.documentElement.lang = languagePref;
      showToast('success', t('dashboard.settings.toast.saveSuccess'));
    } catch {
      showToast('error', t('dashboard.settings.toast.saveError'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 text-gray-500">
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

      <div>
        <h2 className="text-storelaunch-dark font-bold text-2xl mb-1">
          {t('dashboard.settings.title')}
        </h2>
        <p className="text-gray-500 text-sm">{t('dashboard.settings.subtitle')}</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <nav className="lg:w-56 flex-shrink-0">
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            {SETTINGS_TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`w-full px-4 py-3 text-sm font-medium transition-colors border-b border-gray-100 last:border-b-0 ${isRTL ? 'text-right' : 'text-left'} ${
                  activeTab === tab
                    ? `bg-storelaunch-green/10 text-storelaunch-dark ${isRTL ? 'border-r-4' : 'border-l-4'} border-storelaunch-green`
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {t(`dashboard.settings.tabs.${tab}`)}
              </button>
            ))}
          </div>
        </nav>

        <div className="flex-1 min-w-0">
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-100 pb-2">{t('dashboard.settings.tabs.profile')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('dashboard.settings.profile.name')}
                  </label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    value={profile.name}
                    onChange={(e) =>
                      setProfile((prev) => ({ ...prev, name: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('dashboard.settings.profile.email')}
                  </label>
                  <input
                    type="email"
                    disabled
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50"
                    value={profile.email}
                    readOnly
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('dashboard.settings.profile.phone')}
                  </label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    value={profile.phone}
                    pattern="05[0-9]{8}"
                    title="Phone number must contain exactly 10 digits"
                    onInvalid={(e) => e.target.setCustomValidity('Phone number must contain exactly 10 digits')}
                    onInput={(e) => e.target.setCustomValidity('')}
                    onChange={(e) =>
                      setProfile((prev) => ({ ...prev, phone: e.target.value }))
                    }
                  />
                </div>
              </div>
              <div>
                <button
                  type="button"
                  onClick={saveProfile}
                  disabled={saving}
                  className="px-4 py-2 bg-storelaunch-green text-white rounded-lg text-sm font-medium hover:bg-storelaunch-deep-green disabled:opacity-50"
                >
                  {t('dashboard.settings.actions.saveChanges')}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'business' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-100 pb-2">{t('dashboard.settings.tabs.business')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('dashboard.settings.business.businessName')}
                  </label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    value={business.businessName || ''}
                    onChange={(e) =>
                      setBusiness((prev) => ({
                        ...prev,
                        businessName: e.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('dashboard.settings.business.crNumber')}
                  </label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    value={business.crNumber || ''}
                    onChange={(e) =>
                      setBusiness((prev) => ({ ...prev, crNumber: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('dashboard.settings.business.taxNumber')}
                  </label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    value={business.taxNumber || ''}
                    onChange={(e) =>
                      setBusiness((prev) => ({
                        ...prev,
                        taxNumber: e.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('dashboard.settings.business.defaultCurrency')}
                  </label>
                  <select
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    value={business.defaultCurrency || 'SAR'}
                    onChange={(e) =>
                      setBusiness((prev) => ({
                        ...prev,
                        defaultCurrency: e.target.value,
                      }))
                    }
                  >
                    <option value="SAR">SAR</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('dashboard.settings.business.invoiceFooter')}
                  </label>
                  <textarea
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm min-h-[80px]"
                    value={business.invoiceFooter || ''}
                    onChange={(e) =>
                      setBusiness((prev) => ({
                        ...prev,
                        invoiceFooter: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
              <div>
                <button
                  type="button"
                  onClick={saveBusiness}
                  disabled={saving}
                  className="px-4 py-2 bg-storelaunch-green text-white rounded-lg text-sm font-medium hover:bg-storelaunch-deep-green disabled:opacity-50"
                >
                  {t('dashboard.settings.actions.saveChanges')}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'language' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-100 pb-2">{t('dashboard.settings.tabs.language')}</h3>
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('dashboard.settings.language.currentLanguage')}
                </label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  value={languagePref}
                  onChange={(e) => setLanguagePref(e.target.value)}
                >
                  <option value="ar">
                    {t('dashboard.settings.language.arabic')}
                  </option>
                  <option value="en">
                    {t('dashboard.settings.language.english')}
                  </option>
                </select>
              </div>
              <div>
                <button
                  type="button"
                  onClick={saveLanguage}
                  disabled={saving}
                  className="px-4 py-2 bg-storelaunch-green text-white rounded-lg text-sm font-medium hover:bg-storelaunch-deep-green disabled:opacity-50"
                >
                  {t('dashboard.settings.language.savePreference')}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'store' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-100 pb-2">
                {t('dashboard.settings.tabs.store')}
              </h3>
              {!storeRecord ? (
                <p className="text-sm text-gray-600">{t('dashboard.subscriptionPage.noStore')}</p>
              ) : storeRecord.status === 'Suspended' ? (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
                  <p className="text-sm text-amber-900 font-medium">
                    {t('dashboard.storeManagement.danger.reactivateDescription')}
                  </p>
                  <button
                    type="button"
                    onClick={handleReactivateStore}
                    disabled={storeActionSaving}
                    className="px-4 py-2 bg-storelaunch-green text-white rounded-lg text-sm font-medium hover:bg-storelaunch-deep-green disabled:opacity-50"
                  >
                    {t('dashboard.storeManagement.danger.reactivate')}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-2">
                    <p className="text-sm text-red-800 font-medium">
                      {t('dashboard.storeManagement.danger.deactivateDescription')}
                    </p>
                    <label className="block text-sm font-medium text-red-800 mb-1">
                      {t('dashboard.storeManagement.danger.confirmDeactivate')}
                    </label>
                    <input
                      type="text"
                      className="w-full border border-red-300 rounded-lg px-3 py-2 text-sm bg-white"
                      value={dangerConfirm}
                      onChange={(e) => setDangerConfirm(e.target.value.toUpperCase())}
                      placeholder="DEACTIVATE"
                    />
                    <button
                      type="button"
                      onClick={handleDeactivateStore}
                      disabled={storeActionSaving || dangerConfirm !== 'DEACTIVATE'}
                      className="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
                    >
                      {t('dashboard.storeManagement.danger.deactivate')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
