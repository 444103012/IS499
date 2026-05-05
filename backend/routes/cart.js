const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const customerAuth = require('../middleware/customerAuth');
const { isStoreActive } = require('../utils/storeVisibility');
const { computeTotals, parseKey, revalidateCartItems, mergeGuestCartItems } = require('../utils/cartRevalidation');
const { getCart, setCart } = require('../utils/cartStorage');

function cartKey(productId, variantId) {
  return variantId ? `${productId}_${variantId}` : String(productId);
}

async function validateProductAndVariant(pool, productId, variantId, quantity) {
  const pid = parseInt(productId, 10);
  if (!productId || isNaN(pid)) return { error: 'Invalid product' };

  const prod = await pool.query(
    `SELECT
       product_id,
       store_id,
       product_name,
       title,
       price,
       status,
       images,
       images->>0 AS image
     FROM products
     WHERE product_id = $1`,
    [pid]
  );
  if (!prod.rows[0]) return { error: 'Product not found' };
  const p = prod.rows[0];
  if (p.status !== 'Active') return { error: 'Product not available' };
  if (!(await isStoreActive(pool, p.store_id))) return { error: 'Store not available' };

  let unitPrice = parseFloat(p.price);
  let optionRow = null;

  let available = 0;
  if (variantId) {
    const vid = parseInt(variantId, 10);
    if (isNaN(vid)) return { error: 'Invalid variant' };
    const opt = await pool.query(
      'SELECT option_id, option_name, option_value, stock_qty, additional_price FROM product_options WHERE product_id = $1 AND option_id = $2',
      [pid, vid]
    );
    if (!opt.rows[0]) return { error: 'Variant not found' };
    optionRow = opt.rows[0];
    unitPrice += parseFloat(optionRow.additional_price || 0);
    available = parseInt(optionRow.stock_qty, 10) || 0;
    if (quantity > available) return { error: 'OUT_OF_STOCK', available };
  } else {
    const opts = await pool.query(
      'SELECT SUM(stock_qty) AS total FROM product_options WHERE product_id = $1',
      [pid]
    );
    const totalOpt = opts.rows[0] && opts.rows[0].total != null ? parseInt(opts.rows[0].total, 10) : null;
    available = totalOpt != null ? totalOpt : 999999;
    if (available === 0) return { error: 'OUT_OF_STOCK', available: 0 };
    if (quantity > available) return { error: 'OUT_OF_STOCK', available };
  }

  return { product: p, unitPrice, optionRow, available };
}





async function getAvailableStock(pool, productId, variantId) {
  const pid = parseInt(productId, 10);
  if (variantId) {
    const r = await pool.query(
      'SELECT stock_qty FROM product_options WHERE product_id = $1 AND option_id = $2',
      [pid, parseInt(variantId, 10)]
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


router.use(customerAuth);

router.post('/revalidate', async (req, res) => {
  const pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'INTERNAL_ERROR' });
  try {
    const items = await getCart(pool, req.customerId);
    const result = await revalidateCartItems(items, {
      validateProductAndVariant: (productId, variantId, quantity) =>
        validateProductAndVariant(pool, productId, variantId, quantity),
    });
    if (result.changed) {
      await setCart(pool, req.customerId, result.items);
    }
    return res.json(result);
  } catch (err) {
    console.error('Cart revalidate error:', err);
    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});


router.get('/', async (req, res) => {
  const pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'INTERNAL_ERROR', requestId: crypto.randomUUID ? crypto.randomUUID() : undefined });
  try {
    const items = await getCart(pool, req.customerId);
    const totals = computeTotals(items);
    return res.json({ items, totals, warnings: [] });
  } catch (err) {
    console.error('Cart get error:', err);
    return res.status(500).json({ error: 'Failed to load cart' });
  }
});


