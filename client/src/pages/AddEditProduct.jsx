import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../api';

export default function AddEditProduct() {
  const { t } = useTranslation();
  const { storeId, productId } = useParams();
  const navigate = useNavigate();
  const isEdit = !!productId;
  const [nameEn, setNameEn] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [descriptionEn, setDescriptionEn] = useState('');
  const [price, setPrice] = useState('');
  const [stockQuantity, setStockQuantity] = useState(0);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    api(`/products/${productId}`)
      .then((p) => {
        setNameEn(p.name_en || '');
        setNameAr(p.name_ar || '');
        setDescriptionEn(p.description_en || '');
        setPrice(String(p.price));
        setStockQuantity(p.stock_quantity ?? 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [productId, isEdit]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      nameEn: nameEn.trim(),
      nameAr: nameAr || null,
      descriptionEn: descriptionEn || null,
      price: parseFloat(price),
      stockQuantity: parseInt(stockQuantity, 10) || 0,
    };
    const method = isEdit ? 'PUT' : 'POST';
    const url = isEdit ? `/products/${productId}` : `/products/manage/${storeId}`;
    if (!isEdit) payload.nameEn = nameEn.trim();
    api(url, { method, body: JSON.stringify(isEdit ? payload : { ...payload, nameEn: payload.nameEn }) })
      .then(() => navigate(`/dashboard/products/${storeId}`))
      .catch((err) => { alert(err.message); setSaving(false); });
  };

  if (loading) return <div className="max-w-2xl mx-auto px-4 py-8">Loading...</div>;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">{isEdit ? t('editProduct') : t('addProduct')}</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">{t('productName')} (EN)</label>
          <input
            type="text"
            value={nameEn}
            onChange={(e) => setNameEn(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">{t('productName')} (AR)</label>
          <input
            type="text"
            value={nameAr}
            onChange={(e) => setNameAr(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Description (EN)</label>
          <textarea
            value={descriptionEn}
            onChange={(e) => setDescriptionEn(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('price')} ({t('sar')})</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('stock')}</label>
            <input
              type="number"
              min="0"
              value={stockQuantity}
              onChange={(e) => setStockQuantity(parseInt(e.target.value, 10) || 0)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <button type="submit" disabled={saving} className="px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-500 disabled:opacity-50">
            {saving ? '...' : t('save')}
          </button>
          <button type="button" onClick={() => navigate(`/dashboard/products/${storeId}`)} className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50">
            {t('cancel')}
          </button>
        </div>
      </form>
    </div>
  );
}
