

const express = require('express');
const adminAuthMiddleware = require('../middleware/adminAuth');
const {
  sqlStoreIdNotIn,
  sqlOrderIdNotIn,
  SQL_EXCLUDE_EXAMPLE_CUSTOMER_EMAIL,
} = require('../utils/operationsMonitoringExclude');

const router = express.Router();
router.use(adminAuthMiddleware);

const SQL_CUSTOMER_REQUEST_ACTION_IN_QUEUE = ` AND LOWER(TRIM(COALESCE(cor.action_type, ''))) IN ('cancel', 'cancel_request', 'return', 'return_request')`;

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

function parseLimit(raw) {
  const n = parseInt(raw, 10);
  if (Number.isNaN(n) || n < 1) return DEFAULT_LIMIT;
  return Math.min(n, MAX_LIMIT);
}

async function safeSelect(pool, label, sql, params = []) {
  try {
    const result = await pool.query(sql, params);
    return { ok: true, rows: result.rows };
  } catch (err) {
    if (err.code === '42P01') {
      return { ok: false, rows: [], skipped: true, reason: `${label}: table missing` };
    }
    if (err.code === '42703') {
      return { ok: false, rows: [], skipped: true, reason: `${label}: column missing` };
    }
    throw err;
  }
}


router.get('/checkout-payments', async (req, res) => {
  const pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });
  const limit = parseLimit(req.query.limit);
  try {
    const { rows, skipped } = await safeSelect(
      pool,
      'checkout-payments',
      `
      SELECT *
      FROM (
        SELECT DISTINCT ON (p.order_id)
          p.payment_id,
          p.order_id,
          p.payment_status,
          p.amount,
          p.method,
          p.provider_ref,
          p.created_at AS payment_created_at,
          o.store_id,
          NULLIF(o.store_order_seq::text, '')::int AS store_order_seq,
          o.customer_id,
          o.status AS order_status,
          o.total_amount AS order_total,
          s.name AS store_name,
          s.domain_name,
          c.email AS customer_email,
          CASE
            WHEN LOWER(TRIM(COALESCE(p.payment_status, ''))) = 'failed' THEN 'failed'
            ELSE 'other'
          END AS issue_kind
        FROM payments p
        INNER JOIN orders o ON o.order_id = p.order_id
        INNER JOIN stores s ON s.store_id = o.store_id
        LEFT JOIN customers c ON c.customer_id = o.customer_id
        WHERE 1=1${sqlStoreIdNotIn()}${sqlOrderIdNotIn()}${SQL_EXCLUDE_EXAMPLE_CUSTOMER_EMAIL}
        ORDER BY p.order_id, p.created_at DESC
      ) t
      WHERE t.issue_kind = 'failed'
      ORDER BY t.payment_created_at DESC
      LIMIT $1
      `,
      [limit]
    );
    return res.json({ items: rows, tableMissing: Boolean(skipped) });
  } catch (err) {
    console.error('admin GET /operations/checkout-payments:', err);
    return res.status(500).json({ error: 'Failed to load checkout payment issues' });
  }
});


router.get('/store-activations', async (req, res) => {
  const pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });
  const limit = parseLimit(req.query.limit);
  try {
    const { rows, skipped } = await safeSelect(
      pool,
      'store-activations',
      `
      SELECT
        a.id,
        a.store_id,
        a.attempted_at,
        a.status,
        a.payment_method,
        a.amount_sar,
        a.transaction_ref,
        a.error_message,
        s.name AS store_name,
        s.domain_name,
        s.status AS store_status
      FROM store_activation_attempts a
      INNER JOIN stores s ON s.store_id = a.store_id
      WHERE LOWER(TRIM(COALESCE(a.status, ''))) = 'failed'${sqlStoreIdNotIn()}
      ORDER BY a.attempted_at DESC
      LIMIT $1
      `,
      [limit]
    );
    return res.json({ items: rows, tableMissing: Boolean(skipped) });
  } catch (err) {
    console.error('admin GET /operations/store-activations:', err);
    return res.status(500).json({ error: 'Failed to load store activation failures' });
  }
});


