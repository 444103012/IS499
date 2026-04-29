import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../../api/axios';

const CARRIERS = [
  { key: 'aramex', label: 'Aramex' },
  { key: 'smsa', label: 'SMSA' },
  { key: 'spl', label: 'SPL' },
];

const ShippingProvidersPage = () => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [shipping, setShipping] = useState({});

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const { data } = await axiosInstance.get('/api/store');
        if (!cancelled) {
          setShipping(data.settings?.shipping || {});
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

  const updateCarrier = (key, updater) => {
    setShipping((prev) => {
      const current = prev[key] || {};
      return {
        ...prev,
        [key]: updater(current),
      };
    });
  };

  const addZone = (key) => {
    updateCarrier(key, (carrier) => {
      const zones = Array.isArray(carrier.zones) ? carrier.zones : [];
      return {
        ...carrier,
        zones: [...zones, { name: '', baseRate: '' }],
      };
    });
  };

  const handleZoneChange = (key, index, field, value) => {
    updateCarrier(key, (carrier) => {
      const zones = Array.isArray(carrier.zones) ? [...carrier.zones] : [];
      zones[index] = { ...(zones[index] || {}), [field]: value };
      return { ...carrier, zones };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await axiosInstance.put('/api/store/shipping-providers', { shipping });
      showToast('success', t('dashboard.storeManagement.toast.saveSuccess'));
    } catch {
      showToast('error', t('dashboard.storeManagement.toast.saveError'));
    } finally {
      setSaving(false);
    }
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
          {t('dashboard.storeManagement.shipping.sectionTitle')}
        </h2>
      </div>
      <p className="text-gray-600 text-sm mb-2">
        {t('dashboard.storeManagement.shipping.description')}
      </p>

      <div className="bg-white border border-gray-200 rounded-xl shadow-md p-6 space-y-5">
        {CARRIERS.map((c) => {
          const carrier = shipping[c.key] || {};
          const enabled = !!carrier.enabled;
          return (
            <div key={c.key} className="border border-gray-100 rounded-lg p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="font-medium text-sm text-gray-900">
                    {c.label}
                  </span>
                </div>
                <label className="flex items-center gap-2 text-xs text-gray-700">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300"
                    checked={enabled}
                    onChange={(e) =>
                      updateCarrier(c.key, (carrierState) => ({
                        ...carrierState,
                        enabled: e.target.checked,
                      }))
                    }
                  />
                  {enabled
                    ? t('dashboard.storeManagement.shipping.enabled')
                    : t('dashboard.storeManagement.shipping.disabled')}
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    {t('dashboard.storeManagement.shipping.provider')}
                  </label>
                  <input
                    type="text"
                    disabled
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs bg-gray-50"
                    value={c.label}
                    readOnly
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    {t('dashboard.storeManagement.shipping.zonesTitle')}
                  </label>
                  <p className="text-xs text-gray-500">
                    {Array.isArray(carrier.zones) ? carrier.zones.length : 0}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-gray-800">
                  {t('dashboard.storeManagement.shipping.zonesTitle')}
                </h4>
                <div className="space-y-2">
                  {(carrier.zones || []).map((z, idx) => (
                    <div
                      key={`${c.key}-zone-${idx}`}
                      className="grid grid-cols-1 md:grid-cols-2 gap-2"
                    >
                      <input
                        type="text"
                        className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-xs"
                        placeholder={t('dashboard.storeManagement.shipping.zoneName')}
                        value={z.name || ''}
                        onChange={(e) =>
                          handleZoneChange(c.key, idx, 'name', e.target.value)
                        }
                      />
                      <input
                        type="number"
                        className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-xs"
                        placeholder={t('dashboard.storeManagement.shipping.baseRate')}
                        value={z.baseRate || ''}
                        onChange={(e) =>
                          handleZoneChange(c.key, idx, 'baseRate', e.target.value)
                        }
                      />
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => addZone(c.key)}
                  className="mt-1 text-xs font-medium text-storelaunch-teal hover:underline"
                >
                  {t('dashboard.storeManagement.shipping.addZone')}
                </button>
              </div>
            </div>
          );
        })}

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

export default ShippingProvidersPage;

