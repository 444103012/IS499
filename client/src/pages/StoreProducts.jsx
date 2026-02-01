import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../api';
import { Plus, Pencil, Trash2 } from 'lucide-react';

export default function StoreProducts() {
  const { t } = useTranslation();
  const { storeId } = useParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api(`/products/manage/${storeId}`)
      .then(setProducts)
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [storeId]);

  const handleDelete = (id) => {
    if (!window.confirm(t('delete') + '?')) return;
    api(`/products/${id}`, { method: 'DELETE' })
      .then(() => setProducts((prev) => prev.filter((p) => p.id !== id)))
      .catch(alert);
  };

  if (loading) return <div className="max-w-4xl mx-auto px-4 py-8">Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">{t('products')}</h1>
        <Link
          to={`/dashboard/products/${storeId}/new`}
          className="flex items-center gap-2 px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-500"
        >
          <Plus className="w-4 h-4" /> {t('addProduct')}
        </Link>
      </div>
      {products.length === 0 ? (
        <p className="text-slate-600">{t('noProducts')}</p>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left p-3 font-medium text-slate-700">{t('productName')}</th>
                <th className="text-left p-3 font-medium text-slate-700">{t('price')}</th>
                <th className="text-left p-3 font-medium text-slate-700">{t('stock')}</th>
                <th className="w-24 p-3" />
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="p-3">{p.name_en || p.name_ar}</td>
                  <td className="p-3">{p.price} {t('sar')}</td>
                  <td className="p-3">{p.stock_quantity}</td>
                  <td className="p-3 flex gap-2">
                    <Link
                      to={`/dashboard/products/${storeId}/edit/${p.id}`}
                      className="p-1.5 text-sky-600 hover:bg-sky-50 rounded"
                    >
                      <Pencil className="w-4 h-4" />
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleDelete(p.id)}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
