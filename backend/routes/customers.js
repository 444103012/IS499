const express = require('express');
const router = express.Router();
const customerAuthMiddleware = require('../middleware/customerAuthMiddleware');
const authMiddleware = require('../middleware/authMiddleware');
const { getStoreId } = require('../utils/getStoreId');
const { hashPassword, comparePassword } = require('../utils/hash');
const {
  ORDER_ACTIONS,
  parsePagination,
  canCustomerAccessOrder,
} = require('../utils/customerOrders');
const { deriveCustomerDisplayStatus } = require('../utils/orderStatusDisplay');

const MIN_PASSWORD_LENGTH = 8;
const REVIEW_MIN_COMMENT_LENGTH = 3;

function normalizeStatus(value) {
  return String(value || '').trim().toLowerCase();
}

function isReviewEligibleByStatus({ paymentStatus, fulfillmentStatus }) {
  const payment = normalizeStatus(paymentStatus);
  const fulfillment = normalizeStatus(fulfillmentStatus);
  const paid = ['paid', 'captured', 'authorized', 'success', 'completed'].includes(payment);
  const delivered = ['delivered', 'completed'].includes(fulfillment);
  return paid && delivered;
}

function normalizeReviewEntry(entry = {}) {
  const productId = Number.parseInt(entry.productId ?? entry.product_id, 10);
  const rating = Number.parseInt(entry.rating, 10);
  const comment = typeof entry.comment === 'string' ? entry.comment.trim() : '';
  return { productId, rating, comment };
}

function validateReviewEntry(entry) {
  if (!Number.isInteger(entry.rating) || entry.rating < 1 || entry.rating > 5) {
    return 'Rating must be between 1 and 5';
  }
  if (!entry.comment || entry.comment.length < REVIEW_MIN_COMMENT_LENGTH) {
    return `Comment must be at least ${REVIEW_MIN_COMMENT_LENGTH} characters`;
  }
  return null;
}

function validateBody(body, requiredFields) {
  return requiredFields.filter((field) => {
    const value = body[field];
    return value === undefined || value === null || (typeof value === 'string' && value.trim() === '');
  });
}

async function ensureCustomerAddressColumn(pool) {
  await pool.query('ALTER TABLE customers ADD COLUMN IF NOT EXISTS saved_address JSONB');
}

async function ensureOrderSequenceColumns(pool) {
  await pool.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS store_order_seq INTEGER');
  await pool.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_order_seq INTEGER');
}






router.get('/profile', customerAuthMiddleware, async (req, res) => {
  const pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });
  const customerId = req.user.customer_id;

  try {
    await ensureCustomerAddressColumn(pool);
    const result = await pool.query(
      'SELECT first_name, last_name, email, phone, saved_address FROM customers WHERE customer_id = $1',
      [customerId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    return res.json({ customer: result.rows[0] });
  } catch (err) {
    console.error('Customer profile fetch error:', err);
    return res.status(500).json({ error: 'Failed to fetch profile' });
  }
});






router.put('/profile', customerAuthMiddleware, async (req, res) => {
  const pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });
  const customerId = req.user.customer_id;
  const { first_name, last_name, email, phone } = req.body;

  const missing = validateBody(req.body, ['first_name', 'last_name', 'email', 'phone']);
  if (missing.length > 0) {
    return res.status(400).json({ error: 'Missing required fields', fields: missing });
  }

  const trimmedEmail = String(email).trim().toLowerCase();
  const trimmedPhone = phone ? String(phone).trim() : null;
  const phonePattern = /^(\+?\d{8,15})$/;
  if (!trimmedPhone || !phonePattern.test(trimmedPhone)) {
    return res.status(400).json({ error: 'Invalid phone format' });
  }

  try {
    await ensureCustomerAddressColumn(pool);
    const existingEmail = await pool.query(
      'SELECT customer_id FROM customers WHERE LOWER(email) = $1 AND customer_id != $2',
      [trimmedEmail, customerId]
    );
    if (existingEmail.rows.length > 0) {
      return res.status(409).json({ error: 'Email already exists' });
    }

    await pool.query(
      'UPDATE customers SET first_name = $1, last_name = $2, email = $3, phone = $4 WHERE customer_id = $5',
      [first_name.trim(), last_name.trim(), trimmedEmail, trimmedPhone, customerId]
    );

    const result = await pool.query(
      'SELECT first_name, last_name, email, phone, saved_address FROM customers WHERE customer_id = $1',
      [customerId]
    );
    return res.json({ message: 'Profile updated successfully', customer: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Email already exists' });
    }
    console.error('Customer profile update error:', err);
    return res.status(500).json({ error: 'Failed to update profile' });
  }
});

