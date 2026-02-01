import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import api from '../api';

export default function ProductPage() {
  const { t, i18n } = useTranslation();
  const { slug, productId } = useParams();
  const { user } = useAuth();
  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    api(`/products/${productId}`)
      .then(setProduct)
      .catch(() => setProduct(null))
      .finally(() => setLoading(false));
  }, [productId]);

  const handleAddToCart = () => {
    if (!user) {
      window.location.href = `/login?redirect=/store/${slug}/product/${productId}`;
      return;
    }
    setAdding(true);
    api(`/cart/${product.store_id}/items`, {
      method: 'POST',
      body: JSON.stringify({ productId: product.id, quantity }),
    })
      .then(() => {
        setAdding(false);
        window.location.href = `/store/${slug}/cart`;
      })
      .catch((err) => {
        alert(err.message);
        setAdding(false);
      });
  };

  if (loading) return <div className="max-w-4xl mx-auto px-4 py-12">Loading...</div>;
  if (!product) return <div className="max-w-4xl mx-auto px-4 py-12">Product not found</div>;

  const isRtl = i18n.language === 'ar';
  const name = (isRtl && product.name_ar) ? product.name_ar : product.name_en;
  const desc = (isRtl && product.description_ar) ? product.description_ar : product.description_en;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link to={`/store/${slug}`} className="text-sky-600 hover:underline mb-4 inline-block">← Back to store</Link>
      <div className="grid md:grid-cols-2 gap-8 bg-white rounded-xl border border-slate-200 p-6">
        <div className="aspect-square bg-slate-100 rounded-lg flex items-center justify-center">
          {product.image_url ? (
            <img src={product.image_url} alt={name} className="w-full h-full object-cover rounded-lg" />
          ) : (
            <span className="text-6xl">📦</span>
          )}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{name}</h1>
          <p className="text-2xl font-bold text-sky-600 mt-2">{product.price} {t('sar')}</p>
          {desc && <p className="text-slate-600 mt-4">{desc}</p>}
          <p className="text-sm text-slate-500 mt-2">{t('stock')}: {product.stock_quantity}</p>
          <div className="mt-6 flex items-center gap-4">
            <label className="text-sm font-medium text-slate-700">{t('quantity')}</label>
            <input
              type="number"
              min={1}
              max={product.stock_quantity}
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 1)}
              className="w-20 px-3 py-2 border border-slate-300 rounded-lg"
            />
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={adding || product.stock_quantity < 1}
              className="px-6 py-2.5 bg-sky-600 text-white font-medium rounded-lg hover:bg-sky-500 disabled:opacity-50"
            >
              {adding ? '...' : t('addToCart')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
