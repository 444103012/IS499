const express = require('express');
const customerAuth = require('../middleware/customerAuth');
const { getCart } = require('../utils/cartStorage');
const router = express.Router();


const ALL_SHIPPING_OPTIONS = [
  { id: 'NO_SHIPPING', label: 'No shipping needed / Digital', amount: 0, storeKey: 'noShippingNeeded' },
  { id: 'ARAMEX_STD', label: 'Aramex - Standard (2-4 days)', amount: 25.0, storeKey: 'aramex' },
  { id: 'SMSA_EXP', label: 'SMSA - Express (1-2 days)', amount: 45.0, storeKey: 'smsa' },
  { id: 'SPL_STD', label: 'SPL - Standard', amount: 20.0, storeKey: 'spl' },
];

function mapCarrierNameToShippingKey(carrierName) {
  const n = String(carrierName || '').trim().toLowerCase();
  if (n.includes('digital')) return 'noShippingNeeded';
  if (n.includes('smsa')) return 'smsa';
  if (n.includes('aramex')) return 'aramex';
  if (n.includes('spl')) return 'spl';
  return null;
}

async function resolveStoreShippingConfig(pool, storeId) {
  const settingsRow = await pool.query(
    `SELECT shipping FROM store_settings WHERE store_id = $1 LIMIT 1`,
    [storeId]
  );
  let shipping = settingsRow.rows[0]?.shipping;
  if (shipping && typeof shipping === 'object' && Object.keys(shipping).length > 0) {
    return shipping;
  }
  const prov = await pool.query('SELECT carrier_name FROM shipping_providers WHERE store_id = $1', [storeId]);
  const inferred = {};
  for (const r of prov.rows) {
    const k = mapCarrierNameToShippingKey(r.carrier_name);
    if (k) inferred[k] = { enabled: true, zones: [] };
  }
  return inferred;
}

function isCarrierEnabledInSettings(shipping, storeKey) {
  const entry = shipping && typeof shipping === 'object' ? shipping[storeKey] : null;
  return !!(entry && entry.enabled === true);
}

async function getEnabledShippingOptions(pool, customerId) {
  const cartItems = await loadCustomerCart(pool, customerId);
  if (!cartItems || cartItems.length === 0) return [];

  const firstProductId = cartItems[0]?.productId;
  if (!firstProductId) return [];

  const storeRow = await pool.query(
    `SELECT s.store_id FROM products p JOIN stores s ON s.store_id = p.store_id WHERE p.product_id = $1 LIMIT 1`,
    [parseInt(firstProductId, 10)]
  );
  if (!storeRow.rows.length) return [];
  const storeId = storeRow.rows[0].store_id;

  const shipping = await resolveStoreShippingConfig(pool, storeId);
  const hasAnyConfig =
    (shipping && typeof shipping === 'object' && Object.keys(shipping).length > 0);

  if (!hasAnyConfig) {
    return ALL_SHIPPING_OPTIONS;
  }

  const enabled = ALL_SHIPPING_OPTIONS.filter((opt) => isCarrierEnabledInSettings(shipping, opt.storeKey));
  return enabled;
}

async function assertShippingMethodAllowedForCustomer(pool, customerId, shippingMethodId) {
  const allowed = await getEnabledShippingOptions(pool, customerId);
  const ok = allowed.some((o) => o.id === shippingMethodId);
  if (!ok) {
    const err = new Error('Shipping method is not enabled for this store');
    err.statusCode = 400;
    err.code = 'SHIPPING_METHOD_NOT_ALLOWED';
    throw err;
  }
}


const DEFAULT_TAX_RATE = 0.15;

