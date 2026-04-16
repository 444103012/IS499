const VALID_STORE_STATUSES = ['Active', 'Suspended'];

function normalizeStatus(status) {
  if (!status || typeof status !== 'string') return null;
  const trimmed = status.trim();
  return VALID_STORE_STATUSES.includes(trimmed) ? trimmed : null;
}

async function getAllStores(req, res) {
  const pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });

  try {
    const sql = `
      SELECT
        s.store_id,
        s.name AS store_name,
        s.store_owner_id AS owner_id,
        so.first_name AS owner_first_name,
        so.last_name AS owner_last_name,
        COALESCE(sub.plan_type, 'basic') AS plan,
        COALESCE(s.status, 'Pending') AS status,
        s.created_at
      FROM stores s
      JOIN store_owners so ON so.store_owner_id = s.store_owner_id
      LEFT JOIN LATERAL (
        SELECT plan_type
        FROM subscriptions sub
        WHERE sub.store_id = s.store_id
        ORDER BY sub.start_date DESC NULLS LAST, sub.subscription_id DESC
        LIMIT 1
      ) sub ON TRUE
      ORDER BY s.created_at DESC, s.store_id DESC
    `;
    const result = await pool.query(sql);
    return res.json({ stores: result.rows });
  } catch (err) {
    console.error('Admin get stores error:', err);
    return res.status(500).json({ error: 'Failed to fetch stores' });
  }
}

async function getStoreById(req, res) {
  const pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });

  const storeId = parseInt(req.params.id, 10);
  if (Number.isNaN(storeId)) {
    return res.status(400).json({ error: 'Invalid store id' });
  }

  try {
    const sql = `
      SELECT
        s.store_id,
        s.name AS store_name,
        s.description,
        s.store_type,
        s.logo,
        s.theme,
        s.status,
        s.created_at,
        s.store_owner_id AS owner_id,
        so.first_name AS owner_first_name,
        so.last_name AS owner_last_name,
        so.email AS owner_email,
        so.phone AS owner_phone,
        COALESCE(so.setup_step, 0) AS setup_step,
        plan.plan_type,
        plan.status AS plan_status,
        plan.start_date AS plan_start_date,
        plan.end_date AS plan_end_date
      FROM stores s
      JOIN store_owners so ON so.store_owner_id = s.store_owner_id
      LEFT JOIN LATERAL (
        SELECT plan_type, status, start_date, end_date
        FROM subscriptions sub
        WHERE sub.store_id = s.store_id
        ORDER BY sub.start_date DESC NULLS LAST, sub.subscription_id DESC
        LIMIT 1
      ) plan ON TRUE
      WHERE s.store_id = $1
      LIMIT 1
    `;
    const result = await pool.query(sql, [storeId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Store not found' });
    }

    const row = result.rows[0];
    const store = {
      store_id: row.store_id,
      store_name: row.store_name,
      description: row.description,
      store_type: row.store_type,
      logo: row.logo,
      theme: row.theme,
      status: row.status,
      created_at: row.created_at,
    };

    const owner = {
      owner_id: row.owner_id,
      first_name: row.owner_first_name,
      last_name: row.owner_last_name,
      email: row.owner_email,
      phone: row.owner_phone,
      setup_step: Number(row.setup_step || 0),
    };

    const plan = row.plan_type
      ? {
          plan_type: row.plan_type,
          status: row.plan_status,
          start_date: row.plan_start_date,
          end_date: row.plan_end_date,
        }
      : null;

    const setup_progress = {
      step: Number(row.setup_step || 0),
    };

    return res.json({
      store,
      owner,
      plan,
      theme: row.theme,
      setup_progress,
    });
  } catch (err) {
    console.error('Admin get store by id error:', err);
    return res.status(500).json({ error: 'Failed to fetch store details' });
  }
}

async function updateStoreStatus(req, res) {
  const pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });

  const storeId = parseInt(req.params.id, 10);
  if (Number.isNaN(storeId)) {
    return res.status(400).json({ error: 'Invalid store id' });
  }

  const status = normalizeStatus(req.body && req.body.status);
  if (!status) {
    return res.status(400).json({ error: 'Invalid status', valid: VALID_STORE_STATUSES });
  }

  try {
    const result = await pool.query(
      `UPDATE stores
       SET status = $1
       WHERE store_id = $2
       RETURNING store_id, name AS store_name, status`,
      [status, storeId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Store not found' });
    }
    return res.json({
      message: 'Store status updated',
      store: result.rows[0],
    });
  } catch (err) {
    console.error('Admin update store status error:', err);
    return res.status(500).json({ error: 'Failed to update store status' });
  }
}

async function notifyStoreOwner(req, res) {
  const pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });

  const storeId = parseInt(req.params.id, 10);
  if (Number.isNaN(storeId)) {
    return res.status(400).json({ error: 'Invalid store id' });
  }

  const message =
    req.body && typeof req.body.message === 'string' && req.body.message.trim()
      ? req.body.message.trim()
      : null;
  if (!message) {
    return res.status(400).json({ error: 'Notification message is required' });
  }

  try {
    const storeResult = await pool.query(
      `SELECT s.store_id, s.name AS store_name,
              so.store_owner_id AS owner_id, so.email AS owner_email
       FROM stores s
       JOIN store_owners so ON so.store_owner_id = s.store_owner_id
       WHERE s.store_id = $1
       LIMIT 1`,
      [storeId]
    );
    if (storeResult.rows.length === 0) {
      return res.status(404).json({ error: 'Store not found' });
    }
    const row = storeResult.rows[0];

   
    try {
      await pool.query(
        `INSERT INTO store_admins (admin_id, store_id, activity_note)
         VALUES ($1, $2, $3)`,
        [req.user && req.user.admin_id ? req.user.admin_id : null, row.store_id, message]
      );
    } catch (activityErr) {
      console.error('Admin store notification activity insert error:', activityErr);
     
    }

    console.log('Simulated admin notification to store owner:', {
      store_id: row.store_id,
      owner_id: row.owner_id,
      owner_email: row.owner_email,
      message,
    });

    return res.json({
      message: 'Notification simulated (not actually sent)',
      notification: {
        store_id: row.store_id,
        owner_id: row.owner_id,
        owner_email: row.owner_email,
        message,
      },
    });
  } catch (err) {
    console.error('Admin notify store owner error:', err);
    return res.status(500).json({ error: 'Failed to send notification' });
  }
}

module.exports = {
  getAllStores,
  getStoreById,
  updateStoreStatus,
  notifyStoreOwner,
};

