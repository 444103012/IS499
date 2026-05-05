function normalizeStatus(value) {
  return String(value || '').trim().toLowerCase();
}

function deriveCustomerDisplayStatus({ paymentStatus, fulfillmentStatus }) {
  const payment = normalizeStatus(paymentStatus);
  const fulfillment = normalizeStatus(fulfillmentStatus);

  if (['failed', 'cancelled', 'canceled', 'voided', 'expired'].includes(payment)) return 'Failed';
  if (['paid', 'captured', 'authorized', 'success'].includes(payment)) {
    if (['processing', 'pending'].includes(fulfillment)) return 'Paid';
  }

  if (fulfillment) return fulfillmentStatus || 'Processing';
  if (payment) return paymentStatus || 'Pending';
  return 'Pending';
}

module.exports = {
  normalizeStatus,
  deriveCustomerDisplayStatus,
};
