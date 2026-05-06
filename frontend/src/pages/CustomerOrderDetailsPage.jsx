import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from '../router';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../api/axios';
import StorefrontHeader from '../components/StorefrontHeader';
import useStoreBranding from '../hooks/useStoreBranding';
import { buildStorefrontPath, normalizeStoreName } from '../utils/storefrontRoutes';
import CurrencyAmount from '../components/common/CurrencyAmount';
import useMediaQuery from '../hooks/useMediaQuery';
import {
  getSecondaryOrderAction,
  getCustomerPrimaryStatus,
  canSubmitOrderReview,
  isReviewLocked,
  localizeOrderStatus,
} from '../utils/orderPresentation';
import StarPicker from '../components/reviews/StarPicker';

const ORDER_STAGES = ['Processing', 'Packed', 'Shipped', 'Delivered'];
const RETURN_REASON_MIN = 10;

function getCustomerOrderDisplayNumber(order) {
  return order?.customer_order_seq || order?.order_id;
}

function StatusBadge({ value, isRTL }) {
  const normalized = String(value || '').toLowerCase();
  const className =
    normalized === 'delivered' || normalized === 'paid'
      ? 'bg-emerald-100 text-emerald-800'
      : normalized === 'processing' || normalized === 'pending' || normalized === 'packed'
      ? 'bg-amber-100 text-amber-800'
      : normalized === 'shipped'
      ? 'bg-blue-100 text-blue-800'
      : normalized === 'cancelled' || normalized === 'failed'
      ? 'bg-red-100 text-red-700'
      : 'bg-gray-100 text-gray-700';
  return <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${className}`}>{localizeOrderStatus(value, isRTL)}</span>;
}

function DetailsSkeleton() {
  return (
    <div className="space-y-4">
      {[0, 1, 2].map((idx) => (
        <div key={idx} className="bg-white border border-gray-200 rounded-xl p-5 animate-pulse">
          <div className="h-4 w-1/3 bg-gray-200 rounded mb-3" />
          <div className="h-3 w-2/3 bg-gray-200 rounded mb-2" />
          <div className="h-3 w-1/2 bg-gray-200 rounded" />
        </div>
      ))}
    </div>
  );
}

function parseShippingAddress(rawAddress) {
  if (rawAddress == null) return null;
  const value = typeof rawAddress === 'string' ? rawAddress.trim() : rawAddress;
  if (!value) return null;

  let parsed = value;
  if (typeof value === 'string') {
    try {
      parsed = JSON.parse(value);
    } catch {
      parsed = value;
    }
  }

  if (typeof parsed === 'string') {
    return {
      lines: [parsed],
      cityRegionPostal: null,
      country: null,
    };
  }
  if (!parsed || typeof parsed !== 'object') return null;

  const line1 = parsed.address_line1 || parsed.line1 || parsed.street || parsed.address || null;
  const line2 = parsed.address_line2 || parsed.line2 || parsed.district || null;
  const city = parsed.city || parsed.town || null;
  const region = parsed.region || parsed.state || parsed.province || null;
  const postalCode = parsed.postal_code || parsed.postalCode || parsed.zip || null;
  const country = parsed.country || null;

  return {
    lines: [line1, line2].filter(Boolean),
    cityRegionPostal: [city, region, postalCode].filter(Boolean).join(', ') || null,
    country: country || null,
  };
}

function textLabels(isRTL) {
  return {
    details: isRTL ? 'تفاصيل الطلب' : 'Order Details',
    fulfillment: isRTL ? 'التجهيز:' : 'Fulfillment:',
    items: isRTL ? 'العناصر' : 'Items',
    qty: isRTL ? 'الكمية' : 'Qty',
    subtotal: isRTL ? 'سعر فرعي' : 'Subtotal',
    trackingTitle: isRTL ? 'تتبع الطلب' : 'Order Tracking',
    shipmentTitle: isRTL ? 'الشحن والتتبع' : 'Shipment & Tracking',
    requestReturn: isRTL ? 'طلب إرجاع' : 'Request Return',
    cancelOrder: isRTL ? 'إلغاء الطلب' : 'Cancel Order',
    reviewHint: isRTL ? 'متاح بعد التسليم والدفع' : 'Available after paid delivered orders',
    writeReview: isRTL ? 'كتابة تقييم' : 'Write Review',
    reviewed: isRTL ? 'تم التقييم' : 'Reviewed',
    submitReview: isRTL ? 'إرسال التقييم' : 'Submit Review',
    storeReview: isRTL ? 'تقييم المتجر' : 'Store Review',
    productReview: isRTL ? 'تقييم المنتج' : 'Product Review',
    comment: isRTL ? 'التعليق' : 'Comment',
    optional: isRTL ? 'اختياري' : 'Optional',
    selectRating: isRTL ? 'اختر التقييم' : 'Select rating',
    reviewSaved: isRTL ? 'تم حفظ التقييم بنجاح' : 'Review submitted successfully',
    recipient: isRTL ? 'المستلم:' : 'Recipient:',
    phone: isRTL ? 'الهاتف:' : 'Phone:',
    address: isRTL ? 'العنوان:' : 'Address:',
    trackingNumber: isRTL ? 'رقم التتبع:' : 'Tracking Number:',
  };
}

export default function CustomerOrderDetailsPage() {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const { storeSlug, orderId } = useParams();
  const normalizedStoreSlug = normalizeStoreName(storeSlug);
  const navigate = useNavigate();
  const { storeInfo, branding } = useStoreBranding(normalizedStoreSlug);
  const [state, setState] = useState({ loading: true, error: '', order: null, actionMessage: '', actionError: '' });
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [returnFormOpen, setReturnFormOpen] = useState(false);
  const [returnReason, setReturnReason] = useState('');
  const [returnSubmitted, setReturnSubmitted] = useState(false);
  const [reviewExpanded, setReviewExpanded] = useState(false);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewDraft, setReviewDraft] = useState({ store: { rating: 0, comment: '' }, products: {} });

  const loginPath = useMemo(
    () => (normalizedStoreSlug ? buildStorefrontPath(normalizedStoreSlug, 'login') : '/customer/login'),
    [normalizedStoreSlug]
  );
  const ordersPath = normalizedStoreSlug ? buildStorefrontPath(normalizedStoreSlug, 'orders') : '/customer/orders';

  const fetchOrderDetails = async () => {
    setState((prev) => ({ ...prev, loading: true, error: '', actionError: '', actionMessage: '' }));
    try {
      const { data } = await axiosInstance.get(`/api/customers/orders/${orderId}`);
      setState((prev) => ({ ...prev, loading: false, order: data?.order || null }));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        order: null,
        error: err?.response?.data?.error || (isRTL ? 'تعذر تحميل تفاصيل الطلب' : 'Failed to load order details'),
      }));
    }
  };

  useEffect(() => {
    if (!localStorage.getItem('customer_token')) {
      navigate(loginPath, { replace: true });
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data } = await axiosInstance.get(`/api/customers/orders/${orderId}`);
        if (!cancelled) setState((prev) => ({ ...prev, loading: false, order: data?.order || null }));
      } catch (err) {
        if (!cancelled) {
          setState((prev) => ({
            ...prev,
            loading: false,
            order: null,
            error: err?.response?.data?.error || (isRTL ? 'تعذر تحميل تفاصيل الطلب' : 'Failed to load order details'),
          }));
        }
      }
    })();
    return () => { cancelled = true; };
  }, [orderId, loginPath, navigate, isRTL]);

  const trackingValue = state.order?.shipping?.tracking_number || null;
  const formattedAddress = parseShippingAddress(state.order?.shipping?.shipping_address);
  const text = textLabels(isRTL);
  const primaryStatus = getCustomerPrimaryStatus(state.order);
  const currentStatus = localizeOrderStatus(state.order?.fulfillment_status, false);
  const stageIndex = ORDER_STAGES.findIndex((stage) => stage.toLowerCase() === String(currentStatus).toLowerCase());
  const canReview = canSubmitOrderReview(state.order);
  const reviewCompleted = isReviewLocked(state.order);
  const secondaryAction = getSecondaryOrderAction(state.order, isRTL);

  useEffect(() => {
    if (!state.order) return;
    const fallbackTargetsMap = new Map();
    (state.order.items || []).forEach((item) => {
      const productId = Number(item?.product_id);
      if (!Number.isFinite(productId) || fallbackTargetsMap.has(productId)) return;
      fallbackTargetsMap.set(productId, {
        product_id: productId,
        product_name: item.product_name || 'Product',
        reviewed: Boolean(item.review),
      });
    });
    const effectiveTargets = (state.order.review_targets && state.order.review_targets.length > 0)
      ? state.order.review_targets
      : Array.from(fallbackTargetsMap.values());

    const initialProducts = {};
    effectiveTargets.forEach((target) => {
      const productReview = (state.order.items || []).find((item) => item.product_id === target.product_id)?.review || null;
      initialProducts[target.product_id] = {
        rating: productReview?.rating || 0,
        comment: productReview?.comment || '',
        reviewed: Boolean(target.reviewed || productReview),
        product_name: target.product_name,
      };
    });
    setReviewDraft({
      store: {
        rating: state.order.review_state?.store_review?.rating || 0,
        comment: state.order.review_state?.store_review?.comment || '',
        reviewed: Boolean(state.order.review_state?.store_review),
      },
      products: initialProducts,
    });
  }, [state.order]);

  const submitAction = async (type, reasonOverride = '') => {
    setState((prev) => ({ ...prev, actionError: '', actionMessage: '' }));
    try {
      const payload = type === 'cancel'
          ? { reason: 'Customer requested cancellation' }
          : { reason: reasonOverride.trim() };
      const endpoint = type === 'cancel' ? 'cancel-request' : 'return-request';
      const fallbackMessage = type === 'cancel'
          ? (isRTL ? 'تم إلغاء الطلب' : 'Order cancelled')
          : (isRTL ? 'تم إرسال طلب الإرجاع' : 'Return request submitted.');
      const { data } = await axiosInstance.post(`/api/customers/orders/${orderId}/${endpoint}`, payload);
      setState((prev) => ({
        ...prev,
        actionMessage: type === 'return'
          ? (isRTL ? 'تم إرسال طلب الإرجاع' : 'Return request submitted.')
          : (data?.message || fallbackMessage),
        order: type === 'cancel' && prev.order
          ? { ...prev.order, fulfillment_status: 'Cancelled', display_status: 'Cancelled' }
          : prev.order,
      }));
      if (type === 'cancel') {
        setCancelConfirmOpen(false);
      } else {
        setReturnFormOpen(false);
        setReturnSubmitted(true);
        setReturnReason('');
      }
    } catch (err) {
      setState((prev) => ({ ...prev, actionError: err?.response?.data?.error || (isRTL ? 'تعذر إرسال الطلب' : 'Failed to submit request') }));
    }
  };

  const submitReview = async () => {
    setState((prev) => ({ ...prev, actionError: '', actionMessage: '' }));
    const storeReview = !reviewDraft.store.reviewed && reviewDraft.store.rating && reviewDraft.store.comment.trim()
      ? { rating: Number(reviewDraft.store.rating), comment: reviewDraft.store.comment.trim() }
      : null;
    const productReviews = Object.entries(reviewDraft.products || {})
      .map(([productId, value]) => ({
        productId: Number(productId),
        rating: value?.rating ? Number(value.rating) : null,
        comment: (value?.comment || '').trim(),
        reviewed: Boolean(value?.reviewed),
      }))
      .filter((entry) => !entry.reviewed && Number.isInteger(entry.rating) && entry.comment);
    const productReviewsPayload = productReviews.map(({ reviewed, ...rest }) => rest);
    const allTargetsAlreadyReviewed = Boolean(reviewDraft.store.reviewed)
      && Object.values(reviewDraft.products || {}).every((entry) => Boolean(entry?.reviewed));

    if (!storeReview && productReviewsPayload.length === 0) {
      setState((prev) => ({
        ...prev,
        actionError: allTargetsAlreadyReviewed
          ? (isRTL ? 'تم تقييم جميع عناصر الطلب مسبقاً' : 'All review targets for this order are already reviewed.')
          : (isRTL ? 'أدخل تقييمًا واحدًا على الأقل (المنتج أو المتجر)' : 'Enter at least one review (store or product)'),
      }));
      return;
    }

    setReviewSubmitting(true);
    try {
      await axiosInstance.post(`/api/customers/orders/${orderId}/review`, { storeReview, productReviews: productReviewsPayload });
      await fetchOrderDetails();
      setReviewExpanded(false);
      setState((prev) => ({ ...prev, actionMessage: text.reviewSaved, actionError: '' }));
    } catch (err) {
      if (err?.response?.data?.code === 'ALREADY_REVIEWED') {
        await fetchOrderDetails();
        setReviewExpanded(false);
        setState((prev) => ({
          ...prev,
          actionError: isRTL ? 'تم تقييم هذا العنصر مسبقاً' : 'This review target was already submitted.',
        }));
        return;
      }
      setState((prev) => ({
        ...prev,
        actionError: err?.response?.data?.error || (isRTL ? 'تعذر إرسال التقييم' : 'Failed to submit review'),
      }));
    } finally {
      setReviewSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: branding.background }} dir={isRTL ? 'rtl' : 'ltr'}>
      <StorefrontHeader storeSlug={normalizedStoreSlug} storeInfo={storeInfo} branding={branding} />
      <div className={`max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 ${isRTL ? 'rtl-page-fix' : ''}`}>
        <div className={`mb-6 ${isRTL ? 'text-right' : 'text-left'}`}>
          <Link to={ordersPath} className="text-sm font-medium" style={{ color: branding.buttons }}>
            {isRTL ? 'العودة لسجل الطلبات' : 'Back to Order History'}
          </Link>
        </div>

        {state.loading ? (
          <DetailsSkeleton />
        ) : state.error || !state.order ? (
          <div className={`bg-white border border-red-200 rounded-xl p-6 ${isRTL ? 'text-right' : 'text-left'}`}>
            <p className="text-red-600 mb-3">{state.error || (isRTL ? 'تعذر العثور على الطلب' : 'Order details could not be retrieved')}</p>
            <button type="button" onClick={fetchOrderDetails} className="px-4 py-2 rounded-lg bg-storelaunch-green text-white text-sm font-medium">
              {isRTL ? 'إعادة المحاولة' : 'Retry'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {state.actionMessage ? <div className="p-3 rounded-lg bg-emerald-50 text-emerald-700 text-sm">{state.actionMessage}</div> : null}
            {state.actionError ? <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">{state.actionError}</div> : null}

            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <div className={`flex items-start justify-between gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className={`${isRTL ? 'text-right' : 'text-left'}`}>
                  <h1 className="text-xl font-bold" style={{ color: branding.text }}>
                    {text.details} #{getCustomerOrderDisplayNumber(state.order)}
                  </h1>
                  <p className="text-sm text-gray-500 mt-1">
                    {new Date(state.order.order_date).toLocaleString(isRTL ? 'ar-SA' : 'en-US')}
                  </p>
                </div>
                <div className={`${isRTL ? 'text-right' : 'text-right'} shrink-0`}>
                  <p className={`text-sm text-gray-600 mb-1 inline-flex items-center gap-1.5 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <bdi>{isRTL ? 'الحالة:' : 'Status:'}</bdi> <StatusBadge value={primaryStatus} isRTL={isRTL} />
                  </p>
                  <p className={`text-sm text-gray-600 mb-1 inline-flex items-center gap-1.5 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <bdi>{text.fulfillment}</bdi> <StatusBadge value={state.order.fulfillment_status} isRTL={isRTL} />
                  </p>
                  <p className="text-lg font-bold mt-1" style={{ color: branding.priceLabels || branding.buttons }}>
                    <CurrencyAmount value={state.order.total_amount || 0} isRTL={isRTL} size="xl" />
                  </p>
                </div>
              </div>
            </div>

            <div className={`bg-white border border-gray-200 rounded-xl p-5 ${isRTL ? 'text-right' : 'text-left'}`}>
              <h2 className="text-lg font-semibold mb-3" style={{ color: branding.text }}>
                {text.items}
              </h2>
              <div className="space-y-3">
                {(state.order.items || []).map((item) => (
                  <div key={item.order_item_id} className={`flex items-center justify-between gap-3 ${isRTL ? 'flex-row-reverse' : ''}`} data-testid="order-item-row">
                    <div className={`flex items-center gap-3 min-w-0 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <div className="w-12 h-12 rounded-lg overflow-hidden border border-gray-200 bg-gray-50 flex items-center justify-center">
                        {item.image_url ? (
                          <img src={item.image_url} alt={item.product_name} className="w-full h-full object-cover" />
                        ) : (
                          <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M4 7h16M7 4v3m10-3v3M6 20h12a2 2 0 002-2V7H4v11a2 2 0 002 2z" />
                          </svg>
                        )}
                      </div>
                      <div className={`min-w-0 ${isRTL ? 'text-right' : 'text-left'}`}>
                        <p className="font-medium" style={{ color: branding.text }}>{item.product_name}</p>
                        <p className="text-xs text-gray-500">
                          {item.option_name && item.option_value ? `${item.option_name}: ${item.option_value} - ` : ''}
                          {text.qty}: {item.quantity}
                        </p>
                      </div>
                    </div>
                    <div className={`${isRTL ? 'text-left' : 'text-right'} shrink-0`}>
                      <p className="text-xs text-gray-500">{text.subtotal}</p>
                      <p className="text-sm font-semibold text-gray-800">
                        <CurrencyAmount value={item.subtotal || 0} isRTL={isRTL} />
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className={`bg-white border border-gray-200 rounded-xl p-5 ${isRTL ? 'text-right' : 'text-left'}`}>
              <h2 className="text-lg font-semibold mb-3" style={{ color: branding.text }}>
                {text.trackingTitle}
              </h2>
              {['Cancelled', 'Failed'].includes(currentStatus) ? (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-700 text-sm">
                  {isRTL ? 'تم إيقاف هذا الطلب ولا توجد مراحل شحن إضافية.' : 'This order has been stopped and no further shipping stages are available.'}
                </div>
              ) : (
                <ol className={`space-y-3 ${isRTL ? 'text-right' : 'text-left'}`} data-testid="order-timeline">
                  {ORDER_STAGES.map((stage, idx) => {
                    const active = stageIndex >= idx;
                    return (
                      <li key={stage} className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
                        <span className={`w-7 h-7 rounded-full inline-flex items-center justify-center text-xs font-bold ${active ? 'bg-storelaunch-green text-white' : 'bg-gray-200 text-gray-500'}`}>
                          {idx + 1}
                        </span>
                        <span className={`text-sm ${active ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>{localizeOrderStatus(stage, isRTL)}</span>
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>

            <div className={`bg-white border border-gray-200 rounded-xl p-5 ${isRTL ? 'text-right' : 'text-left'}`} data-testid="tracking-section">
              <h2 className="text-lg font-semibold mb-3" style={{ color: branding.text }}>
                {text.shipmentTitle}
              </h2>
              {state.order.shipping ? (
                <div className={`space-y-2 text-sm text-gray-700 ${isRTL ? 'text-right' : 'text-left'}`}>
                  <p><span className="font-medium">{text.recipient}</span> {state.order.shipping.shipping_name || '—'}</p>
                  <p><span className="font-medium">{text.phone}</span> {state.order.shipping.shipping_phone || '—'}</p>
                  <div>
                    <p className="font-medium">{text.address}</p>
                    {formattedAddress ? (
                      <div className="mt-1 space-y-0.5 text-gray-600">
                        {formattedAddress.lines.map((line) => (
                          <p key={line}>{line}</p>
                        ))}
                        {formattedAddress.cityRegionPostal ? <p>{formattedAddress.cityRegionPostal}</p> : null}
                        {formattedAddress.country ? <p>{formattedAddress.country}</p> : null}
                      </div>
                    ) : (
                      <p className="mt-1 text-gray-600">—</p>
                    )}
                  </div>
                  {trackingValue ? (
                    <p className="text-sm">
                      <span className="font-medium">{text.trackingNumber}</span> {trackingValue}
                    </p>
                  ) : (
                    <p className="text-sm text-gray-500">{isRTL ? 'معلومات التتبع غير متاحة بعد.' : 'Tracking information is not yet available.'}</p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-500">{isRTL ? 'لا توجد معلومات شحن حتى الآن.' : 'Shipment info is not available yet.'}</p>
              )}
            </div>

            <div className={`bg-white border border-gray-200 rounded-xl p-5 ${isRTL ? 'text-right' : 'text-left'}`}>
              <h2 className="text-lg font-semibold mb-3" style={{ color: branding.text }}>
                {isRTL ? 'إجراءات الطلب' : 'Order Actions'}
              </h2>
              <div
                className={`flex gap-2 ${isRTL ? 'flex-row-reverse justify-end' : ''} ${isDesktop ? '' : 'flex-wrap'}`}
                data-testid="details-actions-row"
              >
                <button
                  type="button"
                  onClick={() => setReviewExpanded((prev) => !prev)}
                  disabled={!canReview || reviewCompleted}
                  title={!canReview ? text.reviewHint : ''}
                  className={`h-10 px-4 rounded-lg text-sm font-medium border inline-flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-gray-300 ${canReview ? 'border-gray-300 text-gray-700 hover:bg-gray-50' : 'border-gray-200 text-gray-400 cursor-not-allowed'}`}
                >
                  {reviewCompleted ? text.reviewed : text.writeReview}
                </button>
                {!(
                  (secondaryAction.type === 'cancel' && !secondaryAction.enabled)
                  || returnSubmitted
                ) ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (!secondaryAction.enabled) return;
                      if (secondaryAction.type === 'cancel') {
                        setCancelConfirmOpen(true);
                        setReturnFormOpen(false);
                        setReturnReason('');
                        return;
                      }
                      setReturnFormOpen(true);
                      setCancelConfirmOpen(false);
                    }}
                    disabled={!secondaryAction.enabled}
                    title={secondaryAction.enabled ? '' : secondaryAction.hint}
                    className={`h-10 px-4 rounded-lg border text-sm font-medium inline-flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-gray-300 ${
                      secondaryAction.enabled ? 'border-gray-300 text-gray-700 hover:bg-gray-50' : 'border-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {secondaryAction.label}
                  </button>
                ) : null}
              </div>
              {cancelConfirmOpen ? (
                <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3">
                  <p className="text-sm text-red-700 mb-2">
                    {isRTL ? 'هل أنت متأكد من إلغاء هذا الطلب؟' : 'Are you sure you want to cancel this order?'}
                  </p>
                  <div className={`flex gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <button
                      type="button"
                      className="h-9 px-3 rounded-lg bg-red-600 text-white text-sm font-medium"
                      onClick={() => submitAction('cancel')}
                    >
                      {isRTL ? 'نعم، إلغاء الطلب' : 'Yes, Cancel Order'}
                    </button>
                    <button
                      type="button"
                      className="h-9 px-3 rounded-lg border border-gray-300 text-sm font-medium"
                      onClick={() => setCancelConfirmOpen(false)}
                    >
                      {isRTL ? 'الاحتفاظ بالطلب' : 'Keep Order'}
                    </button>
                  </div>
                </div>
              ) : null}
              {returnFormOpen ? (
                <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <label className="text-sm font-medium text-gray-700 block mb-1">
                    {isRTL ? 'سبب الإرجاع' : 'Reason for return'}
                  </label>
                  <textarea
                    value={returnReason}
                    onChange={(e) => setReturnReason(e.target.value)}
                    rows={3}
                    className="w-full rounded-lg border border-gray-300 p-2 text-sm"
                  />
                  <div className={`mt-2 flex gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <button
                      type="button"
                      className="h-9 px-3 rounded-lg bg-storelaunch-green text-white text-sm font-medium disabled:opacity-60"
                      disabled={returnReason.trim().length < RETURN_REASON_MIN}
                      onClick={() => submitAction('return', returnReason)}
                    >
                      {isRTL ? 'إرسال طلب الإرجاع' : 'Submit Return Request'}
                    </button>
                    <button
                      type="button"
                      className="h-9 px-3 rounded-lg border border-gray-300 text-sm font-medium"
                      onClick={() => {
                        setReturnFormOpen(false);
                        setReturnReason('');
                      }}
                    >
                      {isRTL ? 'إلغاء' : 'Cancel'}
                    </button>
                  </div>
                </div>
              ) : null}
              {canReview && !reviewCompleted && reviewExpanded ? (
                <div className="mt-4 border-t border-gray-100 pt-4 space-y-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-2">{text.storeReview}</p>
                    <div className={`grid gap-2 ${isDesktop ? 'grid-cols-2' : 'grid-cols-1'}`}>
                      <StarPicker
                        value={reviewDraft.store.rating}
                        onChange={(rating) => setReviewDraft((prev) => ({
                          ...prev,
                          store: { ...prev.store, rating },
                        }))}
                        isRTL={isRTL}
                        accentColor={branding.buttons}
                        label={text.selectRating}
                        disabled={reviewDraft.store.reviewed}
                      />
                      <input
                        value={reviewDraft.store.comment}
                        onChange={(e) => setReviewDraft((prev) => ({
                          ...prev,
                          store: { ...prev.store, comment: e.target.value },
                        }))}
                        placeholder={`${text.comment} (${text.optional})`}
                        className="h-10 px-3 rounded-lg border border-gray-300 text-sm"
                        disabled={reviewDraft.store.reviewed}
                      />
                    </div>
                    {reviewDraft.store.reviewed ? (
                      <p className="mt-1 text-xs text-emerald-600">{text.reviewed}</p>
                    ) : null}
                  </div>
                  {Object.entries(reviewDraft.products || {}).map(([productId, itemDraft]) => (
                    <div key={`review-${productId}`}>
                      <p className="text-sm font-semibold text-gray-700 mb-2">{text.productReview}: {itemDraft.product_name || 'Product'}</p>
                      <div className={`grid gap-2 ${isDesktop ? 'grid-cols-2' : 'grid-cols-1'}`}>
                        <StarPicker
                          value={reviewDraft.products?.[productId]?.rating || 0}
                          onChange={(rating) => setReviewDraft((prev) => ({
                            ...prev,
                            products: {
                              ...prev.products,
                              [productId]: {
                                ...(prev.products?.[productId] || { comment: '', reviewed: false }),
                                rating,
                              },
                            },
                          }))}
                          isRTL={isRTL}
                          accentColor={branding.buttons}
                          label={text.selectRating}
                          disabled={itemDraft.reviewed}
                        />
                        <input
                          value={reviewDraft.products?.[productId]?.comment || ''}
                          onChange={(e) => setReviewDraft((prev) => ({
                            ...prev,
                            products: {
                              ...prev.products,
                              [productId]: {
                                ...(prev.products?.[productId] || { rating: 0, reviewed: false }),
                                comment: e.target.value,
                              },
                            },
                          }))}
                          placeholder={`${text.comment} (${text.optional})`}
                          className="h-10 px-3 rounded-lg border border-gray-300 text-sm"
                          disabled={itemDraft.reviewed}
                        />
                      </div>
                      {itemDraft.reviewed ? (
                        <p className="mt-1 text-xs text-emerald-600">{text.reviewed}</p>
                      ) : null}
                    </div>
                  ))}
                  <div>
                    <button
                      type="button"
                      onClick={submitReview}
                      disabled={reviewSubmitting}
                      className="h-10 px-4 rounded-lg text-sm font-medium text-white bg-storelaunch-green hover:bg-storelaunch-deep-green disabled:opacity-60"
                    >
                      {text.submitReview}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
