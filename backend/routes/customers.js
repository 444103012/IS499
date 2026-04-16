

const express = require('express');
const router = express.Router();
const customerAuthMiddleware = require('../middleware/customerAuthMiddleware');
const authMiddleware = require('../middleware/authMiddleware');
const { getStoreId } = require('../utils/getStoreId');
const { hashPassword, comparePassword } = require('../utils/hash');

const MIN_PASSWORD_LENGTH = 8;

function validateBody(body, requiredFields) {
  return requiredFields.filter((field) => {
    const value = body[field];
    return value === undefined || value === null || (typeof value === 'string' && value.trim() === '');
  });
}

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
    `;
    const profileResult = await pool.query(profileSql, [customerId]);
    if (!profileResult.rows[0]) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const ordersSql = `
      SELECT
        o.order_id,
        o.order_date,
        o.total_amount,
        o.status AS fulfillment_status
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

router.get('/profile', customerAuthMiddleware, async (req, res) => {
  const pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });
  const customerId = req.user.customer_id;

  try {
    const result = await pool.query(
      'SELECT first_name, last_name, email, phone FROM customers WHERE customer_id = $1',
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
      'SELECT first_name, last_name, email, phone FROM customers WHERE customer_id = $1',
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

module.exports = router;
