const express = require('express');
const { uploadStoreLogo } = require('../middleware/upload');

const router = express.Router();

async function getStoreId(pool, store_owner_id) {
  const r = await pool.query(
    'SELECT store_id FROM stores WHERE store_owner_id = $1 ORDER BY created_at DESC LIMIT 1',
    [store_owner_id]
  );
  return r.rows[0] ? r.rows[0].store_id : null;
}

async function updateSetupStep(pool, store_owner_id, step) {
  try {
    await pool.query(
      'UPDATE store_owners SET setup_step = $1 WHERE store_owner_id = $2',
      [step, store_owner_id]
    );
  } catch (err) {
    if (err.code === '42703' || (err.message && err.message.includes('setup_step'))) {
      return;
    }
    throw err;
  }
}

router.get('/status', async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const { store_owner_id } = req.user;
    let setup_step = 0;
    try {
      const r = await pool.query(
        'SELECT setup_step FROM store_owners WHERE store_owner_id = $1',
        [store_owner_id]
      );
      setup_step = r.rows[0] && r.rows[0].setup_step != null ? Number(r.rows[0].setup_step) : 0;
    } catch (colErr) {
      if (colErr.code === '42703' || (colErr.message && colErr.message.includes('setup_step'))) {
        setup_step = 0;
      } else throw colErr;
    }
    let store_id = null;
    let store_name = null;
    let store_logo = null;
    if (setup_step >= 1) {
      const storeRow = await pool.query(
        'SELECT store_id, name, logo FROM stores WHERE store_owner_id = $1 ORDER BY created_at DESC LIMIT 1',
        [store_owner_id]
      );
      if (storeRow.rows[0]) {
        store_id = storeRow.rows[0].store_id;
        store_name = storeRow.rows[0].name || null;
        store_logo = storeRow.rows[0].logo || null;
      }
    }
    res.json({ setup_step, store_id, store_name, store_logo });
  } catch (err) {
    console.error('store-setup status:', err);
    res.status(500).json({ error: 'Failed to get status' });
  }
});

router.post('/store-details', uploadStoreLogo.single('logo'), async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const { store_owner_id } = req.user;
    const name = (req.body && req.body.name ? String(req.body.name) : '').trim();
    if (!name) return res.status(400).json({ error: 'Store name is required' });
    const store_type = (req.body.store_type || '').trim() || null;
    const description = (req.body.description || '').trim() || null;
    const logoUrl = req.file && req.file.location ? req.file.location : null;
    const result = await pool.query(
      `INSERT INTO stores (store_owner_id, name, domain_name, logo, store_type, description, status)
       VALUES ($1, $2, NULL, $3, $4, $5, 'Pending')
       RETURNING store_id`,
      [store_owner_id, name, logoUrl, store_type, description]
    );
    const store_id = result.rows[0].store_id;
    await updateSetupStep(pool, store_owner_id, 1);
    res.status(201).json({ success: true, store_id, next_step: 2 });
  } catch (err) {
    console.error('store-setup store-details:', err);
    const message = process.env.NODE_ENV !== 'production' && err.message ? err.message : 'Failed to save store details';
    res.status(500).json({ error: message });
  }
});

router.post('/select-plan', async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const { store_owner_id } = req.user;
    const { store_id, plan_type } = req.body || {};
    if (!store_id || !plan_type) return res.status(400).json({ error: 'store_id and plan_type required' });
    if (!['basic', 'pro', 'advanced'].includes(plan_type)) return res.status(400).json({ error: 'Invalid plan_type' });
    const check = await pool.query(
      'SELECT store_id FROM stores WHERE store_id = $1 AND store_owner_id = $2',
      [store_id, store_owner_id]
    );
    if (check.rows.length === 0) return res.status(403).json({ error: 'Store not found' });
    await pool.query(
      `INSERT INTO subscriptions (store_id, admin_id, plan_type, start_date, end_date, status)
       VALUES ($1, NULL, $2, CURRENT_DATE, NULL, 'Active')`,
      [store_id, plan_type]
    );
    await updateSetupStep(pool, store_owner_id, 2);
    res.json({ success: true, next_step: 3 });
  } catch (err) {
    console.error('store-setup select-plan:', err);
    res.status(500).json({ error: 'Failed to save plan' });
  }
});

router.post('/select-theme', async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const { store_owner_id } = req.user;
    const { store_id, theme } = req.body || {};
    if (!store_id || !theme) return res.status(400).json({ error: 'store_id and theme required' });
    const check = await pool.query(
      'SELECT store_id FROM stores WHERE store_id = $1 AND store_owner_id = $2',
      [store_id, store_owner_id]
    );
    if (check.rows.length === 0) return res.status(403).json({ error: 'Store not found' });
    await pool.query('UPDATE stores SET theme = $1 WHERE store_id = $2', [String(theme).substring(0, 100), store_id]);
    await updateSetupStep(pool, store_owner_id, 3);
    res.json({ success: true, next_step: 4 });
  } catch (err) {
    console.error('store-setup select-theme:', err);
    res.status(500).json({ error: 'Failed to save theme' });
  }
});

router.post('/payment', async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const { store_owner_id } = req.user;
    const { store_id, providers } = req.body || {};
    if (!store_id || !Array.isArray(providers)) return res.status(400).json({ error: 'store_id and providers array required' });
    const check = await pool.query(
      'SELECT store_id FROM stores WHERE store_id = $1 AND store_owner_id = $2',
      [store_id, store_owner_id]
    );
    if (check.rows.length === 0) return res.status(403).json({ error: 'Store not found' });
    for (const p of providers) {
      const name = String(p.provider_name || '').substring(0, 100);
      const creds = typeof p.credentials === 'object' ? p.credentials : {};
      if (name) {
        await pool.query(
          'INSERT INTO payment_providers (store_id, provider_name, credentials) VALUES ($1, $2, $3)',
          [store_id, name, JSON.stringify(creds)]
        );
      }
    }
    await updateSetupStep(pool, store_owner_id, 4);
    res.json({ success: true, next_step: 5 });
  } catch (err) {
    console.error('store-setup payment:', err);
    res.status(500).json({ error: 'Failed to save payment' });
  }
});

router.post('/shipping', async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const { store_owner_id } = req.user;
    const { store_id, providers } = req.body || {};
    if (!store_id || !Array.isArray(providers)) return res.status(400).json({ error: 'store_id and providers array required' });
    const check = await pool.query(
      'SELECT store_id FROM stores WHERE store_id = $1 AND store_owner_id = $2',
      [store_id, store_owner_id]
    );
    if (check.rows.length === 0) return res.status(403).json({ error: 'Store not found' });
    for (const p of providers) {
      const name = String(p.carrier_name || '').substring(0, 100);
      const creds = typeof p.credentials === 'object' ? p.credentials : {};
      if (name) {
        await pool.query(
          'INSERT INTO shipping_providers (store_id, carrier_name, credentials) VALUES ($1, $2, $3)',
          [store_id, name, JSON.stringify(creds)]
        );
      }
    }
    await updateSetupStep(pool, store_owner_id, 5);
    res.json({ success: true, next_step: 6 });
  } catch (err) {
    console.error('store-setup shipping:', err);
    res.status(500).json({ error: 'Failed to save shipping' });
  }
});

router.post('/finish', async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const { store_owner_id } = req.user;
    await updateSetupStep(pool, store_owner_id, 6);
    res.json({ success: true, next_step: 6 });
  } catch (err) {
    console.error('store-setup finish:', err);
    res.status(500).json({ error: 'Failed to finish' });
  }
});

module.exports = router;