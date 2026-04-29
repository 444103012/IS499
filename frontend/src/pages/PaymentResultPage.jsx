import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import StorefrontHeader from '../components/StorefrontHeader';
import { useCart } from '../context/cart/CartContext';
import api from '../api/axios';

const PaymentResultPage = () => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const location = useLocation();
  const navigate = useNavigate();
  const { storeSlug } = useParams();
  const { items, removeItem } = useCart();
  const storefrontPath = storeSlug ? `/${storeSlug}/customer` : '/shop';

  const [status, setStatus] = useState('processing');
  const [orderId, setOrderId] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = i18n.language;
  }, [i18n.language, isRTL]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const statusParam = params.get('status');
    const orderIdParam = params.get('orderId');
    if (orderIdParam) setOrderId(orderIdParam);
    if (statusParam) setStatus(statusParam);
  }, [location.search]);

  useEffect(() => {
    const fetchOrder = async () => {
      if (!orderId) return;
      try {
        const { data } = await api.get(`/api/checkout/orders/${orderId}`);
        const paymentStatus = data.order?.payment_status || 'Pending';
        if (paymentStatus === 'Paid' || paymentStatus === 'paid') {
          setStatus('success');
          setMessage(
            isRTL ? 'تم الدفع بنجاح. شكراً لتسوقك معنا.' : 'Payment completed successfully. Thank you for your purchase.'
          );
         
          if (items && items.length > 0) {
            items.forEach((it) => removeItem(it.key));
          }
        } else if (paymentStatus === 'Failed') {
          setStatus('failed');
          setMessage(
            isRTL ? 'فشل الدفع. يمكنك المحاولة مرة أخرى.' : 'Payment failed. You can try again.'
          );
        } else {
          setStatus('processing');
          setMessage(
            isRTL ? 'يتم معالجة الدفع. يرجى التحقق لاحقاً.' : 'Payment is still processing. Please check again later.'
          );
        }
      } catch (err) {
        console.error('payment result order error:', err);
      }
    };
    if (status === 'success' || status === 'failed' || status === 'processing') {
      fetchOrder();
    }
  }, [orderId, status, isRTL, items, removeItem]);

  const handleRetry = async () => {
    if (!orderId) {
      navigate(storefrontPath);
      return;
    }
    try {
      const { data } = await api.post('/api/payments/init', { orderId, method: 'creditcard' });
      if (data.transactionUrl) {
        window.location.href = data.transactionUrl;
      } else {
        window.location.href = data.callbackUrl;
      }
    } catch (err) {
      setMessage(
        isRTL ? 'فشل بدء عملية الدفع مرة أخرى.' : 'Failed to start payment again.'
      );
    }
  };

  const title =
    status === 'success'
      ? (isRTL ? 'تم الدفع بنجاح' : 'Payment Success')
      : status === 'failed'
      ? (isRTL ? 'فشل الدفع' : 'Payment Failed')
      : (isRTL ? 'جاري معالجة الدفع' : 'Processing Payment');

  return (
    <div className="min-h-screen bg-gray-50" dir={isRTL ? 'rtl' : 'ltr'}>
      <StorefrontHeader />
      <div className="max-w-lg mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm text-center">
          <h1 className="text-2xl font-bold text-storelaunch-dark mb-4">{title}</h1>
          <p className="text-sm text-gray-600 mb-4">{message}</p>
          {orderId && (
            <p className="text-xs text-gray-500 mb-6">
              {isRTL ? `رقم الطلب: ${orderId}` : `Order ID: ${orderId}`}
            </p>
          )}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              type="button"
              onClick={() => navigate(storefrontPath)}
              className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-storelaunch-dark hover:border-storelaunch-green"
            >
              {isRTL ? 'متابعة التسوق' : 'Continue Shopping'}
            </button>
            {status === 'failed' && (
              <button
                type="button"
                onClick={handleRetry}
                className="cart-btn-primary px-4 py-2 text-sm font-medium"
              >
                {isRTL ? 'إعادة المحاولة' : 'Retry Payment'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentResultPage;

