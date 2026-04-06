
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axiosInstance from '../../api/axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const emptyOption = () => ({ option_name: '', option_value: '', stock_qty: 0, additional_price: 0, image: '' });

const EditProductPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
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
    image: '',
    options: [],
  });

  useEffect(() => {
    if (Number.isNaN(productId)) {
      setError('Invalid product id');
      setLoading(false);
      return;
    }
    axiosInstance
      .get(`/api/products/${productId}`)
      .then(({ data }) => {
        const p = data.product || {};
        setForm({
          product_name: p.product_name || '',
          title: p.title || '',
          status: p.status || 'Active',
          price: p.price != null ? String(p.price) : '',
          image: p.image || '',
          options: Array.isArray(p.options) && p.options.length
            ? p.options.map((o) => ({
                option_id: o.option_id,
                option_name: o.option_name || '',
                option_value: o.option_value || '',
                stock_qty: o.stock_qty ?? 0,
                additional_price: o.additional_price ?? 0,
                image: o.image || '',
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
          option_id: o.option_id,
          option_name: o.option_name.trim(),
          option_value: o.option_value.trim(),
          stock_qty: parseInt(o.stock_qty, 10) || 0,
          additional_price: parseFloat(o.additional_price) || 0,
          image: (o.image || '').trim() || undefined,
        }));
      await axiosInstance.put(`/api/products/${productId}`, {
        product_name: name,
        title: (form.title || '').trim() || undefined,
        status: form.status,
        price: priceVal,
        image: (form.image || '').trim() || undefined,
        options,
      });
      navigate('/dashboard/products');
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to update product');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-4">Loading product...</div>;
  if (error && !form.product_name) {
    return (
      <div>
        <p className="text-red-600">{error}</p>
        <button type="button" onClick={() => navigate('/dashboard/products')} className="mt-2 text-storelaunch-teal hover:underline">
          ← Back to Products
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-4">
        <button
          type="button"
          onClick={() => navigate('/dashboard/products')}
          className="text-storelaunch-dark hover:underline text-sm"
        >
          ← Products
        </button>
        <h2 className="text-storelaunch-dark font-bold text-xl">Edit Product</h2>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 max-w-5xl">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="font-medium text-gray-900 mb-3">Basic info</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
              <input
                type="text"
                value={form.product_name}
                onChange={(e) => update('product_name', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title (optional)</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => update('title', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Product image (optional)</label>
              <div className="flex items-center gap-3">
                {form.image ? (
                  <div className="relative">
                    <img
                      src={form.image.startsWith('http') ? form.image : `${API_BASE.replace(/\/$/, '')}/${form.image.replace(/^\//, '')}`}
                      alt="Product"
                      className="h-20 w-20 object-cover rounded-lg border border-gray-200"
                    />
                    <button type="button" onClick={() => update('image', '')} className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs leading-none" aria-label="Remove image">×</button>
                  </div>
                ) : null}
                <label className="cursor-pointer">
                  <span className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">{uploading === 'product' ? 'Uploading…' : 'Choose image'}</span>
                  <input type="file" accept="image/*" className="sr-only" disabled={uploading !== null} onChange={handleProductImageChange} />
                </label>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => update('status', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Price *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.price}
                  onChange={(e) => update('price', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  required
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="font-medium text-gray-900 mb-3">Inventory (variants)</h3>
          <div className="flex flex-wrap gap-2 items-center mb-1.5 px-0.5">
            <div className="w-28"><span className="block text-sm font-medium text-gray-700 whitespace-nowrap">Option</span></div>
            <div className="w-24"><span className="block text-sm font-medium text-gray-700 whitespace-nowrap">Value</span></div>
            <div className="w-20"><span className="block text-sm font-medium text-gray-700 whitespace-nowrap">Stock</span></div>
            <div className="w-20"><span className="block text-sm font-medium text-gray-700 whitespace-nowrap">+Price</span></div>
            <div className="w-24"><span className="block text-sm font-medium text-gray-700 whitespace-nowrap">Image</span></div>
            <div className="w-14" aria-hidden="true" />
          </div>
          {(form.options || []).map((opt, index) => (
            <div key={opt.option_id || index} className="flex flex-wrap gap-2 items-end mb-3 p-3 bg-gray-50 rounded-md">
              <input
                type="text"
                placeholder="Option (e.g. Size)"
                value={opt.option_name}
                onChange={(e) => updateOption(index, 'option_name', e.target.value)}
                className="border border-gray-300 rounded px-2 py-1.5 text-sm w-28"
              />
              <input
                type="text"
                placeholder="Value"
                value={opt.option_value}
                onChange={(e) => updateOption(index, 'option_value', e.target.value)}
                className="border border-gray-300 rounded px-2 py-1.5 text-sm w-24"
              />
              <input
                type="number"
                min="0"
                placeholder="Stock"
                value={opt.stock_qty}
                onChange={(e) => updateOption(index, 'stock_qty', e.target.value)}
                className="border border-gray-300 rounded px-2 py-1.5 text-sm w-20"
              />
              <input
                type="number"
                step="1"
                min="0"
                placeholder="+Price"
                value={opt.additional_price}
                onChange={(e) => updateOption(index, 'additional_price', e.target.value)}
                className="border border-gray-300 rounded px-2 py-1.5 text-sm w-20"
              />
              <div className="w-24 flex items-center gap-1">
                {opt.image ? (
                  <div className="relative shrink-0">
                    <img src={opt.image.startsWith('http') ? opt.image : `${API_BASE.replace(/\/$/, '')}/${opt.image.replace(/^\//, '')}`} alt="" className="h-8 w-8 object-cover rounded border border-gray-200" />
                    <button type="button" onClick={() => updateOption(index, 'image', '')} className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-red-500 text-white rounded-full text-[10px] leading-none" aria-label="Remove">×</button>
                  </div>
                ) : null}
                <label className="cursor-pointer shrink-0">
                  <span className="text-xs text-gray-600 hover:text-storelaunch-teal">{uploading === `option-${index}` ? '…' : 'Upload'}</span>
                  <input type="file" accept="image/*" className="sr-only" disabled={uploading !== null} onChange={(e) => handleOptionImageChange(index, e)} />
                </label>
              </div>
              <button type="button" onClick={() => removeOption(index)} className="text-red-600 text-sm hover:underline">
                Remove
              </button>
            </div>
          ))}
          <button type="button" onClick={addOption} className="text-storelaunch-teal text-sm font-medium hover:underline">
            + Add option
          </button>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-storelaunch-green text-white rounded-md text-sm font-medium hover:bg-storelaunch-deep-green disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/dashboard/products')}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditProductPage;
