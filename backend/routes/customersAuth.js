const express = require('express');
const router = express.Router();
const { hashPassword, comparePassword } = require('../utils/hash');
const { generateToken } = require('../utils/token');

const MIN_PASSWORD_LENGTH = 8;


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

  const { email, phone, password, first_name, last_name, preferred_lang } = req.body;


  const missing = validateBody(req.body, ['email', 'password', 'first_name', 'last_name', 'phone']);
  if (missing.length > 0) {
    return res.status(400).json({ error: 'Missing required fields', fields: missing });
  }


  if (password.length < MIN_PASSWORD_LENGTH) {
    return res.status(400).json({ error: 'Weak password', detail: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` });
  }

  const trimmedEmail = String(email).trim().toLowerCase();
  const trimmedPhone = phone ? String(phone).trim() : null;

  
  const phonePattern = /^(\+?\d{8,15})$/;
  if (!trimmedPhone || !phonePattern.test(trimmedPhone)) {
    return res.status(400).json({ error: 'Invalid phone format' });
  }

  try {
  
    const existingEmail = await pool.query(
      'SELECT customer_id FROM customers WHERE email = $1',
      [trimmedEmail]
    );
    if (existingEmail.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

  
    if (trimmedPhone) {
      const existingPhone = await pool.query(
        'SELECT customer_id FROM customers WHERE phone = $1',
        [trimmedPhone]
      );
      if (existingPhone.rows.length > 0) {
        return res.status(409).json({ error: 'Phone already registered' });
      }
    }

    const password_hash = await hashPassword(password);

    let row;

    try {
    
      const result = await pool.query(
        `INSERT INTO customers (first_name, last_name, email, phone, password_hash, preferred_lang)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING customer_id, first_name, last_name, email, phone, status, preferred_lang, created_at`,
        [
          first_name.trim(),
          last_name.trim(),
          trimmedEmail,
          trimmedPhone,
          password_hash,
          preferred_lang || 'en'
        ]
      );
      row = result.rows[0];
    } catch (innerErr) {
     
      if (innerErr.code === '42703') {
        const fallbackResult = await pool.query(
          `INSERT INTO customers (first_name, last_name, email, phone, password_hash)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING customer_id, first_name, last_name, email, phone, status, created_at`,
          [
            first_name.trim(),
            last_name.trim(),
            trimmedEmail,
            trimmedPhone,
            password_hash
          ]
        );
        const fallbackRow = fallbackResult.rows[0];
        row = {
          ...fallbackRow,
          preferred_lang: preferred_lang || 'en',
        };
      } else {
        throw innerErr;
      }
    }

    const token = generateToken(row.customer_id, 'customer');

    return res.status(201).json({
      message: 'Customer registered successfully',
      token,
      customer_id: row.customer_id,
      customer: {
        customer_id: row.customer_id,
        first_name: row.first_name,
        last_name: row.last_name,
        email: row.email,
        phone: row.phone,
        status: row.status,
        preferred_lang: row.preferred_lang,
        created_at: row.created_at,
      },
    });
  } catch (err) {
    console.error('Customer register error:', err);
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

  const { emailOrPhone, password } = req.body;


  if (!emailOrPhone?.trim() || !password) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const trimmedInput = String(emailOrPhone).trim().toLowerCase();

  try {
    let result;
    try {
      result = await pool.query(
        'SELECT customer_id, password_hash, first_name, last_name, email, phone, status, preferred_lang FROM customers WHERE LOWER(email) = $1 OR phone = $2',
        [trimmedInput, String(emailOrPhone).trim()]
      );
    } catch (colErr) {
      if (colErr.code === '42703') {
        result = await pool.query(
          'SELECT customer_id, password_hash, first_name, last_name, email, phone, status FROM customers WHERE LOWER(email) = $1 OR phone = $2',
          [trimmedInput, String(emailOrPhone).trim()]
        );
      } else {
        throw colErr;
      }
    }

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const row = result.rows[0];

    if (row.status && row.status.toLowerCase() === 'suspended') {
      return res.status(403).json({ error: 'Account suspended' });
    }

    const valid = await comparePassword(password, row.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken(row.customer_id, 'customer');
    const preferred_lang = row.preferred_lang || 'en';

    return res.json({
      message: 'Login successful',
      token,
      customer_id: row.customer_id,
      customer: {
        customer_id: row.customer_id,
        first_name: row.first_name,
        last_name: row.last_name,
        email: row.email,
        phone: row.phone,
        status: row.status,
        preferred_lang,
      },
    });
  } catch (err) {
    console.error('Customer login error:', err);
    return res.status(500).json({ error: 'Login failed' });
  }
});


router.post('/logout', (req, res) => {

  return res.json({ message: 'Logout successful' });
});

module.exports = router;
