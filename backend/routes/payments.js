const express = require('express');
const customerAuth = require('../middleware/customerAuth');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

const FRONTEND_BASE_URL = (process.env.FRONTEND_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const MOYASAR_PUBLISHABLE_KEY = process.env.MOYASAR_PUBLISHABLE_KEY || '';
const MOYASAR_SECRET_KEY = process.env.MOYASAR_SECRET_KEY || '';
const MOYASAR_API_BASE = (process.env.MOYASAR_API_BASE || 'https://api.moyasar.com').replace(/\/$/, '');
const BACKEND_BASE_URL = (process.env.BACKEND_BASE_URL || '').replace(/\/$/, '');

function normalizeStoreSlug(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

function toGatewayStatus(value) {
  const normalized = String(value || '').toLowerCase();
  if (normalized === 'paid' || normalized === 'captured' || normalized === 'authorized') return 'Paid';
  if (normalized === 'failed' || normalized === 'canceled' || normalized === 'cancelled' || normalized === 'expired' || normalized === 'voided') return 'Failed';
  return 'Pending';
}

function getMoyasarPaymentRef(payload = {}) {
  if (payload?.payments?.[0]?.id) return String(payload.payments[0].id);
  if (payload?.id) return String(payload.id);
  return null;
}

async function fetchMoyasarInvoice(invoiceId) {
  if (!invoiceId || !MOYASAR_SECRET_KEY) return null;
  const authToken = Buffer.from(`${MOYASAR_SECRET_KEY}:`).toString('base64');
  const resp = await fetch(`${MOYASAR_API_BASE}/v1/invoices/${encodeURIComponent(invoiceId)}`, {
    method: 'GET',
    headers: {
      Authorization: `Basic ${authToken}`,
      'Content-Type': 'application/json',
    },
  });
  const body = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    const message = body?.message || body?.error || `HTTP ${resp.status}`;
    throw new Error(`Moyasar invoice verify failed: ${message}`);
  }
  return body;
}

async function upsertPaymentRecord(db, { orderId, paymentStatus, method, amount, providerRef, rawPayload }) {
  try {
    await db.query(
      `UPDATE payments
       SET payment_status = $1, method = COALESCE($2, method), amount = COALESCE($3, amount)
       WHERE order_id = $4 AND provider_ref = $5`,
      [paymentStatus, method || null, amount, orderId, providerRef]
    );
    const existing = await db.query(
      'SELECT payment_id FROM payments WHERE order_id = $1 AND provider_ref = $2 LIMIT 1',
      [orderId, providerRef]
    );
    if (existing.rows[0]) return;

    await db.query(
      `INSERT INTO payments (order_id, payment_status, method, amount, provider_ref)
       VALUES ($1, $2, $3, $4, $5)`,
      [orderId, paymentStatus, method || null, amount, providerRef]
    );
  } catch (err) {
    if (err.code !== '42703' && err.code !== '42P01') throw err;
    try {
      await db.query(
        `UPDATE payments
         SET payment_status = $1, method = COALESCE($2, method), amount = COALESCE($3, amount)
         WHERE order_id = $4 AND external_id = $5`,
        [paymentStatus, method || null, amount, orderId, providerRef]
      );
      const existing = await db.query(
        'SELECT payment_id FROM payments WHERE order_id = $1 AND external_id = $2 LIMIT 1',
        [orderId, providerRef]
      );
      if (existing.rows[0]) return;
      await db.query(
        `INSERT INTO payments (order_id, payment_status, method, amount, external_id, raw_payload)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [orderId, paymentStatus, method || null, amount, providerRef, rawPayload]
      );
    } catch (fallbackErr) {
      if (fallbackErr.code !== '42703' && fallbackErr.code !== '42P01') throw fallbackErr;
    }
  }
}

async function persistPaymentOutcome(pool, { orderId, gatewayPayload, source }) {
  const providerRef = getMoyasarPaymentRef(gatewayPayload);
  const paymentStatus = toGatewayStatus(gatewayPayload?.status);
  const method = gatewayPayload?.payments?.[0]?.source?.type || gatewayPayload?.payments?.[0]?.source?.company || null;
  const amount = gatewayPayload?.amount != null ? Number(gatewayPayload.amount) / 100 : null;

  const client = await pool.connect();
  try {
    const orderCheck = await client.query('SELECT order_id, customer_id FROM orders WHERE order_id = $1 LIMIT 1', [orderId]);
    if (!orderCheck.rows[0]) {
      return { ok: false, reason: 'ORDER_NOT_FOUND' };
    }

    await upsertPaymentRecord(client, {
      orderId,
      paymentStatus,
      method,
      amount,
      providerRef,
      rawPayload: JSON.stringify(gatewayPayload || {}),
    });

    if (paymentStatus === 'Paid') {
      await client.query(
        `UPDATE orders
         SET status = CASE WHEN status IN ('Pending', 'Processing') THEN 'Processing' ELSE status END
         WHERE order_id = $1`,
        [orderId]
      );
      const customerId = orderCheck.rows[0]?.customer_id;
      if (customerId != null) {
        try {
          await client.query(
            `UPDATE customers
             SET cart = '[]'::jsonb
             WHERE customer_id = $1`,
            [customerId]
          );
        } catch (cartErr) {
          if (cartErr.code !== '42703' && cartErr.code !== '42P01') throw cartErr;
        }
      }
    }

    return { ok: true, paymentStatus, providerRef };
  } catch (err) {
    throw err;
  } finally {
    client.release();
  }
}

function resolveInvoiceIdFromReturnQuery(query = {}) {
  return String(
    query.invoice_id
    || query.invoiceId
    || query.invoice
    || query.id
    || query.payment_id
    || query.paymentId
    || ''
  ).trim();
}

/**
 * Shared Moyasar invoice creation (customer checkout + store-owner payment link).
 * @param {object} params
 * @param {object} params.orderRow — row with order_id, total_amount, store_name (store slug source)
 * @param {number|string|null} params.customerIdForMetadata — orders.customer_id for Moyasar metadata
 * @param {string} params.successUrl
 * @param {string} params.backUrl
 * @param {string} [params.callbackUrl]
 */
async function createMoyasarInvoiceSessionForOrder({
  orderRow,
  customerIdForMetadata,
  successUrl,
  backUrl,
  callbackUrl,
}) {
  if (!MOYASAR_SECRET_KEY) {
    const err = new Error('Payment gateway is not configured');
    err.code = 'GATEWAY_NOT_CONFIGURED';
    throw err;
  }

  const order_id = orderRow.order_id;
  const amountHalalas = Math.round(Number(orderRow.total_amount || 0) * 100);
  const storeSlug = normalizeStoreSlug(orderRow.store_name);
  const invoiceBody = {
    amount: amountHalalas,
    currency: 'SAR',
    description: `Order #${order_id}`,
    success_url: successUrl,
    back_url: backUrl,
    ...(callbackUrl ? { callback_url: callbackUrl } : {}),
    metadata: {
      order_id: String(order_id),
      customer_id: String(customerIdForMetadata ?? ''),
      store_slug: storeSlug,
    },
  };

  const authToken = Buffer.from(`${MOYASAR_SECRET_KEY}:`).toString('base64');
  const gatewayResponse = await fetch(`${MOYASAR_API_BASE}/v1/invoices`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${authToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(invoiceBody),
  });
  const gatewayPayload = await gatewayResponse.json().catch(() => ({}));
  if (!gatewayResponse.ok) {
    const gatewayMessage = gatewayPayload?.message || gatewayPayload?.errors || gatewayPayload?.error || `HTTP ${gatewayResponse.status}`;
    const err = new Error(gatewayMessage);
    err.statusCode = 502;
    err.gatewayPayload = gatewayPayload;
    throw err;
  }
  const transactionUrl =
    gatewayPayload?.url
    || gatewayPayload?.payment_url
    || gatewayPayload?.checkout_url
    || gatewayPayload?.redirect_url
    || '';
  if (!transactionUrl) {
    const err = new Error('Payment session URL is missing');
    err.statusCode = 502;
    throw err;
  }

  return {
    orderId: order_id,
    amount: amountHalalas,
    currency: 'SAR',
    description: `Order #${order_id}`,
    invoiceId: gatewayPayload?.id || null,
    transactionUrl,
    successUrl,
    callbackUrl,
    publishableKey: MOYASAR_PUBLISHABLE_KEY,
  };
}

router.post('/init', customerAuth, async (req, res) => {
  const pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });

  const { orderId, method } = req.body || {};
  const order_id = parseInt(orderId, 10);
  if (Number.isNaN(order_id)) return res.status(400).json({ error: 'Invalid order id' });

  try {
    const orderResult = await pool.query(
      `SELECT o.order_id, o.total_amount, o.store_id, s.name AS store_name
       FROM orders o
       LEFT JOIN stores s ON s.store_id = o.store_id
       WHERE o.order_id = $1 AND o.customer_id = $2`,
      [order_id, req.customerId]
    );
    const order = orderResult.rows[0];
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const requestOrigin = `${req.protocol}://${req.get('host')}`.replace(/\/$/, '');
    const callbackOrigin = BACKEND_BASE_URL || requestOrigin;
    const storeSlug = normalizeStoreSlug(order.store_name);
    const successUrl = `${callbackOrigin}/api/payments/return?orderId=${encodeURIComponent(order_id)}&storeSlug=${encodeURIComponent(storeSlug)}`;
    const backUrl = `${FRONTEND_BASE_URL}${storeSlug ? `/${storeSlug}/checkout` : '/checkout'}`;
    const callbackUrl = `${callbackOrigin}/api/payments/callback`;

    const session = await createMoyasarInvoiceSessionForOrder({
      orderRow: order,
      customerIdForMetadata: req.customerId,
      successUrl,
      backUrl,
      callbackUrl,
    });

    return res.json({
      ...session,
      method: method || 'creditcard',
    });
  } catch (err) {
    if (err.code === 'GATEWAY_NOT_CONFIGURED') {
      return res.status(503).json({ error: err.message, code: 'GATEWAY_NOT_CONFIGURED' });
    }
    if (err.statusCode === 502) {
      console.error('payments init gateway error:', err.message);
      return res.status(502).json({ error: 'Failed to initialize payment session' });
    }
    console.error('payments init error:', err);
    return res.status(500).json({ error: 'Failed to initialize payment' });
  }
});

/**
 * Store owner: payment link for an existing order (same Moyasar flow as /init).
 */
router.post('/init-for-order', authMiddleware, async (req, res) => {
  const pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });

  const { store_owner_id } = req.user;
  const { orderId, method } = req.body || {};
  const order_id = parseInt(orderId, 10);
  if (Number.isNaN(order_id)) return res.status(400).json({ error: 'Invalid order id' });

  try {
    const orderResult = await pool.query(
      `SELECT o.order_id, o.total_amount, o.store_id, o.customer_id, s.name AS store_name
       FROM orders o
       JOIN stores s ON s.store_id = o.store_id
       WHERE o.order_id = $1 AND s.store_owner_id = $2`,
      [order_id, store_owner_id]
    );
    const order = orderResult.rows[0];
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const requestOrigin = `${req.protocol}://${req.get('host')}`.replace(/\/$/, '');
    const callbackOrigin = BACKEND_BASE_URL || requestOrigin;
    const storeSlug = normalizeStoreSlug(order.store_name);
    const successUrl = `${callbackOrigin}/api/payments/return?orderId=${encodeURIComponent(order_id)}&storeSlug=${encodeURIComponent(storeSlug)}`;
    const backUrl = `${FRONTEND_BASE_URL}/dashboard/orders`;
    const callbackUrl = `${callbackOrigin}/api/payments/callback`;

    const session = await createMoyasarInvoiceSessionForOrder({
      orderRow: order,
      customerIdForMetadata: order.customer_id,
      successUrl,
      backUrl,
      callbackUrl,
    });

    return res.json({
      ...session,
      method: method || 'creditcard',
    });
  } catch (err) {
    if (err.code === 'GATEWAY_NOT_CONFIGURED') {
      return res.status(503).json({ error: err.message, code: 'GATEWAY_NOT_CONFIGURED' });
    }
    if (err.statusCode === 502) {
      console.error('payments init-for-order gateway error:', err.message);
      return res.status(502).json({ error: 'Failed to initialize payment session' });
    }
    console.error('payments init-for-order error:', err);
    return res.status(500).json({ error: 'Failed to initialize payment' });
  }
});






