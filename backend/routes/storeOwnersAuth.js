const express = require('express');
const router = express.Router();
const { hashPassword, comparePassword } = require('../utils/hash');
const { generateToken } = require('../utils/token');

const REQUIRED_REGISTER = ['first_name', 'last_name', 'email', 'phone', 'password'];
const REQUIRED_LOGIN = ['email', 'password'];

function validateBody(body, requiredFields) {
  const missing = requiredFields.filter((field) => {
    const value = body[field];
    return value === undefined || value === null || (typeof value === 'string' && value.trim() === '');
  });
  return missing;
}

router.post('/register', async (req, res) => {
  const pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });

  const missing = validateBody(req.body, REQUIRED_REGISTER);
  if (missing.length > 0) {
    return res.status(400).json({ error: 'Missing required fields', fields: missing });
  }

  const { first_name, last_name, email, phone, password } = req.body;
  const trimmedEmail = String(email).trim().toLowerCase();

  try {
   
   
    const existing = await pool.query(
      'SELECT store_owner_id FROM store_owners WHERE email = $1',
      [trimmedEmail]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const password_hash = await hashPassword(password);

   
    let result;
    try {
      result = await pool.query(
        `INSERT INTO store_owners (first_name, last_name, email, phone, password_hash)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING store_owner_id, first_name, last_name, email, phone, status, COALESCE(setup_step, 0) AS setup_step, created_at`,
        [first_name.trim(), last_name.trim(), trimmedEmail, String(phone).trim(), password_hash]
      );
    } catch (insertErr) {
      if (insertErr.code === '42703' || (insertErr.message && insertErr.message.includes('setup_step'))) {
        result = await pool.query(
          `INSERT INTO store_owners (first_name, last_name, email, phone, password_hash)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING store_owner_id, first_name, last_name, email, phone, status, created_at`,
          [first_name.trim(), last_name.trim(), trimmedEmail, String(phone).trim(), password_hash]
        );
      } else throw insertErr;
    }

    const row = result.rows[0];
    const token = generateToken(row.store_owner_id);
    const setup_step = row.setup_step != null ? Number(row.setup_step) : 0;
    return res.status(201).json({
      message: 'Store owner registered successfully',
      token,
      store_owner_id: row.store_owner_id,
      setup_step,
      store_owner: {
        store_owner_id: row.store_owner_id,
        first_name: row.first_name,
        last_name: row.last_name,
        email: row.email,
        phone: row.phone,
        status: row.status,
        setup_step,
        created_at: row.created_at,
      },
    });
  } catch (err) {
    console.error('Register error:', err);
    const isDev = process.env.NODE_ENV !== 'production';
    return res.status(500).json({
      error: 'Registration failed',
      ...(isDev && err.message && { detail: err.message }),
    });
  }
});

router.post('/login', async (req, res) => {
  const pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });

  const missing = validateBody(req.body, REQUIRED_LOGIN);
  if (missing.length > 0) {
    return res.status(400).json({ error: 'Missing required fields', fields: missing });
  }

  const { email, password } = req.body;
  const trimmedEmail = String(email).trim().toLowerCase();

  try {
    let result;
    try {
      result = await pool.query(
        'SELECT store_owner_id, password_hash, first_name, last_name, email, phone, status, COALESCE(setup_step, 0) AS setup_step FROM store_owners WHERE email = $1',
        [trimmedEmail]
      );
    } catch (colErr) {
      if (colErr.code === '42703' || (colErr.message && colErr.message.includes('setup_step'))) {
        result = await pool.query(
          'SELECT store_owner_id, password_hash, first_name, last_name, email, phone, status FROM store_owners WHERE email = $1',
          [trimmedEmail]
        );
      } else throw colErr;
    }

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const row = result.rows[0];
    const valid = await comparePassword(password, row.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = generateToken(row.store_owner_id);
    const setup_step = row.setup_step != null ? Number(row.setup_step) : 0;

    return res.json({
      message: 'Login successful',
      token,
      store_owner_id: row.store_owner_id,
      setup_step,
      store_owner: {
        store_owner_id: row.store_owner_id,
        first_name: row.first_name,
        last_name: row.last_name,
        email: row.email,
        phone: row.phone,
        status: row.status,
        setup_step,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Login failed' });
  }
});

module.exports = router;