async function loadCustomerCart(pool, customerId) {
  return getCart(pool, customerId);
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
       JOIN stores s ON s.store_id = p.store_id
       JOIN subscriptions sub ON sub.store_id = s.store_id
       WHERE po.product_id = $1
         AND po.option_id = $2
         AND s.status = 'Active'
         AND sub.paid_date IS NOT NULL`,
      [pid, vid]
    );
    return r.rows[0] || null;
  }

  const r = await pool.query(
    `SELECT p.product_id, p.store_id, p.price
     FROM products p
     JOIN stores s ON s.store_id = p.store_id
     JOIN subscriptions sub ON sub.store_id = s.store_id
     WHERE p.product_id = $1
       AND s.status = 'Active'
       AND sub.paid_date IS NOT NULL`,
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

async function ensureOrderSequenceColumns(pool) {
  await pool.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS store_order_seq INTEGER');
  await pool.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_order_seq INTEGER');
}


router.use(customerAuth);


router.get('/shipping/options', async (req, res) => {
  const pool = req.app.locals.pool;
  if (!pool) return res.json({ options: [] });
  try {
    const options = await getEnabledShippingOptions(pool, req.customerId);
    return res.json({ options });
  } catch (err) {
    console.error('shipping options error:', err);
    return res.json({ options: [] });
  }
});


router.post('/quote', async (req, res) => {
  const pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });

  const { shippingMethodId } = req.body || {};
  if (!shippingMethodId) {
    return res.status(400).json({ error: 'Shipping method is required' });
  }
  const shipping = ALL_SHIPPING_OPTIONS.find((opt) => opt.id === shippingMethodId);
  if (!shipping) {
    return res.status(400).json({ error: 'Invalid shipping method' });
  }

  try {
    const items = await loadCustomerCart(pool, req.customerId);
    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    try {
      await assertShippingMethodAllowedForCustomer(pool, req.customerId, shippingMethodId);
    } catch (e) {
      if (e.statusCode === 400) {
        return res.status(400).json({ error: e.message, code: e.code });
      }
      throw e;
    }

    const shippingAmountHalalas = toHalalas(shipping.amount);

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

  const shipping = ALL_SHIPPING_OPTIONS.find((opt) => opt.id === shippingMethodId);
  if (!shipping) {
    return res.status(400).json({ error: 'Invalid shipping method' });
  }

  const shippingAmountHalalas = toHalalas(shipping.amount);

  try {
    const items = await loadCustomerCart(pool, req.customerId);
    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    try {
      await assertShippingMethodAllowedForCustomer(pool, req.customerId, shippingMethodId);
    } catch (e) {
      if (e.statusCode === 400) {
        return res.status(400).json({ error: e.message, code: e.code });
      }
      throw e;
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

    await ensureOrderSequenceColumns(pool);
    const seqResult = await pool.query(
      `SELECT
         (SELECT COUNT(*)::INTEGER + 1 FROM orders WHERE store_id = $1) AS store_order_seq,
         (SELECT COUNT(*)::INTEGER + 1 FROM orders WHERE customer_id = $2) AS customer_order_seq`,
      [storeId, req.customerId]
    );
    const storeOrderSeq = seqResult.rows[0]?.store_order_seq || 1;
    const customerOrderSeq = seqResult.rows[0]?.customer_order_seq || 1;

    const orderResult = await pool.query(
      `INSERT INTO orders (store_id, customer_id, total_amount, status, order_date, store_order_seq, customer_order_seq)
       VALUES ($1, $2, $3, $4, NOW(), $5, $6)
       RETURNING order_id, store_order_seq, customer_order_seq`,
      [storeId, req.customerId, fromHalalas(grandTotalHalalas), 'Processing', storeOrderSeq, customerOrderSeq]
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

      // Deduct stock
      if (variantRow.option_id) {
        await pool.query(
          `UPDATE product_options SET stock_qty = GREATEST(0, stock_qty - $1)
           WHERE option_id = $2`,
          [qty, variantRow.option_id]
        );
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
      `SELECT o.order_id, o.customer_id, o.total_amount,
              s.domain_name AS store_slug, s.name AS store_name, s.logo, s.theme
       FROM orders o
       LEFT JOIN stores s ON s.store_id = o.store_id
       WHERE o.order_id = $1 AND o.customer_id = $2`,
      [orderId, req.customerId]
    );
    const order = orderResult.rows[0];
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const [payRow, itemRows] = await Promise.all([
      pool.query(
        'SELECT payment_status FROM payments WHERE order_id = $1 ORDER BY created_at DESC LIMIT 1',
        [orderId]
      ),
      pool.query(
        `SELECT
           oi.quantity,
           oi.price,
           COALESCE(p.product_name, p.title, 'Product') AS product_name,
           po.name AS option_name
         FROM order_items oi
         LEFT JOIN product_options po ON po.option_id = oi.option_id
         LEFT JOIN products p ON p.product_id = po.product_id
         WHERE oi.order_id = $1
         ORDER BY oi.order_item_id ASC`,
        [orderId]
      ).catch(() => ({ rows: [] })),
    ]);

    const storeCtx = order.store_slug
      ? {
          domain_name: order.store_slug,
          name: order.store_name || order.store_slug,
          logo: order.logo || null,
          theme: order.theme || null,
        }
      : null;

    return res.json({
      order: {
        order_id: order.order_id,
        total_amount: order.total_amount,
        payment_status: payRow.rows[0]?.payment_status || 'Pending',
        items: itemRows.rows.map((r) => ({
          product_name: r.product_name,
          option_name: r.option_name || null,
          quantity: r.quantity,
          price: r.price,
        })),
      },
      store: storeCtx,
    });
  } catch (err) {
    console.error('checkout get order error:', err);
    return res.status(500).json({ error: 'Failed to get order' });
  }
});

module.exports = router;

