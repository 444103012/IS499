'use strict';

/**
 * Admin operations monitoring — exclude debug / fixture rows (no schema changes).
 *
 * Rules (all optional except where noted):
 * 1. OPERATIONS_EXCLUDE_STORE_IDS — comma- or space-separated positive store_id values; those stores are omitted.
 * 2. OPERATIONS_EXCLUDE_ORDER_IDS — same for order_id.
 * 3. Customer email: rows joined to customers with addresses under @example.* are omitted (common fixture data).
 *
 * Set (1) and/or (2) in backend `.env` for demo DBs that use real-looking rows on specific ids.
 */

function parsePositiveIds(raw) {
  if (raw == null || raw === '') return [];
  const s = new Set();
  const str = typeof raw === 'string' ? raw : String(raw);
  for (const part of str.split(/[\s,]+/)) {
    const n = parseInt(String(part).trim(), 10);
    if (Number.isInteger(n) && n > 0 && n <= 2147483647) s.add(n);
  }
  return [...s];
}

function sqlStoreIdNotIn() {
  const ids = parsePositiveIds(process.env.OPERATIONS_EXCLUDE_STORE_IDS);
  if (!ids.length) return '';
  return ` AND s.store_id NOT IN (${ids.join(',')})`;
}

function sqlOrderIdNotIn() {
  const ids = parsePositiveIds(process.env.OPERATIONS_EXCLUDE_ORDER_IDS);
  if (!ids.length) return '';
  return ` AND o.order_id NOT IN (${ids.join(',')})`;
}

/** Use on queries that LEFT/INNER JOIN customers as `c` (checkout payments, customer requests, summaries). */
const SQL_EXCLUDE_EXAMPLE_CUSTOMER_EMAIL = ` AND (c.customer_id IS NULL OR LOWER(TRIM(c.email)) NOT LIKE '%@example.%')`;

module.exports = {
  parsePositiveIds,
  sqlStoreIdNotIn,
  sqlOrderIdNotIn,
  SQL_EXCLUDE_EXAMPLE_CUSTOMER_EMAIL,
};
