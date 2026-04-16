const { comparePassword } = require('../utils/hash');
const { generateAdminToken } = require('../utils/generateToken');

function validateBody(body, required) {
  return required.filter((field) => {
    const value = body[field];
    return value === undefined || value === null || (typeof value === 'string' && value.trim() === '');
  });
}

async function loginAdmin(req, res) {
  const pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });

  const missing = validateBody(req.body, ['email', 'password']);
  if (missing.length > 0) {
    return res.status(400).json({ error: 'Missing required fields', fields: missing });
  }

  const email = String(req.body.email).trim().toLowerCase();
  const password = req.body.password;

  try {
    let result;
    try {
      result = await pool.query(
        'SELECT id, first_name, last_name, email, password_hash, status, created_at FROM admins WHERE LOWER(email) = $1',
        [email]
      );
    } catch (colErr) {
      if (colErr.code === '42703') {
        result = await pool.query(
          'SELECT admin_id, email, password_hash, created_at FROM admins WHERE LOWER(email) = $1',
          [email]
        );
      } else throw colErr;
    }

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const admin = result.rows[0];
    const pk = admin.id != null ? admin.id : admin.admin_id;
    const valid = await comparePassword(password, admin.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = generateAdminToken(pk);
    const displayName = [admin.first_name, admin.last_name].filter(Boolean).join(' ').trim() || admin.email;

    return res.json({
      message: 'Login successful',
      token,
      admin_id: pk,
      admin: {
        id: pk,
        name: displayName,
        email: admin.email,
        role: admin.role || 'admin',
        created_at: admin.created_at,
      },
    });
  } catch (err) {
    console.error('Admin login error:', err);
    const isDev = process.env.NODE_ENV !== 'production';
    return res.status(500).json({
      error: 'Login failed',
      ...(isDev && err.message && { detail: err.message }),
    });
  }
}

function logoutAdmin(req, res) {
  return res.json({ message: 'Logout successful' });
}

async function getAuthenticatedAdmin(req, res) {
  const pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });

  const adminId = req.user?.admin_id;
  if (!adminId) return res.status(401).json({ error: 'Not authenticated' });

  try {
    let result;
    try {
      result = await pool.query(
        'SELECT id, first_name, last_name, email, status, created_at FROM admins WHERE id = $1',
        [adminId]
      );
    } catch (colErr) {
      if (colErr.code === '42703') {
        result = await pool.query(
          'SELECT admin_id, email, created_at FROM admins WHERE admin_id = $1',
          [adminId]
        );
      } else throw colErr;
    }

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Admin not found' });
    }

    const admin = result.rows[0];
    const pk = admin.id != null ? admin.id : admin.admin_id;
    const displayName = [admin.first_name, admin.last_name].filter(Boolean).join(' ').trim() || admin.email;

    return res.json({
      message: 'Authenticated',
      admin_id: pk,
      admin: {
        id: pk,
        name: displayName,
        email: admin.email,
        role: admin.role || 'admin',
        created_at: admin.created_at,
      },
    });
  } catch (err) {
    console.error('Admin me error:', err);
    return res.status(500).json({ error: 'Failed to fetch admin' });
  }
}

module.exports = {
  loginAdmin,
  logoutAdmin,
  getAuthenticatedAdmin,
};
