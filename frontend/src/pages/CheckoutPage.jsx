import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useCart } from '../context/cart/CartContext';
import api from '../api/axios';
import StorefrontHeader from '../components/StorefrontHeader';
import AddressForm from '../components/checkout/AddressForm';
import ShippingSelector from '../components/checkout/ShippingSelector';
import SummaryCard from '../components/checkout/SummaryCard';

const CheckoutPage = () => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const navigate = useNavigate();
  const { items, totals } = useCart();

  const [address, setAddress] = useState({ country: 'SA' });
  const [shippingOptions, setShippingOptions] = useState([]);
  const [selectedShippingId, setSelectedShippingId] = useState('');
  const [quote, setQuote] = useState({
    itemsTotal: totals.grand || 0,
    shippingAmount: 0,
    taxAmount: 0,
    grandTotal: totals.grand || 0,
  });
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = i18n.language;
  }, [i18n.language, isRTL]);

  useEffect(() => {
    if (!items || items.length === 0) {
      navigate('/shop', { replace: true });
      return;
    }
    (async () => {
      try {
        const { data } = await api.get('/api/checkout/shipping/options');
        setShippingOptions(data.options || []);
        if (!selectedShippingId && data.options && data.options[0]) {
          setSelectedShippingId(data.options[0].id);
        }
      } catch (err) {
        console.error('shipping options error:', err);
      }
    })();
  }, [items, navigate]);

  useEffect(() => {
    if (!items || items.length === 0) return;
    if (!selectedShippingId) return;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const { data } = await api.post('/api/checkout/quote', {
          address,
          shippingMethodId: selectedShippingId,
        });
        setQuote({
          itemsTotal: data.itemsTotal,
          shippingAmount: data.shippingAmount,
          taxAmount: data.taxAmount,
          grandTotal: data.grandTotal,
        });
      } catch (err) {
        setError(err.response?.data?.error || (isRTL ? 'فشل حساب الإجمالي' : 'Failed to calculate totals'));
      } finally {
        setLoading(false);
      }
    })();
  }, [address, selectedShippingId, items, isRTL]);

  const isAddressValid =
    (address.full_name || '').trim() &&
    (address.phone || '').trim() &&
    (address.email || '').trim() &&
    (address.address1 || '').trim() &&
    (address.city || '').trim() &&
    (address.region || '').trim() &&
    (address.postal_code || '').trim();

  const canSubmit = !!isAddressValid && !!selectedShippingId && !submitting && !loading;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError('');
    try {
      const { data: created } = await api.post('/api/checkout/create-order', {
        address,
        shippingMethodId: selectedShippingId,
      });
      const orderId = created.orderId;
      const { data: payment } = await api.post('/api/payments/init', {
        orderId,
        method: 'creditcard',
      });
      if (payment.transactionUrl) {
        window.location.href = payment.transactionUrl;
      } else {
       
        window.location.href = payment.callbackUrl;
      }
    } catch (err) {
      if (err.response?.status === 409 && err.response?.data?.error === 'OUT_OF_STOCK') {
        const d = err.response.data;
        setError(
          isRTL
            ? 'أحد المنتجات نفد من المخزون. يرجى مراجعة السلة.'
            : 'One of the items is out of stock. Please review your cart.'
        );
        navigate('/shop', { replace: false });
      } else {
        setError(err.response?.data?.error || (isRTL ? 'فشل إنشاء الطلب' : 'Failed to create order'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50" dir={isRTL ? 'rtl' : 'ltr'}>
      <StorefrontHeader />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className={`text-2xl font-bold text-storelaunch-dark mb-6 ${isRTL ? 'text-right' : 'text-left'}`}>
          {isRTL ? 'إتمام الطلب' : 'Checkout'}
        </h1>

        {error && (
          <div className={`mb-4 p-3 rounded-md bg-red-50 border border-red-200 text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
            <span className="text-red-700">{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <AddressForm value={address} onChange={setAddress} isRTL={isRTL} />
            <ShippingSelector
              options={shippingOptions}
              selectedId={selectedShippingId}
              onChange={setSelectedShippingId}
              isRTL={isRTL}
            />
          </div>
          <div className="space-y-4">
            <SummaryCard
              itemsTotal={quote.itemsTotal}
              shippingAmount={quote.shippingAmount}
              taxAmount={quote.taxAmount}
              grandTotal={quote.grandTotal}
              isRTL={isRTL}
            />
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="cart-btn-primary w-full py-3 text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting
                ? isRTL ? 'جاري التوجيه للدفع...' : 'Redirecting to payment...'
                : isRTL ? 'المتابعة للدفع' : 'Proceed to Payment'}
            </button>
          </div>
        </div>

        {loading && (
          <p className={`mt-4 text-sm text-gray-500 ${isRTL ? 'text-right' : 'text-left'}`}>
            {isRTL ? 'جاري تحديث الإجمالي...' : 'Updating totals...'}
          </p>
        )}
      </div>
    </div>
  );
};

export default CheckoutPage;