router.get('/address', customerAuthMiddleware, async (req, res) => {
  const pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });
  const customerId = req.user.customer_id;

  try {
    await ensureCustomerAddressColumn(pool);
    const result = await pool.query(
      'SELECT saved_address FROM customers WHERE customer_id = $1',
      [customerId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    return res.json({ address: result.rows[0].saved_address || null });
  } catch (err) {
    console.error('Customer address fetch error:', err);
    return res.status(500).json({ error: 'Failed to fetch saved address' });
  }
});

router.put('/address', customerAuthMiddleware, async (req, res) => {
  const pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });
  const customerId = req.user.customer_id;
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const address = {
    full_name: typeof body.full_name === 'string' ? body.full_name.trim() : '',
    phone: typeof body.phone === 'string' ? body.phone.trim() : '',
    address1: typeof body.address1 === 'string' ? body.address1.trim() : '',
    city: typeof body.city === 'string' ? body.city.trim() : '',
    region: typeof body.region === 'string' ? body.region.trim() : '',
    postal_code: typeof body.postal_code === 'string' ? body.postal_code.trim() : '',
    country: typeof body.country === 'string' ? body.country.trim() : '',
  };
  const missing = ['full_name', 'address1', 'city', 'country'].filter((key) => !address[key]);
  if (missing.length > 0) {
    return res.status(400).json({ error: 'Missing required address fields', fields: missing });
  }

  try {
    await ensureCustomerAddressColumn(pool);
    const result = await pool.query(
      'UPDATE customers SET saved_address = $1 WHERE customer_id = $2 RETURNING saved_address',
      [address, customerId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    return res.json({ message: 'Address saved successfully', address: result.rows[0].saved_address });
  } catch (err) {
    console.error('Customer address update error:', err);
    return res.status(500).json({ error: 'Failed to save address' });
  }
});

