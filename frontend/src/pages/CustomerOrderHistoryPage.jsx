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
  formatItemCount,
  getSecondaryOrderAction,
  getCustomerPrimaryStatus,
  canSubmitOrderReview,
  isReviewLocked,
  localizeOrderStatus,
} from '../utils/orderPresentation';

const STATUS_STYLES = {
  delivered: 'bg-emerald-100 text-emerald-800',
  paid: 'bg-emerald-100 text-emerald-800',
  processing: 'bg-amber-100 text-amber-800',
  pending: 'bg-amber-100 text-amber-800',
  shipped: 'bg-blue-100 text-blue-800',
  cancelled: 'bg-red-100 text-red-700',
  failed: 'bg-red-100 text-red-700',
  refunded: 'bg-purple-100 text-purple-700',
  returned: 'bg-purple-100 text-purple-700',
};

function statusChipClass(value = '') {
  const normalized = String(value || '').trim().toLowerCase();
  return STATUS_STYLES[normalized] || 'bg-gray-100 text-gray-700';
}

function OrderSkeleton({ isDesktop }) {
  if (isDesktop) {
    return (
      <div className="p-4 border-b border-gray-100 animate-pulse">
        <div className={`grid ${DESKTOP_COLUMNS_CLASS} gap-3 items-center`}>
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-lg bg-gray-200" />
            <div className="space-y-2 flex-1">
              <div className="h-3 w-2/3 rounded bg-gray-200" />
              <div className="h-3 w-1/3 rounded bg-gray-200" />
            </div>
          </div>
          <div className="h-3 bg-gray-200 rounded" />
          <div className="h-3 bg-gray-200 rounded" />
          <div className="h-9 w-[18rem] bg-gray-200 rounded" />
        </div>
      </div>
    );
  }
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 animate-pulse">
      <div className="h-4 w-1/2 bg-gray-200 rounded mb-3" />
      <div className="h-3 w-2/3 bg-gray-200 rounded mb-2" />
      <div className="h-3 w-1/3 bg-gray-200 rounded" />
    </div>
  );
}

function labels(isRTL) {
  return {
    backToStore: isRTL ? 'العودة للمتجر' : 'Back to Store',
    title: isRTL ? 'سجل الطلبات' : 'Order History',
    searchPlaceholder: isRTL ? 'ابحث برقم الطلب' : 'Search by order #',
    searchAria: isRTL ? 'بحث الطلبات' : 'Search orders',
    filterStatusAria: isRTL ? 'تصفية الحالة' : 'Filter status',
    sortAria: isRTL ? 'ترتيب الطلبات' : 'Sort orders',
    allStatuses: isRTL ? 'كل الحالات' : 'All statuses',
    processing: isRTL ? 'قيد المعالجة' : 'Processing',
    shipped: isRTL ? 'تم الشحن' : 'Shipped',
    delivered: isRTL ? 'تم التسليم' : 'Delivered',
    cancelled: isRTL ? 'ملغي' : 'Cancelled',
    newest: isRTL ? 'الأحدث' : 'Newest first',
    oldest: isRTL ? 'الأقدم' : 'Oldest first',
    retry: isRTL ? 'إعادة المحاولة' : 'Retry',
    noMatching: isRTL ? 'لا توجد طلبات مطابقة' : 'No matching orders found',
    noMatchingDesc: isRTL ? 'يمكنك تعديل عوامل التصفية أو متابعة التسوق.' : 'Try changing filters or continue shopping.',
    backToShopping: isRTL ? 'العودة للتسوق' : 'Back to Store',
    order: isRTL ? 'الطلب' : 'Order',
    status: isRTL ? 'الحالة' : 'Status',
    total: isRTL ? 'الإجمالي' : 'Total',
    actions: isRTL ? 'الإجراءات' : 'Actions',
    details: isRTL ? 'التفاصيل' : 'Details',
    trackOrder: isRTL ? 'تتبع الطلب' : 'Track Order',
    review: isRTL ? 'تقييم' : 'Review',
    reviewed: isRTL ? 'تم التقييم' : 'Reviewed',
    reviewHint: isRTL ? 'متاح بعد تسليم الطلب ودفعه' : 'Available after paid delivered orders',
    primaryProductFallback: isRTL ? 'منتجات متعددة' : 'Multiple items',
  };
}