router.get('/shipping-signals', async (req, res) => {
  const pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });
  const limit = parseLimit(req.query.limit);
  try {
    const { rows, skipped } = await safeSelect(
      pool,
      'shipping-signals',
      `
      SELECT
        o.order_id,
        o.store_id,
        NULLIF(o.store_order_seq::text, '')::int AS store_order_seq,
        o.status AS order_status,
        o.order_date,
        o.total_amount,
        s.name AS store_name,
        s.domain_name,
        sh.shipment_id,
        sh.tracking_number,
        sh.shipment_status,
        sh.shipped_at,
        sh.delivered_at,
        COALESCE(sh.shipped_at, o.order_date) AS aging_anchor_at,
        'stale_packed_or_shipped_not_delivered' AS signal_type
      FROM orders o
      INNER JOIN stores s ON s.store_id = o.store_id
      INNER JOIN LATERAL (
        SELECT shipment_id, tracking_number, shipment_status, shipped_at, delivered_at
        FROM shipments
        WHERE order_id = o.order_id
        ORDER BY shipment_id DESC
        LIMIT 1
      ) sh ON TRUE
      WHERE sh.delivered_at IS NULL
        AND (
          UPPER(TRIM(COALESCE(sh.shipment_status, ''))) IN ('SHIPPED', 'PACKED')
          OR UPPER(TRIM(COALESCE(o.status, ''))) IN ('SHIPPED', 'PACKED')
        )
        AND COALESCE(sh.shipped_at, o.order_date) <= (NOW() - INTERVAL '10 days')${sqlStoreIdNotIn()}${sqlOrderIdNotIn()}
      ORDER BY COALESCE(sh.shipped_at, o.order_date) ASC NULLS LAST
      LIMIT $1
      `,
      [limit]
    );
    return res.json({ items: rows, tableMissing: Boolean(skipped) });
  } catch (err) {
    console.error('admin GET /operations/shipping-signals:', err);
    return res.status(500).json({ error: 'Failed to load shipping signals' });
  }
});


router.get('/customer-requests', async (req, res) => {
  const pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });
  const limit = parseLimit(req.query.limit);
  try {
    const { rows, skipped } = await safeSelect(
      pool,
      'customer-requests',
      `
      SELECT
        cor.id,
        cor.order_id,
        cor.customer_id,
        cor.action_type,
        cor.status,
        cor.created_at,
        cor.payload,
        o.store_id,
        NULLIF(o.store_order_seq::text, '')::int AS store_order_seq,
        o.status AS order_status,
        s.name AS store_name,
        s.domain_name,
        c.email AS customer_email
      FROM customer_order_requests cor
      INNER JOIN orders o ON o.order_id = cor.order_id
      INNER JOIN stores s ON s.store_id = o.store_id
      LEFT JOIN customers c ON c.customer_id = cor.customer_id
      WHERE LOWER(TRIM(COALESCE(cor.status, ''))) = 'pending'${SQL_CUSTOMER_REQUEST_ACTION_IN_QUEUE}${sqlStoreIdNotIn()}${sqlOrderIdNotIn()}${SQL_EXCLUDE_EXAMPLE_CUSTOMER_EMAIL}
      ORDER BY cor.created_at ASC
      LIMIT $1
      `,
      [limit]
    );
    return res.json({ items: rows, tableMissing: Boolean(skipped) });
  } catch (err) {
    console.error('admin GET /operations/customer-requests:', err);
    return res.status(500).json({ error: 'Failed to load customer order requests' });
  }
});