async function handleMoyasarCallback(req, res) {
  const pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });

  const payload = req.body || {};
  const orderId = payload?.metadata?.order_id ? parseInt(payload.metadata.order_id, 10) : null;
  const invoiceId = payload?.id || null;

  if (!invoiceId || !orderId || Number.isNaN(orderId)) {
    console.warn('payments callback missing required fields', {
      hasInvoiceId: Boolean(invoiceId),
      hasOrderId: Boolean(orderId),
    });
    return res.status(400).json({ error: 'Invalid callback payload' });
  }

  try {
    const verifiedInvoice = await fetchMoyasarInvoice(invoiceId);
    const result = await persistPaymentOutcome(pool, {
      orderId,
      gatewayPayload: verifiedInvoice,
      source: 'callback',
    });
    return res.json({ received: true, result });
  } catch (err) {
    console.error('payments callback error:', err);
    return res.status(500).json({ error: 'Failed to process payment callback' });
  }
}

router.post('/callback', handleMoyasarCallback);

router.post('/webhook', async (req, res) => {
  return handleMoyasarCallback(req, res);
});

router.get('/return', async (req, res) => {
  const pool = req.app.locals.pool;
  if (!pool) return res.status(500).send('Database not configured');

  const orderId = parseInt(req.query.orderId, 10);
  const storeSlug = normalizeStoreSlug(req.query.storeSlug);
  const invoiceId = resolveInvoiceIdFromReturnQuery(req.query);
  const resultPath = storeSlug ? `/${storeSlug}/payment/result` : '/payment/result';

  if (Number.isNaN(orderId) || !invoiceId) {
    const failedUrl = `${FRONTEND_BASE_URL}${resultPath}?orderId=${encodeURIComponent(req.query.orderId || '')}&status=failed`;
    console.error('payments return invalid params', {
      orderId: req.query.orderId,
      invoiceId,
      query: req.query,
    });
    return res.redirect(302, failedUrl);
  }

  try {
    const verifiedInvoice = await fetchMoyasarInvoice(invoiceId);
    const status = toGatewayStatus(verifiedInvoice?.status);
    const persisted = await persistPaymentOutcome(pool, {
      orderId,
      gatewayPayload: verifiedInvoice,
      source: 'return',
    });
    const providerRef = persisted?.providerRef || getMoyasarPaymentRef(verifiedInvoice) || '';
    const redirectUrl = `${FRONTEND_BASE_URL}${resultPath}?orderId=${encodeURIComponent(orderId)}&invoiceId=${encodeURIComponent(invoiceId)}&status=${encodeURIComponent(status.toLowerCase())}${providerRef ? `&paymentId=${encodeURIComponent(providerRef)}` : ''}`;
    return res.redirect(302, redirectUrl);
  } catch (err) {
    console.error('payments return error:', err);
    const failedUrl = `${FRONTEND_BASE_URL}${resultPath}?orderId=${encodeURIComponent(orderId)}&invoiceId=${encodeURIComponent(invoiceId)}&status=failed`;
    return res.redirect(302, failedUrl);
  }
});