router.put('/password', customerAuthMiddleware, async (req, res) => {
  const pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });
  const customerId = req.user.customer_id;
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current password and new password are required' });
  }
  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    return res.status(400).json({
      error: 'Weak password',
      detail: `New password must be at least ${MIN_PASSWORD_LENGTH} characters`,
    });
  }

  try {
    const result = await pool.query(
      'SELECT password_hash FROM customers WHERE customer_id = $1',
      [customerId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    const valid = await comparePassword(currentPassword, result.rows[0].password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const password_hash = await hashPassword(newPassword);
    await pool.query(
      'UPDATE customers SET password_hash = $1 WHERE customer_id = $2',
      [password_hash, customerId]
    );
    return res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error('Customer password update error:', err);
    return res.status(500).json({ error: 'Failed to update password' });
  }
});

async function ensureCustomerOrderRequestTable(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS customer_order_requests (
      id SERIAL PRIMARY KEY,
      order_id INTEGER NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
      customer_id INTEGER NOT NULL REFERENCES customers(customer_id) ON DELETE CASCADE,
      action_type VARCHAR(20) NOT NULL,
      payload JSONB DEFAULT '{}'::jsonb,
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

async function ensureOrderStatusHistoryTable(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS order_status_history (
      id SERIAL PRIMARY KEY,
      order_id INTEGER NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
      status VARCHAR(50) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
}

async function restockOrderItems(pool, orderId) {
  await pool.query(
    `WITH restock AS (
       SELECT oi.option_id, SUM(oi.quantity)::INTEGER AS qty
       FROM order_items oi
       WHERE oi.order_id = $1
         AND oi.option_id IS NOT NULL
       GROUP BY oi.option_id
     )
     UPDATE product_options po
     SET stock_qty = COALESCE(po.stock_qty, 0) + restock.qty
     FROM restock
     WHERE po.option_id = restock.option_id`,
    [orderId]
  );
}

async function fetchOrderReviewContext(pool, { orderId, customerId }) {
  const orderResult = await pool.query(
    `SELECT
      o.order_id,
      o.customer_id,
      o.store_id,
      o.status AS fulfillment_status,
      COALESCE(pay.payment_status, 'Pending') AS payment_status
    FROM orders o
    LEFT JOIN LATERAL (
      SELECT p.payment_status
      FROM payments p
      WHERE p.order_id = o.order_id
      ORDER BY p.created_at DESC
      LIMIT 1
    ) pay ON true
    WHERE o.order_id = $1`,
    [orderId]
  );
  const order = orderResult.rows[0];
  if (!order) return null;
  if (!canCustomerAccessOrder(order, customerId)) return null;

  const orderedProductsResult = await pool.query(
    `SELECT DISTINCT p.product_id
     FROM order_items oi
     JOIN product_options po ON po.option_id = oi.option_id
     JOIN products p ON p.product_id = po.product_id
     WHERE oi.order_id = $1`,
    [orderId]
  );
  const orderedProductIds = new Set(
    orderedProductsResult.rows
      .map((row) => Number.parseInt(row.product_id, 10))
      .filter(Number.isInteger)
  );

  return { order, orderedProductIds };
}

function dedupeReviewTargetsFromItems(items = []) {
  const seen = new Set();
  const targets = [];
  for (const item of items) {
    const productId = Number.parseInt(item.product_id, 10);
    if (!Number.isInteger(productId) || seen.has(productId)) continue;
    seen.add(productId);
    targets.push({
      product_id: productId,
      product_name: item.product_name || 'Product',
    });
  }
  return targets;
}

async function createReviewForOrder(pool, { customerId, orderId, storeId, productId, rating, comment }) {
  const inserted = await pool.query(
    `INSERT INTO reviews (customer_id, order_id, store_id, product_id, admin_id, rating, comment)
     VALUES ($1, $2, $3, $4, NULL, $5, $6)
     RETURNING review_id, customer_id, order_id, store_id, product_id, rating, comment, review_date`,
    [customerId, orderId, storeId, productId, rating, comment]
  );
  return inserted.rows[0];
}

async function hasExistingReviewForOrderTarget(pool, { customerId, orderId, storeId, productId }) {
  const existing = await pool.query(
    `SELECT review_id
     FROM reviews
     WHERE customer_id = $1
       AND order_id = $2
       AND store_id = $3
       AND (
         ($4::int IS NULL AND product_id IS NULL)
         OR product_id = $4
       )
     LIMIT 1`,
    [customerId, orderId, storeId, productId]
  );
  return Boolean(existing.rows[0]);
}

function alreadyReviewedErrorResponse() {
  return { code: 'ALREADY_REVIEWED', error: 'Review already submitted for this target' };
}

router.get('/orders', customerAuthMiddleware, async (req, res) => {
  const pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });
  const customerId = req.user.customer_id;
  const { page, limit, offset } = parsePagination(req.query);

  try {
    await ensureOrderSequenceColumns(pool);
    const countResult = await pool.query(
      'SELECT COUNT(*)::INTEGER AS total FROM orders WHERE customer_id = $1',
      [customerId]
    );
    const total = countResult.rows[0]?.total || 0;

    const rows = await pool.query(
      `SELECT
        o.order_id,
        o.customer_order_seq,
        o.order_date,
        o.total_amount,
        o.status AS fulfillment_status,
        COALESCE(pay.payment_status, 'Pending') AS payment_status,
        COALESCE(items.item_count, 0) AS item_count,
        COALESCE(items.product_count, 0) AS product_count,
        items.primary_product_name,
        items.primary_image_url,
        COALESCE(rev.reviewed_product_count, 0) AS reviewed_product_count,
        COALESCE(rev.has_store_review, false) AS has_store_review
      FROM orders o
      LEFT JOIN LATERAL (
        SELECT p.payment_status
        FROM payments p
        WHERE p.order_id = o.order_id
        ORDER BY p.created_at DESC
        LIMIT 1
      ) pay ON true
      LEFT JOIN LATERAL (
        SELECT
          COUNT(oi.order_item_id)::INTEGER AS item_count,
          COUNT(DISTINCT p.product_id)::INTEGER AS product_count,
          MIN(p.product_name) AS primary_product_name,
          COALESCE(
            MIN(po.images->>0),
            MIN(p.images->>0)
          ) AS primary_image_url
        FROM order_items oi
        LEFT JOIN product_options po ON po.option_id = oi.option_id
        LEFT JOIN products p ON p.product_id = po.product_id
        WHERE oi.order_id = o.order_id
      ) items ON true
      LEFT JOIN LATERAL (
        SELECT
          COUNT(DISTINCT r.product_id)::INTEGER AS reviewed_product_count,
          BOOL_OR(r.product_id IS NULL) AS has_store_review
        FROM reviews r
        WHERE r.customer_id = o.customer_id
          AND r.store_id = o.store_id
          AND r.order_id = o.order_id
          AND (
            r.product_id IS NULL
            OR r.product_id IN (
              SELECT DISTINCT p2.product_id
              FROM order_items oi2
              JOIN product_options po2 ON po2.option_id = oi2.option_id
              JOIN products p2 ON p2.product_id = po2.product_id
              WHERE oi2.order_id = o.order_id
            )
          )
      ) rev ON true
      WHERE o.customer_id = $1
      ORDER BY o.order_date DESC
      LIMIT $2 OFFSET $3`,
      [customerId, limit, offset]
    );

    return res.json({
      orders: rows.rows.map((order) => ({
        ...order,
        display_status: deriveCustomerDisplayStatus({
          paymentStatus: order.payment_status,
          fulfillmentStatus: order.fulfillment_status,
        }),
        review_state: {
          eligible: isReviewEligibleByStatus({
            paymentStatus: order.payment_status,
            fulfillmentStatus: order.fulfillment_status,
          }),
          has_store_review: Boolean(order.has_store_review),
          reviewed_product_count: Number(order.reviewed_product_count || 0),
          total_product_count: Number(order.product_count || 0),
          all_reviewed: Boolean(order.has_store_review)
            && Number(order.product_count || 0) > 0
            && Number(order.reviewed_product_count || 0) >= Number(order.product_count || 0),
        },
      })),
      page,
      limit,
      total,
    });
  } catch (err) {
    console.error('Customer orders list error:', err);
    return res.status(500).json({ error: 'Failed to fetch order history' });
  }
});

router.get('/orders/:id', customerAuthMiddleware, async (req, res) => {
  const pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });
  const customerId = req.user.customer_id;
  const orderId = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(orderId)) return res.status(400).json({ error: 'Invalid order id' });

  try {
    await ensureOrderSequenceColumns(pool);
    const orderResult = await pool.query(
      `SELECT
        o.order_id,
        o.customer_order_seq,
        o.order_date,
        o.total_amount,
        o.status AS fulfillment_status,
        o.store_id,
        o.customer_id,
        COALESCE(pay.payment_status, 'Pending') AS payment_status
      FROM orders o
      LEFT JOIN LATERAL (
        SELECT p.payment_status
        FROM payments p
        WHERE p.order_id = o.order_id
        ORDER BY p.created_at DESC
        LIMIT 1
      ) pay ON true
      WHERE o.order_id = $1`,
      [orderId]
    );
    const order = orderResult.rows[0];
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (!canCustomerAccessOrder(order, customerId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const itemsResult = await pool.query(
      `SELECT
        oi.order_item_id,
        oi.option_id,
        oi.quantity,
        oi.price,
        p.product_id,
        p.product_name,
        COALESCE(po.images->>0, p.images->>0) AS image_url,
        po.option_name,
        po.option_value
      FROM order_items oi
      LEFT JOIN product_options po ON po.option_id = oi.option_id
      LEFT JOIN products p ON p.product_id = po.product_id
      WHERE oi.order_id = $1
      ORDER BY oi.order_item_id ASC`,
      [orderId]
    );
    const reviewTargets = dedupeReviewTargetsFromItems(itemsResult.rows);
    const productIds = reviewTargets.map((target) => target.product_id);
    const reviewsResult = await pool.query(
      `SELECT review_id, product_id, rating, comment, review_date
       FROM reviews
       WHERE customer_id = $1
         AND store_id = $2
         AND order_id = $3
         AND (
           product_id IS NULL
           OR (array_length($4::int[], 1) IS NOT NULL AND product_id = ANY($4::int[]))
         )`,
      [customerId, order.store_id, orderId, productIds]
    );
    const orderedReviews = [...reviewsResult.rows].sort(
      (a, b) => new Date(b.review_date || 0).getTime() - new Date(a.review_date || 0).getTime()
    );
    const storeReview = orderedReviews.find((row) => row.product_id == null) || null;
    const productReviewsMap = new Map();
    orderedReviews
      .filter((row) => row.product_id != null)
      .forEach((row) => {
        const pid = Number.parseInt(row.product_id, 10);
        if (Number.isInteger(pid) && !productReviewsMap.has(pid)) {
          productReviewsMap.set(pid, row);
        }
      });

    let shipmentResult;
    try {
      shipmentResult = await pool.query(
        `SELECT shipping_name, shipping_address, shipping_phone, shipment_status, tracking_number
         FROM shipments
         WHERE order_id = $1
         ORDER BY shipment_id DESC
         LIMIT 1`,
        [orderId]
      );
    } catch (err) {
      if (err.code !== '42703') throw err;
      shipmentResult = await pool.query(
        `SELECT shipping_name, shipping_address, shipping_phone, shipment_status
         FROM shipments
         WHERE order_id = $1
         ORDER BY shipment_id DESC
         LIMIT 1`,
        [orderId]
      );
    }

    return res.json({
      order: {
        order_id: order.order_id,
        customer_order_seq: order.customer_order_seq,
        order_date: order.order_date,
        total_amount: Number(order.total_amount || 0),
        payment_status: order.payment_status,
        fulfillment_status: order.fulfillment_status || shipmentResult.rows[0]?.shipment_status || 'Processing',
        display_status: deriveCustomerDisplayStatus({
          paymentStatus: order.payment_status,
          fulfillmentStatus: order.fulfillment_status || shipmentResult.rows[0]?.shipment_status || 'Processing',
        }),
        shipping: shipmentResult.rows[0] || null,
        items: itemsResult.rows.map((row) => ({
          order_item_id: row.order_item_id,
          option_id: row.option_id,
          product_id: row.product_id,
          product_name: row.product_name || 'Product',
          image_url: row.image_url || null,
          option_name: row.option_name || null,
          option_value: row.option_value || null,
          quantity: Number(row.quantity || 0),
          price: Number(row.price || 0),
          subtotal: Number(row.quantity || 0) * Number(row.price || 0),
          review: (() => {
            const review = productReviewsMap.get(Number.parseInt(row.product_id, 10));
            if (!review) return null;
            return {
              review_id: review.review_id,
              rating: Number(review.rating || 0),
              comment: review.comment || '',
              review_date: review.review_date,
            };
          })(),
        })),
        review_state: {
          eligible: isReviewEligibleByStatus({
            paymentStatus: order.payment_status,
            fulfillmentStatus: order.fulfillment_status || shipmentResult.rows[0]?.shipment_status || 'Processing',
          }),
          store_review: storeReview ? {
            review_id: storeReview.review_id,
            rating: Number(storeReview.rating || 0),
            comment: storeReview.comment || '',
            review_date: storeReview.review_date,
          } : null,
          reviewed_product_count: productReviewsMap.size,
          total_product_count: productIds.length,
          all_reviewed: Boolean(storeReview) && productIds.length > 0 && productReviewsMap.size >= productIds.length,
        },
        review_targets: reviewTargets.map((target) => ({
          ...target,
          reviewed: productReviewsMap.has(target.product_id),
        })),
      },
    });
  } catch (err) {
    console.error('Customer order details error:', err);
    return res.status(500).json({ error: 'Failed to fetch order details' });
  }
});

async function createOrderActionRequest({ pool, orderId, customerId, actionType, payload }) {
  await ensureCustomerOrderRequestTable(pool);
  const result = await pool.query(
    `INSERT INTO customer_order_requests (order_id, customer_id, action_type, payload, status)
     VALUES ($1, $2, $3, $4, 'pending')
     RETURNING id, order_id, customer_id, action_type, status, created_at`,
    [orderId, customerId, actionType, payload || {}]
  );
  return result.rows[0];
}

async function fetchCustomerOwnedOrder(pool, orderId, customerId) {
  const orderResult = await pool.query(
    'SELECT order_id, customer_id, status AS fulfillment_status FROM orders WHERE order_id = $1 AND customer_id = $2',
    [orderId, customerId]
  );
  return orderResult.rows[0] || null;
}

async function handleCancelRequest(req, res) {
  const pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });
  const customerId = req.user.customer_id;
  const orderId = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(orderId)) return res.status(400).json({ error: 'Invalid order id' });

  try {
    const order = await fetchCustomerOwnedOrder(pool, orderId, customerId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    if (normalizeStatus(order.fulfillment_status) === 'delivered') {
      return res.status(400).json({ error: 'Delivered orders cannot be cancelled' });
    }
    if (normalizeStatus(order.fulfillment_status) === 'cancelled') {
      return res.status(400).json({ error: 'Order is already cancelled' });
    }
    const reason = typeof req.body?.reason === 'string' && req.body.reason.trim()
      ? req.body.reason.trim()
      : 'Customer requested cancellation';

    await pool.query('BEGIN');
    await ensureOrderStatusHistoryTable(pool);
    const requestRecord = await createOrderActionRequest({
      pool,
      orderId,
      customerId,
      actionType: ORDER_ACTIONS.CANCEL_REQUEST,
      payload: { reason },
    });
    await pool.query(
      `UPDATE orders
       SET status = 'Cancelled'
       WHERE order_id = $1`,
      [orderId]
    );
    await restockOrderItems(pool, orderId);
    await pool.query(
      `INSERT INTO order_status_history (order_id, status)
       VALUES ($1, 'Cancelled')`,
      [orderId]
    );
    // Cancel is applied in this transaction; keep the audit row out of the admin “pending” queue.
    await pool.query(`UPDATE customer_order_requests SET status = 'completed' WHERE id = $1`, [requestRecord.id]);
    await pool.query('COMMIT');

    return res.status(201).json({
      message: 'Cancel request submitted',
      request: { ...requestRecord, status: 'completed' },
    });
  } catch (err) {
    try { await pool.query('ROLLBACK'); } catch (_) {}
    console.error('Customer cancel request error:', err);
    return res.status(500).json({ error: 'Failed to submit cancel request' });
  }
}

