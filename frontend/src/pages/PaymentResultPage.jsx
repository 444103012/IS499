import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import StorefrontHeader from '../components/StorefrontHeader';
import { useCart } from '../context/cart/CartContext';
import api from '../api/axios';
import { buildStorefrontPath, isValidStoreName, normalizeStoreName } from '../utils/storefrontRoutes';
import useStoreBranding from '../hooks/useStoreBranding';

const SESSION_SLUG_KEY = 'customer_last_store_slug';

const PaymentResultPage = () => {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const location = useLocation();
  const navigate = useNavigate();
  const { storeSlug: urlStoreSlug } = useParams();

  // Resolved slug — starts from URL param, updated once order API responds with store context.
  const [resolvedStoreSlug, setResolvedStoreSlug] = useState(() => {
    const normalized = normalizeStoreName(urlStoreSlug || '');
    if (isValidStoreName(normalized)) return normalized;
    try {
      const saved = sessionStorage.getItem(SESSION_SLUG_KEY);
      const savedNorm = normalizeStoreName(saved || '');
      return isValidStoreName(savedNorm) ? savedNorm : '';
    } catch (_) {
      return '';
    }
  });

  // Resolved store info — for passing to StorefrontHeader when branding hook has an empty slug.
  const [resolvedStoreInfo, setResolvedStoreInfo] = useState(null);

  const { storeInfo: brandingStoreInfo, branding } = useStoreBranding(resolvedStoreSlug);
  const storeInfo = resolvedStoreInfo || brandingStoreInfo;

  const { clearCart } = useCart();
  const storefrontHome = resolvedStoreSlug ? buildStorefrontPath(resolvedStoreSlug) : '/';

  const [status, setStatus] = useState('processing');
  const [orderId, setOrderId] = useState(null);
  const [invoiceId, setInvoiceId] = useState('');
  const [referenceId, setReferenceId] = useState('');
  const [message, setMessage] = useState('');
  const [orderSummary, setOrderSummary] = useState(null);
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
      if (isSameOrigin && parsed.pathname === '/payment/result' && resolvedStoreSlug) {
        const storeScoped = buildStorefrontPath(resolvedStoreSlug, 'payment/result');
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

        // Resolve and persist store slug from the order's store context.
        const apiSlug = normalizeStoreName(data.store?.domain_name || '');
        if (isValidStoreName(apiSlug) && apiSlug !== resolvedStoreSlug) {
          setResolvedStoreSlug(apiSlug);
          try { sessionStorage.setItem(SESSION_SLUG_KEY, apiSlug); } catch (_) {}
        }
        if (data.store?.name || data.store?.logo) {
          setResolvedStoreInfo(data.store);
        }

        // If the URL doesn't include the slug (landed on /payment/result), replace history entry.
        if (isValidStoreName(apiSlug) && !urlStoreSlug) {
          const canonicalPath = `/${apiSlug}/payment/result${location.search}`;
          navigate(canonicalPath, { replace: true });
          return;
        }

        const paymentStatus = data.order?.payment_status || 'Pending';
          const effectiveStatus = normalizeStatus(paymentStatus) === 'pending' && verifyStatus
            ? verifyStatus
            : paymentStatus;

          if (isPaidStatus(effectiveStatus)) {
          setStatus('success');
          setMessage(
            isRTL ? 'تم الدفع بنجاح. شكراً لتسوقك معنا.' : 'Payment completed successfully. Thank you for your purchase.'
          );
          if (data.order?.items) {
            setOrderSummary({
              items: data.order.items,
              total_amount: data.order.total_amount,
            });
          }
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
  }, [orderId, invoiceId, isRTL, clearCart, resolvedStoreSlug, urlStoreSlug, location.search, navigate]);

  const handleRetry = async () => {
    if (!orderId) {
      navigate(storefrontHome);
      return;
    }
    try {
      const { data } = await api.post('/api/payments/init', { orderId, method: 'creditcard', frontendOrigin: window.location.origin });
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

  const formatPrice = (v) =>
    typeof v === 'number' || (typeof v === 'string' && v !== '')
      ? `${Number(v).toFixed(2)} ${isRTL ? 'ر.س' : 'SAR'}`
      : '';

  return (
    <div className="min-h-screen" style={{ backgroundColor: branding.background }} dir={isRTL ? 'rtl' : 'ltr'}>
      <StorefrontHeader storeSlug={resolvedStoreSlug} storeInfo={storeInfo} branding={branding} />
      <div className="max-w-lg mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-4">

        {/* Status card */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm text-center">
          {status === 'success' && (
            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          )}
          {status === 'failed' && (
            <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          )}
          {status === 'processing' && (
            <div className="w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-amber-500 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
            </div>
          )}
          <h1 className="text-xl font-bold mb-2" style={{ color: branding.text }}>{title}</h1>
          {message && <p className="text-sm text-gray-600 mb-3">{message}</p>}
          {orderId && (
            <p className="text-xs text-gray-500">
              {isRTL ? `رقم الطلب: #${orderId}` : `Order #${orderId}`}
            </p>
          )}
          {referenceId && (
            <p className="text-xs text-gray-400 mt-1">
              {isRTL ? `مرجع الدفع: ${referenceId}` : `Payment ref: ${referenceId}`}
            </p>
          )}
        </div>

        {/* Order summary — shown on success */}
        {status === 'success' && orderSummary && (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
              <h2 className="text-sm font-semibold text-gray-700">
                {isRTL ? 'ملخص الطلب' : 'Order Summary'}
              </h2>
            </div>
            <ul className="divide-y divide-gray-100">
              {orderSummary.items.map((item, i) => (
                <li key={i} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{item.product_name}</p>
                    {item.option_name && (
                      <p className="text-xs text-gray-400 truncate">{item.option_name}</p>
                    )}
                  </div>
                  <div className={`shrink-0 text-${isRTL ? 'left' : 'right'}`}>
                    <span className="text-gray-500 text-xs">×{item.quantity}</span>
                    <p className="font-semibold text-gray-800">{formatPrice(item.price)}</p>
                  </div>
                </li>
              ))}
            </ul>
            <div className="flex justify-between items-center px-5 py-3 border-t border-gray-200 bg-gray-50">
              <span className="text-sm font-semibold text-gray-700">
                {isRTL ? 'الإجمالي' : 'Total'}
              </span>
              <span className="text-base font-bold" style={{ color: branding.priceLabels || branding.buttons || '#047857' }}>
                {formatPrice(orderSummary.total_amount)}
              </span>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          {status === 'success' && (
            <button
              type="button"
              onClick={() => {
                const ordersPath = resolvedStoreSlug
                  ? buildStorefrontPath(resolvedStoreSlug, `orders${orderId ? `/${orderId}` : ''}`)
                  : `/customer/orders${orderId ? `/${orderId}` : ''}`;
                navigate(ordersPath);
              }}
              className="cart-btn-primary px-4 py-2.5 text-sm font-medium"
            >
              {isRTL ? 'عرض طلبي' : 'View My Order'}
            </button>
          )}
          <button
            type="button"
            onClick={() => navigate(storefrontHome)}
            className="px-4 py-2.5 rounded-lg border text-sm font-medium"
            style={{ color: branding.text, borderColor: branding.priceLabels || branding.buttons }}
          >
            {isRTL ? 'متابعة التسوق' : 'Continue Shopping'}
          </button>
          {status === 'failed' && (
            <button
              type="button"
              onClick={handleRetry}
              className="cart-btn-primary px-4 py-2.5 text-sm font-medium"
            >
              {isRTL ? 'إعادة المحاولة' : 'Retry Payment'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentResultPage;

