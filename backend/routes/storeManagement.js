const express = require('express');
const { uploadStoreLogo } = require('../middleware/upload');
const { getStoreId } = require('../utils/getStoreId');

const router = express.Router();

async function ensureStoreSettingsTable(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS store_settings (
      store_id INTEGER PRIMARY KEY REFERENCES stores(store_id) ON DELETE CASCADE,
      info JSONB DEFAULT '{}'::JSONB,
      branding JSONB DEFAULT '{}'::JSONB,
      domain JSONB DEFAULT '{}'::JSONB,
      payments JSONB DEFAULT '{}'::JSONB,
      shipping JSONB DEFAULT '{}'::JSONB,
      policies JSONB DEFAULT '{}'::JSONB,
      footer JSONB DEFAULT '{}'::JSONB
    );
  `);
}

async function getOrCreateStoreSettings(pool, store_id) {
  await ensureStoreSettingsTable(pool);
  const existing = await pool.query('SELECT * FROM store_settings WHERE store_id = $1', [store_id]);
  if (existing.rows[0]) return existing.rows[0];
  const inserted = await pool.query(
    'INSERT INTO store_settings (store_id) VALUES ($1) RETURNING *',
    [store_id]
  );
  return inserted.rows[0];
}

router.get('/', async (req, res) => {
  const pool = req.app.locals.pool;
  const { store_owner_id } = req.user;
  try {
    const store_id = await getStoreId(pool, store_owner_id);
    if (!store_id) return res.status(404).json({ error: 'No store found' });
    const storeRow = await pool.query(
      `SELECT store_id, store_owner_id, name, description, store_type, logo, theme, domain_name, status, created_at
       FROM stores WHERE store_id = $1`,
      [store_id]
    );
    const store = storeRow.rows[0];
    const settings = await getOrCreateStoreSettings(pool, store_id);
    res.json({
      store,
      settings: {
        info: settings.info || {},
        branding: settings.branding || {},
        domain: settings.domain || {},
        payments: settings.payments || {},
        shipping: settings.shipping || {},
        policies: settings.policies || {},
        footer: settings.footer || {},
      },
    });
  } catch (err) {
    console.error('store GET /api/store:', err);
    res.status(500).json({ error: 'Failed to load store' });
  }
});

router.put('/', async (req, res) => {
  const pool = req.app.locals.pool;
  const { store_owner_id } = req.user;
  const body = req.body || {};
  try {
    const store_id = await getStoreId(pool, store_owner_id);
    if (!store_id) return res.status(404).json({ error: 'No store found' });

    const name = (body.name || '').trim();
    if (!name) return res.status(400).json({ error: 'Store name is required' });
    const description = (body.description || '').trim() || null;
    const store_type = (body.store_type || '').trim() || null;
    const status = body.status === 'Suspended' ? 'Suspended' : 'Active';

    await pool.query(
      `UPDATE stores
       SET name = $1, description = $2, store_type = $3, status = $4
       WHERE store_id = $5`,
      [name, description, store_type, status, store_id]
    );

    const info = body.info && typeof body.info === 'object' ? body.info : {};
    await ensureStoreSettingsTable(pool);
    await pool.query(
      `INSERT INTO store_settings (store_id, info)
       VALUES ($1, $2)
       ON CONFLICT (store_id) DO UPDATE SET info = EXCLUDED.info`,
      [store_id, info]
    );

    res.json({ success: true });
  } catch (err) {
    console.error('store PUT /api/store:', err);
    res.status(500).json({ error: 'Failed to update store' });
  }
});

router.put('/logo', uploadStoreLogo.single('logo'), async (req, res) => {
  const pool = req.app.locals.pool;
  const { store_owner_id } = req.user;
  try {
    const store_id = await getStoreId(pool, store_owner_id);
    if (!store_id) return res.status(404).json({ error: 'No store found' });
    if (!req.file || !req.file.location) return res.status(400).json({ error: 'No image file provided' });

    const logoUrl = req.file.location;
    await pool.query('UPDATE stores SET logo = $1 WHERE store_id = $2', [logoUrl, store_id]);
    const settings = await getOrCreateStoreSettings(pool, store_id);
    const branding = Object.assign({}, settings.branding || {}, { logo: logoUrl });
    await pool.query('UPDATE store_settings SET branding = $1 WHERE store_id = $2', [
      branding,
      store_id,
    ]);

    res.json({ success: true, logo: logoUrl });
  } catch (err) {
    console.error('store PUT /api/store/logo:', err);
    res.status(500).json({ error: 'Failed to upload logo' });
  }
});

router.put('/theme', async (req, res) => {
  const pool = req.app.locals.pool;
  const { store_owner_id } = req.user;
  const { theme, branding } = req.body || {};
  try {
    const store_id = await getStoreId(pool, store_owner_id);
    if (!store_id) return res.status(404).json({ error: 'No store found' });
    if (!theme) return res.status(400).json({ error: 'theme is required' });

    await pool.query('UPDATE stores SET theme = $1 WHERE store_id = $2', [
      String(theme).substring(0, 100),
      store_id,
    ]);
    if (branding && typeof branding === 'object') {
      await ensureStoreSettingsTable(pool);
      await pool.query(
        `INSERT INTO store_settings (store_id, branding)
         VALUES ($1, $2)
         ON CONFLICT (store_id) DO UPDATE SET branding = EXCLUDED.branding`,
        [store_id, branding]
      );
    }
    res.json({ success: true });
  } catch (err) {
    console.error('store PUT /api/store/theme:', err);
    res.status(500).json({ error: 'Failed to update theme' });
  }
});

router.put('/domain', async (req, res) => {
  const pool = req.app.locals.pool;
  const { store_owner_id } = req.user;
  const { customDomain, domainMeta } = req.body || {};
  try {
    const store_id = await getStoreId(pool, store_owner_id);
    if (!store_id) return res.status(404).json({ error: 'No store found' });

    const dom = (customDomain || '').trim() || null;
    if (dom) {
      await pool.query('UPDATE stores SET domain_name = $1 WHERE store_id = $2', [dom, store_id]);
    }
    const domain = domainMeta && typeof domainMeta === 'object' ? domainMeta : {};
    await ensureStoreSettingsTable(pool);
    await pool.query(
      `INSERT INTO store_settings (store_id, domain)
       VALUES ($1, $2)
       ON CONFLICT (store_id) DO UPDATE SET domain = EXCLUDED.domain`,
      [store_id, domain]
    );

    res.json({ success: true });
  } catch (err) {
    console.error('store PUT /api/store/domain:', err);
    res.status(500).json({ error: 'Failed to update domain' });
  }
});

router.put('/payment-providers', async (req, res) => {
  const pool = req.app.locals.pool;
  const { store_owner_id } = req.user;
  const { payments } = req.body || {};
  try {
    const store_id = await getStoreId(pool, store_owner_id);
    if (!store_id) return res.status(404).json({ error: 'No store found' });
    if (!payments || typeof payments !== 'object') {
      return res.status(400).json({ error: 'payments object required' });
    }
    await ensureStoreSettingsTable(pool);
    await pool.query(
      `INSERT INTO store_settings (store_id, payments)
       VALUES ($1, $2)
       ON CONFLICT (store_id) DO UPDATE SET payments = EXCLUDED.payments`,
      [store_id, payments]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('store PUT /api/store/payment-providers:', err);
    res.status(500).json({ error: 'Failed to update payment providers' });
  }
});

router.put('/shipping-providers', async (req, res) => {
  const pool = req.app.locals.pool;
  const { store_owner_id } = req.user;
  const { shipping } = req.body || {};
  try {
    const store_id = await getStoreId(pool, store_owner_id);
    if (!store_id) return res.status(404).json({ error: 'No store found' });
    if (!shipping || typeof shipping !== 'object') {
      return res.status(400).json({ error: 'shipping object required' });
    }
    await ensureStoreSettingsTable(pool);
    await pool.query(
      `INSERT INTO store_settings (store_id, shipping)
       VALUES ($1, $2)
       ON CONFLICT (store_id) DO UPDATE SET shipping = EXCLUDED.shipping`,
      [store_id, shipping]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('store PUT /api/store/shipping-providers:', err);
    res.status(500).json({ error: 'Failed to update shipping providers' });
  }
});

router.put('/policies', async (req, res) => {
  const pool = req.app.locals.pool;
  const { store_owner_id } = req.user;
  const { policies } = req.body || {};
  try {
    const store_id = await getStoreId(pool, store_owner_id);
    if (!store_id) return res.status(404).json({ error: 'No store found' });
    if (!policies || typeof policies !== 'object') {
      return res.status(400).json({ error: 'policies object required' });
    }
    await ensureStoreSettingsTable(pool);
    await pool.query(
      `INSERT INTO store_settings (store_id, policies)
       VALUES ($1, $2)
       ON CONFLICT (store_id) DO UPDATE SET policies = EXCLUDED.policies`,
      [store_id, policies]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('store PUT /api/store/policies:', err);
    res.status(500).json({ error: 'Failed to update policies' });
  }
});

router.put('/footer', async (req, res) => {
  const pool = req.app.locals.pool;
  const { store_owner_id } = req.user;
  const { footer } = req.body || {};
  try {
    const store_id = await getStoreId(pool, store_owner_id);
    if (!store_id) return res.status(404).json({ error: 'No store found' });
    if (!footer || typeof footer !== 'object') {
      return res.status(400).json({ error: 'footer object required' });
    }
    await ensureStoreSettingsTable(pool);
    await pool.query(
      `INSERT INTO store_settings (store_id, footer)
       VALUES ($1, $2)
       ON CONFLICT (store_id) DO UPDATE SET footer = EXCLUDED.footer`,
      [store_id, footer]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('store PUT /api/store/footer:', err);
    res.status(500).json({ error: 'Failed to update footer' });
  }
});

router.delete('/', async (req, res) => {
  const pool = req.app.locals.pool;
  const { store_owner_id } = req.user;
  try {
    const store_id = await getStoreId(pool, store_owner_id);
    if (!store_id) return res.status(404).json({ error: 'No store found' });
    await pool.query('DELETE FROM stores WHERE store_id = $1 AND store_owner_id = $2', [
      store_id,
      store_owner_id,
    ]);
    res.json({ success: true });
  } catch (err) {
    console.error('store DELETE /api/store:', err);
    res.status(500).json({ error: 'Failed to delete store' });
  }
});

module.exports = router;