router.post('/add', async (req, res) => {
  const pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });
  const { productId, variantId, quantity: qty = 1, title, image, options } = req.body || {};
  const quantity = Math.max(1, parseInt(qty, 10) || 1);

  const valid = await validateProductAndVariant(pool, productId, variantId || null, quantity);
  if (valid.error) {
    if (valid.error === 'OUT_OF_STOCK') {
      return res.status(409).json({ error: 'OUT_OF_STOCK', code: 'OUT_OF_STOCK', available: valid.available, message: 'Requested quantity exceeds available stock.' });
    }
    let code = 'INVALID_PAYLOAD';
    if (valid.error === 'Invalid variant' || valid.error === 'Variant not found') {
      code = 'INVALID_VARIANT';
    } else if (valid.error === 'Product not found' || valid.error === 'Product not available' || valid.error === 'Store not available') {
      code = 'INVALID_PRODUCT';
    }
    return res.status(400).json({ error: code });
  }

  const key = cartKey(productId, variantId || null);
  const effectivePrice = valid.unitPrice;
  const subtotal = effectivePrice * quantity;

  
  let itemOptions = null;
  if (Array.isArray(options) && options.length > 0) {
    const normalized = options.filter(
      (o) => o && typeof o.option_name === 'string' && typeof o.option_value === 'string'
    );
    if (normalized.length > 0) {
      itemOptions = normalized;
    }
  } else if (
    valid.optionRow &&
    typeof valid.optionRow.option_name === 'string' &&
    typeof valid.optionRow.option_value === 'string'
  ) {
    itemOptions = [{
      option_name: valid.optionRow.option_name,
      option_value: valid.optionRow.option_value,
    }];
  }

  const newItem = {
    key,
    productId: parseInt(productId, 10),
    title: title || valid.product.product_name || valid.product.title,
    image: image || valid.product.image || (valid.product.images && valid.product.images[0]) || null,
    variantId: variantId ? parseInt(variantId, 10) : null,
    options: itemOptions,
    unitPrice: effectivePrice,
    quantity,
    subtotal,
  };

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const lockRow = await client.query(
      'SELECT customer_id FROM customers WHERE customer_id = $1 FOR UPDATE',
      [req.customerId]
    );
    if (!lockRow.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'CUSTOMER_NOT_FOUND' });
    }
    let items = await getCart(pool, req.customerId);
    const existing = items.find((i) => i.key === key);
    if (existing) {
      const newQty = (existing.quantity || 0) + quantity;
      const available = await getAvailableStock(pool, productId, variantId || null);
      if (newQty > available) {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: 'OUT_OF_STOCK', available });
      }
      existing.quantity = newQty;
      existing.unitPrice = effectivePrice;
      existing.subtotal = effectivePrice * newQty;
    } else {
      items = [...items, newItem];
    }
    console.debug && console.debug('[cart] options:', newItem.options);
    await setCart(pool, req.customerId, items);
    await client.query('COMMIT');
    const totals = computeTotals(items);
    return res.json({ items, totals, warnings: [] });
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    const requestId = crypto.randomUUID ? crypto.randomUUID() : undefined;
    console.error('Cart add error:', {
      requestId,
      customerId: req.customerId,
      payload: { productId, variantId: variantId || null, quantity },
      message: err.message,
      code: err.code,
      stack: err.stack,
    });
    return res.status(500).json({ error: 'INTERNAL_ERROR', requestId });
  } finally {
    client.release();
  }
});


router.put('/update', async (req, res) => {
  const pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'INTERNAL_ERROR', requestId: crypto.randomUUID ? crypto.randomUUID() : undefined });
  const { key, quantity: qty } = req.body || {};
  if (!key || typeof key !== 'string') return res.status(400).json({ error: 'INVALID_PAYLOAD' });
  const quantity = Math.max(0, parseInt(qty, 10) ?? 0);

  try {
    let items = await getCart(pool, req.customerId);
    const idx = items.findIndex((i) => i.key === key);
    if (idx === -1) return res.status(404).json({ error: 'ITEM_NOT_FOUND' });

    if (quantity === 0) {
      items.splice(idx, 1);
    } else {
      const item = items[idx];
      const { productId, variantId } = parseKey(item);
      const available = await getAvailableStock(pool, productId, variantId);
      if (quantity > available) return res.status(409).json({ error: 'OUT_OF_STOCK', code: 'OUT_OF_STOCK', available, message: 'Requested quantity exceeds available stock.' });
      const effectivePrice = await (async () => {
        const prod = await pool.query('SELECT price FROM products WHERE product_id = $1', [parseInt(productId, 10)]);
        if (!prod.rows[0]) return item.unitPrice || 0;
        let price = parseFloat(prod.rows[0].price) || 0;
        if (variantId) {
          const opt = await pool.query('SELECT additional_price FROM product_options WHERE product_id = $1 AND option_id = $2', [productId, parseInt(variantId, 10)]);
          if (opt.rows[0]) price += parseFloat(opt.rows[0].additional_price) || 0;
        }
        return price;
      })();
      item.quantity = quantity;
      item.unitPrice = effectivePrice;
      item.subtotal = effectivePrice * quantity;
    }
    await setCart(pool, req.customerId, items);
    const totals = computeTotals(items);
    return res.json({ items, totals, warnings: [] });
  } catch (err) {
    const requestId = crypto.randomUUID ? crypto.randomUUID() : undefined;
    console.error('Cart update error:', err, requestId);
    return res.status(500).json({ error: 'INTERNAL_ERROR', requestId });
  }
});


router.delete('/remove/:key', async (req, res) => {
  const pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });
  const { key } = req.params;

  try {
    let items = await getCart(pool, req.customerId);
    items = items.filter((i) => i.key !== key);
    await setCart(pool, req.customerId, items);
    const totals = computeTotals(items);
    return res.json({ items, totals, warnings: [] });
  } catch (err) {
    console.error('Cart remove error:', err);
    return res.status(500).json({ error: 'Failed to remove item' });
  }
});

router.post('/clear', async (req, res) => {
  const pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });

  try {
    await setCart(pool, req.customerId, []);
    return res.json({ items: [], totals: { items: 0, grand: 0 }, warnings: [] });
  } catch (err) {
    console.error('Cart clear error:', err);
    return res.status(500).json({ error: 'Failed to clear cart' });
  }
});


router.post('/merge', async (req, res) => {
  const pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });
  const guestItems = Array.isArray(req.body?.items) ? req.body.items : [];

  try {
    const currentItems = await getCart(pool, req.customerId);
    const merged = await mergeGuestCartItems(currentItems, guestItems, {
      validateProductAndVariant: (productId, variantId, quantity) =>
        validateProductAndVariant(pool, productId, variantId, quantity),
      getAvailableStock: (productId, variantId) => getAvailableStock(pool, productId, variantId),
    });
    const { items, warnings } = merged;
    await setCart(pool, req.customerId, items);
    return res.json({ items, totals: merged.totals, warnings });
  } catch (err) {
    console.error('Cart merge error:', err);
    return res.status(500).json({ error: 'Failed to merge cart' });
  }
});

module.exports = router;
