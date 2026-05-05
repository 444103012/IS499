
const { generateToken } = require('../utils/token');
const VALID_USER_STATUSES = ['Active', 'Suspended'];
const VALID_STORE_OWNER_STATUSES = ['Active', 'Suspended', 'Disabled'];

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 50;

function parsePaginationQuery(req) {
  const rawLimit = parseInt(req.query.limit, 10);
  const limit = Number.isFinite(rawLimit)
    ? Math.min(Math.max(rawLimit, 1), MAX_LIMIT)
    : DEFAULT_LIMIT;
  const rawPage = parseInt(req.query.page, 10);
  const page = Number.isFinite(rawPage) && rawPage >= 1 ? rawPage : 1;
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
  return { page, limit, search };
}

/** Escape % _ \ for use in ILIKE ... ESCAPE '\' */
function ilikeContainsParam(search) {
  if (!search) return null;
  const escaped = search.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
  return `%${escaped}%`;
}

function validateUserStatus(status) {
  if (!status || typeof status !== 'string') return false;
  return VALID_USER_STATUSES.includes(status.trim());
}

function validateStoreOwnerStatus(status) {
  if (!status || typeof status !== 'string') return false;
  return VALID_STORE_OWNER_STATUSES.includes(status.trim());
}




async function getAllUsers(req, res) {
  const pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });

  const { page, limit, search } = parsePaginationQuery(req);
  const pattern = ilikeContainsParam(search);
  const hasSearch = Boolean(pattern);

  try {
    const whereClause = hasSearch
      ? `WHERE (
           customers.first_name ILIKE $1 ESCAPE '\\'
           OR customers.last_name ILIKE $1 ESCAPE '\\'
           OR customers.email ILIKE $1 ESCAPE '\\'
         )`
      : '';
    const params = hasSearch ? [pattern] : [];

    const countSql = `SELECT COUNT(*)::int AS count FROM customers ${whereClause}`;
    const countResult = await pool.query(countSql, params);
    const total = countResult.rows[0]?.count ?? 0;

    const offset = (page - 1) * limit;
    const limitPlaceholder = hasSearch ? '$2' : '$1';
    const offsetPlaceholder = hasSearch ? '$3' : '$2';
    const dataParams = hasSearch ? [pattern, limit, offset] : [limit, offset];

    const dataSql = `
      SELECT customer_id, first_name, last_name, email, COALESCE(status, 'Active') AS status, created_at
      FROM customers
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ${limitPlaceholder} OFFSET ${offsetPlaceholder}
    `;
    const result = await pool.query(dataSql, dataParams);

    return res.json({
      users: result.rows,
      total,
      page,
      limit,
    });
  } catch (err) {
    console.error('Admin get users error:', err);
    return res.status(500).json({ error: 'Failed to fetch users' });
  }
}




async function getAllStoreOwners(req, res) {
  const pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });

  const { page, limit, search } = parsePaginationQuery(req);
  const pattern = ilikeContainsParam(search);
  const hasSearch = Boolean(pattern);

  try {
    const whereClause = hasSearch
      ? `WHERE (
           so.first_name ILIKE $1 ESCAPE '\\'
           OR so.last_name ILIKE $1 ESCAPE '\\'
           OR so.email ILIKE $1 ESCAPE '\\'
           OR EXISTS (
             SELECT 1 FROM stores s
             WHERE s.store_owner_id = so.store_owner_id AND s.name ILIKE $1 ESCAPE '\\'
           )
         )`
      : '';

    const baseFrom = `
      FROM store_owners so
      ${whereClause}
    `;
    const params = hasSearch ? [pattern] : [];

    const countSql = `SELECT COUNT(*)::int AS count ${baseFrom}`;
    const countResult = await pool.query(countSql, params);
    const total = countResult.rows[0]?.count ?? 0;

    const offset = (page - 1) * limit;
    const limitPlaceholder = hasSearch ? '$2' : '$1';
    const offsetPlaceholder = hasSearch ? '$3' : '$2';
    const dataParams = hasSearch ? [pattern, limit, offset] : [limit, offset];

    const dataSql = `
      SELECT so.store_owner_id AS owner_id, so.first_name, so.last_name, so.email,
             (SELECT s.name FROM stores s WHERE s.store_owner_id = so.store_owner_id ORDER BY s.store_id LIMIT 1) AS store_name,
             COALESCE(so.status, 'Active') AS status, so.created_at
      FROM store_owners so
      ${whereClause}
      ORDER BY so.created_at DESC
      LIMIT ${limitPlaceholder} OFFSET ${offsetPlaceholder}
    `;
    const result = await pool.query(dataSql, dataParams);
    const rows = result.rows.map((r) => ({ ...r, store_name: r.store_name || '—' }));
    return res.json({
      store_owners: rows,
      total,
      page,
      limit,
    });
  } catch (err) {
    console.error('Admin get store owners error:', err);
    return res.status(500).json({ error: 'Failed to fetch store owners' });
  }
}