const DESKTOP_ACTION_BUTTON_CLASS =
  'h-8 w-full px-2 rounded-md text-[11px] font-medium border inline-flex items-center justify-center whitespace-nowrap leading-none focus:outline-none focus:ring-2';
const MOBILE_ACTION_BUTTON_CLASS =
  'h-9 min-w-[6.75rem] px-3 rounded-lg text-sm font-medium border inline-flex items-center justify-center whitespace-nowrap leading-none focus:outline-none focus:ring-2';
const DESKTOP_COLUMNS_CLASS = 'grid-cols-[minmax(0,1fr)_8.75rem_8.75rem_18.5rem]';
const DESKTOP_ACTION_CELL_CLASS = 'w-[18.5rem]';
const DESKTOP_ACTION_GROUP_CLASS = 'grid grid-cols-3 gap-1.5 w-full';
const RETURN_REASON_MIN = 10;

function getCustomerOrderDisplayNumber(order) {
  return order?.customer_order_seq || order?.order_id;
}

function ReviewActionButton({ orderId, reviewAllowed, label, text, isRTL, onClick }) {
  const tooltipId = `review-hint-${orderId}`;
  return (
    <span
      className="relative inline-flex w-full group"
      tabIndex={reviewAllowed ? -1 : 0}
      aria-describedby={reviewAllowed ? undefined : tooltipId}
    >
      <button
        type="button"
        onClick={onClick}
        disabled={!reviewAllowed}
        data-testid={`review-order-${orderId}`}
        className={`${DESKTOP_ACTION_BUTTON_CLASS} focus:ring-gray-300 ${reviewAllowed ? 'border-gray-300 text-gray-700 hover:bg-gray-50' : 'border-gray-200 text-gray-400 cursor-not-allowed'}`}
      >
        {label}
      </button>
      {!reviewAllowed ? (
        <span
          id={tooltipId}
          role="tooltip"
          className={`pointer-events-none absolute bottom-full mb-2 z-20 whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-[11px] font-medium text-white opacity-0 shadow transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100 ${isRTL ? 'right-0' : 'left-0'}`}
        >
          {text.reviewHint}
        </span>
      ) : null}
    </span>
  );
}

