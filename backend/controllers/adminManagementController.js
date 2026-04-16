const VALID_STATUSES = ['Active', 'Suspended', 'Disabled'];

function validateStatus(status) {
  if (!status || typeof status !== 'string') return false;
  return VALID_STATUSES.includes(status.trim());
}

async function getAllUsers(req, res) {
  const pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });

  try {
    const result = await pool.query(
      `SELECT customer_id, first_name, last_name, email, COALESCE(status, 'Active') AS status, created_at
       FROM customers
       ORDER BY created_at DESC`
    );
    return res.json({ users: result.rows });
  } catch (err) {
    console.error('Admin get users error:', err);
    return res.status(500).json({ error: 'Failed to fetch users' });
  }
}

async function getAllStoreOwners(req, res) {
  const pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });

  try {
    const result = await pool.query(
      `SELECT so.store_owner_id AS owner_id, so.first_name, so.last_name, so.email,
              (SELECT s.name FROM stores s WHERE s.store_owner_id = so.store_owner_id ORDER BY s.store_id LIMIT 1) AS store_name,
              COALESCE(so.status, 'Active') AS status, so.created_at
       FROM store_owners so
       ORDER BY so.created_at DESC`
    );
    const rows = result.rows.map((r) => ({ ...r, store_name: r.store_name || '—' }));
    return res.json({ store_owners: rows });
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
  if (!validateStatus(status)) {
    return res.status(400).json({ error: 'Invalid status', valid: VALID_STATUSES });
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
  if (!validateStatus(status)) {
    return res.status(400).json({ error: 'Invalid status', valid: VALID_STATUSES });
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
  getDashboardStats,
};