router.get('/summary', async (req, res) => {
  const pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });

  const out = {
    failed_checkout_payments: 0,
    failed_store_activation_attempts: 0,
    shipping_signals: 0,
    pending_customer_order_requests: 0,
    tables: {
      payments: true,
      store_activation_attempts: true,
      shipments: true,
      customer_order_requests: true,
    },
  };

  try {
    const pay = await safeSelect(
      pool,
      'summary-payments',
      `
      SELECT COUNT(*)::int AS failed_cnt
      FROM (
        SELECT DISTINCT ON (p.order_id)
          CASE
            WHEN LOWER(TRIM(COALESCE(p.payment_status, ''))) = 'failed' THEN 'failed'
            ELSE 'other'
          END AS issue_kind
        FROM payments p
        INNER JOIN orders o ON o.order_id = p.order_id
        INNER JOIN stores s ON s.store_id = o.store_id
        LEFT JOIN customers c ON c.customer_id = o.customer_id
        WHERE 1=1${sqlStoreIdNotIn()}${sqlOrderIdNotIn()}${SQL_EXCLUDE_EXAMPLE_CUSTOMER_EMAIL}
        ORDER BY p.order_id, p.created_at DESC
      ) t
      WHERE t.issue_kind = 'failed'
      `
    );
    if (pay.skipped) out.tables.payments = false;
    else if (pay.rows[0]) {
      out.failed_checkout_payments = pay.rows[0].failed_cnt || 0;
    }

    const act = await safeSelect(
      pool,
      'summary-activations',
      `
      SELECT COUNT(*)::int AS cnt
      FROM store_activation_attempts a
      INNER JOIN stores s ON s.store_id = a.store_id
      WHERE LOWER(TRIM(COALESCE(a.status, ''))) = 'failed'${sqlStoreIdNotIn()}
      `
    );
    if (act.skipped) out.tables.store_activation_attempts = false;
    else out.failed_store_activation_attempts = act.rows[0]?.cnt || 0;

    const ship = await safeSelect(
      pool,
      'summary-shipping',
      `
      SELECT COUNT(*)::int AS cnt
      FROM orders o
      INNER JOIN stores s ON s.store_id = o.store_id
      INNER JOIN LATERAL (
        SELECT shipment_id, shipment_status, shipped_at, delivered_at
        FROM shipments
        WHERE order_id = o.order_id
        ORDER BY shipment_id DESC
        LIMIT 1
      ) sh ON TRUE
      WHERE sh.delivered_at IS NULL
        AND (
          UPPER(TRIM(COALESCE(sh.shipment_status, ''))) IN ('SHIPPED', 'PACKED')
          OR UPPER(TRIM(COALESCE(o.status, ''))) IN ('SHIPPED', 'PACKED')
        )
        AND COALESCE(sh.shipped_at, o.order_date) <= (NOW() - INTERVAL '10 days')${sqlStoreIdNotIn()}${sqlOrderIdNotIn()}
      `
    );
    if (ship.skipped) out.tables.shipments = false;
    else out.shipping_signals = ship.rows[0]?.cnt || 0;

    const reqResult = await safeSelect(
      pool,
      'summary-requests',
      `
      SELECT COUNT(*)::int AS cnt
      FROM customer_order_requests cor
      INNER JOIN orders o ON o.order_id = cor.order_id
      INNER JOIN stores s ON s.store_id = o.store_id
      LEFT JOIN customers c ON c.customer_id = cor.customer_id
      WHERE LOWER(TRIM(COALESCE(cor.status, ''))) = 'pending'${SQL_CUSTOMER_REQUEST_ACTION_IN_QUEUE}${sqlStoreIdNotIn()}${sqlOrderIdNotIn()}${SQL_EXCLUDE_EXAMPLE_CUSTOMER_EMAIL}
      `
    );
    if (reqResult.skipped) out.tables.customer_order_requests = false;
    else out.pending_customer_order_requests = reqResult.rows[0]?.cnt || 0;

    return res.json(out);
  } catch (err) {
    console.error('admin GET /operations/summary:', err);
    return res.status(500).json({ error: 'Failed to load operations summary' });
  }
});

module.exports = router;
