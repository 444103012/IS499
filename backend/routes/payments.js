const express = require('express');
const crypto = require('crypto');
const customerAuth = require('../middleware/customerAuth');

const router = express.Router();

const FRONTEND_BASE_URL = (process.env.FRONTEND_BASE_URL || '').replace(/\/$/, '');
const MOYASAR_PUBLISHABLE_KEY = process.env.MOYASAR_PUBLISHABLE_KEY || '';
const MOYASAR_SECRET_KEY = process.env.MOYASAR_SECRET_KEY || '';

function toStoreSlug(raw) {
  return String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

router.post('/init', customerAuth, async (req, res) => {
  const pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });

  const { orderId, method } = req.body || {};
  const order_id = parseInt(orderId, 10);
  if (Number.isNaN(order_id)) return res.status(400).json({ error: 'Invalid order id' });

  try {
    const orderResult = await pool.query(
      `SELECT o.order_id, o.total_amount, s.domain_name, s.name AS store_name
       FROM orders o
       JOIN stores s ON s.store_id = o.store_id
       WHERE o.order_id = $1 AND o.customer_id = $2`,
      [order_id, req.customerId]
    );
    const order = orderResult.rows[0];
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const amountHalalas = Math.round(Number(order.total_amount || 0) * 100);
    const storeSlug = toStoreSlug(order.domain_name || order.store_name);
    const callbackPath = `/${storeSlug}/payment/result?orderId=${order_id}`;
    const callbackUrl = FRONTEND_BASE_URL ? `${FRONTEND_BASE_URL}${callbackPath}` : callbackPath;

   
   
   
    return res.json({
      orderId: order_id,
      amount: amountHalalas,
      currency: 'SAR',
      description: `Order #${order_id}`,
      method: method || 'creditcard',
      callbackUrl,
      publishableKey: MOYASAR_PUBLISHABLE_KEY,
    });
  } catch (err) {
    console.error('payments init error:', err);
    return res.status(500).json({ error: 'Failed to initialize payment' });
  }
});

router.post('/webhook', async (req, res) => {
  const pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });

  const signature = req.headers['x-moyasar-signature'] || req.headers['moyasar-signature'];
  const payload = JSON.stringify(req.body || {});

  if (MOYASAR_SECRET_KEY && signature) {
    try {
      const hmac = crypto.createHmac('sha256', MOYASAR_SECRET_KEY);
      hmac.update(payload);
      const expected = hmac.digest('hex');
      if (expected !== signature) {
        console.warn('payments webhook: invalid signature');
        return res.status(400).json({ error: 'Invalid signature' });
      }
    } catch (err) {
      console.error('payments webhook signature error:', err);
    }
  }

 
  const body = req.body || {};
  const status = body.status;
  const method = body.method || null;
  const externalId = body.id || null;
  const orderId = body.metadata && body.metadata.order_id ? parseInt(body.metadata.order_id, 10) : null;
  const amount = body.amount != null ? Number(body.amount) / 100 : null;

  if (!orderId || Number.isNaN(orderId)) {
   
    return res.json({ received: true });
  }

  try {
   
    try {
      await pool.query(
        `INSERT INTO payments (order_id, payment_status, method, amount, external_id, raw_payload)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [orderId, status || 'paid', method, amount, externalId, payload]
      );
    } catch (err) {
      if (err.code !== '42703' && err.code !== '42P01') throw err;
    }

    if (status === 'paid') {
     
     
    }

    return res.json({ received: true });
  } catch (err) {
    console.error('payments webhook error:', err);
    return res.status(500).json({ error: 'Failed to process webhook' });
  }
});

module.exports = router;