async function handleReturnRequest(req, res) {
  const pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });
  const customerId = req.user.customer_id;
  const orderId = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(orderId)) return res.status(400).json({ error: 'Invalid order id' });

  const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : '';
  if (!reason) {
    return res.status(400).json({ error: 'Reason is required' });
  }

  try {
    const order = await fetchCustomerOwnedOrder(pool, orderId, customerId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    if (normalizeStatus(order.fulfillment_status) !== 'delivered') {
      return res.status(400).json({ error: 'Returns can only be requested for delivered orders' });
    }

    const requestRecord = await createOrderActionRequest({
      pool,
      orderId,
      customerId,
      actionType: ORDER_ACTIONS.RETURN_REQUEST,
      payload: { reason },
    });

    return res.status(201).json({
      message: 'Return request submitted',
      request: requestRecord,
    });
  } catch (err) {
    console.error('Customer return request error:', err);
    return res.status(500).json({ error: 'Failed to submit return request' });
  }
}

router.post('/orders/:id/review', customerAuthMiddleware, async (req, res) => {
  const pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });
  const customerId = req.user.customer_id;
  const orderId = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(orderId)) return res.status(400).json({ error: 'Invalid order id' });

  try {
    const context = await fetchOrderReviewContext(pool, { orderId, customerId });
    if (!context) return res.status(404).json({ error: 'Order not found' });
    const { order, orderedProductIds } = context;

    if (!isReviewEligibleByStatus({
      paymentStatus: order.payment_status,
      fulfillmentStatus: order.fulfillment_status,
    })) {
      return res.status(409).json({ error: 'Order is not eligible for review yet' });
    }

    const storeReviewInput = req.body?.storeReview || null;
    const productReviewsInput = Array.isArray(req.body?.productReviews) ? req.body.productReviews : [];
    if (!storeReviewInput && productReviewsInput.length === 0) {
      return res.status(400).json({ error: 'At least one review entry is required' });
    }

    const created = [];
    if (storeReviewInput) {
      const normalizedStoreReview = normalizeReviewEntry(storeReviewInput);
      const storeReviewError = validateReviewEntry(normalizedStoreReview);
      if (storeReviewError) return res.status(400).json({ error: storeReviewError });
      if (await hasExistingReviewForOrderTarget(pool, {
        customerId,
        orderId,
        storeId: order.store_id,
        productId: null,
      })) {
        return res.status(409).json(alreadyReviewedErrorResponse());
      }
      const row = await createReviewForOrder(pool, {
        customerId,
        orderId,
        storeId: order.store_id,
        productId: null,
        rating: normalizedStoreReview.rating,
        comment: normalizedStoreReview.comment,
      });
      created.push(row);
    }

    for (const rawProductReview of productReviewsInput) {
      const normalizedProductReview = normalizeReviewEntry(rawProductReview);
      if (!Number.isInteger(normalizedProductReview.productId) || !orderedProductIds.has(normalizedProductReview.productId)) {
        return res.status(400).json({ error: 'Invalid product review target for this order' });
      }
      const entryError = validateReviewEntry(normalizedProductReview);
      if (entryError) return res.status(400).json({ error: entryError });
      if (await hasExistingReviewForOrderTarget(pool, {
        customerId,
        orderId,
        storeId: order.store_id,
        productId: normalizedProductReview.productId,
      })) {
        return res.status(409).json(alreadyReviewedErrorResponse());
      }
      const row = await createReviewForOrder(pool, {
        customerId,
        orderId,
        storeId: order.store_id,
        productId: normalizedProductReview.productId,
        rating: normalizedProductReview.rating,
        comment: normalizedProductReview.comment,
      });
      created.push(row);
    }

    return res.status(201).json({
      message: 'Review submitted successfully',
      duplicate_rule: 'One review per customer per order target (store or product). Duplicate submissions are rejected.',
      reviews: created.map((row) => ({
        review_id: row.review_id,
        order_id: row.order_id,
        product_id: row.product_id,
        rating: Number(row.rating || 0),
        comment: row.comment || '',
        review_date: row.review_date,
      })),
    });
  } catch (err) {
    if (err?.code === '23505') {
      return res.status(409).json(alreadyReviewedErrorResponse());
    }
    console.error('Customer review submit error:', err);
    return res.status(500).json({ error: 'Failed to submit review' });
  }
});

