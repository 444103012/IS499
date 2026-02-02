import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import api from '../api';

export default function Cart() {
  const { t, i18n } = useTranslation();
  const { slug } = useParams();
  const { user } = useAuth();
  const [store, setStore] = useState(null);
  const [cartData, setCartData] = useState({ cart: null, items: [], subtotal: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api(`/stores/public/${slug}`)
      .then((s) => {
        setStore(s);
        return api(`/cart/${s.id}`);
      })
      .then(setCartData)
      .catch(() => setCartData({ cart: null, items: [], subtotal: 0 }))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <div className="max-w-4xl mx-auto px-4 py-12">Loading...</div>;
  if (!store) return <div className="max-w-4xl mx-auto px-4 py-12">Store not found</div>;
  if (!user) return <div className="max-w-4xl mx-auto px-4 py-12 text-center"><p className="text-slate-600">Please log in to view your cart.</p><Link to="/login" className="text-sky-600 mt-2 inline-block">Login</Link></div>;

  const { items, subtotal } = cartData;
  const isRtl = i18n.language === 'ar';

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link to={`/store/${slug}`} className="text-sky-600 hover:underline mb-4 inline-block">← Back to store</Link>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">{t('cart')}</h1>
      {!items || items.length === 0 ? (
        <p className="text-slate-600">{t('noProducts')} in cart</p>
      ) : (
        <>
          <div className="space-y-4 mb-8">
            {items.map((i) => {
              const name = (isRtl && i.name_ar) ? i.name_ar : i.name_en;
              return (
                <div key={i.id} className="flex items-center gap-4 bg-white rounded-xl border border-slate-200 p-4">
                  <div className="w-16 h-16 bg-slate-100 rounded flex items-center justify-center">
                    {i.image_url ? <img src={i.image_url} alt={name} className="w-full h-full object-cover rounded" /> : <span>📦</span>}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">{name}</p>
                    <p className="text-sky-600">{i.price} {t('sar')} × {i.quantity}</p>
                  </div>
                  <p className="font-bold text-slate-900">{i.price * i.quantity} {t('sar')}</p>
                </div>
              );
            })}
          </div>
          <div className="bg-slate-100 rounded-xl p-4 mb-6">
            <p className="text-lg font-bold text-slate-900">{t('subtotal')}: {subtotal} {t('sar')}</p>
          </div>
          <Link
            to={`/store/${store.id}/checkout`}
            className="inline-block px-6 py-3 bg-sky-600 text-white font-medium rounded-lg hover:bg-sky-500"
          >
            {t('checkout')}
          </Link>
        </>
      )}
    </div>
  );
}
