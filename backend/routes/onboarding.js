

const express = require('express');
const { uploadStoreLogo } = require('../middleware/upload');

const router = express.Router();

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
    res.status(201).json({ store_id });
  } catch (err) {
    console.error('onboarding store-details:', err);
    res.status(500).json({ error: 'Failed to save store details' });
  }
});

router.post('/select-plan', async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const { store_owner_id } = req.user;
    const { store_id, plan_type } = req.body || {};
    if (!store_id || !plan_type) {
      return res.status(400).json({ error: 'store_id and plan_type are required' });
    }
    const allowed = ['basic', 'pro', 'advanced'];
    if (!allowed.includes(plan_type)) {
      return res.status(400).json({ error: 'Invalid plan_type' });
    }
    const check = await pool.query(
      'SELECT store_id FROM stores WHERE store_id = $1 AND store_owner_id = $2',
      [store_id, store_owner_id]
    );
    if (check.rows.length === 0) {
      return res.status(403).json({ error: 'Store not found or access denied' });
    }
    await pool.query(
      `INSERT INTO subscriptions (store_id, admin_id, plan_type, start_date, end_date, status)
       VALUES ($1, NULL, $2, CURRENT_DATE, NULL, 'Active')`,
      [store_id, plan_type]
    );
    res.status(201).json({ success: true });
  } catch (err) {
    console.error('onboarding select-plan:', err);
    res.status(500).json({ error: 'Failed to save plan' });
  }
});

router.post('/select-theme', async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const { store_owner_id } = req.user;
    const { store_id, theme } = req.body || {};
    if (!store_id || !theme) {
      return res.status(400).json({ error: 'store_id and theme are required' });
    }
    const check = await pool.query(
      'SELECT store_id FROM stores WHERE store_id = $1 AND store_owner_id = $2',
      [store_id, store_owner_id]
    );
    if (check.rows.length === 0) {
      return res.status(403).json({ error: 'Store not found or access denied' });
    }
    await pool.query(
      'UPDATE stores SET theme = $1 WHERE store_id = $2',
      [String(theme).substring(0, 100), store_id]
    );
    res.status(200).json({ success: true });
  } catch (err) {
    console.error('onboarding select-theme:', err);
    res.status(500).json({ error: 'Failed to save theme' });
  }
});

router.post('/payment', async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const { store_owner_id } = req.user;
    const { store_id, provider_name, credentials } = req.body || {};
    if (!store_id || !provider_name) {
      return res.status(400).json({ error: 'store_id and provider_name are required' });
    }
    const check = await pool.query(
      'SELECT store_id FROM stores WHERE store_id = $1 AND store_owner_id = $2',
      [store_id, store_owner_id]
    );
    if (check.rows.length === 0) {
      return res.status(403).json({ error: 'Store not found or access denied' });
    }
    await pool.query(
      'INSERT INTO payment_providers (store_id, provider_name, credentials) VALUES ($1, $2, $3)',
      [store_id, String(provider_name).substring(0, 100), JSON.stringify(credentials || {})]
    );
    res.status(201).json({ success: true });
  } catch (err) {
    console.error('onboarding payment:', err);
    res.status(500).json({ error: 'Failed to save payment provider' });
  }
});

router.post('/shipping', async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const { store_owner_id } = req.user;
    const { store_id, carrier_name, credentials } = req.body || {};
    if (!store_id || !carrier_name) {
      return res.status(400).json({ error: 'store_id and carrier_name are required' });
    }
    const check = await pool.query(
      'SELECT store_id FROM stores WHERE store_id = $1 AND store_owner_id = $2',
      [store_id, store_owner_id]
    );
    if (check.rows.length === 0) {
      return res.status(403).json({ error: 'Store not found or access denied' });
    }
    await pool.query(
      'INSERT INTO shipping_providers (store_id, carrier_name, credentials) VALUES ($1, $2, $3)',
      [store_id, String(carrier_name).substring(0, 100), JSON.stringify(credentials || {})]
    );
    res.status(201).json({ success: true });
  } catch (err) {
    console.error('onboarding shipping:', err);
    res.status(500).json({ error: 'Failed to save shipping provider' });
  }
});

module.exports = router;
