const express = require('express');
const { getStoreId } = require('../utils/getStoreId');

const router = express.Router();


async function ensureStatusHistoryTable(queryable) {
  try {
    await queryable.query(`
      CREATE TABLE IF NOT EXISTS order_status_history (
        id SERIAL PRIMARY KEY,
        order_id INTEGER NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
        status VARCHAR(50) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
  } catch (err) {
    console.warn('Could not ensure order_status_history table:', err.message);
  }
}

async function ensureCustomerOrderRequestTable(queryable) {
  await queryable.query(`
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

async function ensureOrderSequenceColumns(queryable) {
  await queryable.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS store_order_seq INTEGER');
  await queryable.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_order_seq INTEGER');
}

const FULFILLMENT_STATUSES = ['Processing', 'Packed', 'Shipped', 'Delivered', 'Cancelled'];

function ensureStoreOrder(pool, order_id, store_owner_id) {
  return pool.query(
    `SELECT o.order_id FROM orders o
     JOIN stores s ON s.store_id = o.store_id
     WHERE o.order_id = $1 AND s.store_owner_id = $2`,
    [order_id, store_owner_id]
  ).then(r => (r.rows[0] ? r.rows[0].order_id : null));
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


router.get('/analytics/summary', async (req, res) => {
  const pool = req.app.locals.pool;
  const { store_owner_id } = req.user;
  try {
    await ensureOrderSequenceColumns(pool);
    const store_id = await getStoreId(pool, store_owner_id);
    if (!store_id) {
      return res.json({
        total_sales: 0,
        total_orders: 0,
        sales_by_date: [],
        best_selling_products: [],
      });
    }

    const totalsSql = `
      SELECT
        COALESCE(SUM(o.total_amount), 0) AS total_sales,
        COUNT(*)::INTEGER AS total_orders
      FROM orders o
      WHERE o.store_id = $1
    `;
    const totalsResult = await pool.query(totalsSql, [store_id]);
    const totalsRow = totalsResult.rows[0] || { total_sales: 0, total_orders: 0 };

    const salesByDateSql = `
      SELECT
        DATE_TRUNC('day', o.order_date)::date AS day,
        COALESCE(SUM(o.total_amount), 0) AS total_sales,
        COUNT(*)::INTEGER AS orders_count
      FROM orders o
      WHERE o.store_id = $1
        AND o.order_date >= NOW() - INTERVAL '30 days'
      GROUP BY day
      ORDER BY day ASC
    `;
    const salesByDateResult = await pool.query(salesByDateSql, [store_id]);

    const bestSellersSql = `
      SELECT
        p.product_id,
        COALESCE(p.product_name, 'Product') AS product_name,
        COALESCE(SUM(oi.quantity), 0) AS units_sold
      FROM orders o
      JOIN order_items oi ON oi.order_id = o.order_id
      JOIN product_options po ON po.option_id = oi.option_id
      JOIN products p ON p.product_id = po.product_id
      WHERE o.store_id = $1
      GROUP BY p.product_id, p.product_name
      ORDER BY units_sold DESC
      LIMIT 5
    `;
    const bestSellersResult = await pool.query(bestSellersSql, [store_id]);

    const safeTotals = totalsRow || { total_sales: 0, total_orders: 0 };
    return res.json({
      total_sales: Number(safeTotals.total_sales || 0),
      total_orders: safeTotals.total_orders || 0,
      sales_by_date: salesByDateResult.rows.map((row) => ({
        date: row.day,
        total_sales: Number(row.total_sales || 0),
        orders_count: row.orders_count || 0,
      })),
      best_selling_products: bestSellersResult.rows.map((row) => ({
        product_id: row.product_id,
        product_name: row.product_name,
        units_sold: Number(row.units_sold || 0),
      })),
    });
  } catch (err) {
    console.error('orders analytics summary:', err);
    res.status(500).json({ error: 'Failed to load analytics summary' });
  }
});


router.get('/', async (req, res) => {
  const pool = req.app.locals.pool;
  const { store_owner_id } = req.user;
  try {
    const store_id = await getStoreId(pool, store_owner_id);
    if (!store_id) return res.json({ orders: [], total: 0, page: 1, limit: 10 });

    const search = (req.query.search || '').trim();
    const payment_status = (req.query.payment_status || '').trim();
    const fulfillment_status = (req.query.fulfillment_status || '').trim();
    const date_from = (req.query.date_from || '').trim();
    const date_to = (req.query.date_to || '').trim();
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const offset = (page - 1) * limit;

    let where = 'o.store_id = $1';
    const params = [store_id];
    let n = 2;

    if (search) {
      where += ` AND (o.order_id::TEXT = $${n} OR c.first_name ILIKE $${n + 1} OR c.last_name ILIKE $${n + 1} OR (c.first_name || ' ' || c.last_name) ILIKE $${n + 1})`;
      params.push(search, `%${search}%`);
      n += 2;
    }
    if (fulfillment_status) {
      where += ` AND o.status = $${n}`;
      params.push(fulfillment_status);
      n++;
    }
    if (date_from) {
      where += ` AND o.order_date >= $${n}::timestamptz`;
      params.push(date_from);
      n++;
    }
    if (date_to) {
      where += ` AND o.order_date <= ($${n}::date + interval '1 day')::timestamptz`;
      params.push(date_to);
      n++;
    }
    if (payment_status) {
      where += ` AND pay.payment_status = $${n}`;
      params.push(payment_status);
      n++;
    }

    const countSql = `
      SELECT COUNT(*)::INTEGER AS total
      FROM orders o
      LEFT JOIN customers c ON c.customer_id = o.customer_id
      LEFT JOIN LATERAL (
        SELECT p.payment_status FROM payments p WHERE p.order_id = o.order_id ORDER BY p.created_at DESC LIMIT 1
      ) pay ON true
      WHERE ${where}
    `;
    const countResult = await pool.query(countSql, params);
    const total = countResult.rows[0].total;

    params.push(limit, offset);
    const listSql = `
      SELECT o.order_id, o.store_order_seq, o.order_date, o.status AS fulfillment_status, o.total_amount,
             c.customer_id, c.first_name, c.last_name,
             pay.payment_status, pay.method AS payment_method
      FROM orders o
      LEFT JOIN customers c ON c.customer_id = o.customer_id
      LEFT JOIN LATERAL (
        SELECT p.payment_status, p.method FROM payments p WHERE p.order_id = o.order_id ORDER BY p.created_at DESC LIMIT 1
      ) pay ON true
      WHERE ${where}
      ORDER BY o.order_date DESC
      LIMIT $${n} OFFSET $${n + 1}
    `;
    const listResult = await pool.query(listSql, params);

    const orders = listResult.rows.map(row => ({
      order_id: row.order_id,
      store_order_seq: row.store_order_seq,
      customer_name: [row.first_name, row.last_name].filter(Boolean).join(' ') || '—',
      order_date: row.order_date,
      total_amount: row.total_amount,
      payment_status: row.payment_status || 'Pending',
      fulfillment_status: row.fulfillment_status || 'Processing',
      payment_method: row.payment_method,
    }));

    res.json({ orders, total, page, limit });
  } catch (err) {
    console.error('orders list:', err);
    res.status(500).json({ error: 'Failed to list orders' });
  }
});


router.get('/:id', async (req, res) => {
  const pool = req.app.locals.pool;
  const { store_owner_id } = req.user;
  const order_id = parseInt(req.params.id, 10);
  if (Number.isNaN(order_id)) return res.status(400).json({ error: 'Invalid order id' });
  try {
    await ensureOrderSequenceColumns(pool);
    const allowed = await ensureStoreOrder(pool, order_id, store_owner_id);
    if (!allowed) return res.status(404).json({ error: 'Order not found' });

    const orderRow = await pool.query(
      `SELECT o.order_id, o.store_order_seq, o.order_date, o.status AS fulfillment_status, o.total_amount, o.customer_id
       FROM orders o WHERE o.order_id = $1`,
      [order_id]
    );
    if (!orderRow.rows[0]) return res.status(404).json({ error: 'Order not found' });
    const order = orderRow.rows[0];

    const paymentRow = await pool.query(
      'SELECT payment_status, method FROM payments WHERE order_id = $1 ORDER BY created_at DESC LIMIT 1',
      [order_id]
    );
    order.payment_status = paymentRow.rows[0]?.payment_status || 'Pending';
    order.payment_method = paymentRow.rows[0]?.method || null;

    const customerRow = await pool.query(
      'SELECT first_name, last_name, email, phone FROM customers WHERE customer_id = $1',
      [order.customer_id]
    );
    const c = customerRow.rows[0];
    order.customer = c ? {
      name: [c.first_name, c.last_name].filter(Boolean).join(' '),
      email: c.email,
      phone: c.phone,
    } : null;

    const shipRow = await pool.query(
      'SELECT shipping_name, shipping_address, shipping_phone FROM shipments WHERE order_id = $1 ORDER BY shipment_id DESC LIMIT 1',
      [order_id]
    );
    const ship = shipRow.rows[0];
    order.shipping_address = ship?.shipping_address || null;
    order.shipping_name = ship?.shipping_name || (order.customer?.name) || null;
    order.shipping_phone = ship?.shipping_phone || (order.customer?.phone) || null;

    const itemsResult = await pool.query(
      `SELECT oi.order_item_id, oi.option_id, oi.quantity, oi.price,
              p.product_id, p.product_name,
              p.images->>0 AS product_image,
              po.images->>0 AS option_image
       FROM order_items oi
       LEFT JOIN product_options po ON po.option_id = oi.option_id
       LEFT JOIN products p ON p.product_id = po.product_id
       WHERE oi.order_id = $1
       ORDER BY oi.order_item_id`,
      [order_id]
    );
    order.items = itemsResult.rows.map(row => ({
      order_item_id: row.order_item_id,
      option_id: row.option_id,
      product_name: row.product_name || 'Product',
      product_image: row.option_image || row.product_image,
      variant: row.option_name && row.option_value ? `${row.option_name}: ${row.option_value}` : null,
      quantity: row.quantity,
      price: row.price,
      subtotal: Number(row.quantity) * Number(row.price),
    }));

    let statusHistory = [];
    try {
      await ensureStatusHistoryTable(pool);
      const historyResult = await pool.query(
        'SELECT id, status, created_at FROM order_status_history WHERE order_id = $1 ORDER BY created_at ASC',
        [order_id]
      );
      statusHistory = historyResult.rows;
    } catch (histErr) {
      console.warn('order_status_history query failed (table may not exist):', histErr.message);
    }
    order.status_history = statusHistory;
    if (order.status_history.length === 0 && order.fulfillment_status) {
      order.status_history = [{ status: order.fulfillment_status, created_at: order.order_date }];
    }

    res.json({ order: order });
  } catch (err) {
    console.error('orders get:', err);
    res.status(500).json({ error: 'Failed to get order' });
  }
});


router.put('/:id/status', async (req, res) => {
  const pool = req.app.locals.pool;
  const { store_owner_id } = req.user;
  const order_id = parseInt(req.params.id, 10);
  const { fulfillment_status } = req.body || {};
  if (Number.isNaN(order_id)) return res.status(400).json({ error: 'Invalid order id' });
  if (!FULFILLMENT_STATUSES.includes(fulfillment_status)) {
    return res.status(400).json({ error: 'Invalid fulfillment_status. Use: Processing, Packed, Shipped, Delivered, Cancelled' });
  }
  try {
    const allowed = await ensureStoreOrder(pool, order_id, store_owner_id);
    if (!allowed) return res.status(404).json({ error: 'Order not found' });

    const currentStatusResult = await pool.query(
      'SELECT status FROM orders WHERE order_id = $1',
      [order_id]
    );
    const currentStatus = String(currentStatusResult.rows[0]?.status || '').toLowerCase();

    await pool.query('BEGIN');
    await pool.query('UPDATE orders SET status = $1 WHERE order_id = $2', [fulfillment_status, order_id]);
    if (fulfillment_status === 'Cancelled' && currentStatus !== 'cancelled') {
      await restockOrderItems(pool, order_id);
    }
    try {
      await ensureStatusHistoryTable(pool);
      await pool.query(
        'INSERT INTO order_status_history (order_id, status) VALUES ($1, $2)',
        [order_id, fulfillment_status]
      );
    } catch (histErr) {
      console.warn('Could not insert order_status_history:', histErr.message);
    }
    await pool.query('COMMIT');

    const updated = await pool.query(
      'SELECT order_id, status AS fulfillment_status FROM orders WHERE order_id = $1',
      [order_id]
    );
    const history = await pool.query(
      'SELECT id, status, created_at FROM order_status_history WHERE order_id = $1 ORDER BY created_at ASC',
      [order_id]
    );
    res.json({
      order: updated.rows[0],
      status_history: history.rows,
      message: 'Status updated',
    });
  } catch (err) {
    try { await pool.query('ROLLBACK'); } catch (_) {}
    console.error('orders status:', err);
    res.status(500).json({ error: 'Failed to update status' });
  }
});


router.put('/:id/cancel', async (req, res) => {
  const pool = req.app.locals.pool;
  const { store_owner_id } = req.user;
  const order_id = parseInt(req.params.id, 10);
  if (Number.isNaN(order_id)) return res.status(400).json({ error: 'Invalid order id' });
  try {
    const allowed = await ensureStoreOrder(pool, order_id, store_owner_id);
    if (!allowed) return res.status(404).json({ error: 'Order not found' });

    const currentStatusResult = await pool.query(
      'SELECT status FROM orders WHERE order_id = $1',
      [order_id]
    );
    const currentStatus = String(currentStatusResult.rows[0]?.status || '').toLowerCase();

    await pool.query('BEGIN');
    await pool.query("UPDATE orders SET status = 'Cancelled' WHERE order_id = $1", [order_id]);
    if (currentStatus !== 'cancelled') {
      await restockOrderItems(pool, order_id);
    }
    try {
      await ensureStatusHistoryTable(pool);
      await pool.query(
        "INSERT INTO order_status_history (order_id, status) VALUES ($1, 'Cancelled')",
        [order_id]
      );
    } catch (histErr) {
      console.warn('Could not insert order_status_history (cancel):', histErr.message);
    }
    await pool.query('COMMIT');

    const updated = await pool.query(
      'SELECT order_id, status AS fulfillment_status FROM orders WHERE order_id = $1',
      [order_id]
    );
    const history = await pool.query(
      'SELECT id, status, created_at FROM order_status_history WHERE order_id = $1 ORDER BY created_at ASC',
      [order_id]
    );
    res.json({
      order: updated.rows[0],
      status_history: history.rows,
      message: 'Order cancelled',
    });
  } catch (err) {
    try { await pool.query('ROLLBACK'); } catch (_) {}
    console.error('orders cancel:', err);
    res.status(500).json({ error: 'Failed to cancel order' });
  }
});

router.get('/:id/return-requests', async (req, res) => {
  const pool = req.app.locals.pool;
  const { store_owner_id } = req.user;
  const order_id = parseInt(req.params.id, 10);
  if (Number.isNaN(order_id)) return res.status(400).json({ error: 'Invalid order id' });

  try {
    const allowed = await ensureStoreOrder(pool, order_id, store_owner_id);
    if (!allowed) return res.status(404).json({ error: 'Order not found' });
    await ensureCustomerOrderRequestTable(pool);
    const result = await pool.query(
      `SELECT id, action_type, payload, status, created_at
       FROM customer_order_requests
       WHERE order_id = $1
         AND action_type = 'return'
       ORDER BY created_at DESC`,
      [order_id]
    );
    return res.json({ requests: result.rows });
  } catch (err) {
    console.error('order return requests list error:', err);
    return res.status(500).json({ error: 'Failed to load return requests' });
  }
});

router.put('/return-requests/:requestId', async (req, res) => {
  const pool = req.app.locals.pool;
  const { store_owner_id } = req.user;
  const requestId = parseInt(req.params.requestId, 10);
  if (Number.isNaN(requestId)) return res.status(400).json({ error: 'Invalid request id' });
  const decision = String(req.body?.decision || '').toLowerCase();
  if (!['approved', 'rejected'].includes(decision)) {
    return res.status(400).json({ error: "Invalid decision value. Use 'approved' or 'rejected'" });
  }

  try {
    await ensureCustomerOrderRequestTable(pool);
    await ensureStatusHistoryTable(pool);
    const requestResult = await pool.query(
      `SELECT cor.id, cor.order_id, cor.action_type
       FROM customer_order_requests cor
       JOIN orders o ON o.order_id = cor.order_id
       JOIN stores s ON s.store_id = o.store_id
       WHERE cor.id = $1
         AND cor.action_type = 'return'
         AND s.store_owner_id = $2`,
      [requestId, store_owner_id]
    );
    const requestRow = requestResult.rows[0];
    if (!requestRow) {
      return res.status(404).json({ error: 'Return request not found' });
    }

    const nextOrderStatus = decision === 'approved' ? 'Return Approved' : 'Return Rejected';
    await pool.query('BEGIN');
    await pool.query(
      `UPDATE customer_order_requests
       SET status = $1
       WHERE id = $2`,
      [decision, requestId]
    );
    await pool.query(
      `UPDATE orders
       SET status = $1
       WHERE order_id = $2`,
      [nextOrderStatus, requestRow.order_id]
    );
    await pool.query(
      `INSERT INTO order_status_history (order_id, status)
       VALUES ($1, $2)`,
      [requestRow.order_id, nextOrderStatus]
    );
    await pool.query('COMMIT');

    return res.json({
      message: 'Return request updated',
      request_id: requestId,
      decision,
      order_id: requestRow.order_id,
      order_status: nextOrderStatus,
    });
  } catch (err) {
    try { await pool.query('ROLLBACK'); } catch (_) {}
    console.error('order return request decision error:', err);
    return res.status(500).json({ error: 'Failed to update return request' });
  }
});

module.exports = router;