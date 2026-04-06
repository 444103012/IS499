

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../api/axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const emptyOption = () => ({ option_name: '', option_value: '', stock_qty: 0, additional_price: 0, image: '' });

const AddProductPage = () => {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(null);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({
    product_name: '',
    title: '',
    status: 'Active',
    price: '',
    image: '',
    options: [{ ...emptyOption() }],
  });

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

  const uploadImage = async (file, setPath, uploadingKey) => {
    if (!file || !file.type.startsWith('image/')) return;
    setUploading(uploadingKey);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('image', file);
      const { data } = await axiosInstance.postForm('/api/products/upload-image', formData);
      if (data.path) setPath(data.path);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Image upload failed');
    } finally {
      setUploading(null);
    }
  };

  const handleProductImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) uploadImage(file, (path) => update('image', path), 'product');
    e.target.value = '';
  };

  const handleOptionImageChange = (index, e) => {
    const file = e.target.files?.[0];
    if (file) uploadImage(file, (path) => updateOption(index, 'image', path), `option-${index}`);
    e.target.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    const name = (form.product_name || '').trim();
    if (!name) {
      setError('Product name is required');
      return;
    }
    const priceVal = parseFloat(form.price);
    if (Number.isNaN(priceVal) || priceVal < 0) {
      setError('Valid base price is required');
      return;
    }
    setSaving(true);
    try {
      const options = (form.options || [])
        .filter((o) => (o.option_name || '').trim() && (o.option_value || '').trim())
        .map((o) => ({
          option_name: o.option_name.trim(),
          option_value: o.option_value.trim(),
          stock_qty: parseInt(o.stock_qty, 10) || 0,
          additional_price: parseFloat(o.additional_price) || 0,
          image: (o.image || '').trim() || undefined,
        }));
      await axiosInstance.post('/api/products/create', {
        product_name: name,
        title: (form.title || '').trim() || undefined,
        status: form.status,
        price: priceVal,
        image: (form.image || '').trim() || undefined,
        options: options.length ? options : undefined,
      });
      navigate('/dashboard/products');
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to create product');
    } finally {
      setSaving(false);
    }
  };

  const productImageUrl = form.image && form.image.trim()
    ? (form.image.startsWith('http') ? form.image : `${API_BASE.replace(/\/$/, '')}/${form.image.replace(/^\//, '')}`)
    : null;

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <button
          type="button"
          onClick={() => navigate('/dashboard/products')}
          className="text-storelaunch-dark hover:underline text-sm font-medium"
        >
          ← Products
        </button>
        <h2 className="text-storelaunch-dark font-bold text-xl">Add Product</h2>
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
                <h3 className="font-semibold text-gray-900">Product image</h3>
                <p className="text-sm text-gray-500 mt-0.5">Main image for this product (optional)</p>
              </div>
              <div className="p-6">
                {productImageUrl ? (
                  <div className="relative w-full rounded-xl overflow-hidden bg-gray-50 border border-gray-200 shadow-inner">
                    <img
                      src={productImageUrl}
                      alt="Product"
                      className="w-full aspect-video object-cover rounded-xl"
                    />
                    <div className="absolute inset-0 flex items-center justify-center gap-3 bg-black/40 opacity-0 hover:opacity-100 transition-opacity rounded-xl">
                      <label className="cursor-pointer px-4 py-2 bg-white rounded-lg text-sm font-medium text-gray-800 hover:bg-gray-100">
                        Change
                        <input type="file" accept="image/*" className="sr-only" disabled={uploading !== null} onChange={handleProductImageChange} />
                      </label>
                      <button
                        type="button"
                        onClick={() => update('image', '')}
                        className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full min-h-[240px] rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 hover:border-storelaunch-green hover:bg-gray-50/80 transition-colors cursor-pointer">
                    <div className="flex flex-col items-center gap-2 py-8 px-4">
                      <span className="text-gray-400">
                        <svg className="w-14 h-14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" />
                        </svg>
                      </span>
                      <span className="text-sm font-medium text-gray-600">
                        {uploading === 'product' ? 'Uploading…' : 'Click to upload product image'}
                      </span>
                      <span className="text-xs text-gray-400">PNG, JPG, GIF or WebP (max 5MB)</span>
                    </div>
                    <input type="file" accept="image/*" className="sr-only" disabled={uploading !== null} onChange={handleProductImageChange} />
                  </label>
                )}
              </div>
            </div>

            {/* B. Product details card */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Product details</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Product name *</label>
                  <input
                    type="text"
                    value={form.product_name}
                    onChange={(e) => update('product_name', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-storelaunch-green/30 focus:border-storelaunch-green"
                    placeholder="e.g. Classic T-Shirt"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title (optional)</label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => update('title', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-storelaunch-green/30 focus:border-storelaunch-green"
                    placeholder="Short display title"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => update('status', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-storelaunch-green/30 focus:border-storelaunch-green"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          
          <div className="space-y-6">
            
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Pricing</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Base price *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.price}
                  onChange={(e) => update('price', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-storelaunch-green/30 focus:border-storelaunch-green"
                  placeholder="0.00"
                  required
                />
              </div>
            </div>

            
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900">Inventory & variants</h3>
                <p className="text-sm text-gray-500 mt-1">Add options like Size (S, M, L) or Color with stock and optional extra price per variant.</p>
              </div>
              <div className="p-6 space-y-4">
                {(form.options || []).map((opt, index) => (
                  <div
                    key={index}
                    className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-600">Variant {index + 1}</span>
                      <button
                        type="button"
                        onClick={() => removeOption(index)}
                        className="text-red-600 text-sm font-medium hover:underline"
                        aria-label="Remove this variant"
                      >
                        Remove
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Option (e.g. Size)</label>
                        <input
                          type="text"
                          placeholder="e.g. Size"
                          value={opt.option_name}
                          onChange={(e) => updateOption(index, 'option_name', e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Value (e.g. S, M, L)</label>
                        <input
                          type="text"
                          placeholder="e.g. S, M, L"
                          value={opt.option_value}
                          onChange={(e) => updateOption(index, 'option_value', e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Stock</label>
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
                        <label className="block text-xs font-medium text-gray-500 mb-1">Additional price</label>
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
                    <div className="flex items-center gap-3">
                      {opt.image ? (
                        <div className="flex items-center gap-2">
                          <img
                            src={opt.image.startsWith('http') ? opt.image : `${API_BASE.replace(/\/$/, '')}/${opt.image.replace(/^\//, '')}`}
                            alt=""
                            className="h-12 w-12 object-cover rounded-lg border border-gray-200"
                          />
                          <button type="button" onClick={() => updateOption(index, 'image', '')} className="text-xs text-red-600 hover:underline">Remove image</button>
                        </div>
                      ) : null}
                      <label className="cursor-pointer">
                        <span className="text-sm font-medium text-storelaunch-teal hover:underline">
                          {uploading === `option-${index}` ? 'Uploading…' : (opt.image ? 'Change variant image' : 'Add variant image')}
                        </span>
                        <input type="file" accept="image/*" className="sr-only" disabled={uploading !== null} onChange={(e) => handleOptionImageChange(index, e)} />
                      </label>
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addOption}
                  className="w-full py-3 rounded-xl border-2 border-dashed border-gray-300 text-gray-600 font-medium text-sm hover:border-storelaunch-green hover:text-storelaunch-green hover:bg-storelaunch-green/5 transition-colors"
                >
                  + Add variant
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
            {saving ? 'Saving…' : 'Save product'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/dashboard/products')}
            className="px-6 py-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddProductPage;
