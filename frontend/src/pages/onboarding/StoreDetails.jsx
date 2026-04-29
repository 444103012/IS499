import React, { useState } from 'react';
import { useOnboarding, STORE_TYPES } from '../../context/OnboardingContext';
import axiosInstance from '../../api/axios';

export default function StoreDetails({ isRTL, t, onNext }) {
  const { storeDetails, updateStoreDetails, setStoreId } = useOnboarding();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

  const canNext = storeDetails.storeName?.trim();

  const handleSubmit = async () => {
    if (!canNext) return;
    setLoading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('name', storeDetails.storeName.trim());
      if (storeDetails.storeType) formData.append('store_type', storeDetails.storeType);
      if (storeDetails.storeDescription) formData.append('description', storeDetails.storeDescription);
      if (storeDetails.storeLogo) formData.append('logo', storeDetails.storeLogo);
      const { data } = await axiosInstance.postForm('/api/onboarding/store-details', formData);
      setStoreId(data.store_id);
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
        </div>
        <div>
          <label className="block text-sm font-medium text-storelaunch-dark mb-1">
            {t('onboarding.storeDetails.storeLogo')}
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={handleLogoChange}
            className="w-full text-sm text-gray-600 file:mr-2 file:py-1.5 file:px-3 file:rounded file:border-0 file:bg-storelaunch-green file:text-white"
          />
          {storeDetails.storeLogoPreview && (
            <div className="mt-2">
              <img
                src={storeDetails.storeLogoPreview}
                alt="Logo preview"
                className="h-20 w-20 object-contain border border-gray-200 rounded"
              />
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
              <option key={type.id} value={type.id}>
                {isRTL ? type.nameAr : type.nameEn}
              </option>
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
      {error && (
        <p className={`mt-2 text-sm text-red-600 ${isRTL ? 'text-right' : 'text-left'}`}>{error}</p>
      )}
      <div className={`mt-8 flex ${isRTL ? 'flex-row-reverse justify-end' : 'justify-end'}`}>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canNext || loading}
          className="px-6 py-2 bg-storelaunch-green text-white rounded-md font-medium disabled:opacity-50"
        >
          {loading ? (isRTL ? 'جاري الحفظ...' : 'Saving...') : t('onboarding.next')}
        </button>
      </div>
    </div>
  );
}
