import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import StorefrontHeader from '../components/StorefrontHeader';
import { useCart } from '../context/cart/CartContext';
import api from '../api/axios';
import { buildStorefrontPath } from '../utils/storefrontRoutes';
import useStoreBranding from '../hooks/useStoreBranding';

const PaymentResultPage = () => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const location = useLocation();
  const navigate = useNavigate();
  const { storeSlug } = useParams();
  const { storeInfo, branding } = useStoreBranding(storeSlug);
  const { clearCart } = useCart();
  const storefrontHome = storeSlug ? buildStorefrontPath(storeSlug) : '/';

  const [status, setStatus] = useState('processing');
  const [orderId, setOrderId] = useState(null);
  const [invoiceId, setInvoiceId] = useState('');
  const [referenceId, setReferenceId] = useState('');
  const [message, setMessage] = useState('');
  const hasClearedCartRef = useRef(false);

  const resolvePaymentRedirectUrl = (paymentData) => {
    const candidate =
      paymentData?.transactionUrl
      || paymentData?.paymentUrl
      || paymentData?.checkoutUrl
      || paymentData?.redirect_url
      || paymentData?.redirectUrl
      || paymentData?.url
      || paymentData?.callbackUrl
      || '';
    if (!candidate || typeof candidate !== 'string') return '';

    try {
      const parsed = new URL(candidate, window.location.origin);
      const isSameOrigin = parsed.origin === window.location.origin;
      if (isSameOrigin && parsed.pathname === '/payment/result' && storeSlug) {
        const storeScoped = buildStorefrontPath(storeSlug, 'payment/result');
        return `${window.location.origin}${storeScoped}${parsed.search}`;
      }
      return parsed.href;
    } catch (_) {
      return '';
    }
  };

  useEffect(() => {
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = i18n.language;
  }, [i18n.language, isRTL]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const statusParam = params.get('status');
    const orderIdParam = params.get('orderId');
    const invoiceIdParam = params.get('invoiceId') || params.get('invoice_id') || params.get('id');
    const paymentRefParam = params.get('paymentId') || params.get('payment_id');
    if (orderIdParam) setOrderId(orderIdParam);
    if (invoiceIdParam) setInvoiceId(invoiceIdParam);
    if (paymentRefParam) setReferenceId(paymentRefParam);
    if (statusParam) setStatus(statusParam);
  }, [location.search]);

  useEffect(() => {
    let isCancelled = false;
    const delaysMs = [0, 500, 1000];
    const normalizeStatus = (value) => String(value || '').trim().toLowerCase();
    const isPaidStatus = (value) => ['paid', 'captured', 'authorized', 'success'].includes(normalizeStatus(value));
    const isFailedStatus = (value) => ['failed', 'canceled', 'cancelled', 'expired', 'voided'].includes(normalizeStatus(value));

    const sleep = (ms) => new Promise((resolve) => {
      setTimeout(resolve, ms);
    });

    const verifyAndFetchOrder = async () => {
      if (!orderId) return;
      const hasCustomerToken = typeof localStorage !== 'undefined' && Boolean(localStorage.getItem('customer_token'));

      for (let attempt = 0; attempt < delaysMs.length; attempt += 1) {
        if (isCancelled) return;
        if (delaysMs[attempt] > 0) {
          await sleep(delaysMs[attempt]);
          if (isCancelled) return;
        }

        let verifyStatus = '';
      try {
          if (invoiceId && hasCustomerToken) {
          try {
            const verify = await api.get(`/api/payments/verify-return?orderId=${encodeURIComponent(orderId)}&invoiceId=${encodeURIComponent(invoiceId)}`);
              verifyStatus = verify?.data?.paymentStatus || '';
            if (verify?.data?.referenceId) {
              setReferenceId(String(verify.data.referenceId));
            }
          } catch (verifyErr) {
              if (verifyErr?.response?.status === 401 || verifyErr?.response?.status === 403) {
                setStatus('processing');
                setMessage(
                  isRTL
                    ? 'انتهت جلسة تسجيل الدخول. يرجى تسجيل الدخول للتحقق من حالة الدفع.'
                    : 'Your session expired. Please sign in to verify payment status.'
                );
                return;
              }
          }
        }

        const { data } = await api.get(`/api/checkout/orders/${orderId}`);
        const paymentStatus = data.order?.payment_status || 'Pending';
          const effectiveStatus = normalizeStatus(paymentStatus) === 'pending' && verifyStatus
            ? verifyStatus
            : paymentStatus;

          if (isPaidStatus(effectiveStatus)) {
          setStatus('success');
          setMessage(
            isRTL ? 'تم الدفع بنجاح. شكراً لتسوقك معنا.' : 'Payment completed successfully. Thank you for your purchase.'
          );
            if (!hasClearedCartRef.current) {
              hasClearedCartRef.current = true;
              try {
                await clearCart();
              } catch (_) {}
            }
            return;
          }

          if (isFailedStatus(effectiveStatus)) {
          setStatus('failed');
          setMessage(
            isRTL ? 'فشل الدفع. يمكنك المحاولة مرة أخرى.' : 'Payment failed. You can try again.'
          );
            return;
          }

          if (attempt < delaysMs.length - 1) {
            continue;
          }

          setStatus('processing');
          setMessage(
            isRTL ? 'يتم معالجة الدفع. يرجى التحقق لاحقاً.' : 'Payment is still processing. Please check again later.'
          );
          return;
      } catch (err) {
        console.error('payment result order error:', err);
          if (err?.response?.status === 401 || err?.response?.status === 403) {
            setStatus('processing');
            setMessage(
              isRTL
                ? 'انتهت جلسة تسجيل الدخول. يرجى تسجيل الدخول للتحقق من حالة الدفع.'
                : 'Your session expired. Please sign in to verify payment status.'
            );
            return;
          }

          if (attempt < delaysMs.length - 1) {
            continue;
          }
        setStatus('processing');
        setMessage(
          isRTL ? 'يتم التحقق من نتيجة الدفع حالياً. يرجى الانتظار أو تحديث الصفحة بعد لحظات.' : 'We are still verifying your payment result. Please wait or refresh in a moment.'
        );
          return;
        }
      }
    };

    verifyAndFetchOrder();
    return () => {
      isCancelled = true;
    };
  }, [orderId, invoiceId, isRTL, clearCart]);

  const handleRetry = async () => {
    if (!orderId) {
      navigate(storefrontHome);
      return;
    }
    try {
      const { data } = await api.post('/api/payments/init', { orderId, method: 'creditcard' });
      const redirectUrl = resolvePaymentRedirectUrl(data);
      if (!redirectUrl) {
        setMessage(
          isRTL ? 'رابط الدفع غير متوفر حالياً. حاول مرة أخرى.' : 'Payment URL is not available right now. Please try again.'
        );
        return;
      }
      window.location.href = redirectUrl;
    } catch (err) {
      setMessage(
        isRTL ? 'فشل بدء عملية الدفع مرة أخرى.' : 'Failed to start payment again.'
      );
    }
  };

  const title =
    status === 'success'
      ? (isRTL ? 'تم تأكيد الطلب' : 'Order Confirmed')
      : status === 'failed'
      ? (isRTL ? 'فشل الدفع' : 'Payment Failed')
      : (isRTL ? 'جاري معالجة الدفع' : 'Processing Payment');

  return (
    <div className="min-h-screen" style={{ backgroundColor: branding.background }} dir={isRTL ? 'rtl' : 'ltr'}>
      <StorefrontHeader storeSlug={storeSlug} storeInfo={storeInfo} branding={branding} />
      <div className="max-w-lg mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm text-center">
          <h1 className="text-2xl font-bold mb-4" style={{ color: branding.text }}>{title}</h1>
          <p className="text-sm text-gray-600 mb-4">{message}</p>
          {orderId && (
            <p className="text-xs text-gray-500 mb-6">
              {isRTL ? `رقم الطلب: ${orderId}` : `Order ID: ${orderId}`}
            </p>
          )}
          {referenceId && (
            <p className="text-xs text-gray-500 mb-6">
              {isRTL ? `مرجع الدفع: ${referenceId}` : `Payment Ref: ${referenceId}`}
            </p>
          )}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              type="button"
              onClick={() => navigate(storefrontHome)}
              className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium"
              style={{ color: branding.text, borderColor: branding.priceLabels || branding.buttons }}
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

