const express = require('express');
const customerAuth = require('../middleware/customerAuth');
const router = express.Router();
const SHIPPING_OPTIONS = [
  { id: 'ARAMEX_STD', label: 'Aramex - Standard (2-4 days)', amount: 25.0 },
  { id: 'SMSA_EXP', label: 'SMSA - Express (1-2 days)', amount: 45.0 },
];
const DEFAULT_TAX_RATE = 0.15;
async function loadCustomerCart(pool, customerId) {
  try {
    const r = await pool.query(
      'SELECT cart FROM customers WHERE customer_id = $1',
      [customerId]
    );
    if (!r.rows[0]) return [];
    const cart = r.rows[0].cart;
    if (Array.isArray(cart)) return cart;
    if (typeof cart === 'string') {
      try {
        const parsed = JSON.parse(cart);
        return Array.isArray(parsed) ? parsed : [];
      } catch (_) {
        return [];
      }
    }
    return [];
  } catch (err) {
    if (err.code === '42703') return [];
    throw err;
  }
}

async function getVariantAndStore(pool, productId, variantId) {
  const pid = parseInt(productId, 10);
  if (Number.isNaN(pid)) return null;

  if (variantId) {
    const vid = parseInt(variantId, 10);
    if (Number.isNaN(vid)) return null;
    const r = await pool.query(
      `SELECT po.option_id, po.stock_qty, po.additional_price,
              p.product_id, p.store_id, p.price
       FROM product_options po
       JOIN products p ON p.product_id = po.product_id
       WHERE po.product_id = $1 AND po.option_id = $2`,
      [pid, vid]
    );
    return r.rows[0] || null;
  }

  const r = await pool.query(
    'SELECT product_id, store_id, price FROM products WHERE product_id = $1',
    [pid]
  );
  return r.rows[0] || null;
}

async function getAvailableStockForItem(pool, productId, variantId) {
  const pid = parseInt(productId, 10);
  if (Number.isNaN(pid)) return 0;

  if (variantId) {
    const vid = parseInt(variantId, 10);
    if (Number.isNaN(vid)) return 0;
    const r = await pool.query(
      'SELECT stock_qty FROM product_options WHERE product_id = $1 AND option_id = $2',
      [pid, vid]
    );
    return r.rows[0] ? parseInt(r.rows[0].stock_qty, 10) || 0 : 0;
  }

  const r = await pool.query(
    'SELECT COALESCE(SUM(stock_qty), 0) AS total FROM product_options WHERE product_id = $1',
    [pid]
  );
  const total = r.rows[0] && r.rows[0].total != null ? parseInt(r.rows[0].total, 10) : null;
  if (total !== null) return total;
  return 999999;
}

function toHalalas(amountSar) {
  const n = Number(amountSar || 0);
  return Math.round(n * 100);
}

function fromHalalas(amountHalalas) {
  return (amountHalalas || 0) / 100;
}

router.use(customerAuth);

router.get('/shipping/options', async (req, res) => {
  return res.json({ options: SHIPPING_OPTIONS });
});

router.post('/quote', async (req, res) => {
  const pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });

  const { shippingMethodId } = req.body || {};
  const shipping = SHIPPING_OPTIONS.find((opt) => opt.id === shippingMethodId);
  const shippingAmountHalalas = shipping ? toHalalas(shipping.amount) : 0;

  try {
    const items = await loadCustomerCart(pool, req.customerId);
    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    const itemsTotalHalalas = items.reduce((sum, it) => {
      const unit = Number(it.unitPrice || 0);
      const qty = Number(it.quantity || 0);
      return sum + toHalalas(unit) * qty;
    }, 0);

    const taxRate = DEFAULT_TAX_RATE;
    const taxAmountHalalas = Math.round(itemsTotalHalalas * taxRate);
    const grandTotalHalalas = itemsTotalHalalas + shippingAmountHalalas + taxAmountHalalas;

    return res.json({
      itemsTotal: fromHalalas(itemsTotalHalalas),
      shippingAmount: fromHalalas(shippingAmountHalalas),
      taxAmount: fromHalalas(taxAmountHalalas),
      grandTotal: fromHalalas(grandTotalHalalas),
      currency: 'SAR',
      taxRate,
    });
  } catch (err) {
    console.error('checkout quote error:', err);
    return res.status(500).json({ error: 'Failed to calculate quote' });
  }
});

