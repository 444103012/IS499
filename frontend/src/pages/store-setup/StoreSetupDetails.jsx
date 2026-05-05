



import React, { useState, useMemo, useEffect } from 'react';
import { useStoreSetup, STORE_TYPES, storeSetupStep1DraftKey } from '../../context/StoreSetupContext';
import axiosInstance from '../../api/axios';
import { previewStoreSlugFromName } from '../../utils/previewStoreSlugFromName';

export default function StoreSetupDetails({ isRTL, t, onNext }) {
  const { storeId, storeDetails, updateStoreDetails, setStoreId } = useStoreSetup();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (storeId) return;
    const ownerId = typeof localStorage !== 'undefined' ? localStorage.getItem('store_owner_id') : null;
    if (!ownerId) return;
    if (storeDetails.storeName?.trim() || storeDetails.storeType || storeDetails.storeDescription?.trim()) return;
    try {
      const raw = localStorage.getItem(storeSetupStep1DraftKey(ownerId));
      if (!raw) return;
      const d = JSON.parse(raw);
      if (!d || typeof d !== 'object') return;
      updateStoreDetails({
        storeName: typeof d.storeName === 'string' ? d.storeName : '',
        storeType: typeof d.storeType === 'string' ? d.storeType : '',
        storeDescription: typeof d.storeDescription === 'string' ? d.storeDescription : '',
      });
    } catch {
      /* ignore corrupt draft */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-time draft restore when no server store yet
  }, [storeId]);

  useEffect(() => {
    if (storeId) return;
    const ownerId = typeof localStorage !== 'undefined' ? localStorage.getItem('store_owner_id') : null;
    if (!ownerId) return undefined;
    const tmr = setTimeout(() => {
      const draft = {
        storeName: storeDetails.storeName || '',
        storeType: storeDetails.storeType || '',
        storeDescription: storeDetails.storeDescription || '',
      };
      if (draft.storeName.trim() || draft.storeType || draft.storeDescription.trim()) {
        try {
          localStorage.setItem(storeSetupStep1DraftKey(ownerId), JSON.stringify(draft));
        } catch {
          /* quota */
        }
      }
    }, 600);
    return () => clearTimeout(tmr);
  }, [storeId, storeDetails.storeName, storeDetails.storeType, storeDetails.storeDescription]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    updateStoreDetails({ [name]: value });
    setError('');
  };

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => updateStoreDetails({ storeLogo: file, storeLogoPreview: reader.result });
    reader.readAsDataURL(file);
    setError('');
  };

  const hasStoreName = Boolean(storeDetails.storeName?.trim());
  const hasStoreLogo = Boolean(storeDetails.storeLogo) || Boolean(storeDetails.storeLogoPreview);
  const canNext = hasStoreName && hasStoreLogo;
  const baseDomain = 'storelaunch.site';
  const slugPreview = useMemo(
    () => previewStoreSlugFromName(storeDetails.storeName || ''),
    [storeDetails.storeName]
  );

  const handleSubmit = async () => {
    if (!hasStoreName) {
      setError(isRTL ? 'يرجى إدخال اسم المتجر للمتابعة.' : 'Please enter your store name to continue.');
      return;
    }
    if (!hasStoreLogo) {
      setError(isRTL ? 'صورة المتجر مطلوبة قبل الانتقال للخطوة التالية.' : 'A store image is required before moving to the next step.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('name', storeDetails.storeName.trim());
      if (storeDetails.storeType) formData.append('store_type', storeDetails.storeType);
      if (storeDetails.storeDescription) formData.append('description', storeDetails.storeDescription);
      if (storeDetails.storeLogo) formData.append('logo', storeDetails.storeLogo);
      const { data } = await axiosInstance.postForm('/api/store-setup/store-details', formData);
      setStoreId(data.store_id);
      const ownerId = typeof localStorage !== 'undefined' ? localStorage.getItem('store_owner_id') : null;
      if (ownerId) {
        try {
          localStorage.removeItem(storeSetupStep1DraftKey(ownerId));
        } catch {
          /* ignore */
        }
      }
      onNext();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to save store details');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className={`max-w-lg mx-auto ${isRTL ? 'text-right' : 'text-left'}`}>
      <h2 className={`text-xl font-bold text-storelaunch-dark mb-6 ${isRTL ? 'text-right' : 'text-left'}`}>
        {t('onboarding.storeDetails.title')}
      </h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-storelaunch-dark mb-1">
            {t('onboarding.storeDetails.storeName')} *
          </label>
          <input
            type="text"
            name="storeName"
            value={storeDetails.storeName}
            onChange={handleChange}
            placeholder={t('onboarding.storeDetails.storeNamePlaceholder')}
            className={`w-full p-2 border border-gray-300 rounded-md ${isRTL ? 'text-right' : 'text-left'}`}
          />
          <p className="mt-2 text-xs text-gray-600">
            {t('onboarding.storeDetails.urlPreviewHint')}
          </p>
          {slugPreview.length >= 3 && (
            <p className="mt-1 text-sm text-storelaunch-dark font-medium break-all">
              {baseDomain}/{slugPreview}
            </p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-storelaunch-dark mb-1">
            {t('onboarding.storeDetails.storeLogo')} *
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={handleLogoChange}
            className="w-full text-sm text-gray-600 file:mr-2 file:py-1.5 file:px-3 file:rounded file:border-0 file:bg-storelaunch-green file:text-white"
          />
          {storeDetails.storeLogoPreview && (
            <div className="mt-2">
              <img src={storeDetails.storeLogoPreview} alt="Logo preview" className="h-20 w-20 object-contain border border-gray-200 rounded" />
            </div>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-storelaunch-dark mb-1">
            {t('onboarding.storeDetails.storeType')}
          </label>
          <select
            name="storeType"
            value={storeDetails.storeType}
            onChange={handleChange}
            className={`w-full p-2 border border-gray-300 rounded-md ${isRTL ? 'text-right' : 'text-left'}`}
          >
            <option value="">{t('onboarding.storeDetails.chooseType')}</option>
            {STORE_TYPES.map((type) => (
              <option key={type.id} value={type.id}>{isRTL ? type.nameAr : type.nameEn}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-storelaunch-dark mb-1">
            {t('onboarding.storeDetails.storeDescription')}
          </label>
          <textarea
            name="storeDescription"
            value={storeDetails.storeDescription}
            onChange={handleChange}
            rows={4}
            placeholder={t('onboarding.storeDetails.descriptionPlaceholder')}
            className={`w-full p-2 border border-gray-300 rounded-md resize-none ${isRTL ? 'text-right' : 'text-left'}`}
          />
        </div>
      </div>
      {error && <p className={`mt-2 text-sm text-red-600 ${isRTL ? 'text-right' : 'text-left'}`}>{error}</p>}
      <div className={`mt-8 flex ${isRTL ? 'flex-row-reverse justify-end' : 'justify-end'}`}>
        <button type="button" onClick={handleSubmit} disabled={!canNext || loading} className="px-6 py-2 bg-storelaunch-green text-white rounded-md font-medium disabled:opacity-50">
          {loading ? (isRTL ? 'جاري الحفظ...' : 'Saving...') : t('onboarding.next')}
        </button>
      </div>
    </div>
  );
}
