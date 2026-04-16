const POLICY_MAX_LEN = 100000;
const PLAN_NAME_MAX_LEN = 100;
const THEME_MAX_LEN = 100;

const PLAN_STATUSES = ['Enabled', 'Disabled'];

function isPlainObject(v) {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

async function ensurePlatformTables(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS platform_policies (
      id INTEGER PRIMARY KEY DEFAULT 1,
      terms_text TEXT NOT NULL DEFAULT '',
      privacy_text TEXT NOT NULL DEFAULT '',
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS platform_plans (
      plan_id SERIAL PRIMARY KEY,
      name VARCHAR(${PLAN_NAME_MAX_LEN}) NOT NULL,
      price NUMERIC(10, 2) NOT NULL DEFAULT 0,
      features JSONB NOT NULL DEFAULT '[]'::JSONB,
      status VARCHAR(20) NOT NULL DEFAULT 'Enabled',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS platform_config (
      id INTEGER PRIMARY KEY DEFAULT 1,
      maintenance_mode BOOLEAN NOT NULL DEFAULT FALSE,
      max_stores_per_owner INTEGER NOT NULL DEFAULT 1,
      default_theme VARCHAR(${THEME_MAX_LEN}) NOT NULL DEFAULT 'Default',
      extra JSONB NOT NULL DEFAULT '{}'::JSONB,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(
    `INSERT INTO platform_policies (id)
     VALUES (1)
     ON CONFLICT (id) DO NOTHING`
  );
  await pool.query(
    `INSERT INTO platform_config (id)
     VALUES (1)
     ON CONFLICT (id) DO NOTHING`
  );
}

async function getPolicies(req, res) {
  const pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });
  try {
    await ensurePlatformTables(pool);
    const r = await pool.query(
      'SELECT terms_text, privacy_text, updated_at FROM platform_policies WHERE id = 1'
    );
    const row = r.rows[0] || { terms_text: '', privacy_text: '', updated_at: null };
    return res.json(row);
  } catch (err) {
    console.error('Admin get platform policies error:', err);
    return res.status(500).json({ error: 'Failed to fetch policies' });
  }
}

async function updatePolicies(req, res) {
  const pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });

  const body = req.body || {};
  const hasTerms = Object.prototype.hasOwnProperty.call(body, 'terms_text');
  const hasPrivacy = Object.prototype.hasOwnProperty.call(body, 'privacy_text');
  if (!hasTerms && !hasPrivacy) {
    return res.status(400).json({ error: 'Provide terms_text and/or privacy_text' });
  }

  const updates = {};
  if (hasTerms) {
    if (typeof body.terms_text !== 'string') return res.status(400).json({ error: 'terms_text must be a string' });
    if (body.terms_text.length > POLICY_MAX_LEN) return res.status(400).json({ error: 'terms_text too long' });
    updates.terms_text = body.terms_text;
  }
  if (hasPrivacy) {
    if (typeof body.privacy_text !== 'string') return res.status(400).json({ error: 'privacy_text must be a string' });
    if (body.privacy_text.length > POLICY_MAX_LEN) return res.status(400).json({ error: 'privacy_text too long' });
    updates.privacy_text = body.privacy_text;
  }

  try {
    await ensurePlatformTables(pool);
    const terms = updates.terms_text;
    const privacy = updates.privacy_text;
    const r = await pool.query(
      `UPDATE platform_policies
       SET terms_text = COALESCE($1, terms_text),
           privacy_text = COALESCE($2, privacy_text),
           updated_at = NOW()
       WHERE id = 1
       RETURNING terms_text, privacy_text, updated_at`,
      [hasTerms ? terms : null, hasPrivacy ? privacy : null]
    );
    return res.json({ message: 'Policies updated', ...r.rows[0] });
  } catch (err) {
    console.error('Admin update platform policies error:', err);
    return res.status(500).json({ error: 'Failed to update policies' });
  }
}

async function getPlans(req, res) {
  const pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });
  try {
    await ensurePlatformTables(pool);
    const r = await pool.query(
      `SELECT plan_id, name, price, features, status
       FROM platform_plans
       ORDER BY plan_id DESC`
    );
    return res.json({ plans: r.rows });
  } catch (err) {
    console.error('Admin get platform plans error:', err);
    return res.status(500).json({ error: 'Failed to fetch plans' });
  }
}