export default function CustomerOrderHistoryPage() {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const text = labels(isRTL);
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const { storeSlug } = useParams();
  const normalizedStoreSlug = normalizeStoreName(storeSlug);
  const navigate = useNavigate();
  const { storeInfo, branding } = useStoreBranding(normalizedStoreSlug);
  const [state, setState] = useState({ loading: true, error: '', orders: [], actionMessage: '', actionError: '' });
  const [cancelConfirmOrderId, setCancelConfirmOrderId] = useState(null);
  const [returnDraft, setReturnDraft] = useState({ orderId: null, reason: '' });
  const [returnSubmittedMap, setReturnSubmittedMap] = useState({});
  const [filters, setFilters] = useState({
    status: 'all',
    sort: 'newest',
    search: '',
  });

  const loginPath = useMemo(
    () => (normalizedStoreSlug ? buildStorefrontPath(normalizedStoreSlug, 'login') : '/customer/login'),
    [normalizedStoreSlug]
  );
  const storefrontHome = normalizedStoreSlug ? buildStorefrontPath(normalizedStoreSlug) : '/';

  const fetchOrders = async () => {
    setState((prev) => ({ ...prev, loading: true, error: '', actionMessage: '', actionError: '' }));
    try {
      const { data } = await axiosInstance.get('/api/customers/orders?page=1&limit=25');
      setState((prev) => ({ ...prev, loading: false, error: '', orders: data?.orders || [] }));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err?.response?.data?.error || (isRTL ? 'تعذر تحميل الطلبات' : 'Failed to load orders'),
        orders: [],
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
        const { data } = await axiosInstance.get('/api/customers/orders?page=1&limit=25');
        if (!cancelled) {
          setState((prev) => ({ ...prev, loading: false, error: '', orders: data?.orders || [] }));
        }
      } catch (err) {
        if (!cancelled) {
          setState((prev) => ({
            ...prev,
            loading: false,
            error: err?.response?.data?.error || (isRTL ? 'تعذر تحميل الطلبات' : 'Failed to load orders'),
            orders: [],
          }));
        }
      }
    })();
    return () => { cancelled = true; };
  }, [navigate, loginPath, isRTL]);

  const filteredOrders = useMemo(() => {
    let rows = [...state.orders];
    if (filters.status !== 'all') {
      rows = rows.filter((order) => String(order.fulfillment_status || '').toLowerCase() === filters.status);
    }
    if (filters.search.trim()) {
      const needle = filters.search.trim().toLowerCase();
      rows = rows.filter((order) => String(getCustomerOrderDisplayNumber(order)).toLowerCase().includes(needle));
    }
    rows.sort((a, b) => {
      const aTime = new Date(a.order_date).getTime();
      const bTime = new Date(b.order_date).getTime();
      return filters.sort === 'oldest' ? aTime - bTime : bTime - aTime;
    });
    return rows;
  }, [state.orders, filters]);

  const submitAction = async (orderId, type, reasonOverride = '') => {
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
        orders: prev.orders.map((order) => (
          order.order_id === orderId && type === 'cancel'
            ? { ...order, fulfillment_status: 'Cancelled', display_status: 'Cancelled' }
            : order
        )),
      }));
      if (type === 'cancel') {
        setCancelConfirmOrderId(null);
      } else {
        setReturnSubmittedMap((prev) => ({ ...prev, [orderId]: true }));
        setReturnDraft({ orderId: null, reason: '' });
      }
    } catch (err) {
      setState((prev) => ({
        ...prev,
        actionError: err?.response?.data?.error || (isRTL ? 'تعذر إرسال الطلب' : 'Failed to submit request'),
      }));
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: branding.background }} dir={isRTL ? 'rtl' : 'ltr'}>
      <StorefrontHeader storeSlug={normalizedStoreSlug} storeInfo={storeInfo} branding={branding} />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className={`mb-6 ${isRTL ? 'text-right' : 'text-left'}`}>
          <Link to={storefrontHome} className="text-sm font-medium" style={{ color: branding.buttons }}>
            {text.backToStore}
          </Link>
          <h1 className="text-2xl font-bold mt-2" style={{ color: branding.text }}>
            {text.title}
          </h1>
        </div>

        <div className={`bg-white border border-gray-200 rounded-xl p-3 mb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 ${isRTL ? 'text-right' : 'text-left'}`}>
          <input
            value={filters.search}
            onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
            placeholder={text.searchPlaceholder}
            className={`h-9 px-3 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-storelaunch-green ${isRTL ? 'text-right' : 'text-left'}`}
            aria-label={text.searchAria}
          />
          <select
            value={filters.status}
            onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
            className="h-9 px-3 rounded-lg border border-gray-300 text-sm bg-white"
            aria-label={text.filterStatusAria}
          >
            <option value="all">{text.allStatuses}</option>
            <option value="processing">{text.processing}</option>
            <option value="shipped">{text.shipped}</option>
            <option value="delivered">{text.delivered}</option>
            <option value="cancelled">{text.cancelled}</option>
          </select>
          <select
            value={filters.sort}
            onChange={(e) => setFilters((prev) => ({ ...prev, sort: e.target.value }))}
            className="h-9 px-3 rounded-lg border border-gray-300 text-sm bg-white"
            aria-label={text.sortAria}
          >
            <option value="newest">{text.newest}</option>
            <option value="oldest">{text.oldest}</option>
          </select>
        </div>

        {state.actionMessage ? <div className="mb-3 p-3 rounded-lg bg-emerald-50 text-emerald-700 text-sm">{state.actionMessage}</div> : null}
        {state.actionError ? <div className="mb-3 p-3 rounded-lg bg-red-50 text-red-700 text-sm">{state.actionError}</div> : null}

        {state.loading ? (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            {[0, 1, 2].map((i) => <OrderSkeleton key={i} isDesktop={isDesktop} />)}
          </div>
        ) : state.error ? (
          <div className={`bg-white border border-red-200 rounded-xl p-6 ${isRTL ? 'text-right' : 'text-left'}`}>
            <p className="text-red-600 mb-3">{state.error}</p>
            <button type="button" onClick={fetchOrders} className="px-4 py-2 rounded-lg bg-storelaunch-green text-white text-sm font-medium">
              {text.retry}
            </button>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
            <div className="w-14 h-14 rounded-full bg-gray-100 mx-auto mb-3 flex items-center justify-center">
              <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a3 3 0 006 0M9 5a3 3 0 016 0M9 12h6m-6 4h4" />
              </svg>
            </div>
            <p className="text-gray-700 font-medium mb-1">{text.noMatching}</p>
            <p className="text-sm text-gray-500 mb-4">{text.noMatchingDesc}</p>
            <Link to={storefrontHome} className="inline-flex px-4 py-2 rounded-lg text-sm font-medium text-white bg-storelaunch-green">
              {text.backToShopping}
            </Link>
          </div>
        ) : (
          <>
            {isDesktop ? (
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                <div className={`grid ${DESKTOP_COLUMNS_CLASS} gap-3 px-4 py-3 text-xs uppercase tracking-wide text-gray-500 border-b border-gray-100 ${isRTL ? 'text-right' : 'text-left'}`}>
                  <div>{text.order}</div>
                  <div className={isRTL ? 'text-right' : 'text-left'}>{text.status}</div>
                  <div className={isRTL ? 'text-right' : 'text-left'}>{text.total}</div>
                  <div className={`${DESKTOP_ACTION_CELL_CLASS} ${isRTL ? 'text-right' : 'text-left'}`}>{text.actions}</div>
                </div>
                <div className="divide-y divide-gray-100">
                  {filteredOrders.map((order) => {
                    const reviewCompleted = isReviewLocked(order);
                    const reviewAllowed = canSubmitOrderReview(order);
                    const secondaryAction = getSecondaryOrderAction(order, isRTL);
                    const primaryStatus = getCustomerPrimaryStatus(order);
                    return (
                      <div key={order.order_id} className="px-4 py-3">
                        <div className={`grid ${DESKTOP_COLUMNS_CLASS} gap-3 items-center ${isRTL ? 'text-right' : 'text-left'}`}>
                          <div className={`min-w-0 flex items-center gap-3 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
                            <div className="relative w-14 h-14 shrink-0">
                              <div className="w-14 h-14 rounded-lg overflow-hidden border border-gray-200 bg-gray-50 flex items-center justify-center">
                                {order.primary_image_url ? (
                                  <img src={order.primary_image_url} alt={order.primary_product_name || 'product'} className="w-full h-full object-cover" />
                                ) : (
                                  <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M4 7h16M7 4v3m10-3v3M6 20h12a2 2 0 002-2V7H4v11a2 2 0 002 2z" />
                                  </svg>
                                )}
                              </div>
                              {(order.item_count || 0) > 1 ? (
                                <span
                                  data-testid={`order-badge-${order.order_id}`}
                                  className={`absolute -bottom-1.5 px-1.5 py-0.5 min-w-[1.5rem] rounded-full text-[10px] leading-4 text-center font-semibold bg-gray-900 text-white shadow-sm ${isRTL ? '-left-1.5' : '-right-1.5'}`}
                                >
                                  +{(order.item_count || 0) - 1}
                                </span>
                              ) : null}
                            </div>
                            <div className={`min-w-0 ${isRTL ? 'text-right' : 'text-left'}`}>
                              <p className="text-sm font-semibold truncate" style={{ color: branding.text }}>
                                #{getCustomerOrderDisplayNumber(order)} - {order.primary_product_name || text.primaryProductFallback}
                              </p>
                              <p className="text-xs text-gray-500 truncate">
                                {new Date(order.order_date).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US')} - {formatItemCount(order.item_count || 0, isRTL)}
                              </p>
                              <p className="text-xs text-gray-500 truncate">{isRTL ? 'الدفع:' : 'Payment:'} {localizeOrderStatus(order.payment_status, isRTL)}</p>
                            </div>
                          </div>
                          <div className={isRTL ? 'text-right' : 'text-left'}>
                            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${statusChipClass(primaryStatus)}`}>
                              {localizeOrderStatus(primaryStatus, isRTL)}
                            </span>
                          </div>
                          <div className={`text-sm font-semibold ${isRTL ? 'text-right' : 'text-left'}`} style={{ color: branding.priceLabels || branding.buttons }}>
                            <CurrencyAmount value={order.total_amount || 0} isRTL={isRTL} />
                          </div>
                          <div className={DESKTOP_ACTION_CELL_CLASS}>
                            <div className={DESKTOP_ACTION_GROUP_CLASS} style={{ direction: isRTL ? 'rtl' : 'ltr' }}>
                              <Link
                                to={buildStorefrontPath(normalizedStoreSlug, `orders/${order.order_id}`)}
                                data-testid={`track-order-${order.order_id}`}
                                className={`${DESKTOP_ACTION_BUTTON_CLASS} text-white bg-storelaunch-green border-storelaunch-green hover:bg-storelaunch-deep-green focus:ring-storelaunch-green`}
                              >
                                {text.trackOrder}
                              </Link>
                              <ReviewActionButton
                                orderId={order.order_id}
                                reviewAllowed={reviewAllowed}
                                label={reviewCompleted ? text.reviewed : text.review}
                                text={text}
                                isRTL={isRTL}
                                onClick={() => navigate(buildStorefrontPath(normalizedStoreSlug, `orders/${order.order_id}`))}
                              />
                              {!(
                                (secondaryAction.type === 'cancel' && !secondaryAction.enabled)
                                || returnSubmittedMap[order.order_id]
                              ) ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (!secondaryAction.enabled) return;
                                    if (secondaryAction.type === 'cancel') {
                                      setCancelConfirmOrderId(order.order_id);
                                      setReturnDraft({ orderId: null, reason: '' });
                                      return;
                                    }
                                    setReturnDraft({ orderId: order.order_id, reason: '' });
                                    setCancelConfirmOrderId(null);
                                  }}
                                  disabled={!secondaryAction.enabled}
                                  title={secondaryAction.enabled ? '' : secondaryAction.hint}
                                  data-testid={`secondary-order-${order.order_id}`}
                                  className={`${DESKTOP_ACTION_BUTTON_CLASS} focus:ring-gray-300 ${
                                    secondaryAction.enabled
                                      ? 'border-gray-300 text-gray-700 hover:bg-gray-50'
                                      : 'border-gray-200 text-gray-400 cursor-not-allowed'
                                  }`}
                                >
                                  {secondaryAction.label}
                                </button>
                              ) : null}
                            </div>
                            {cancelConfirmOrderId === order.order_id ? (
                              <div className="mt-2 rounded-lg border border-red-200 bg-red-50 p-3">
                                <p className="text-sm text-red-700 mb-2">
                                  {isRTL ? 'هل أنت متأكد من إلغاء هذا الطلب؟' : 'Are you sure you want to cancel this order?'}
                                </p>
                                <div className={`flex gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                  <button
                                    type="button"
                                    className="h-9 px-3 rounded-lg bg-red-600 text-white text-sm font-medium"
                                    onClick={() => submitAction(order.order_id, 'cancel')}
                                  >
                                    {isRTL ? 'نعم، إلغاء الطلب' : 'Yes, Cancel Order'}
                                  </button>
                                  <button
                                    type="button"
                                    className="h-9 px-3 rounded-lg border border-gray-300 text-sm font-medium"
                                    onClick={() => setCancelConfirmOrderId(null)}
                                  >
                                    {isRTL ? 'الاحتفاظ بالطلب' : 'Keep Order'}
                                  </button>
                                </div>
                              </div>
                            ) : null}
                            {returnDraft.orderId === order.order_id ? (
                              <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
                                <label className="text-sm font-medium text-gray-700 block mb-1">
                                  {isRTL ? 'سبب الإرجاع' : 'Reason for return'}
                                </label>
                                <textarea
                                  value={returnDraft.reason}
                                  onChange={(e) => setReturnDraft({ orderId: order.order_id, reason: e.target.value })}
                                  rows={3}
                                  className="w-full rounded-lg border border-gray-300 p-2 text-sm"
                                />
                                <div className={`mt-2 flex gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                  <button
                                    type="button"
                                    className="h-9 px-3 rounded-lg bg-storelaunch-green text-white text-sm font-medium disabled:opacity-60"
                                    disabled={returnDraft.reason.trim().length < RETURN_REASON_MIN}
                                    onClick={() => submitAction(order.order_id, 'return', returnDraft.reason)}
                                  >
                                    {isRTL ? 'إرسال طلب الإرجاع' : 'Submit Return Request'}
                                  </button>
                                  <button
                                    type="button"
                                    className="h-9 px-3 rounded-lg border border-gray-300 text-sm font-medium"
                                    onClick={() => setReturnDraft({ orderId: null, reason: '' })}
                                  >
                                    {isRTL ? 'إلغاء' : 'Cancel'}
                                  </button>
                                </div>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredOrders.map((order) => {
                  const reviewCompleted = isReviewLocked(order);
                  const reviewAllowed = canSubmitOrderReview(order);
                  const secondaryAction = getSecondaryOrderAction(order, isRTL);
                  const primaryStatus = getCustomerPrimaryStatus(order);
                  return (
                    <article key={order.order_id} className="bg-white border border-gray-200 rounded-xl p-4">
                      <div className={`flex items-start gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <div className="relative w-14 h-14 shrink-0">
                          <div className="w-14 h-14 rounded-lg overflow-hidden border border-gray-200 bg-gray-50 flex items-center justify-center">
                            {order.primary_image_url ? (
                              <img src={order.primary_image_url} alt={order.primary_product_name || 'product'} className="w-full h-full object-cover" />
                            ) : (
                              <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M4 7h16M7 4v3m10-3v3M6 20h12a2 2 0 002-2V7H4v11a2 2 0 002 2z" />
                              </svg>
                            )}
                          </div>
                          {(order.item_count || 0) > 1 ? (
                            <span
                              data-testid={`order-badge-${order.order_id}`}
                              className={`absolute -bottom-1.5 px-1.5 py-0.5 min-w-[1.5rem] rounded-full text-[10px] leading-4 text-center font-semibold bg-gray-900 text-white shadow-sm ${isRTL ? '-left-1.5' : '-right-1.5'}`}
                            >
                              +{(order.item_count || 0) - 1}
                            </span>
                          ) : null}
                        </div>
                        <div className={`flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                          <p className="text-sm font-semibold" style={{ color: branding.text }}>#{getCustomerOrderDisplayNumber(order)}</p>
                          <p className="text-xs text-gray-600 mt-0.5">{order.primary_product_name || text.primaryProductFallback}</p>
                          <p className="text-xs text-gray-500">{new Date(order.order_date).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US')} - {formatItemCount(order.item_count || 0, isRTL)}</p>
                        </div>
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${statusChipClass(primaryStatus)}`}>
                          {localizeOrderStatus(primaryStatus, isRTL)}
                        </span>
                      </div>
                      <div className={`mt-3 flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <p className="text-sm font-semibold" style={{ color: branding.priceLabels || branding.buttons }}>
                          <CurrencyAmount value={order.total_amount || 0} isRTL={isRTL} />
                        </p>
                        <p className="text-xs text-gray-500">{isRTL ? 'الدفع:' : 'Payment:'} {localizeOrderStatus(order.payment_status, isRTL)}</p>
                      </div>
                      <div className={`mt-3 flex gap-1.5 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <Link
                          to={buildStorefrontPath(normalizedStoreSlug, `orders/${order.order_id}`)}
                          data-testid={`track-order-${order.order_id}`}
                          className={`flex-1 ${MOBILE_ACTION_BUTTON_CLASS} text-white bg-storelaunch-green border-storelaunch-green hover:bg-storelaunch-deep-green focus:ring-storelaunch-green`}
                        >
                          {text.trackOrder}
                        </Link>
                        <button
                          type="button"
                          onClick={() => navigate(buildStorefrontPath(normalizedStoreSlug, `orders/${order.order_id}`))}
                          disabled={!reviewAllowed}
                          title={reviewAllowed ? '' : text.reviewHint}
                          data-testid={`review-order-${order.order_id}`}
                          className={`${MOBILE_ACTION_BUTTON_CLASS} focus:ring-gray-300 ${reviewAllowed ? 'border-gray-300 text-gray-700 hover:bg-gray-50' : 'border-gray-200 text-gray-400 cursor-not-allowed'}`}
                          aria-label={isRTL ? `كتابة تقييم للطلب ${order.order_id}` : `Write review for order ${order.order_id}`}
                        >
                          {reviewCompleted ? text.reviewed : text.review}
                        </button>
                        {!(
                          (secondaryAction.type === 'cancel' && !secondaryAction.enabled)
                          || returnSubmittedMap[order.order_id]
                        ) ? (
                          <button
                            type="button"
                            onClick={() => {
                              if (!secondaryAction.enabled) return;
                              if (secondaryAction.type === 'cancel') {
                                setCancelConfirmOrderId(order.order_id);
                                setReturnDraft({ orderId: null, reason: '' });
                                return;
                              }
                              setReturnDraft({ orderId: order.order_id, reason: '' });
                              setCancelConfirmOrderId(null);
                            }}
                            disabled={!secondaryAction.enabled}
                            title={secondaryAction.enabled ? '' : secondaryAction.hint}
                            data-testid={`secondary-order-${order.order_id}`}
                            className={`${MOBILE_ACTION_BUTTON_CLASS} focus:ring-gray-300 ${
                              secondaryAction.enabled
                                ? 'border-gray-300 text-gray-700 hover:bg-gray-50'
                                : 'border-gray-200 text-gray-400 cursor-not-allowed'
                            }`}
                            aria-label={isRTL ? `${secondaryAction.label} للطلب ${order.order_id}` : `${secondaryAction.label} for order ${order.order_id}`}
                          >
                            {secondaryAction.label}
                          </button>
                        ) : null}
                      </div>
                      {cancelConfirmOrderId === order.order_id ? (
                        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3">
                          <p className="text-sm text-red-700 mb-2">
                            {isRTL ? 'هل أنت متأكد من إلغاء هذا الطلب؟' : 'Are you sure you want to cancel this order?'}
                          </p>
                          <div className={`flex gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <button
                              type="button"
                              className="h-9 px-3 rounded-lg bg-red-600 text-white text-sm font-medium"
                              onClick={() => submitAction(order.order_id, 'cancel')}
                            >
                              {isRTL ? 'نعم، إلغاء الطلب' : 'Yes, Cancel Order'}
                            </button>
                            <button
                              type="button"
                              className="h-9 px-3 rounded-lg border border-gray-300 text-sm font-medium"
                              onClick={() => setCancelConfirmOrderId(null)}
                            >
                              {isRTL ? 'الاحتفاظ بالطلب' : 'Keep Order'}
                            </button>
                          </div>
                        </div>
                      ) : null}
                      {returnDraft.orderId === order.order_id ? (
                        <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
                          <label className="text-sm font-medium text-gray-700 block mb-1">
                            {isRTL ? 'سبب الإرجاع' : 'Reason for return'}
                          </label>
                          <textarea
                            value={returnDraft.reason}
                            onChange={(e) => setReturnDraft({ orderId: order.order_id, reason: e.target.value })}
                            rows={3}
                            className="w-full rounded-lg border border-gray-300 p-2 text-sm"
                          />
                          <div className={`mt-2 flex gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <button
                              type="button"
                              className="h-9 px-3 rounded-lg bg-storelaunch-green text-white text-sm font-medium disabled:opacity-60"
                              disabled={returnDraft.reason.trim().length < RETURN_REASON_MIN}
                              onClick={() => submitAction(order.order_id, 'return', returnDraft.reason)}
                            >
                              {isRTL ? 'إرسال طلب الإرجاع' : 'Submit Return Request'}
                            </button>
                            <button
                              type="button"
                              className="h-9 px-3 rounded-lg border border-gray-300 text-sm font-medium"
                              onClick={() => setReturnDraft({ orderId: null, reason: '' })}
                            >
                              {isRTL ? 'إلغاء' : 'Cancel'}
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
