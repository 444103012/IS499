function normalizeImages(v) {
  if (Array.isArray(v)) return v.filter((s) => typeof s === 'string' && s.trim());
  if (typeof v === 'string') {
    try {
      const parsed = JSON.parse(v);
      return Array.isArray(parsed) ? parsed.filter((s) => typeof s === 'string' && s.trim()) : [];
    } catch (_) { return v.trim() ? [v.trim()] : []; }
  }
  return [];
}

const express = require('express');
const { getStoreId } = require('../utils/getStoreId');
const { uploadProductImage, uploadVariantImage } = require('../middleware/upload');

const router = express.Router();


async function getProductStoreId(pool, product_id, store_owner_id) {
  const r = await pool.query(
    `SELECT p.store_id FROM products p
     JOIN stores s ON s.store_id = p.store_id
     WHERE p.product_id = $1 AND s.store_owner_id = $2`,
    [product_id, store_owner_id]
  );
  return r.rows[0] ? r.rows[0].store_id : null;
}


router.post('/upload-image', uploadProductImage.single('image'), (req, res) => {
  if (!req.file || !req.file.location) return res.status(400).json({ error: 'No image file provided' });
  res.json({ path: req.file.location });
});


router.post('/upload-variant-image', uploadVariantImage.single('image'), (req, res) => {
  if (!req.file || !req.file.location) return res.status(400).json({ error: 'No image file provided' });
  res.json({ path: req.file.location });
});