function validatePlanPayload(body, { requireNameAndPrice = false } = {}) {
  if (!isPlainObject(body)) return { ok: false, error: 'Invalid body' };

  const out = {};
  const hasName = Object.prototype.hasOwnProperty.call(body, 'name');
  const hasPrice = Object.prototype.hasOwnProperty.call(body, 'price');
  const hasFeatures = Object.prototype.hasOwnProperty.call(body, 'features');
  const hasStatus = Object.prototype.hasOwnProperty.call(body, 'status');

  if (requireNameAndPrice && (!hasName || !hasPrice)) {
    return { ok: false, error: 'name and price are required' };
  }

  if (hasName) {
    if (typeof body.name !== 'string' || !body.name.trim()) return { ok: false, error: 'name is required' };
    if (body.name.trim().length > PLAN_NAME_MAX_LEN) return { ok: false, error: 'name too long' };
    out.name = body.name.trim();
  }

  if (hasPrice) {
    const priceNum = Number(body.price);
    if (Number.isNaN(priceNum) || priceNum < 0) return { ok: false, error: 'price must be a non-negative number' };
    out.price = priceNum;
  }

  if (hasFeatures) {
    if (!Array.isArray(body.features)) return { ok: false, error: 'features must be an array' };
    out.features = body.features;
  }

  if (hasStatus) {
    if (typeof body.status !== 'string' || !PLAN_STATUSES.includes(body.status.trim())) {
      return { ok: false, error: 'Invalid status', valid: PLAN_STATUSES };
    }
    out.status = body.status.trim();
  }

  if (!hasName && !hasPrice && !hasFeatures && !hasStatus) {
    return { ok: false, error: 'No fields to update' };
  }

  return { ok: true, data: out };
}

async function createPlan(req, res) {
  const pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });

  const validation = validatePlanPayload(req.body, { requireNameAndPrice: true });
  if (!validation.ok) return res.status(400).json({ error: validation.error, valid: validation.valid });
  const { name, price, features, status } = validation.data;

  try {
    await ensurePlatformTables(pool);
    const r = await pool.query(
      `INSERT INTO platform_plans (name, price, features, status)
       VALUES ($1, $2, $3, $4)
       RETURNING plan_id, name, price, features, status`,
      [name, price, JSON.stringify(features || []), status || 'Enabled']
    );
    return res.status(201).json({ message: 'Plan created', plan: r.rows[0] });
  } catch (err) {
    console.error('Admin create platform plan error:', err);
    return res.status(500).json({ error: 'Failed to create plan' });
  }
}

async function updatePlan(req, res) {
  const pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });
  const planId = parseInt(req.params.id, 10);
  if (Number.isNaN(planId)) return res.status(400).json({ error: 'Invalid plan id' });

  const validation = validatePlanPayload(req.body, { requireNameAndPrice: false });
  if (!validation.ok) return res.status(400).json({ error: validation.error, valid: validation.valid });
  const payload = validation.data;

  try {
    await ensurePlatformTables(pool);
    const r = await pool.query(
      `UPDATE platform_plans
       SET name = COALESCE($1, name),
           price = COALESCE($2, price),
           features = COALESCE($3::jsonb, features),
           status = COALESCE($4, status),
           updated_at = NOW()
       WHERE plan_id = $5
       RETURNING plan_id, name, price, features, status`,
      [
        Object.prototype.hasOwnProperty.call(payload, 'name') ? payload.name : null,
        Object.prototype.hasOwnProperty.call(payload, 'price') ? payload.price : null,
        Object.prototype.hasOwnProperty.call(payload, 'features') ? JSON.stringify(payload.features) : null,
        Object.prototype.hasOwnProperty.call(payload, 'status') ? payload.status : null,
        planId,
      ]
    );
    if (r.rows.length === 0) return res.status(404).json({ error: 'Plan not found' });
    return res.json({ message: 'Plan updated', plan: r.rows[0] });
  } catch (err) {
    console.error('Admin update platform plan error:', err);
    return res.status(500).json({ error: 'Failed to update plan' });
  }
}

