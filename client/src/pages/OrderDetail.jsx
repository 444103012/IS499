import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../api';

export default function OrderDetail() {
  const { t } = useTranslation();
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api(`/orders/my/${orderId}`)
      .then(setOrder)
      .catch(() => setOrder(null))
      .finally(() => setLoading(false));
  }, [orderId]);

  const confirmPayment = () => {
    api(`/orders/my/${orderId}/confirm-payment`, { method: 'POST' })
      .then(setOrder)
      .catch(alert);
  };

  if (loading) return <div className="max-w-2xl mx-auto px-4 py-8">Loading...</div>;
  if (!order) return <div className="max-w-2xl mx-auto px-4 py-8">Order not found</div>;

  const items = order.items || [];

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Link to="/orders" className="text-sky-600 hover:underline mb-4 inline-block">← {t('orderHistory')}</Link>
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Order #{order.id.slice(0, 8)}</h1>
      <p className="text-slate-600 mb-6">{order.store_name} · {order.status} · {order.payment_status}</p>
      <div className="space-y-4 mb-6">
        {items.map((i) => (
          <div key={i.id} className="flex justify-between items-center py-2 border-b border-slate-100">
            <span>{i.product_name} × {i.quantity}</span>
            <span>{i.unit_price * i.quantity} {t('sar')}</span>
          </div>
        ))}
      </div>
      <div className="bg-slate-50 rounded-xl p-4 mb-6">
        <p className="font-bold text-slate-900">{t('total')}: {order.total} {t('sar')}</p>
        {order.shipping_address && <p className="text-sm text-slate-600 mt-1">{t('shippingAddress')}: {order.shipping_address}</p>}
      </div>
      {order.payment_status !== 'paid' && (
        <button
          type="button"
          onClick={confirmPayment}
          className="px-6 py-2.5 bg-sky-600 text-white rounded-lg hover:bg-sky-500"
        >
          {t('confirmPayment')}
        </button>
      )}
      {order.payment_status === 'paid' && <p className="text-green-600 font-medium">{t('orderConfirmed')}</p>}
    </div>
  );
}
