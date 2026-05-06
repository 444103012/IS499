const PLAN_NAME_MAX_LEN = 100;
const PLAN_SLUG_MAX_LEN = 32;

const DEFAULT_PLATFORM_PLANS = [
  {
    slug: 'basic',
    name: 'Basic',
    rank: 0,
    price: 0,
    features: ['Bank Transfer only', 'Manual Shipping', 'Default Theme Only', 'Arabic & English Support'],
    status: 'Enabled',
  },
  {
    slug: 'pro',
    name: 'Pro',
    rank: 1,
    price: 69,
    features: ['All Basic Features', 'Expanded Payment Options', 'More Shipping Providers', 'Standard Themes', 'Standard Reports & Analytics'],
    status: 'Enabled',
  },
  {
    slug: 'advanced',
    name: 'Advanced',
    rank: 2,
    price: 199,
    features: ['All Pro Features', 'Advanced Reports & Analytics (Export)', 'Custom Domain', 'Advanced Themes', 'Marketing & Conversion Tools', 'POS Integration'],
    status: 'Enabled',
  },
];
const CORE_PLAN_SLUGS = DEFAULT_PLATFORM_PLANS.map((p) => p.slug);

function normalizePlanRow(row) {
  return {
    plan_id: row.plan_id,
    slug: String(row.slug || '').toLowerCase(),
    rank: Number(row.rank || 0),
    name: row.name,
    price: Number(row.price || 0),
    features: Array.isArray(row.features) ? row.features : [],
    status: row.status || 'Enabled',
  };
}

async function ensurePlatformPlansTableAndSeed(pool) {
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
    ALTER TABLE platform_plans
    ADD COLUMN IF NOT EXISTS slug VARCHAR(${PLAN_SLUG_MAX_LEN});
  `);
  await pool.query(`
    ALTER TABLE platform_plans
    ADD COLUMN IF NOT EXISTS rank INTEGER;
  `);

  for (const plan of DEFAULT_PLATFORM_PLANS) {
    await pool.query(
      `UPDATE platform_plans
       SET slug = $1
       WHERE slug IS NULL AND LOWER(name) = $1`,
      [plan.slug]
    );
  }

  await pool.query(
    `UPDATE platform_plans
     SET slug = LOWER(REGEXP_REPLACE(COALESCE(name, 'plan'), '[^a-zA-Z0-9]+', '-', 'g'))
     WHERE slug IS NULL OR slug = ''`
  );

  for (const plan of DEFAULT_PLATFORM_PLANS) {
    await pool.query(
      `UPDATE platform_plans
       SET rank = $1
       WHERE rank IS NULL AND slug = $2`,
      [plan.rank, plan.slug]
    );
  }
  await pool.query(
    `UPDATE platform_plans
     SET rank = 99
     WHERE rank IS NULL`
  );

  await pool.query(`ALTER TABLE platform_plans ALTER COLUMN slug SET NOT NULL`);
  await pool.query(`ALTER TABLE platform_plans ALTER COLUMN rank SET NOT NULL`);
  await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS platform_plans_slug_uniq ON platform_plans(slug)`);

  for (const plan of DEFAULT_PLATFORM_PLANS) {
    await pool.query(
      `INSERT INTO platform_plans (slug, rank, name, price, features, status)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6)
       ON CONFLICT (slug) DO NOTHING`,
      [plan.slug, plan.rank, plan.name, plan.price, JSON.stringify(plan.features), plan.status]
    );
  }
}

async function getPlatformPlans(pool, { enabledOnly = false, coreOnly = true } = {}) {
  await ensurePlatformPlansTableAndSeed(pool);
  const clauses = [];
  const params = [];
  if (enabledOnly) clauses.push(`status = 'Enabled'`);
  if (coreOnly) {
    params.push(CORE_PLAN_SLUGS);
    clauses.push(`slug = ANY($${params.length})`);
  }
  const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
  const r = await pool.query(
    `SELECT plan_id, slug, rank, name, price, features, status
     FROM platform_plans
     ${where}
     ORDER BY rank ASC, plan_id ASC`
    ,
    params
  );
  return r.rows.map(normalizePlanRow);
}

async function getPlatformPlanBySlug(pool, slug, { enabledOnly = false } = {}) {
  await ensurePlatformPlansTableAndSeed(pool);
  const r = await pool.query(
    `SELECT plan_id, slug, rank, name, price, features, status
     FROM platform_plans
     WHERE slug = $1
       ${enabledOnly ? `AND status = 'Enabled'` : ''}
     LIMIT 1`,
    [String(slug || '').trim().toLowerCase()]
  );
  return r.rows[0] ? normalizePlanRow(r.rows[0]) : null;
}

module.exports = {
  DEFAULT_PLATFORM_PLANS,
  CORE_PLAN_SLUGS,
  PLAN_NAME_MAX_LEN,
  PLAN_SLUG_MAX_LEN,
  ensurePlatformPlansTableAndSeed,
  getPlatformPlans,
  getPlatformPlanBySlug,
};