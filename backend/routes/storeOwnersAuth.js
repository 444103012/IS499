/**
 * storeOwnersAuth.js - Store Owner Registration & Login Routes
 * -----------------------------------------------------------
 * EN: IS498 Use Cases: Table 6 Store Owner Registration, Table 7 Store Owner Login.
 *     POST /register: SO-001 — create account, validate fields, hash password, insert store_owners, return token.
 *     POST /login: SO-002 — validate email/password, compare hash, return token and store_owner info.
 * AR: حالات الاستخدام IS498: جدول 6 تسجيل التاجر، جدول 7 تسجيل دخول التاجر.
 *     POST /register: إنشاء حساب، التحقق من الحقول، تجزئة كلمة المرور، إدراج في store_owners، إرجاع الرمز.
 *     POST /login: التحقق من البريد وكلمة المرور، مقارنة التجزئة، إرجاع الرمز ومعلومات التاجر.
 */

const express = require('express');
const router = express.Router();
const { hashPassword, comparePassword } = require('../utils/hash');
const { generateToken } = require('../utils/token');

// EN: Fields that must be present and non-empty for registration (IS498: account and business details).
// AR: الحقول المطلوبة للتسجيل (تفاصيل الحساب والأعمال حسب IS498).
const REQUIRED_REGISTER = ['first_name', 'last_name', 'email', 'phone', 'password'];
// EN: Fields required for login (email + password; IS498 SO-002).
// AR: الحقول المطلوبة لتسجيل الدخول (البريد وكلمة المرور).
const REQUIRED_LOGIN = ['email', 'password'];

/**
 * EN: Check that all required fields exist in body and are non-empty (trimmed strings).
 *     Returns array of missing field names; empty array means valid.
 * AR: التحقق من وجود كل الحقول المطلوبة وأنها غير فارغة. يُرجع أسماء الحقول الناقصة؛ مصفوفة فارغة = صالح.
 */
function validateBody(body, requiredFields) {
  const missing = requiredFields.filter((field) => {
    const value = body[field];
    return value === undefined || value === null || (typeof value === 'string' && value.trim() === '');
  });
  return missing;
}

/**
 * POST /api/store-owners/register (IS498 Table 6 - Store Owner Registration)
 * EN: Create new store owner: validate → check email unique → hash password → INSERT → return token.
 * AR: إنشاء تاجر جديد: التحقق → التحقق من عدم تسجيل البريد → تجزئة كلمة المرور → INSERT → إرجاع الرمز.
 */
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
    // EN: Check if email already exists (IS498 exception: "email already registered").
    // AR: التحقق من أن البريد غير مسجل مسبقاً (استثناء IS498: البريد مسجل مسبقاً).
    const existing = await pool.query(
      'SELECT store_owner_id FROM store_owners WHERE email = $1',
      [trimmedEmail]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const password_hash = await hashPassword(password);

    // EN: Insert new row into store_owners; RETURNING gives us the new store_owner_id and row data.
    // AR: إدراج صف جديد في store_owners؛ RETURNING يعيد store_owner_id والصف الجديد.
    const result = await pool.query(
      `INSERT INTO store_owners (first_name, last_name, email, phone, password_hash)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING store_owner_id, first_name, last_name, email, phone, status, created_at`,
      [first_name.trim(), last_name.trim(), trimmedEmail, String(phone).trim(), password_hash]
    );

    const row = result.rows[0];
    const token = generateToken(row.store_owner_id);

    return res.status(201).json({
      message: 'Store owner registered successfully',
      token,
      store_owner_id: row.store_owner_id,
      store_owner: {
        store_owner_id: row.store_owner_id,
        first_name: row.first_name,
        last_name: row.last_name,
        email: row.email,
        phone: row.phone,
        status: row.status,
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

/**
 * POST /api/store-owners/login (IS498 Table 7 - Store Owner Login)
 * EN: Authenticate: validate body → find user by email → compare password with hash → return token.
 * AR: المصادقة: التحقق من الجسم → البحث بالميل → مقارنة كلمة المرور بالتجزئة → إرجاع الرمز.
 */
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
    const result = await pool.query(
      'SELECT store_owner_id, password_hash, first_name, last_name, email, phone, status FROM store_owners WHERE email = $1',
      [trimmedEmail]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const row = result.rows[0];
    const valid = await comparePassword(password, row.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = generateToken(row.store_owner_id);

    return res.json({
      message: 'Login successful',
      token,
      store_owner_id: row.store_owner_id,
      store_owner: {
        store_owner_id: row.store_owner_id,
        first_name: row.first_name,
        last_name: row.last_name,
        email: row.email,
        phone: row.phone,
        status: row.status,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Login failed' });
  }
});

module.exports = router;