router.post('/orders/:id/return-request', customerAuthMiddleware, async (req, res) => {
  return handleReturnRequest(req, res);
});

router.post('/orders/:id/cancel-request', customerAuthMiddleware, async (req, res) => {
  return handleCancelRequest(req, res);
});





router.get('/', authMiddleware, async (req, res) => {
  const pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });
  const { store_owner_id } = req.user;
  try {
    const store_id = await getStoreId(pool, store_owner_id);
    if (!store_id) return res.json({ customers: [] });

    const sql = `
      SELECT DISTINCT
        c.customer_id,
        c.first_name,
        c.last_name,
        c.email,
        c.phone,
        COALESCE(MIN(o.order_date), c.created_at) AS first_order_at,
        COALESCE(MAX(o.order_date), c.created_at) AS last_order_at,
        COALESCE(SUM(o.total_amount), 0) AS total_spend,
        COUNT(o.order_id) AS orders_count
      FROM customers c
      JOIN orders o ON o.customer_id = c.customer_id
      WHERE o.store_id = $1
      GROUP BY c.customer_id, c.first_name, c.last_name, c.email, c.phone, c.created_at
      ORDER BY last_order_at DESC
    `;
    const result = await pool.query(sql, [store_id]);
    res.json({ customers: result.rows });
  } catch (err) {
    console.error('Owner customers list:', err);
    res.status(500).json({ error: 'Failed to load customers' });
  }
});





