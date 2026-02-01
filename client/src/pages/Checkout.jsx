import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import api from '../api';

export default function Checkout() {
  const { t } = useTranslation();
  const { storeId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [cartData, setCartData] = useState({ items: [], subtotal: 0 });
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    api(`/cart/${storeId}`)
      .then(setCartData)
      .catch(() => setCartData({ items: [], subtotal: 0 }))
      .finally(() => setLoading(false));
  }, [storeId, user, navigate]);

  const handleCheckout = (e) => {
    e.preventDefault();
    if (!address.trim()) return;
    setSubmitting(true);
    api(`/cart/${storeId}/checkout`, {
      method: 'POST',
      body: JSON.stringify({ shippingAddress: address.trim() }),
    })
      .then(({ order }) => {
        setSubmitting(false);
        navigate(`/orders/${order.id}`);
      })
      .catch((err) => {
        alert(err.message);
        setSubmitting(false);
      });
  };

  if (loading) return <div className="max-w-2xl mx-auto px-4 py-12">Loading...</div>;

  const { items, subtotal } = cartData;
  if (!items || items.length === 0) return <div className="max-w-2xl mx-auto px-4 py-12">Cart is empty. <a href="/" className="text-sky-600">Go back</a></div>;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">{t('checkout')}</h1>
      <div className="mb-6 p-4 bg-slate-50 rounded-xl">
        <p className="font-medium text-slate-900">{t('subtotal')}: {subtotal} {t('sar')}</p>
        <p className="text-sm text-slate-600 mt-1">{items.length} item(s)</p>
      </div>
      <form onSubmit={handleCheckout} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">{t('shippingAddress')}</label>
          <textarea
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500"
            required
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 bg-sky-600 text-white font-medium rounded-lg hover:bg-sky-500 disabled:opacity-50"
        >
          {submitting ? '...' : t('payNow')}
        </button>
      </form>
    </div>
  );
}