router.post('/create', async (req, res) => {
  const pool = req.app.locals.pool;
  const { store_owner_id } = req.user;
  try {
    const store_id = await getStoreId(pool, store_owner_id);
    if (!store_id) return res.status(400).json({ error: 'No store found. Complete store setup first.' });

    const { product_name, title, status, price, images, options = [] } = req.body || {};

    const name = (product_name || '').trim();
    if (!name) return res.status(400).json({ error: 'Product name is required' });
    const priceVal = parseFloat(price);
    if (Number.isNaN(priceVal) || priceVal < 0) return res.status(400).json({ error: 'Valid price is required' });
    const statusVal = (status === 'Inactive' ? 'Inactive' : 'Active').trim();
    const titleVal = (title || '').trim() || null;
    const imagesVal = normalizeImages(images);

    const result = await pool.query(
      `INSERT INTO products (store_id, product_name, title, price, status, images)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING product_id, store_id, product_name, title, price, status, images`,
      [store_id, name, titleVal, priceVal, statusVal, JSON.stringify(imagesVal)]
    );
    const product = result.rows[0];
    if (product.images && typeof product.images !== 'object') product.images = product.images && typeof product.images === 'string' ? (() => { try { return JSON.parse(product.images); } catch (_) { return []; } })() : [];
    if (!Array.isArray(product.images)) product.images = [];

    if (Array.isArray(options) && options.length > 0) {
      for (const opt of options) {
        const oName = (opt.option_name || '').trim() || null;
        const oValue = (opt.option_value || '').trim() || null;
        const stock = parseInt(opt.stock_qty, 10);
        const addPrice = parseFloat(opt.additional_price);
        const optImages = normalizeImages(opt.images || opt.image);
        if (oName && oValue != null) {
          await pool.query(
            `INSERT INTO product_options (product_id, option_name, option_value, stock_qty, additional_price, images)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [product.product_id, oName, oValue, Number.isNaN(stock) ? 0 : stock, Number.isNaN(addPrice) ? 0 : addPrice, JSON.stringify(optImages)]
          );
        }
      }
    }

    res.status(201).json({ product, message: 'Product created' });
  } catch (err) {
    console.error('products create:', err);
    res.status(500).json({ error: err.message || 'Failed to create product' });
  }
});


router.get('/categories', async (req, res) => {
  res.json({ categories: [] });
});


router.get('/', async (req, res) => {
  const pool = req.app.locals.pool;
  const { store_owner_id } = req.user;
  try {
    const store_id = await getStoreId(pool, store_owner_id);
    if (!store_id) return res.json({ products: [] });

    const search = (req.query.search || '').trim();
    const statusFilter = (req.query.status || '').trim();

    let sql = `
      SELECT p.product_id, p.store_id, p.product_name, p.title, p.price, p.status, p.images,
             (SELECT COALESCE(SUM(po.stock_qty), 0)::INTEGER FROM product_options po WHERE po.product_id = p.product_id) AS total_stock
      FROM products p
      WHERE p.store_id = $1`;
    const params = [store_id];
    let n = 2;
    if (search) {
      sql += ` AND (p.product_name ILIKE $${n} OR (p.title IS NOT NULL AND p.title ILIKE $${n}))`;
      params.push(`%${search}%`);
      n++;
    }
    if (statusFilter && (statusFilter === 'Active' || statusFilter === 'Inactive')) {
      sql += ` AND p.status = $${n}`;
      params.push(statusFilter);
      n++;
    }
    sql += ` ORDER BY p.product_id DESC`;

    const r = await pool.query(sql, params);
    const products = r.rows.map((row) => {
      const images = row.images != null && typeof row.images === 'object' && Array.isArray(row.images) ? row.images : (typeof row.images === 'string' ? (() => { try { return JSON.parse(row.images); } catch (_) { return []; } })() : []);
      return { ...row, images };
    });
    res.json({ products });
  } catch (err) {
    console.error('products list:', err);
    res.status(500).json({ error: 'Failed to list products' });
  }
});

router.get('/:id', async (req, res) => {
  const pool = req.app.locals.pool;
  const { store_owner_id } = req.user;
  const product_id = parseInt(req.params.id, 10);
  if (Number.isNaN(product_id)) return res.status(400).json({ error: 'Invalid product id' });
  try {
    const store_id = await getProductStoreId(pool, product_id, store_owner_id);
    if (!store_id) return res.status(404).json({ error: 'Product not found' });

    const prod = await pool.query(
      'SELECT product_id, store_id, product_name, title, price, status, images FROM products WHERE product_id = $1',
      [product_id]
    );
    if (prod.rows.length === 0) return res.status(404).json({ error: 'Product not found' });
    const product = prod.rows[0];
    const productImages = product.images != null && typeof product.images === 'object' && Array.isArray(product.images) ? product.images : (typeof product.images === 'string' ? (() => { try { return JSON.parse(product.images); } catch (_) { return []; } })() : []);

    const opts = await pool.query(
      'SELECT option_id, product_id, option_name, option_value, stock_qty, additional_price, images FROM product_options WHERE product_id = $1 ORDER BY option_id',
      [product_id]
    );
    const options = opts.rows.map((o) => {
      const imgs = o.images != null && typeof o.images === 'object' && Array.isArray(o.images) ? o.images : (typeof o.images === 'string' ? (() => { try { return JSON.parse(o.images); } catch (_) { return []; } })() : []);
      return { ...o, images: imgs };
    });

    res.json({
      product: { ...product, images: productImages, options },
    });
  } catch (err) {
    console.error('products get:', err);
    res.status(500).json({ error: 'Failed to get product' });
  }
});


router.put('/:id', async (req, res) => {
  const pool = req.app.locals.pool;
  const { store_owner_id } = req.user;
  const product_id = parseInt(req.params.id, 10);
  if (Number.isNaN(product_id)) return res.status(400).json({ error: 'Invalid product id' });
  try {
    const store_id = await getProductStoreId(pool, product_id, store_owner_id);
    if (!store_id) return res.status(404).json({ error: 'Product not found' });

    const { product_name, title, status, price, images, options = [] } = req.body || {};

    const name = (product_name || '').trim();
    if (!name) return res.status(400).json({ error: 'Product name is required' });
    const priceVal = parseFloat(price);
    if (Number.isNaN(priceVal) || priceVal < 0) return res.status(400).json({ error: 'Valid price is required' });
    const statusVal = (status === 'Inactive' ? 'Inactive' : 'Active').trim();
    const titleVal = (title || '').trim() || null;
    const imagesVal = normalizeImages(images);

    await pool.query(
      'UPDATE products SET product_name = $1, title = $2, price = $3, status = $4, images = $5 WHERE product_id = $6',
      [name, titleVal, priceVal, statusVal, JSON.stringify(imagesVal), product_id]
    );

    if (Array.isArray(options)) {
      const existing = await pool.query('SELECT option_id FROM product_options WHERE product_id = $1', [product_id]);
      const existingIds = new Set(existing.rows.map((r) => r.option_id));
      for (const opt of options) {
        const oName = (opt.option_name || '').trim() || null;
        const oValue = (opt.option_value || '').trim() || null;
        const stock = parseInt(opt.stock_qty, 10);
        const addPrice = parseFloat(opt.additional_price);
        const optImages = normalizeImages(opt.images || opt.image);
        const oid = opt.option_id ? parseInt(opt.option_id, 10) : null;
        if (oid && existingIds.has(oid)) {
          await pool.query(
            `UPDATE product_options SET option_name = $1, option_value = $2, stock_qty = $3, additional_price = $4, images = $5 WHERE option_id = $6`,
            [oName, oValue, Number.isNaN(stock) ? 0 : stock, Number.isNaN(addPrice) ? 0 : addPrice, JSON.stringify(optImages), oid]
          );
        } else if (oName && oValue != null) {
          await pool.query(
            `INSERT INTO product_options (product_id, option_name, option_value, stock_qty, additional_price, images) VALUES ($1, $2, $3, $4, $5, $6)`,
            [product_id, oName, oValue, Number.isNaN(stock) ? 0 : stock, Number.isNaN(addPrice) ? 0 : addPrice, JSON.stringify(optImages)]
          );
        }
      }
    }

    const updated = await pool.query(
      'SELECT product_id, store_id, product_name, title, price, status, images FROM products WHERE product_id = $1',
      [product_id]
    );
    const product = updated.rows[0];
    if (product.images != null && typeof product.images !== 'object') {
      try { product.images = typeof product.images === 'string' ? JSON.parse(product.images) : []; } catch (_) { product.images = []; }
    }
    if (!Array.isArray(product.images)) product.images = [];
    res.json({ product, message: 'Product updated' });
  } catch (err) {
    console.error('products update:', err);
    res.status(500).json({ error: err.message || 'Failed to update product' });
  }
});


router.delete('/:id', async (req, res) => {
  const pool = req.app.locals.pool;
  const { store_owner_id } = req.user;
  const product_id = parseInt(req.params.id, 10);
  if (Number.isNaN(product_id)) return res.status(400).json({ error: 'Invalid product id' });

  // #region agent log
  fetch('http://127.0.0.1:7555/ingest/cbc96d74-14a0-4770-b8b1-588c6e99db24',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'0ad8f9'},body:JSON.stringify({sessionId:'0ad8f9',location:'products.js:DELETE-entry',message:'delete route entered',data:{product_id,store_owner_id},hypothesisId:'ALL',timestamp:Date.now()})}).catch(()=>{});
  // #endregion

  let clientReleased = false;
  const client = await pool.connect();
  try {
    const store_id = await getProductStoreId(pool, product_id, store_owner_id);

    // #region agent log
    fetch('http://127.0.0.1:7555/ingest/cbc96d74-14a0-4770-b8b1-588c6e99db24',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'0ad8f9'},body:JSON.stringify({sessionId:'0ad8f9',location:'products.js:after-getStoreId',message:'store_id resolved',data:{store_id,product_id},hypothesisId:'H-A',timestamp:Date.now()})}).catch(()=>{});
    // #endregion

    if (!store_id) {
      return res.status(404).json({ error: 'Product not found' });
    }

    await client.query('BEGIN');

    // #region agent log
    fetch('http://127.0.0.1:7555/ingest/cbc96d74-14a0-4770-b8b1-588c6e99db24',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'0ad8f9'},body:JSON.stringify({sessionId:'0ad8f9',location:'products.js:after-BEGIN',message:'transaction started',data:{product_id},hypothesisId:'H-B',timestamp:Date.now()})}).catch(()=>{});
    // #endregion

    // Step 1 — Nullify order_items.option_id (no cascade in DB; preserves order history)
    await client.query(
      `UPDATE order_items oi
       SET option_id = NULL
       FROM product_options po
       WHERE oi.option_id = po.option_id AND po.product_id = $1`,
      [product_id]
    );

    // Step 2 — Remove stale cart entries referencing this product's options
    await client.query(
      `DELETE FROM cart_items ci
       USING product_options po
       WHERE ci.option_id = po.option_id AND po.product_id = $1`,
      [product_id]
    );

    // Step 3 — Delete reviews for this product (no cascade in DB)
    await client.query('DELETE FROM reviews WHERE product_id = $1', [product_id]);

    // Step 4 — Delete variants (no cascade in DB)
    await client.query('DELETE FROM product_options WHERE product_id = $1', [product_id]);

    // Step 5 — Now safe to delete the product itself
    await client.query('DELETE FROM products WHERE product_id = $1', [product_id]);

    await client.query('COMMIT');

    // #region agent log
    fetch('http://127.0.0.1:7555/ingest/cbc96d74-14a0-4770-b8b1-588c6e99db24',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'0ad8f9'},body:JSON.stringify({sessionId:'0ad8f9',location:'products.js:after-COMMIT',message:'all steps done, committing',data:{product_id},hypothesisId:'H-C',timestamp:Date.now()})}).catch(()=>{});
    // #endregion

    res.json({ message: 'Product deleted' });
  } catch (err) {
    // #region agent log
    fetch('http://127.0.0.1:7555/ingest/cbc96d74-14a0-4770-b8b1-588c6e99db24',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'0ad8f9'},body:JSON.stringify({sessionId:'0ad8f9',location:'products.js:catch',message:'error caught',data:{errMsg:err.message,errCode:err.code},hypothesisId:'H-B H-C H-D',timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    await client.query('ROLLBACK').catch((rbErr) => {
      // #region agent log
      fetch('http://127.0.0.1:7555/ingest/cbc96d74-14a0-4770-b8b1-588c6e99db24',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'0ad8f9'},body:JSON.stringify({sessionId:'0ad8f9',location:'products.js:rollback-fail',message:'ROLLBACK itself failed',data:{rbErr:rbErr.message},hypothesisId:'H-B',timestamp:Date.now()})}).catch(()=>{});
      // #endregion
    });
    console.error('products delete:', err);
    res.status(500).json({ error: 'Failed to delete product' });
  } finally {
    if (!clientReleased) {
      clientReleased = true;
      client.release();
      // #region agent log
      fetch('http://127.0.0.1:7555/ingest/cbc96d74-14a0-4770-b8b1-588c6e99db24',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'0ad8f9'},body:JSON.stringify({sessionId:'0ad8f9',location:'products.js:finally-release',message:'client released in finally',data:{product_id},hypothesisId:'H-A',timestamp:Date.now()})}).catch(()=>{});
      // #endregion
    }
  }
});


router.post('/:id/options', async (req, res) => {
  const pool = req.app.locals.pool;
  const { store_owner_id } = req.user;
  const product_id = parseInt(req.params.id, 10);
  if (Number.isNaN(product_id)) return res.status(400).json({ error: 'Invalid product id' });
  try {
    const store_id = await getProductStoreId(pool, product_id, store_owner_id);
    if (!store_id) return res.status(404).json({ error: 'Product not found' });

    const { option_name, option_value, stock_qty = 0, additional_price = 0, images } = req.body || {};
    const oName = (option_name || '').trim() || null;
    const oValue = (option_value || '').trim() || null;
    if (!oName || oValue == null) return res.status(400).json({ error: 'option_name and option_value required' });

    const optImages = normalizeImages(images || req.body.image);
    const r = await pool.query(
      `INSERT INTO product_options (product_id, option_name, option_value, stock_qty, additional_price, images)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING option_id, product_id, option_name, option_value, stock_qty, additional_price, images`,
      [product_id, oName, oValue, parseInt(stock_qty, 10) || 0, parseFloat(additional_price) || 0, JSON.stringify(optImages)]
    );
    res.status(201).json({ option: r.rows[0] });
  } catch (err) {
    console.error('products options create:', err);
    res.status(500).json({ error: 'Failed to add option' });
  }
});


router.put('/options/:option_id', async (req, res) => {
  const pool = req.app.locals.pool;
  const { store_owner_id } = req.user;
  const option_id = parseInt(req.params.option_id, 10);
  if (Number.isNaN(option_id)) return res.status(400).json({ error: 'Invalid option id' });
  try {
    const check = await pool.query(
      `SELECT po.option_id FROM product_options po
       JOIN products p ON p.product_id = po.product_id
       JOIN stores s ON s.store_id = p.store_id
       WHERE po.option_id = $1 AND s.store_owner_id = $2`,
      [option_id, store_owner_id]
    );
    if (check.rows.length === 0) return res.status(404).json({ error: 'Option not found' });

    const { option_name, option_value, stock_qty, additional_price, images } = req.body || {};
    const updates = [];
    const params = [];
    let n = 1;
    if (option_name !== undefined) { updates.push(`option_name = $${n}`); params.push((option_name || '').trim() || null); n++; }
    if (option_value !== undefined) { updates.push(`option_value = $${n}`); params.push((option_value || '').trim() || null); n++; }
    if (stock_qty !== undefined) { updates.push(`stock_qty = $${n}`); params.push(parseInt(stock_qty, 10) || 0); n++; }
    if (additional_price !== undefined) { updates.push(`additional_price = $${n}`); params.push(parseFloat(additional_price) || 0); n++; }
    if (images !== undefined) { updates.push(`images = $${n}`); params.push(JSON.stringify(normalizeImages(images))); n++; }
    else if (req.body && req.body.image !== undefined) { updates.push(`images = $${n}`); params.push(JSON.stringify(normalizeImages(req.body.image))); n++; }
    if (updates.length === 0) {
      const r = await pool.query('SELECT * FROM product_options WHERE option_id = $1', [option_id]);
      return res.json({ option: r.rows[0] });
    }
    params.push(option_id);
    await pool.query(`UPDATE product_options SET ${updates.join(', ')} WHERE option_id = $${n}`, params);
    const r = await pool.query('SELECT * FROM product_options WHERE option_id = $1', [option_id]);
    res.json({ option: r.rows[0] });
  } catch (err) {
    console.error('products options update:', err);
    res.status(500).json({ error: 'Failed to update option' });
  }
});


router.delete('/options/:option_id', async (req, res) => {
  const pool = req.app.locals.pool;
  const { store_owner_id } = req.user;
  const option_id = parseInt(req.params.option_id, 10);
  if (Number.isNaN(option_id)) return res.status(400).json({ error: 'Invalid option id' });
  try {
    const check = await pool.query(
      `SELECT po.option_id FROM product_options po
       JOIN products p ON p.product_id = po.product_id
       JOIN stores s ON s.store_id = p.store_id
       WHERE po.option_id = $1 AND s.store_owner_id = $2`,
      [option_id, store_owner_id]
    );
    if (check.rows.length === 0) return res.status(404).json({ error: 'Option not found' });

    // Nullify order_items.option_id to preserve order history
    await pool.query('UPDATE order_items SET option_id = NULL WHERE option_id = $1', [option_id]);
    // Remove stale cart entries
    await pool.query('DELETE FROM cart_items WHERE option_id = $1', [option_id]);
    await pool.query('DELETE FROM product_options WHERE option_id = $1', [option_id]);
    res.json({ message: 'Option deleted' });
  } catch (err) {
    console.error('products options delete:', err);
    res.status(500).json({ error: 'Failed to delete option' });
  }
});

module.exports = router;