import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../api';
import { ShoppingCart, Search } from 'lucide-react';

export default function Storefront() {
  const { t, i18n } = useTranslation();
  const { slug } = useParams();
  const [store, setStore] = useState(null);
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api(`/stores/public/${slug}`)
      .then((s) => {
        setStore(s);
        return api(`/products/store/${s.id}${search ? `?q=${encodeURIComponent(search)}` : ''}`);
      })
      .then(setProducts)
      .catch(() => {
        setStore(null);
        setProducts([]);
      })
      .finally(() => setLoading(false));
  }, [slug, search]);

  if (loading) return <div className="max-w-4xl mx-auto px-4 py-12 text-center">Loading...</div>;
  if (!store) return <div className="max-w-4xl mx-auto px-4 py-12 text-center">Store not found</div>;

  const isRtl = i18n.language === 'ar';
  const name = (isRtl && store.name_ar) ? store.name_ar : store.name;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{name}</h1>
          {store.description && <p className="text-slate-600 mt-1">{store.description}</p>}
        </div>
        <Link
          to={`/store/${slug}/cart`}
          className="flex items-center gap-2 px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-500"
        >
          <ShoppingCart className="w-5 h-5" /> {t('cart')}
        </Link>
      </div>
      <div className="mb-6">
        <input
          type="search"
          placeholder={t('search')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-md px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500"
        />
      </div>
      {products.length === 0 ? (
        <p className="text-slate-600">{t('noProducts')}</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((p) => {
            const pName = (isRtl && p.name_ar) ? p.name_ar : p.name_en;
            return (
              <Link
                key={p.id}
                to={`/store/${slug}/product/${p.id}`}
                className="block bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-md hover:border-sky-200 transition"
              >
                <div className="aspect-square bg-slate-100 flex items-center justify-center">
                  {p.image_url ? (
                    <img src={p.image_url} alt={pName} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-slate-400 text-4xl">📦</span>
                  )}
                </div>
                <div className="p-4">
                  <h2 className="font-medium text-slate-900 truncate">{pName}</h2>
                  <p className="text-sky-600 font-bold mt-1">{p.price} {t('sar')}</p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
