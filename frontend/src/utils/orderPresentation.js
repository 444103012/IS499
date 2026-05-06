export const PRE_DELIVERY_STATUSES = new Set(['processing', 'packed', 'shipped', 'pending']);
export const DELIVERY_COMPLETE_STATUSES = new Set(['delivered', 'completed']);

const STATUS_LABELS = {
  processing: { en: 'Processing', ar: 'قيد المعالجة' },
  packed: { en: 'Packed', ar: 'تم التجهيز' },
  shipped: { en: 'Shipped', ar: 'تم الشحن' },
  delivered: { en: 'Delivered', ar: 'تم التسليم' },
  completed: { en: 'Completed', ar: 'مكتمل' },
  cancelled: { en: 'Cancelled', ar: 'ملغي' },
  pending: { en: 'Pending', ar: 'قيد الانتظار' },
  paid: { en: 'Paid', ar: 'مدفوع' },
  failed: { en: 'Failed', ar: 'فشل' },
  returned: { en: 'Returned', ar: 'تم الإرجاع' },
  refunded: { en: 'Refunded', ar: 'مسترد' },
};

function normalizeStatus(status) {
  return String(status || '').trim().toLowerCase();
}

export function getCustomerPrimaryStatus(order) {
  const payment = normalizeStatus(order?.payment_status);
  const fulfillment = normalizeStatus(order?.fulfillment_status);
  const apiDisplay = normalizeStatus(order?.display_status);

  if (apiDisplay) return order.display_status;
  if (['failed', 'cancelled', 'canceled', 'voided', 'expired'].includes(payment)) return 'Failed';
  if (['paid', 'captured', 'authorized', 'success'].includes(payment) && ['processing', 'pending'].includes(fulfillment)) {
    return 'Paid';
  }
  return order?.fulfillment_status || order?.payment_status || 'Pending';
}

export function localizeOrderStatus(status, isRTL) {
  const normalized = normalizeStatus(status);
  const labels = STATUS_LABELS[normalized];
  if (labels) return isRTL ? labels.ar : labels.en;
  return status || (isRTL ? 'قيد الانتظار' : 'Pending');
}

export function formatItemCount(count, isRTL) {
  const value = Number.isFinite(Number(count)) ? Math.max(0, Number(count)) : 0;
  if (!isRTL) return `${value} item${value === 1 ? '' : 's'}`;

  if (value === 0) return '0 عناصر';
  if (value === 1) return 'عنصر واحد';
  if (value === 2) return 'عنصران';
  if (value <= 10) return `${new Intl.NumberFormat('ar-SA').format(value)} عناصر`;
  return `${new Intl.NumberFormat('ar-SA').format(value)} عنصر`;
}

export function getSecondaryOrderAction(order, isRTL) {
  const status = normalizeStatus(order?.fulfillment_status);

  if (DELIVERY_COMPLETE_STATUSES.has(status)) {
    return {
      type: 'return',
      label: isRTL ? 'طلب إرجاع' : 'Request Return',
      hint: isRTL ? 'متاح بعد التسليم' : 'Available after delivery',
      enabled: true,
    };
  }

  if (['cancelled', 'failed', 'returned', 'refunded', 'return approved', 'return rejected'].includes(status)) {
    return {
      type: 'cancel',
      label: isRTL ? 'إلغاء الطلب' : 'Cancel Order',
      hint: isRTL ? 'غير متاح لهذه الحالة' : 'Unavailable for this order status',
      enabled: false,
    };
  }

  if (PRE_DELIVERY_STATUSES.has(status) || status) {
    return {
      type: 'cancel',
      label: isRTL ? 'إلغاء الطلب' : 'Cancel Order',
      hint: isRTL ? 'الإلغاء متاح قبل التسليم فقط' : 'Cancellation is available before delivery',
      enabled: true,
    };
  }

  return {
    type: 'cancel',
    label: isRTL ? 'إلغاء الطلب' : 'Cancel Order',
    hint: isRTL ? 'الإلغاء متاح قبل التسليم فقط' : 'Cancellation is available before delivery',
    enabled: true,
  };
}

export function isReviewEligible(order) {
  const payment = normalizeStatus(order?.payment_status);
  const fulfillment = normalizeStatus(order?.fulfillment_status);
  return (payment === 'paid' || payment === 'completed') && DELIVERY_COMPLETE_STATUSES.has(fulfillment);
}

export function isReviewLocked(order) {
  return Boolean(order?.review_state?.all_reviewed);
}

export function canSubmitOrderReview(order) {
  return isReviewEligible(order) && !isReviewLocked(order);
}
