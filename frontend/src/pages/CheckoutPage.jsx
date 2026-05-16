import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useParams } from '../router';
import { useTranslation } from 'react-i18next';
import { useCart } from '../context/cart/CartContext';
import api from '../api/axios';
import StorefrontHeader from '../components/StorefrontHeader';
import StorefrontFooter from '../components/storefront/StorefrontFooter';
import AddressForm from '../components/checkout/AddressForm';
import ShippingSelector from '../components/checkout/ShippingSelector';
import SummaryCard from '../components/checkout/SummaryCard';
import { buildStorefrontPath } from '../utils/storefrontRoutes';
import { Link } from '../router';
import useStoreBranding from '../hooks/useStoreBranding';

const CheckoutPage = () => {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const { storeSlug } = useParams();
  const { storeInfo, branding } = useStoreBranding(storeSlug);
  const location = useLocation();
  const {
    items,
    totals,
    loading: cartLoading,
    warnings: cartWarnings = [],
  } = useCart();
  const storefrontHome = storeSlug ? buildStorefrontPath(storeSlug) : '/';

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
  const [profileLoading, setProfileLoading] = useState(false);
  const [serverCartLoading, setServerCartLoading] = useState(false);
  const [serverCartItems, setServerCartItems] = useState([]);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [checkoutItemIssue, setCheckoutItemIssue] = useState('');
  const [isLoggedIn] = useState(() => !!localStorage.getItem('customer_token'));

  const checkoutItems = isLoggedIn ? serverCartItems : items;
  const hasItems = Array.isArray(checkoutItems) && checkoutItems.length > 0;
  const cartReady = !cartLoading;

  const contactHint = isRTL
    ? 'لتعديل البريد أو رقم الجوال، انتقل إلى إعدادات الحساب.'
    : 'To update email or phone, manage them in account settings.';

  const profilePhoneMissingHint = isRTL
    ? 'رقم الجوال غير مكتمل في حسابك. حدّثه من الإعدادات للمتابعة.'
    : 'Phone number is missing in your account. Update it in settings to continue.';

  const checkoutPath = `${location.pathname || storefrontHome}${location.search || ''}`;
  const loginHref = storeSlug
    ? `${buildStorefrontPath(storeSlug, 'login')}?redirectTo=${encodeURIComponent(checkoutPath)}`
    : `/customer/login?redirectTo=${encodeURIComponent(checkoutPath)}`;

  useEffect(() => {
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = i18n.language;
  }, [i18n.language, isRTL]);

  useEffect(() => {
    if (!cartReady || !hasItems) return;
    if (!isLoggedIn) return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get('/api/checkout/shipping/options');
        const opts = Array.isArray(data.options) ? data.options : [];
        if (cancelled) return;
        setShippingOptions(opts);
        setSelectedShippingId((prev) => {
          if (opts.length === 0) return '';
          if (opts.some((o) => o.id === prev)) return prev;
          return opts[0].id;
        });
      } catch (err) {
        console.error('shipping options error:', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [cartReady, hasItems, isLoggedIn]);

  useEffect(() => {
    if (!isLoggedIn) return;
    let cancelled = false;
    setServerCartLoading(true);
    (async () => {
      try {
        const { data } = await api.get('/api/cart');
        const serverItems = Array.isArray(data?.items) ? data.items : [];
        if (!cancelled) setServerCartItems(serverItems.length > 0 ? serverItems : (Array.isArray(items) ? items : []));
      } catch (_) {
        if (!cancelled) setServerCartItems(Array.isArray(items) ? items : []);
      } finally {
        if (!cancelled) setServerCartLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, items]);

  useEffect(() => {
    if (!isLoggedIn) return;
    let cancelled = false;
    setProfileLoading(true);
    (async () => {
      try {
        const { data } = await api.get('/api/customers/profile');
        if (cancelled) return;
        const profile = data?.customer ?? {};
        const email =
          profile?.email ??
          profile?.user?.email ??
          profile?.profile?.email ??
          '';
        const phone =
          profile?.phone ??
          profile?.phoneNumber ??
          profile?.phone_number ??
          profile?.profile?.phone ??
          profile?.profile?.phoneNumber ??
          '';
        const fullNameCandidate =
          profile?.name ??
          [profile?.first_name, profile?.last_name].filter(Boolean).join(' ').trim();

        setAddress((prev) => ({
          ...prev,
          full_name: prev.full_name || fullNameCandidate || '',
          email: String(email || '').trim(),
          phone: String(phone || '').trim(),
        }));
      } catch (err) {
        if (!cancelled && err.response?.status !== 401) {
          setError(err.response?.data?.error || (isRTL ? 'تعذر تحميل بيانات الحساب' : 'Failed to load account details'));
        }
      } finally {
        if (!cancelled) setProfileLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, isRTL]);

  useEffect(() => {
    if (!isLoggedIn) return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get('/api/customers/address');
        if (cancelled) return;
        const saved = data?.address;
        if (!saved || typeof saved !== 'object') return;
        setAddress((prev) => ({
          ...prev,
          full_name: String(saved.full_name ?? prev.full_name ?? '').trim(),
          phone: String(saved.phone ?? prev.phone ?? '').trim(),
          address1: String(saved.address1 ?? prev.address1 ?? '').trim(),
          city: String(saved.city ?? prev.city ?? '').trim(),
          region: String(saved.region ?? prev.region ?? '').trim(),
          postal_code: String(saved.postal_code ?? prev.postal_code ?? '').trim(),
          country: String(saved.country ?? prev.country ?? 'SA').trim() || 'SA',
        }));
      } catch (_) {
        // no saved address
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn]);

  useEffect(() => {
    if (!cartReady || !hasItems) return;
    if (!isLoggedIn) return;
    if (!selectedShippingId) return;
    (async () => {
      setLoading(true);
      setError('');
      setCheckoutItemIssue('');
      try {
        let data;
        try {
          ({ data } = await api.post('/api/checkout/quote', {
            address,
            shippingMethodId: selectedShippingId,
          }));
        } catch (err) {
          const isEmptyServerCart = err.response?.status === 400 && err.response?.data?.error === 'Cart is empty';
          if (!isEmptyServerCart || !hasItems) throw err;
          const merged = await api.post('/api/cart/merge', { items: checkoutItems });
          setServerCartItems(Array.isArray(merged?.data?.items) ? merged.data.items : []);
          ({ data } = await api.post('/api/checkout/quote', {
            address,
            shippingMethodId: selectedShippingId,
          }));
        }
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
  }, [address, selectedShippingId, cartReady, hasItems, isRTL, checkoutItems, isLoggedIn]);

  useEffect(() => {
    setQuote((prev) => ({
      ...prev,
      itemsTotal: Number(totals?.grand || 0),
      grandTotal: prev.shippingAmount || prev.taxAmount
        ? Number(totals?.grand || 0) + Number(prev.shippingAmount || 0) + Number(prev.taxAmount || 0)
        : Number(totals?.grand || 0),
    }));
  }, [totals?.grand]);

  const validateAddress = () => {
    const nextErrors = {};
    if (!(address.full_name || '').trim()) nextErrors.full_name = isRTL ? 'الاسم الكامل مطلوب' : 'Full name is required';
    if (!(address.email || '').trim()) nextErrors.email = isRTL ? 'البريد الإلكتروني مطلوب' : 'Email is required';
    if (!(address.phone || '').trim()) nextErrors.phone = isRTL ? 'رقم الجوال مطلوب' : 'Phone is required';
    if (!(address.address1 || '').trim()) nextErrors.address1 = isRTL ? 'العنوان مطلوب' : 'Address is required';
    if (!(address.city || '').trim()) nextErrors.city = isRTL ? 'المدينة مطلوبة' : 'City is required';
    if (!(address.region || '').trim()) nextErrors.region = isRTL ? 'المنطقة مطلوبة' : 'Region is required';
    if (!(address.postal_code || '').trim()) nextErrors.postal_code = isRTL ? 'الرمز البريدي مطلوب' : 'Postal code is required';
    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const quoteItemsTotal = quote.itemsTotal ?? Number(totals?.grand || 0);
  const quoteGrandTotal = quote.grandTotal ?? Number(totals?.grand || 0);

  const canSubmit = !!selectedShippingId && !submitting && !loading && cartReady && hasItems && !profileLoading && !serverCartLoading && isLoggedIn;

  const missingLockedPhone = useMemo(() => {
    if (!isLoggedIn) return false;
    return !(address.phone || '').trim();
  }, [isLoggedIn, address.phone]);

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



  const handleSubmit = async () => {
    setCheckoutItemIssue('');
    if (!validateAddress()) return;
    if (!canSubmit) return;
    setSubmitting(true);
    setError('');
    try {
      let created;
      try {
        ({ data: created } = await api.post('/api/checkout/create-order', {
          address,
          shippingMethodId: selectedShippingId,
        }));
      } catch (err) {
        const isEmptyServerCart = err.response?.status === 400 && err.response?.data?.error === 'Cart is empty';
        if (!isEmptyServerCart || !hasItems) throw err;
        const merged = await api.post('/api/cart/merge', { items: checkoutItems });
        setServerCartItems(Array.isArray(merged?.data?.items) ? merged.data.items : []);
        ({ data: created } = await api.post('/api/checkout/create-order', {
          address,
          shippingMethodId: selectedShippingId,
        }));
      }
      const orderId = created.orderId;
      const { data: payment } = await api.post('/api/payments/init', {
        orderId,
        method: 'creditcard',
      });
      const redirectUrl = resolvePaymentRedirectUrl(payment);
      if (!redirectUrl) {
        setError(isRTL ? 'تعذر العثور على رابط الدفع. يرجى المحاولة مرة أخرى.' : 'Payment redirect URL is missing. Please try again.');
        return;
      }
      window.location.href = redirectUrl;
    } catch (err) {
      if (err.response?.status === 409 && err.response?.data?.error === 'OUT_OF_STOCK') {
        const d = err.response.data;
        const impacted = checkoutItems.find((item) => Number(item.productId) === Number(d.productId));
        if (impacted) {
          setCheckoutItemIssue(
            isRTL
              ? `المنتج "${impacted.title}" غير متوفر بالكمية المطلوبة. المتاح الآن: ${d.available}`
              : `Item "${impacted.title}" is no longer available in requested quantity. Available now: ${d.available}`
          );
        }
        setError(
          isRTL
            ? 'أحد المنتجات نفد من المخزون. يرجى مراجعة السلة.'
            : 'One of the items is out of stock. Please review your cart.'
        );
      } else {
        setError(err.response?.data?.error || (isRTL ? 'فشل إنشاء الطلب' : 'Failed to create order'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: branding.background }} dir={isRTL ? 'rtl' : 'ltr'}>
      <StorefrontHeader storeSlug={storeSlug} storeInfo={storeInfo} branding={branding} />
      <div className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <div className={`mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
          <div className={`inline-flex items-center gap-2 text-xs text-gray-500 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <span>{isRTL ? 'السلة' : 'Cart'}</span>
            <span>/</span>
            <span className="font-semibold" style={{ color: branding.buttons }}>{isRTL ? 'الشحن' : 'Shipping'}</span>
            <span>/</span>
            <span>{isRTL ? 'الدفع' : 'Payment'}</span>
          </div>
        </div>
        <h1 className={`text-2xl font-semibold mb-6 ${isRTL ? 'text-right' : 'text-left'}`} style={{ color: branding.text }}>
          {isRTL ? 'إتمام الطلب' : 'Checkout'}
        </h1>

        {error && (
          <div className={`mb-4 p-3 rounded-md bg-red-50 border border-red-200 text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
            <span className="text-red-700">{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-7">
          <div className="lg:col-span-2 space-y-5">
            <AddressForm
              value={address}
              onChange={setAddress}
              isRTL={isRTL}
              lockedContactFields={isLoggedIn}
              contactHint={isLoggedIn ? contactHint : ''}
              errors={fieldErrors}
            />
            {cartReady && hasItems ? (
              <ShippingSelector
                options={shippingOptions}
                selectedId={selectedShippingId}
                onChange={setSelectedShippingId}
                isRTL={isRTL}
              />
            ) : null}
          </div>
          <div className="space-y-4 lg:sticky lg:top-24 h-fit">
            <SummaryCard
              items={checkoutItems}
              itemsTotal={quoteItemsTotal}
              shippingAmount={quote.shippingAmount}
              taxAmount={quote.taxAmount}
              grandTotal={quoteGrandTotal}
              isRTL={isRTL}
            />
            {Array.isArray(cartWarnings) && cartWarnings.length > 0 ? (
              <div className={`rounded-md border border-amber-200 bg-amber-50 p-3 ${isRTL ? 'text-right' : 'text-left'}`}>
                {cartWarnings.map((warning) => (
                  <p key={`${warning.key}-${warning.code}`} className="text-xs text-amber-800">{warning.message}</p>
                ))}
              </div>
            ) : null}
            {checkoutItemIssue ? (
              <div className={`rounded-md border border-red-200 bg-red-50 p-3 ${isRTL ? 'text-right' : 'text-left'}`}>
                <p className="text-xs text-red-700">{checkoutItemIssue}</p>
              </div>
            ) : null}
            {!isLoggedIn ? (
              <div className={`rounded-md border border-amber-200 bg-amber-50 p-3 ${isRTL ? 'text-right' : 'text-left'}`}>
                <p className="text-sm text-amber-800 mb-2">
                  {isRTL ? 'يلزم تسجيل الدخول للمتابعة إلى الدفع.' : 'Please sign in to continue to payment.'}
                </p>
                <Link to={loginHref} className="text-sm font-medium" style={{ color: branding.buttons }}>
                  {isRTL ? 'تسجيل الدخول' : 'Sign in'}
                </Link>
              </div>
            ) : null}
            {!cartReady ? (
              <p className={`text-sm text-gray-500 ${isRTL ? 'text-right' : 'text-left'}`}>
                {isRTL ? 'جاري تحميل السلة...' : 'Loading cart...'}
              </p>
            ) : null}
            {cartReady && !hasItems ? (
              <div className={`rounded-md border border-gray-200 bg-white p-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                <p className="text-sm text-gray-600 mb-3">{isRTL ? 'السلة فارغة' : 'Your cart is empty.'}</p>
                <Link to={storefrontHome} className="text-sm font-medium" style={{ color: branding.buttons }}>
                  {isRTL ? 'العودة للتسوق' : 'Continue shopping'}
                </Link>
              </div>
            ) : null}
            {missingLockedPhone ? (
              <p className={`text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                {profilePhoneMissingHint}
              </p>
            ) : null}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!selectedShippingId || submitting || loading || !cartReady || !hasItems || !isLoggedIn}
              className="cart-btn-primary w-full py-3.5 text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
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
      {storeInfo ? <StorefrontFooter storeInfo={storeInfo} branding={branding} isRTL={isRTL} /> : null}
    </div>
  );
};

export default CheckoutPage;