router.get('/verify-return', customerAuth, async (req, res) => {
  const pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });
  const orderId = parseInt(req.query.orderId, 10);
  const invoiceId = String(req.query.invoiceId || '').trim();
  if (Number.isNaN(orderId) || !invoiceId) {
    return res.status(400).json({ error: 'orderId and invoiceId are required' });
  }

  try {
    const order = await pool.query(
      'SELECT order_id FROM orders WHERE order_id = $1 AND customer_id = $2 LIMIT 1',
      [orderId, req.customerId]
    );
    if (!order.rows[0]) return res.status(404).json({ error: 'Order not found' });

    const verifiedInvoice = await fetchMoyasarInvoice(invoiceId);
    const result = await persistPaymentOutcome(pool, {
      orderId,
      gatewayPayload: verifiedInvoice,
      source: 'verify-return',
    });
    return res.json({
      orderId,
      invoiceId,
      paymentStatus: result?.paymentStatus || toGatewayStatus(verifiedInvoice?.status),
      referenceId: result?.providerRef || getMoyasarPaymentRef(verifiedInvoice),
    });
  } catch (err) {
    console.error('payments verify-return error:', err);
    return res.status(500).json({ error: 'Failed to verify payment' });
  }
});

module.exports = router;
module.exports.__testables = {
  toGatewayStatus,
  resolveInvoiceIdFromReturnQuery,
  persistPaymentOutcome,
  createMoyasarInvoiceSessionForOrder,
};