async function updateUserStatus(req, res) {
  const pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });

  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid user id' });

  const { status } = req.body;
  if (!validateUserStatus(status)) {
    return res.status(400).json({ error: 'Invalid status', valid: VALID_USER_STATUSES });
  }

  try {
    const result = await pool.query(
      'UPDATE customers SET status = $1 WHERE customer_id = $2 RETURNING customer_id, first_name, last_name, email, status',
      [status.trim(), id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.json({ message: 'Status updated', user: result.rows[0] });
  } catch (err) {
    console.error('Admin update user status error:', err);
    return res.status(500).json({ error: 'Failed to update status' });
  }
}




async function updateStoreOwnerStatus(req, res) {
  const pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });

  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid store owner id' });

  const { status } = req.body;
  if (!validateStoreOwnerStatus(status)) {
    return res.status(400).json({ error: 'Invalid status', valid: VALID_STORE_OWNER_STATUSES });
  }

  try {
    const result = await pool.query(
      'UPDATE store_owners SET status = $1 WHERE store_owner_id = $2 RETURNING store_owner_id, first_name, last_name, email, status',
      [status.trim(), id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Store owner not found' });
    }
    return res.json({ message: 'Status updated', store_owner: result.rows[0] });
  } catch (err) {
    console.error('Admin update store owner status error:', err);
    return res.status(500).json({ error: 'Failed to update status' });
  }
}

async function generateUserAccessToken(req, res) {
  const pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });

  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid user id' });

  try {
    const result = await pool.query(
      `SELECT customer_id, first_name, last_name, email
       FROM customers
       WHERE customer_id = $1
       LIMIT 1`,
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    const row = result.rows[0];
    const token = generateToken(row.customer_id, 'customer');
    return res.json({
      access: {
        role: 'customer',
        token,
        redirect_to: '/customer/settings',
        profile: row,
      },
    });
  } catch (err) {
    console.error('Admin generate user access token error:', err);
    return res.status(500).json({ error: 'Failed to generate user access token' });
  }
}

async function generateStoreOwnerAccessToken(req, res) {
  const pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });

  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid store owner id' });

  try {
    const result = await pool.query(
      `SELECT store_owner_id, first_name, last_name, email
       FROM store_owners
       WHERE store_owner_id = $1
       LIMIT 1`,
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Store owner not found' });
    const row = result.rows[0];
    const token = generateToken(row.store_owner_id, 'store_owner');
    return res.json({
      access: {
        role: 'store_owner',
        token,
        redirect_to: '/dashboard',
        profile: row,
      },
    });
  } catch (err) {
    console.error('Admin generate store owner access token error:', err);
    return res.status(500).json({ error: 'Failed to generate store owner access token' });
  }
}




async function getDashboardStats(req, res) {
  const pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });

  try {
    const [usersRes, ownersRes, storesRes, productsRes] = await Promise.all([
      pool.query('SELECT COUNT(*)::int AS count FROM customers'),
      pool.query('SELECT COUNT(*)::int AS count FROM store_owners'),
      pool.query('SELECT COUNT(*)::int AS count FROM stores'),
      pool.query('SELECT COUNT(*)::int AS count FROM products'),
    ]);
    return res.json({
      total_users: usersRes.rows[0]?.count ?? 0,
      total_store_owners: ownersRes.rows[0]?.count ?? 0,
      total_stores: storesRes.rows[0]?.count ?? 0,
      total_products: productsRes.rows[0]?.count ?? 0,
    });
  } catch (err) {
    console.error('Admin dashboard stats error:', err);
    return res.status(500).json({ error: 'Failed to fetch stats' });
  }
}

module.exports = {
  getAllUsers,
  getAllStoreOwners,
  updateUserStatus,
  updateStoreOwnerStatus,
  generateUserAccessToken,
  generateStoreOwnerAccessToken,
  getDashboardStats,
};
