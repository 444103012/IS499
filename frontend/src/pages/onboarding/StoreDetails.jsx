



import React, { useState, useRef, useCallback, useMemo } from 'react';
import { useOnboarding, STORE_TYPES } from '../../context/OnboardingContext';
import axiosInstance from '../../api/axios';
import { previewStoreSlugFromName } from '../../utils/previewStoreSlugFromName';

const STORE_NAME_MIN_LENGTH = 3;
const STORE_NAME_MAX_LENGTH = 40;

export default function StoreDetails({ isRTL, t, onNext }) {
  const { storeDetails, updateStoreDetails, setStoreId } = useOnboarding();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [nameAvailable, setNameAvailable] = useState(null); 
  const [nameChecking, setNameChecking] = useState(false);
  const nameCheckTimer = useRef(null);

  const checkNameAvailability = useCallback(async (name) => {
    const trimmedName = name?.trim() || '';
    if (trimmedName.length < STORE_NAME_MIN_LENGTH || trimmedName.length > STORE_NAME_MAX_LENGTH) {
      setNameAvailable(null);
      return;
    }
    setNameChecking(true);
    try {
      const { data } = await axiosInstance.get(`/api/onboarding/check-name?name=${encodeURIComponent(trimmedName)}`);
      setNameAvailable(data.available);
    } catch {
      setNameAvailable(null);
    } finally {
      setNameChecking(false);
    }
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    updateStoreDetails({ [name]: value });
    setError('');
    if (name === 'storeName') {
      setNameAvailable(null);
      if (nameCheckTimer.current) clearTimeout(nameCheckTimer.current);
      nameCheckTimer.current = setTimeout(() => checkNameAvailability(value), 600);
    }
  };

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => updateStoreDetails({ storeLogo: file, storeLogoPreview: reader.result });
    reader.readAsDataURL(file);
    setError('');
  };

  const trimmedStoreName = storeDetails.storeName?.trim() || '';
  const hasValidStoreName = trimmedStoreName.length >= STORE_NAME_MIN_LENGTH && trimmedStoreName.length <= STORE_NAME_MAX_LENGTH;
  const canNext = hasValidStoreName && nameAvailable !== false;

  const baseDomain = 'storelaunch.site';
  const slugPreview = useMemo(
    () => previewStoreSlugFromName(storeDetails.storeName || ''),
    [storeDetails.storeName]
  );

  const handleSubmit = async () => {
    if (!hasValidStoreName) {
      setError(t('onboarding.storeDetails.storeNameLength'));
      return;
    }
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
          <div className="relative">
            <input
              type="text"
              name="storeName"
              value={storeDetails.storeName}
              onChange={handleChange}
              minLength={STORE_NAME_MIN_LENGTH}
              maxLength={STORE_NAME_MAX_LENGTH}
              placeholder={t('onboarding.storeDetails.storeNamePlaceholder')}
              className={`w-full p-2 border rounded-md ${
                trimmedStoreName && !hasValidStoreName ? 'border-red-400 focus:ring-red-400' :
                nameAvailable === false ? 'border-red-400 focus:ring-red-400' :
                nameAvailable === true ? 'border-green-400 focus:ring-green-400' :
                'border-gray-300'
              } ${isRTL ? 'text-right' : 'text-left'}`}
            />
            {nameChecking && (
              <span className={`absolute top-1/2 -translate-y-1/2 ${isRTL ? 'left-3' : 'right-3'} text-gray-400 text-xs`}>
                {isRTL ? 'جاري التحقق...' : 'Checking...'}
              </span>
            )}
            {!nameChecking && nameAvailable === true && (
              <span className={`absolute top-1/2 -translate-y-1/2 ${isRTL ? 'left-3' : 'right-3'} text-green-600`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </span>
            )}
            {!nameChecking && nameAvailable === false && (
              <span className={`absolute top-1/2 -translate-y-1/2 ${isRTL ? 'left-3' : 'right-3'} text-red-500`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </span>
            )}
          </div>
          <p className={`mt-1 text-xs ${trimmedStoreName && !hasValidStoreName ? 'text-red-600' : 'text-gray-500'}`}>
            {t('onboarding.storeDetails.storeNameLength')}
          </p>
          {nameAvailable === false && (
            <p className="mt-1 text-xs text-red-600">
              {isRTL ? 'اسم المتجر مستخدم بالفعل. يرجى اختيار اسم آخر.' : 'This store name is already taken. Please choose a different name.'}
            </p>
          )}
          {nameAvailable === true && (
            <p className="mt-1 text-xs text-green-600">
              {isRTL ? 'اسم المتجر متاح!' : 'Store name is available!'}
            </p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            {t('onboarding.storeDetails.urlPreviewIntro')}
          </p>
          {slugPreview.length >= 3 && (
            <p className="mt-2 text-sm text-storelaunch-dark font-medium break-all">
              {baseDomain}/{slugPreview}
            </p>
          )}
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