router.get('/:id', authMiddleware, async (req, res) => {
  const pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });
  const { store_owner_id } = req.user;
  const customerId = parseInt(req.params.id, 10);
  if (Number.isNaN(customerId)) return res.status(400).json({ error: 'Invalid customer id' });
  try {
    const store_id = await getStoreId(pool, store_owner_id);
    if (!store_id) return res.status(404).json({ error: 'Store not found' });

    const profileSql = `
      SELECT
        c.customer_id,
        c.first_name,
        c.last_name,
        c.email,
        c.phone
      FROM customers c
      WHERE c.customer_id = $1
        AND EXISTS (
          SELECT 1 FROM orders o
          WHERE o.store_id = $2 AND o.customer_id = c.customer_id
        )
    `;
    const profileResult = await pool.query(profileSql, [customerId, store_id]);
    if (!profileResult.rows[0]) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const ordersSql = `
      SELECT
        o.order_id,
        o.order_date,
        o.total_amount,
        o.status AS fulfillment_status,
        (
          SELECT p.payment_status FROM payments p
          WHERE p.order_id = o.order_id
          ORDER BY p.created_at DESC LIMIT 1
        ) AS payment_status
      FROM orders o
      WHERE o.store_id = $1 AND o.customer_id = $2
      ORDER BY o.order_date DESC
    `;
    const ordersResult = await pool.query(ordersSql, [store_id, customerId]);

    const summarySql = `
      SELECT
        COALESCE(SUM(o.total_amount), 0) AS total_spend,
        COUNT(o.order_id) AS orders_count,
        MIN(o.order_date) AS first_order_at,
        MAX(o.order_date) AS last_order_at
      FROM orders o
      WHERE o.store_id = $1 AND o.customer_id = $2
    `;
    const summaryResult = await pool.query(summarySql, [store_id, customerId]);
    const summary = summaryResult.rows[0] || {
      total_spend: 0,
      orders_count: 0,
      first_order_at: null,
      last_order_at: null,
    };

    res.json({
      customer: profileResult.rows[0],
      summary,
      orders: ordersResult.rows,
    });
  } catch (err) {
    console.error('Owner customers detail:', err);
    res.status(500).json({ error: 'Failed to load customer' });
  }
});

module.exports = router;
module.exports.__testables = {
  isReviewEligibleByStatus,
  normalizeReviewEntry,
  validateReviewEntry,
  dedupeReviewTargetsFromItems,
  createReviewForOrder,
  hasExistingReviewForOrderTarget,
  alreadyReviewedErrorResponse,
};