router.post('/create-order', async (req, res) => {
  const pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });

  const { address, shippingMethodId } = req.body || {};
  if (!address || !shippingMethodId) {
    return res.status(400).json({ error: 'Address and shipping method are required' });
  }

  const shipping = SHIPPING_OPTIONS.find((opt) => opt.id === shippingMethodId);
  if (!shipping) {
    return res.status(400).json({ error: 'Invalid shipping method' });
  }

  const shippingAmountHalalas = toHalalas(shipping.amount);

  try {
    const items = await loadCustomerCart(pool, req.customerId);
    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

   
    let storeId = null;
    let itemsTotalHalalas = 0;

    for (const it of items) {
      const qty = Number(it.quantity || 0);
      if (qty <= 0) continue;

      const productId = it.productId;
      const variantId = it.variantId || null;
      const available = await getAvailableStockForItem(pool, productId, variantId);
      if (qty > available) {
        return res.status(409).json({
          error: 'OUT_OF_STOCK',
          productId,
          available,
        });
      }

      const variantRow = await getVariantAndStore(pool, productId, variantId);
      if (!variantRow) {
        return res.status(400).json({ error: 'Product not found', productId });
      }

      if (!storeId) storeId = variantRow.store_id || null;

     
      let unit = Number(variantRow.price || 0);
      if (variantRow.additional_price != null) {
        unit += Number(variantRow.additional_price || 0);
      }
      itemsTotalHalalas += toHalalas(unit) * qty;
    }

    if (!storeId) {
      return res.status(400).json({ error: 'Store not found for cart items' });
    }

    const taxRate = DEFAULT_TAX_RATE;
    const taxAmountHalalas = Math.round(itemsTotalHalalas * taxRate);
    const grandTotalHalalas = itemsTotalHalalas + shippingAmountHalalas + taxAmountHalalas;

   
    await pool.query('BEGIN');

    const orderResult = await pool.query(
      `INSERT INTO orders (store_id, customer_id, total_amount, status, order_date)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING order_id`,
      [storeId, req.customerId, fromHalalas(grandTotalHalalas), 'Processing']
    );
    const orderId = orderResult.rows[0].order_id;

    for (const it of items) {
      const qty = Number(it.quantity || 0);
      if (qty <= 0) continue;
      const productId = it.productId;
      const variantId = it.variantId || null;
      const variantRow = await getVariantAndStore(pool, productId, variantId);
      if (!variantRow) continue;

      let unit = Number(variantRow.price || 0);
      if (variantRow.additional_price != null) {
        unit += Number(variantRow.additional_price || 0);
      }

      try {
        await pool.query(
          `INSERT INTO order_items (order_id, option_id, quantity, price)
           VALUES ($1, $2, $3, $4)`,
          [orderId, variantRow.option_id || null, qty, unit]
        );
      } catch (err) {
        if (err.code !== '42703' && err.code !== '42P01') throw err;
      }
    }

   
    const shippingAddress = JSON.stringify(address);
    const shippingName = address.full_name || address.name || null;
    const shippingPhone = address.phone || null;
    try {
      await pool.query(
        `INSERT INTO shipments (order_id, shipping_name, shipping_address, shipping_phone)
         VALUES ($1, $2, $3, $4)`,
        [orderId, shippingName, shippingAddress, shippingPhone]
      );
    } catch (err) {
      if (err.code !== '42703' && err.code !== '42P01') throw err;
    }

    await pool.query('COMMIT');

    return res.json({
      orderId,
      totals: {
        itemsTotal: fromHalalas(itemsTotalHalalas),
        shippingAmount: fromHalalas(shippingAmountHalalas),
        taxAmount: fromHalalas(taxAmountHalalas),
        grandTotal: fromHalalas(grandTotalHalalas),
        currency: 'SAR',
      },
    });
  } catch (err) {
    console.error('checkout create-order error:', err);
    try { await pool.query('ROLLBACK'); } catch (_) {}
    return res.status(500).json({ error: 'Failed to create order' });
  }
});

router.get('/orders/:id', async (req, res) => {
  const pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });
  const orderId = parseInt(req.params.id, 10);
  if (Number.isNaN(orderId)) return res.status(400).json({ error: 'Invalid order id' });

  try {
    const orderResult = await pool.query(
      'SELECT order_id, customer_id, total_amount FROM orders WHERE order_id = $1 AND customer_id = $2',
      [orderId, req.customerId]
    );
    const order = orderResult.rows[0];
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const payRow = await pool.query(
      'SELECT payment_status FROM payments WHERE order_id = $1 ORDER BY created_at DESC LIMIT 1',
      [orderId]
    );

    return res.json({
      order: {
        order_id: order.order_id,
        total_amount: order.total_amount,
        payment_status: payRow.rows[0]?.payment_status || 'Pending',
      },
    });
  } catch (err) {
    console.error('checkout get order error:', err);
    return res.status(500).json({ error: 'Failed to get order' });
  }
});

module.exports = router;