async function updatePlanStatus(req, res) {
  const pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });
  const planId = parseInt(req.params.id, 10);
  if (Number.isNaN(planId)) return res.status(400).json({ error: 'Invalid plan id' });

  const status = req.body && typeof req.body.status === 'string' ? req.body.status.trim() : '';
  if (!PLAN_STATUSES.includes(status)) {
    return res.status(400).json({ error: 'Invalid status', valid: PLAN_STATUSES });
  }

  try {
    await ensurePlatformTables(pool);
    const r = await pool.query(
      `UPDATE platform_plans
       SET status = $1, updated_at = NOW()
       WHERE plan_id = $2
       RETURNING plan_id, name, price, features, status`,
      [status, planId]
    );
    if (r.rows.length === 0) return res.status(404).json({ error: 'Plan not found' });
    return res.json({ message: 'Plan status updated', plan: r.rows[0] });
  } catch (err) {
    console.error('Admin update platform plan status error:', err);
    return res.status(500).json({ error: 'Failed to update plan status' });
  }
}

async function getPlatformConfig(req, res) {
  const pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });
  try {
    await ensurePlatformTables(pool);
    const r = await pool.query(
      `SELECT maintenance_mode, max_stores_per_owner, default_theme, extra, updated_at
       FROM platform_config
       WHERE id = 1`
    );
    return res.json(r.rows[0] || {
      maintenance_mode: false,
      max_stores_per_owner: 1,
      default_theme: 'Default',
      extra: {},
      updated_at: null,
    });
  } catch (err) {
    console.error('Admin get platform config error:', err);
    return res.status(500).json({ error: 'Failed to fetch platform config' });
  }
}

async function updatePlatformConfig(req, res) {
  const pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });
  const body = req.body || {};
  if (!isPlainObject(body)) return res.status(400).json({ error: 'Invalid body' });

  const hasMaintenance = Object.prototype.hasOwnProperty.call(body, 'maintenance_mode');
  const hasMaxStores = Object.prototype.hasOwnProperty.call(body, 'max_stores_per_owner');
  const hasTheme = Object.prototype.hasOwnProperty.call(body, 'default_theme');
  const hasExtra = Object.prototype.hasOwnProperty.call(body, 'extra');

  if (!hasMaintenance && !hasMaxStores && !hasTheme && !hasExtra) {
    return res.status(400).json({ error: 'No config fields provided' });
  }

  let maintenance_mode = null;
  let max_stores_per_owner = null;
  let default_theme = null;
  let extra = null;

  if (hasMaintenance) {
    if (typeof body.maintenance_mode !== 'boolean') {
      return res.status(400).json({ error: 'maintenance_mode must be boolean' });
    }
    maintenance_mode = body.maintenance_mode;
  }
  if (hasMaxStores) {
    const n = Number(body.max_stores_per_owner);
    if (!Number.isInteger(n) || n < 1 || n > 100) {
      return res.status(400).json({ error: 'max_stores_per_owner must be an integer between 1 and 100' });
    }
    max_stores_per_owner = n;
  }
  if (hasTheme) {
    if (typeof body.default_theme !== 'string' || !body.default_theme.trim()) {
      return res.status(400).json({ error: 'default_theme must be a non-empty string' });
    }
    default_theme = body.default_theme.trim().substring(0, THEME_MAX_LEN);
  }
  if (hasExtra) {
    if (!isPlainObject(body.extra)) return res.status(400).json({ error: 'extra must be an object' });
    extra = body.extra;
  }

  try {
    await ensurePlatformTables(pool);
    const r = await pool.query(
      `UPDATE platform_config
       SET maintenance_mode = COALESCE($1, maintenance_mode),
           max_stores_per_owner = COALESCE($2, max_stores_per_owner),
           default_theme = COALESCE($3, default_theme),
           extra = COALESCE($4::jsonb, extra),
           updated_at = NOW()
       WHERE id = 1
       RETURNING maintenance_mode, max_stores_per_owner, default_theme, extra, updated_at`,
      [
        hasMaintenance ? maintenance_mode : null,
        hasMaxStores ? max_stores_per_owner : null,
        hasTheme ? default_theme : null,
        hasExtra ? JSON.stringify(extra) : null,
      ]
    );
    return res.json({ message: 'Platform config updated', config: r.rows[0] });
  } catch (err) {
    console.error('Admin update platform config error:', err);
    return res.status(500).json({ error: 'Failed to update platform config' });
  }
}

module.exports = {
  getPolicies,
  updatePolicies,
  getPlans,
  createPlan,
  updatePlan,
  updatePlanStatus,
  getPlatformConfig,
  updatePlatformConfig,
};

