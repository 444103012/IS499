const ORDER_ACTIONS = {
  REVIEW: 'review',
  RETURN_REQUEST: 'return_request',
  CANCEL_REQUEST: 'cancel_request',
};

function parsePagination(query = {}) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, Number.parseInt(query.limit, 10) || 10));
  return { page, limit, offset: (page - 1) * limit };
}

function normalizeOrderAction(action = '') {
  const normalized = String(action || '').trim().toLowerCase();
  if (normalized === ORDER_ACTIONS.REVIEW) return ORDER_ACTIONS.REVIEW;
  if (normalized === ORDER_ACTIONS.RETURN_REQUEST) return ORDER_ACTIONS.RETURN_REQUEST;
  if (normalized === ORDER_ACTIONS.CANCEL_REQUEST) return ORDER_ACTIONS.CANCEL_REQUEST;
  return null;
}

function canCustomerAccessOrder(orderRow, customerId) {
  if (!orderRow || orderRow.customer_id == null) return false;
  return Number(orderRow.customer_id) === Number(customerId);
}

module.exports = {
  ORDER_ACTIONS,
  parsePagination,
  normalizeOrderAction,
  canCustomerAccessOrder,
};
