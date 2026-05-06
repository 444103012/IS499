



import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../../api/axios';

const API_BASE = process.env.REACT_APP_API_URL || process.env.REACT_APP_BASE_URL || '';
const emptyOption = () => ({ option_name: '', option_value: '', stock_qty: 0, additional_price: 0, images: [] });

const EditProductPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const productId = parseInt(id, 10);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(null);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({
    product_name: '',
    title: '',
    status: 'Active',
    price: '',
    images: [],
    options: [],
  });

  useEffect(() => {
    if (Number.isNaN(productId)) {
      setError('Invalid product id');
      setLoading(false);
      return;
    }
    axiosInstance
      .get(`/api/store/products/${productId}`)
      .then(({ data }) => {
        const p = data.product || {};
        setForm({
          product_name: p.product_name || '',
          title: p.title || '',
          status: p.status || 'Active',
          price: p.price != null ? String(p.price) : '',
          images: Array.isArray(p.images) ? p.images : (p.image ? [p.image] : []),
          options: Array.isArray(p.options) && p.options.length
            ? p.options.map((o) => ({
                option_id: o.option_id,
                option_name: o.option_name || '',
                option_value: o.option_value || '',
                stock_qty: o.stock_qty ?? 0,
                additional_price: o.additional_price ?? 0,
                images: Array.isArray(o.images) ? o.images : (o.image ? [o.image] : []),
              }))
            : [emptyOption()],
        });
      })
      .catch((err) => setError(err.response?.data?.error || 'Failed to load product'))
      .finally(() => setLoading(false));
  }, [productId]);

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const updateOption = (index, key, value) => {
    setForm((prev) => {
      const opts = [...(prev.options || [])];
      opts[index] = { ...opts[index], [key]: value };
      return { ...prev, options: opts };
    });
  };

  const addOption = () => setForm((prev) => ({ ...prev, options: [...(prev.options || []), emptyOption()] }));
  const removeOption = (index) => {
    setForm((prev) => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index),
    }));
  };

  const uploadImage = async (file, setPath, uploadingKey, forVariant = false) => {
    if (!file || !file.type.startsWith('image/')) return;
    setUploading(uploadingKey);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('image', file);
      const endpoint = forVariant ? '/api/store/products/upload-variant-image' : '/api/store/products/upload-image';
      const { data } = await axiosInstance.postForm(endpoint, formData);
      if (data.path) setPath(data.path);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Image upload failed');
    } finally {
      setUploading(null);
    }
  };

  const addProductImage = (path) => update('images', [...(form.images || []), path]);
  const removeProductImage = (index) => update('images', (form.images || []).filter((_, i) => i !== index));

  const handleProductImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) uploadImage(file, addProductImage, 'product');
    e.target.value = '';
  };

  const addOptionImage = (index, path) => {
    const list = [...(form.options?.[index]?.images || [])];
    list.push(path);
    updateOption(index, 'images', list);
  };
  const removeOptionImage = (index, imgIndex) => {
    const list = (form.options?.[index]?.images || []).filter((_, i) => i !== imgIndex);
    updateOption(index, 'images', list);
  };

  const handleOptionImageChange = (index, e) => {
    const file = e.target.files?.[0];
    if (file) uploadImage(file, (path) => addOptionImage(index, path), `option-${index}`, true);
    e.target.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    const name = (form.product_name || '').trim();
    if (!name) {
      setError(t('dashboard.productForm.errorNameRequired'));
      return;
    }
    const priceVal = parseFloat(form.price);
    if (Number.isNaN(priceVal) || priceVal < 0) {
      setError(t('dashboard.productForm.errorPriceRequired'));
      return;
    }
    setSaving(true);
    try {
      const options = (form.options || [])
        .filter((o) => (o.option_name || '').trim() && (o.option_value || '').trim())
        .map((o) => ({
          option_id: o.option_id,
          option_name: o.option_name.trim(),
          option_value: o.option_value.trim(),
          stock_qty: parseInt(o.stock_qty, 10) || 0,
          additional_price: parseFloat(o.additional_price) || 0,
          images: Array.isArray(o.images) ? o.images.filter((s) => s && String(s).trim()) : [],
        }));
      await axiosInstance.put(`/api/store/products/${productId}`, {
        product_name: name,
        title: (form.title || '').trim() || undefined,
        status: form.status,
        price: priceVal,
        images: Array.isArray(form.images) ? form.images.filter((s) => s && String(s).trim()) : [],
        options,
      });
      navigate('/dashboard/products');
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to update product');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-4">{t('dashboard.productForm.loadingProduct')}</div>;
  if (error && !form.product_name) {
    return (
      <div dir={isRTL ? 'rtl' : 'ltr'}>
        <p className="text-red-600">{error}</p>
        <button
          type="button"
          onClick={() => navigate('/dashboard/products')}
          className="mt-2 text-storelaunch-teal hover:underline"
        >
          {t('dashboard.productForm.backToProducts')}
        </button>
      </div>
    );
  }

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'}>
      <div className={`flex items-center gap-4 mb-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <button
          type="button"
          onClick={() => navigate('/dashboard/products')}
          className="text-storelaunch-dark hover:underline text-sm font-medium"
        >
          {t('dashboard.productForm.backToProducts')}
        </button>
        <h2 className="text-storelaunch-dark font-bold text-xl">
          {t('dashboard.productForm.editTitle')}
        </h2>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900">
                  {t('dashboard.productForm.imagesTitle')}
                </h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  {t('dashboard.productForm.imagesSubtitle')}
                </p>
              </div>
              <div className="p-6 space-y-3">
                {Array.isArray(form.images) && form.images.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {form.images.map((path, idx) => (
                      <div
                        key={idx}
                        className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 border border-gray-200"
                      >
                        <img
                          src={
                            path && !path.startsWith('http')
                              ? `${API_BASE.replace(/\/$/, '')}/${path.replace(/^\//, '')}`
                              : path
                          }
                          alt=""
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removeProductImage(idx)}
                          className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full text-sm leading-none flex items-center justify-center hover:bg-red-600"
                          aria-label="Remove image"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <label className="flex flex-col items-center justify-center w-full min-h-[120px] rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 hover:border-storelaunch-green hover:bg-gray-50/80 transition-colors cursor-pointer">
                  <div className="flex flex-col items-center gap-1 py-4 px-4">
                    <span className="text-gray-400">
                      <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M12 4v16m8-8H4"
                        />
                      </svg>
                    </span>
                    <span className="text-sm font-medium text-gray-600">
                      {uploading === 'product'
                        ? t('dashboard.productForm.imagesUploading')
                        : t('dashboard.productForm.imagesUploadButton')}
                    </span>
                    <span className="text-xs text-gray-400">
                      {t('dashboard.productForm.imagesHint')}
                    </span>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    disabled={uploading !== null}
                    onChange={handleProductImageChange}
                  />
                </label>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-4">
                {t('dashboard.productForm.detailsTitle')}
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('dashboard.productForm.nameLabel')}
                  </label>
                  <input
                    type="text"
                    value={form.product_name}
                    onChange={(e) => update('product_name', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-storelaunch-green/30 focus:border-storelaunch-green"
                    placeholder={t('dashboard.productForm.namePlaceholder')}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('dashboard.productForm.titleLabel')}
                  </label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => update('title', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-storelaunch-green/30 focus:border-storelaunch-green"
                    placeholder={t('dashboard.productForm.titlePlaceholder')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('dashboard.productForm.statusLabel')}
                  </label>
                  <select
                    value={form.status}
                    onChange={(e) => update('status', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-storelaunch-green/30 focus:border-storelaunch-green"
                  >
                    <option value="Active">{t('dashboard.productForm.statusActive')}</option>
                    <option value="Inactive">{t('dashboard.productForm.statusInactive')}</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-4">
                {t('dashboard.productForm.pricingTitle')}
              </h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('dashboard.productForm.basePriceLabel')}
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.price}
                  onChange={(e) => update('price', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-storelaunch-green/30 focus:border-storelaunch-green"
                  placeholder={t('dashboard.productForm.basePricePlaceholder')}
                  required
                />
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900">
                  {t('dashboard.productForm.variantsTitle')}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  {t('dashboard.productForm.variantsSubtitle')}
                </p>
              </div>
              <div className="p-6 space-y-4">
                {(form.options || []).map((opt, index) => (
                  <div
                    key={opt.option_id || index}
                    className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-600">
                        {t('dashboard.productForm.variantLabel', { index: index + 1 })}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeOption(index)}
                        className="text-red-600 text-sm font-medium hover:underline"
                        aria-label="Remove this variant"
                      >
                        {t('dashboard.productForm.variantRemove')}
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                          {t('dashboard.productForm.optionLabel')}
                        </label>
                        <input
                          type="text"
                          placeholder={t('dashboard.productForm.optionPlaceholder')}
                          value={opt.option_name}
                          onChange={(e) => updateOption(index, 'option_name', e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                          {t('dashboard.productForm.valueLabel')}
                        </label>
                        <input
                          type="text"
                          placeholder={t('dashboard.productForm.valuePlaceholder')}
                          value={opt.option_value}
                          onChange={(e) => updateOption(index, 'option_value', e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                          {t('dashboard.productForm.stockLabel')}
                        </label>
                        <input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={opt.stock_qty}
                          onChange={(e) => updateOption(index, 'stock_qty', e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                          {t('dashboard.productForm.additionalPriceLabel')}
                        </label>
                        <input
                          type="number"
                          step="1"
                          min="0"
                          placeholder="0"
                          value={opt.additional_price}
                          onChange={(e) => updateOption(index, 'additional_price', e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        />
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {(opt.images || []).map((path, imgIdx) => (
                        <div key={imgIdx} className="relative">
                          <img
                            src={
                              path && !path.startsWith('http')
                                ? `${API_BASE.replace(/\/$/, '')}/${path.replace(/^\//, '')}`
                                : path
                            }
                            alt=""
                            className="h-12 w-12 object-cover rounded-lg border border-gray-200"
                          />
                          <button
                            type="button"
                            onClick={() => removeOptionImage(index, imgIdx)}
                            className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white rounded-full text-[10px] leading-none"
                            aria-label="Remove"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                      <label className="cursor-pointer">
                        <span className="text-sm font-medium text-storelaunch-teal hover:underline">
                          {uploading === `option-${index}`
                            ? t('dashboard.productForm.variantImagesUploading')
                            : t('dashboard.productForm.variantImagesUpload')}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          className="sr-only"
                          disabled={uploading !== null}
                          onChange={(e) => handleOptionImageChange(index, e)}
                        />
                      </label>
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addOption}
                  className="w-full py-3 rounded-xl border-2 border-dashed border-gray-300 text-gray-600 font-medium text-sm hover:border-storelaunch-green hover:text-storelaunch-green hover:bg-storelaunch-green/5 transition-colors"
                >
                  {t('dashboard.productForm.addVariant')}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-storelaunch-green text-white rounded-xl text-sm font-medium hover:bg-storelaunch-deep-green disabled:opacity-50 shadow-sm"
          >
            {saving ? 'Saving…' : t('dashboard.productForm.saveEdit')}
          </button>
          <button
            type="button"
            onClick={() => navigate('/dashboard/products')}
            className="px-6 py-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            {t('dashboard.productForm.cancel')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditProductPage;
