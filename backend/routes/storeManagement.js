const express = require('express');
const { DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { uploadStoreLogo } = require('../middleware/upload');
const s3 = require('../utils/s3');
const { normalizeStoreSlug, isValidStoreSlug } = require('../utils/storeDomain');
const { getStoreId } = require('../utils/getStoreId');
const { canOwnerAccessStore } = require('../utils/storeAccess');
const subscriptionRouter = require('./subscription');

const router = express.Router();
const PLAN_PRICES = subscriptionRouter.PLAN_PRICES || { basic: 0, pro: 69, advanced: 199 };
const STORE_NAME_MIN_LENGTH = 3;
const STORE_NAME_MAX_LENGTH = 40;
const STORE_NAME_LENGTH_ERROR = 'Store name must be 3-40 characters.';

function isValidStoreNameLength(name) {
  const length = String(name || '').trim().length;
  return length >= STORE_NAME_MIN_LENGTH && length <= STORE_NAME_MAX_LENGTH;
}

function getS3KeyFromStoreLogoUrl(url) {
  const bucket = process.env.AWS_BUCKET;
  const region = process.env.AWS_REGION;
  if (!bucket || !url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  const expectedPathStylePrefix = `https://s3.${region}.amazonaws.com/${bucket}/store-logos/`;
  const expectedVirtualHostedPrefix = `https://${bucket}.s3.${region}.amazonaws.com/store-logos/`;
  const expectedLegacyPrefix = `https://${bucket}.s3.amazonaws.com/store-logos/`;
  const expectedGlobalPathStylePrefix = `https://s3.amazonaws.com/${bucket}/store-logos/`;

  const prefixes = [
    expectedPathStylePrefix,
    expectedVirtualHostedPrefix,
    expectedLegacyPrefix,
    expectedGlobalPathStylePrefix,
  ];
  const matchedPrefix = prefixes.find((prefix) => trimmed.startsWith(prefix));
  if (!matchedPrefix) return null;
  const key = trimmed.slice(matchedPrefix.length);
  if (!key || key.includes('..') || key.includes('?') || key.includes('#')) return null;
  return `store-logos/${key}`;
}
async function ensureStoreSettingsTable(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS store_settings (
      store_id INTEGER PRIMARY KEY REFERENCES stores(store_id) ON DELETE CASCADE,
      info JSONB DEFAULT '{}'::JSONB,
      branding JSONB DEFAULT '{}'::JSONB,
      domain JSONB DEFAULT '{}'::JSONB,
      payments JSONB DEFAULT '{}'::JSONB,
      shipping JSONB DEFAULT '{}'::JSONB,
      policies JSONB DEFAULT '{}'::JSONB,
      footer JSONB DEFAULT '{}'::JSONB
    );
  `);
  await pool.query(`
    ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS footer JSONB DEFAULT '{}'::JSONB;
  `);
}

async function ensureActivationFlowSchema(pool) {
  await pool.query(`
    ALTER TABLE stores
      ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) NOT NULL DEFAULT 'unpaid';
  `);
  await pool.query(`
    ALTER TABLE subscriptions
      ADD COLUMN IF NOT EXISTS paid_date TIMESTAMP WITH TIME ZONE;
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS store_activation_attempts (
      id SERIAL PRIMARY KEY,
      store_id INTEGER NOT NULL REFERENCES stores(store_id) ON DELETE CASCADE,
      attempted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      status VARCHAR(20) NOT NULL,
      payment_method VARCHAR(100),
      amount_sar DECIMAL(10, 2),
      transaction_ref VARCHAR(255),
      error_message TEXT
    );
  `);
}

async function getOrCreateStoreSettings(pool, store_id) {
  await ensureStoreSettingsTable(pool);
  const existing = await pool.query('SELECT * FROM store_settings WHERE store_id = $1', [store_id]);
  if (existing.rows[0]) return existing.rows[0];
  const inserted = await pool.query(
    'INSERT INTO store_settings (store_id) VALUES ($1) RETURNING *',
    [store_id]
  );
  return inserted.rows[0];
}

const PLAN_RANK = { basic: 0, pro: 1, advanced: 2 };
const PAYMENT_MIN_PLAN = {
  bankTransfer: 'basic',
  mada: 'pro',
  stcPay: 'pro',
  applePay: 'advanced',
};
const SHIPPING_MIN_PLAN = {
  noShippingNeeded: 'basic',
  smsa: 'advanced',
  aramex: 'advanced',
  spl: 'pro',
};

function mapCarrierNameToShippingKey(carrierName) {
  const n = String(carrierName || '').trim().toLowerCase();
  if (n.includes('digital')) return 'noShippingNeeded';
  if (n.includes('smsa')) return 'smsa';
  if (n.includes('aramex')) return 'aramex';
  if (n.includes('spl')) return 'spl';
  return null;
}
const DEFAULT_LAYER_COLORS = {
  topBar: '#0A3C5A',
  buttons: '#1FAE77',
  buttonText: '#FFFFFF',
  background: '#F9FAFB',
  text: '#111827',
  priceLabels: '#047857',
  badges: '#F59E0B',
  badgeText: '#FFFFFF',
  productCard: '#FFFFFF',
};
const BRANDING_COLOR_KEYS = Object.keys(DEFAULT_LAYER_COLORS);
const HEX_COLOR_RE = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

function normalizeColor(color, fallback) {
  if (typeof color !== 'string') return fallback;
  const trimmed = color.trim();
  return HEX_COLOR_RE.test(trimmed) ? trimmed : fallback;
}

function normalizeProductLayout(layout) {
  const normalized = String(layout || '').toLowerCase();
  if (normalized === 'compact-list' || normalized === 'list') return 'compact-list';
  return 'grid-classic';
}

function normalizeBranding(branding) {
  const safeBranding = branding && typeof branding === 'object' ? branding : {};
  const safeLayerColors = safeBranding.layerColors && typeof safeBranding.layerColors === 'object'
    ? safeBranding.layerColors
    : {};
  const layerColors = BRANDING_COLOR_KEYS.reduce((acc, key) => {
    acc[key] = normalizeColor(safeLayerColors[key], DEFAULT_LAYER_COLORS[key]);
    return acc;
  }, {});
  return {
    productLayout: normalizeProductLayout(safeBranding.productLayout),
    layerColors,
  };
}

async function getSubscriptionPlan(pool, store_id) {
  const row = await pool.query(
    `SELECT plan_type
     FROM subscriptions
     WHERE store_id = $1
     ORDER BY subscription_id DESC LIMIT 1`,
    [store_id]
  );
  if (!row.rows[0] || !row.rows[0].plan_type) return 'basic';
  const plan = String(row.rows[0].plan_type).toLowerCase();
  return PLAN_RANK[plan] !== undefined ? plan : 'basic';
}

function isAllowedByPlan(plan, minPlan) {
  return PLAN_RANK[plan] >= PLAN_RANK[minPlan];
}

function enforceProviderPlanRules(payload, minPlans, plan, sectionName) {
  const sanitized = {};
  Object.entries(payload || {}).forEach(([providerKey, providerState]) => {
    const minPlan = minPlans[providerKey];
    const enabled = !!providerState?.enabled;
    if (!minPlan) {
      sanitized[providerKey] = providerState;
      return;
    }
    if (enabled && !isAllowedByPlan(plan, minPlan)) {
      const err = new Error(`${providerKey} requires ${minPlan} plan`);
      err.statusCode = 403;
      err.code = 'PLAN_RESTRICTED_PROVIDER';
      err.meta = { section: sectionName, providerKey, requiredPlan: minPlan, currentPlan: plan };
      throw err;
    }
    sanitized[providerKey] = {
      ...(providerState || {}),
      enabled: enabled && isAllowedByPlan(plan, minPlan),
    };
  });
  return sanitized;
}

function enforceAtLeastOneEnabled(payload, sectionName) {
  const enabledCount = Object.values(payload || {}).filter((providerState) => !!providerState?.enabled).length;
  if (enabledCount > 0) return;
  const err = new Error(
    sectionName === 'payments'
      ? 'The store must keep at least one payment provider enabled.'
      : 'The store must keep at least one shipping provider enabled.'
  );
  err.statusCode = 400;
  err.code = 'LAST_PROVIDER_REQUIRED';
  err.meta = { section: sectionName, message: err.message };
  throw err;
}


router.get('/', async (req, res) => {
  const pool = req.app.locals.pool;
  const { store_owner_id } = req.user;
  try {
    const store_id = await getStoreId(pool, store_owner_id);
    if (!store_id) return res.status(404).json({ error: 'No store found' });
    const storeRow = await pool.query(
      `SELECT store_id, store_owner_id, name, description, store_type, logo, theme, domain_name, status, created_at
       FROM stores WHERE store_id = $1`,
      [store_id]
    );
    const store = storeRow.rows[0];
    const settings = await getOrCreateStoreSettings(pool, store_id);
    res.json({
      store,
      settings: {
        info: settings.info || {},
        branding: settings.branding || {},
        domain: settings.domain || {},
        payments: settings.payments || {},
        shipping: settings.shipping || {},
        policies: settings.policies || {},
        footer: settings.footer || {},
      },
    });
  } catch (err) {
    console.error('store GET /api/store:', err);
    res.status(500).json({ error: 'Failed to load store' });
  }
});

router.get('/access-status', async (req, res) => {
  const pool = req.app.locals.pool;
  const ownerId = Number.parseInt(req.user && req.user.store_owner_id, 10);
  if (!pool) return res.status(500).json({ error: 'Database not configured' });
  if (Number.isNaN(ownerId)) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const result = await pool.query(
      `SELECT
         so.store_owner_id,
         COALESCE(so.status, 'Active') AS owner_status,
         s.store_id,
         COALESCE(s.status, 'Pending') AS store_status,
         EXISTS (
           SELECT 1
           FROM stores sx
           WHERE sx.store_owner_id = so.store_owner_id
             AND COALESCE(sx.status, 'Pending') = 'Suspended'
         ) AS has_suspended_store
       FROM store_owners so
       LEFT JOIN LATERAL (
         SELECT store_id, status
         FROM stores
         WHERE store_owner_id = so.store_owner_id
         ORDER BY created_at DESC, store_id DESC
         LIMIT 1
       ) s ON TRUE
       WHERE so.store_owner_id = $1
       LIMIT 1`,
      [ownerId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Store owner not found' });
    }
    const row = result.rows[0];
    const ownerStatus = row.owner_status || 'Active';
    const storeStatus = row.store_status || 'Pending';
    const suspended = ownerStatus === 'Suspended' || storeStatus === 'Suspended' || !!row.has_suspended_store;
    return res.json({
      store_id: row.store_id || null,
      store_status: storeStatus,
      owner_status: ownerStatus,
      suspended,
      suspension_message: suspended
        ? 'Your store has been suspended. Please contact the admin.'
        : '',
    });
  } catch (err) {
    console.error('store GET /api/store/access-status:', err);
    return res.status(500).json({ error: 'Failed to fetch access status' });
  }
});

/** Lightweight counts for dashboard KPI cards (avoids full product + customer list). */
router.get('/dashboard-counts', async (req, res) => {
  const pool = req.app.locals.pool;
  const { store_owner_id } = req.user;
  try {
    const store_id = await getStoreId(pool, store_owner_id);
    if (!store_id) {
      return res.json({ product_count: 0, customer_count: 0 });
    }
    const [productsR, customersR] = await Promise.all([
      pool.query(
        `SELECT COUNT(*)::INTEGER AS n FROM products WHERE store_id = $1 AND status = 'Active'`,
        [store_id]
      ),
      pool.query(
        `SELECT COUNT(DISTINCT c.customer_id)::INTEGER AS n
         FROM customers c
         INNER JOIN orders o ON o.customer_id = c.customer_id
         WHERE o.store_id = $1`,
        [store_id]
      ),
    ]);
    res.json({
      product_count: productsR.rows[0]?.n ?? 0,
      customer_count: customersR.rows[0]?.n ?? 0,
    });
  } catch (err) {
    console.error('store GET /dashboard-counts:', err);
    res.status(500).json({ error: 'Failed to load dashboard counts' });
  }
});

router.put('/', async (req, res) => {
  const pool = req.app.locals.pool;
  const { store_owner_id } = req.user;
  const body = req.body || {};
  try {
    const store_id = await getStoreId(pool, store_owner_id);
    if (!store_id) return res.status(404).json({ error: 'No store found' });

    const name = (body.name || '').trim();
    if (!name) return res.status(400).json({ error: 'Store name is required' });
    if (!isValidStoreNameLength(name)) return res.status(400).json({ error: STORE_NAME_LENGTH_ERROR });
    const description = (body.description || '').trim() || null;
    const store_type = (body.store_type || '').trim() || null;
    const status = body.status === 'Suspended' ? 'Suspended' : 'Active';

    await pool.query(
      `UPDATE stores
       SET name = $1, description = $2, store_type = $3, status = $4
       WHERE store_id = $5`,
      [name, description, store_type, status, store_id]
    );

    await ensureStoreSettingsTable(pool);
    if (Object.prototype.hasOwnProperty.call(body, 'info') && body.info !== null && typeof body.info === 'object') {
      await pool.query(
        `INSERT INTO store_settings (store_id, info)
         VALUES ($1, $2)
         ON CONFLICT (store_id) DO UPDATE SET info = EXCLUDED.info`,
        [store_id, body.info]
      );
    }

    res.json({ success: true });
  } catch (err) {
    console.error('store PUT /api/store:', err);
    res.status(500).json({ error: 'Failed to update store' });
  }
});


router.put('/logo', uploadStoreLogo.single('logo'), async (req, res) => {
  const pool = req.app.locals.pool;
  const { store_owner_id } = req.user;
  try {
    const store_id = await getStoreId(pool, store_owner_id);
    if (!store_id) return res.status(404).json({ error: 'No store found' });
    if (!req.file || !req.file.location) return res.status(400).json({ error: 'No image file provided' });

    const previousStore = await pool.query('SELECT logo FROM stores WHERE store_id = $1', [store_id]);
    const previousLogo = previousStore.rows[0]?.logo || null;
    const logoUrl = req.file.location;
    await pool.query('UPDATE stores SET logo = $1 WHERE store_id = $2', [logoUrl, store_id]);
    const settings = await getOrCreateStoreSettings(pool, store_id);
    const branding = Object.assign({}, settings.branding || {}, { logo: logoUrl });
    await pool.query('UPDATE store_settings SET branding = $1 WHERE store_id = $2', [
      branding,
      store_id,
    ]);

    const oldLogoKey = getS3KeyFromStoreLogoUrl(previousLogo);
    if (oldLogoKey) {
      try {
        await s3.send(
          new DeleteObjectCommand({
            Bucket: process.env.AWS_BUCKET,
            Key: oldLogoKey,
          })
        );
      } catch (deleteErr) {
        console.warn('store PUT /api/store/logo delete old S3 logo warning:', deleteErr.message);
      }
    }

    res.json({ success: true, logo: logoUrl });
  } catch (err) {
    console.error('store PUT /api/store/logo:', err);
    res.status(500).json({ error: 'Failed to upload logo' });
  }
});


router.put('/theme', async (req, res) => {
  const pool = req.app.locals.pool;
  const { store_owner_id } = req.user;
  const { theme, branding } = req.body || {};
  try {
    const store_id = await getStoreId(pool, store_owner_id);
    if (!store_id) return res.status(404).json({ error: 'No store found' });
    if (!theme) return res.status(400).json({ error: 'theme is required' });

    await pool.query('UPDATE stores SET theme = $1 WHERE store_id = $2', [
      String(theme).substring(0, 100),
      store_id,
    ]);
    await ensureStoreSettingsTable(pool);
    await pool.query(
      `INSERT INTO store_settings (store_id, branding)
       VALUES ($1, $2)
       ON CONFLICT (store_id) DO UPDATE SET branding = EXCLUDED.branding`,
      [store_id, normalizeBranding(branding)]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('store PUT /api/store/theme:', err);
    res.status(500).json({ error: 'Failed to update theme' });
  }
});


router.put('/domain', async (req, res) => {
  const pool = req.app.locals.pool;
  const { store_owner_id } = req.user;
  const { customDomain, slug, domainMeta } = req.body || {};
  try {
    const store_id = await getStoreId(pool, store_owner_id);
    if (!store_id) return res.status(404).json({ error: 'No store found' });

    const requestedSlug = slug ?? customDomain;
    const normalizedSlug = normalizeStoreSlug(requestedSlug);
    if (!isValidStoreSlug(normalizedSlug)) {
      return res.status(400).json({
        error: 'Invalid slug. Use 3-40 lowercase letters, numbers, and hyphens only.',
      });
    }

    const existing = await pool.query(
      `SELECT store_id
       FROM stores
       WHERE LOWER(domain_name) = LOWER($1)
         AND store_id != $2
       LIMIT 1`,
      [normalizedSlug, store_id]
    );
    if (existing.rows[0]) {
      return res.status(409).json({ error: 'This store slug is already in use.' });
    }

    const previousDomainRow = await pool.query(
      'SELECT domain_name FROM stores WHERE store_id = $1 LIMIT 1',
      [store_id]
    );
    const previousSlug = String(previousDomainRow.rows[0]?.domain_name || '').trim().toLowerCase();

    await pool.query('UPDATE stores SET domain_name = $1 WHERE store_id = $2', [normalizedSlug, store_id]);

    // Keep domain settings clean: store only active slug preview and drop any stale/legacy domain values.
    const domain = {
      ...(domainMeta && typeof domainMeta === 'object' ? domainMeta : {}),
      slug: normalizedSlug,
      fullUrl: `storelaunch.site/${normalizedSlug}`,
    };
    delete domain.customDomain;
    delete domain.defaultDomain;
    delete domain.previousDomains;
    delete domain.history;

    await ensureStoreSettingsTable(pool);
    await pool.query(
      `INSERT INTO store_settings (store_id, domain)
       VALUES ($1, $2)
       ON CONFLICT (store_id) DO UPDATE SET domain = EXCLUDED.domain`,
      [store_id, domain]
    );

    if (previousSlug && previousSlug !== normalizedSlug) {
      console.info(`store PUT /api/store/domain: replaced old slug "${previousSlug}" with "${normalizedSlug}" for store ${store_id}`);
    }

    res.json({ success: true, slug: normalizedSlug });
  } catch (err) {
    console.error('store PUT /api/store/domain:', err);
    res.status(500).json({ error: 'Failed to update domain' });
  }
});


router.put('/payment-providers', async (req, res) => {
  const pool = req.app.locals.pool;
  const { store_owner_id } = req.user;
  const { payments } = req.body || {};
  try {
    const store_id = await getStoreId(pool, store_owner_id);
    if (!store_id) return res.status(404).json({ error: 'No store found' });
    if (!payments || typeof payments !== 'object') {
      return res.status(400).json({ error: 'payments object required' });
    }
    const plan = await getSubscriptionPlan(pool, store_id);
    const sanitizedPayments = enforceProviderPlanRules(payments, PAYMENT_MIN_PLAN, plan, 'payments');
    enforceAtLeastOneEnabled(sanitizedPayments, 'payments');
    await ensureStoreSettingsTable(pool);
    await pool.query(
      `INSERT INTO store_settings (store_id, payments)
       VALUES ($1, $2)
       ON CONFLICT (store_id) DO UPDATE SET payments = EXCLUDED.payments`,
      [store_id, sanitizedPayments]
    );
    res.json({ success: true });
  } catch (err) {
    if (err.statusCode === 400 && err.code === 'LAST_PROVIDER_REQUIRED') {
      return res.status(400).json({
        error: err.code,
        ...err.meta,
      });
    }
    if (err.statusCode === 403) {
      return res.status(403).json({
        error: 'Provider is not available for current subscription plan',
        ...err.meta,
      });
    }
    console.error('store PUT /api/store/payment-providers:', err);
    res.status(500).json({ error: 'Failed to update payment providers' });
  }
});

router.get('/payment-providers', async (req, res) => {
  const pool = req.app.locals.pool;
  const { store_owner_id } = req.user;
  try {
    const store_id = await getStoreId(pool, store_owner_id);
    if (!store_id) return res.status(404).json({ error: 'No store found' });
    const settings = await getOrCreateStoreSettings(pool, store_id);
    res.json({ payments: settings.payments || {} });
  } catch (err) {
    console.error('store GET /api/store/payment-providers:', err);
    res.status(500).json({ error: 'Failed to load payment providers' });
  }
});


router.put('/shipping-providers', async (req, res) => {
  const pool = req.app.locals.pool;
  const { store_owner_id } = req.user;
  const { shipping } = req.body || {};
  try {
    const store_id = await getStoreId(pool, store_owner_id);
    if (!store_id) return res.status(404).json({ error: 'No store found' });
    if (!shipping || typeof shipping !== 'object') {
      return res.status(400).json({ error: 'shipping object required' });
    }
    const plan = await getSubscriptionPlan(pool, store_id);
    const sanitizedShipping = enforceProviderPlanRules(shipping, SHIPPING_MIN_PLAN, plan, 'shipping');
    enforceAtLeastOneEnabled(sanitizedShipping, 'shipping');
    await ensureStoreSettingsTable(pool);
    await pool.query(
      `INSERT INTO store_settings (store_id, shipping)
       VALUES ($1, $2)
       ON CONFLICT (store_id) DO UPDATE SET shipping = EXCLUDED.shipping`,
      [store_id, sanitizedShipping]
    );
    res.json({ success: true });
  } catch (err) {
    if (err.statusCode === 400 && err.code === 'LAST_PROVIDER_REQUIRED') {
      return res.status(400).json({
        error: err.code,
        ...err.meta,
      });
    }
    if (err.statusCode === 403) {
      return res.status(403).json({
        error: 'Provider is not available for current subscription plan',
        ...err.meta,
      });
    }
    console.error('store PUT /api/store/shipping-providers:', err);
    res.status(500).json({ error: 'Failed to update shipping providers' });
  }
});

router.get('/shipping-providers', async (req, res) => {
  const pool = req.app.locals.pool;
  const { store_owner_id } = req.user;
  try {
    const store_id = await getStoreId(pool, store_owner_id);
    if (!store_id) return res.status(404).json({ error: 'No store found' });
    const settings = await getOrCreateStoreSettings(pool, store_id);
    let shipping = settings.shipping || {};
    if (typeof shipping !== 'object') shipping = {};
    if (Object.keys(shipping).length === 0) {
      const prov = await pool.query(
        'SELECT carrier_name FROM shipping_providers WHERE store_id = $1',
        [store_id]
      );
      const inferred = {};
      for (const r of prov.rows) {
        const k = mapCarrierNameToShippingKey(r.carrier_name);
        if (k) inferred[k] = { enabled: true, zones: [] };
      }
      shipping = inferred;
    }
    res.json({ shipping });
  } catch (err) {
    console.error('store GET /api/store/shipping-providers:', err);
    res.status(500).json({ error: 'Failed to load shipping providers' });
  }
});


router.put('/policies', async (req, res) => {
  const pool = req.app.locals.pool;
  const { store_owner_id } = req.user;
  const { policies } = req.body || {};
  try {
    const store_id = await getStoreId(pool, store_owner_id);
    if (!store_id) return res.status(404).json({ error: 'No store found' });
    if (!policies || typeof policies !== 'object') {
      return res.status(400).json({ error: 'policies object required' });
    }
    await ensureStoreSettingsTable(pool);
    await pool.query(
      `INSERT INTO store_settings (store_id, policies)
       VALUES ($1, $2)
       ON CONFLICT (store_id) DO UPDATE SET policies = EXCLUDED.policies`,
      [store_id, policies]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('store PUT /api/store/policies:', err);
    res.status(500).json({ error: 'Failed to update policies' });
  }
});


const FOOTER_STRING_KEYS = [
  'about',
  'contactEmail',
  'contactPhone',
  'address',
  'instagram',
  'tiktok',
  'snapchat',
  'twitter',
  'whatsapp',
  'facebook',
];

function sanitizeFooterPayload(raw) {
  const out = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const key of FOOTER_STRING_KEYS) {
    if (!(key in raw)) continue;
    const v = raw[key];
    if (v == null) continue;
    if (typeof v === 'object') continue;
    const str = String(v);
    out[key] = str.slice(0, 4000);
  }
  return out;
}

const INFO_STRING_KEYS = ['storeName', 'storeDescription', 'businessCategory'];

function sanitizeInfoPayload(raw) {
  const out = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const key of INFO_STRING_KEYS) {
    if (!(key in raw)) continue;
    const v = raw[key];
    if (v == null || typeof v === 'object') continue;
    out[key] = String(v).slice(0, 2000);
  }
  return out;
}

router.put('/info', async (req, res) => {
  const pool = req.app.locals.pool;
  const { store_owner_id } = req.user;
  const { info } = req.body || {};
  try {
    const store_id = await getStoreId(pool, store_owner_id);
    if (!store_id) return res.status(404).json({ error: 'No store found' });
    if (!info || typeof info !== 'object') {
      return res.status(400).json({ error: 'info object required' });
    }
    const sanitized = sanitizeInfoPayload(info);
    await ensureStoreSettingsTable(pool);
    await pool.query(
      `INSERT INTO store_settings (store_id, info)
       VALUES ($1, $2::jsonb)
       ON CONFLICT (store_id) DO UPDATE SET info = store_settings.info || EXCLUDED.info`,
      [store_id, JSON.stringify(sanitized)]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('store PUT /api/store/info:', err);
    res.status(500).json({ error: 'Failed to update store info' });
  }
});

router.put('/footer', async (req, res) => {
  const pool = req.app.locals.pool;
  const { store_owner_id } = req.user;
  const { footer } = req.body || {};
  try {
    const store_id = await getStoreId(pool, store_owner_id);
    if (!store_id) return res.status(404).json({ error: 'No store found' });
    if (!footer || typeof footer !== 'object') {
      return res.status(400).json({ error: 'footer object required' });
    }
    const sanitized = sanitizeFooterPayload(footer);
    await ensureStoreSettingsTable(pool);
    await pool.query(
      `INSERT INTO store_settings (store_id, footer)
       VALUES ($1, $2::jsonb)
       ON CONFLICT (store_id) DO UPDATE SET footer = EXCLUDED.footer`,
      [store_id, JSON.stringify(sanitized)]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('store PUT /api/store/footer:', err);
    res.status(500).json({ error: 'Failed to update footer' });
  }
});


router.delete('/', async (req, res) => {
  const pool = req.app.locals.pool;
  const { store_owner_id } = req.user;
  try {
    const store_id = await getStoreId(pool, store_owner_id);
    if (!store_id) return res.status(404).json({ error: 'No store found' });
    await pool.query('DELETE FROM stores WHERE store_id = $1 AND store_owner_id = $2', [
      store_id,
      store_owner_id,
    ]);
    res.json({ success: true });
  } catch (err) {
    console.error('store DELETE /api/store:', err);
    res.status(500).json({ error: 'Failed to delete store' });
  }
});

router.get('/:storeId/preview-access', async (req, res) => {
  const pool = req.app.locals.pool;
  const { store_owner_id } = req.user;
  const parsedStoreId = parseInt(req.params.storeId, 10);
  if (Number.isNaN(parsedStoreId)) return res.status(400).json({ error: 'Invalid storeId' });

  try {
    const allowed = await canOwnerAccessStore(pool, parsedStoreId, store_owner_id);
    return res.json({ allowed });
  } catch (err) {
    console.error('store GET /api/store/:storeId/preview-access:', err);
    return res.status(500).json({ error: 'Failed to check preview access' });
  }
});

router.get('/go-live-status', async (req, res) => {
  const pool = req.app.locals.pool;
  const { store_owner_id } = req.user;
  try {
    await ensureActivationFlowSchema(pool);
    const store_id = await getStoreId(pool, store_owner_id);
    if (!store_id) return res.status(404).json({ error: 'Store not found' });

    const row = await pool.query(
      `SELECT s.store_id, s.status AS store_status, s.payment_status, sub.plan_type, sub.paid_date
       FROM stores s
       LEFT JOIN subscriptions sub ON sub.store_id = s.store_id
       WHERE s.store_id = $1
       ORDER BY sub.subscription_id DESC NULLS LAST
       LIMIT 1`,
      [store_id]
    );
    if (!row.rows[0]) return res.status(404).json({ error: 'Store not found' });

    const latestAttempt = await pool.query(
      `SELECT attempted_at, status, error_message
       FROM store_activation_attempts
       WHERE store_id = $1
       ORDER BY attempted_at DESC
       LIMIT 1`,
      [store_id]
    );

    const data = row.rows[0];
    const planType = String(data.plan_type || 'basic').toLowerCase();
    const planPrice = PLAN_PRICES[planType] ?? 0;
    const paymentStatus = data.payment_status || (data.paid_date ? 'paid' : 'unpaid');
    const canActivate = data.store_status === 'Pending' && paymentStatus !== 'paid';
    let reason = null;
    if (data.store_status === 'Active') reason = 'Store already active';
    else if (paymentStatus === 'paid') reason = 'Store already paid';
    else if (planPrice > 0) reason = 'Payment required';

    const attempt = latestAttempt.rows[0];
    return res.json({
      storeId: data.store_id,
      storeStatus: data.store_status,
      paymentStatus,
      planType,
      planPrice,
      currency: 'SAR',
      canActivate,
      reason,
      lastAttempt: attempt
        ? {
            attemptedAt: attempt.attempted_at,
            status: attempt.status,
            errorMessage: attempt.error_message || null,
          }
        : null,
    });
  } catch (err) {
    console.error('store GET /api/store/go-live-status:', err);
    return res.status(500).json({ error: 'Failed to fetch go-live status' });
  }
});

router.post('/go-live', async (req, res) => {
  const pool = req.app.locals.pool;
  const { store_owner_id } = req.user;
  const { store_id, payment_method } = req.body || {};
  const parsedStoreId = parseInt(store_id, 10);
  if (Number.isNaN(parsedStoreId)) return res.status(400).json({ error: 'Invalid store_id' });

  try {
    await ensureActivationFlowSchema(pool);
    const storeResult = await pool.query(
      `SELECT store_id, store_owner_id, status, payment_status
       FROM stores
       WHERE store_id = $1`,
      [parsedStoreId]
    );
    const store = storeResult.rows[0];
    if (!store) return res.status(404).json({ error: 'Store not found' });
    if (store.store_owner_id !== store_owner_id) return res.status(403).json({ error: 'Unauthorized' });
    if (store.status === 'Active') return res.status(409).json({ error: 'Store already active' });
    if (store.status !== 'Pending') return res.status(400).json({ error: 'Store must be in pending status' });

    const lastAttempt = await pool.query(
      `SELECT attempted_at
       FROM store_activation_attempts
       WHERE store_id = $1
       ORDER BY attempted_at DESC
       LIMIT 1`,
      [parsedStoreId]
    );
    if (lastAttempt.rows[0]) {
      const elapsedMs = Date.now() - new Date(lastAttempt.rows[0].attempted_at).getTime();
      if (elapsedMs < 60000) {
        return res.status(429).json({ error: 'Please wait before trying again' });
      }
    }

    const failedAttempts = await pool.query(
      `SELECT COUNT(*)::int AS count
       FROM store_activation_attempts
       WHERE store_id = $1
         AND status = 'failed'
         AND attempted_at >= NOW() - INTERVAL '5 minutes'`,
      [parsedStoreId]
    );
    if ((failedAttempts.rows[0]?.count || 0) >= 3) {
      return res.status(429).json({ error: 'Too many failed attempts. Try again later.' });
    }

    const subResult = await pool.query(
      `SELECT subscription_id, plan_type, paid_date
       FROM subscriptions
       WHERE store_id = $1
       ORDER BY subscription_id DESC
       LIMIT 1`,
      [parsedStoreId]
    );
    if (!subResult.rows[0]) return res.status(400).json({ error: 'No subscription found' });

    const subscription = subResult.rows[0];
    const planType = String(subscription.plan_type || 'basic').toLowerCase();
    const planPrice = PLAN_PRICES[planType] ?? 0;

    const attemptInsert = await pool.query(
      `INSERT INTO store_activation_attempts (store_id, status, payment_method, amount_sar)
       VALUES ($1, 'pending', $2, $3)
       RETURNING id`,
      [parsedStoreId, payment_method || 'moyasar', planPrice]
    );
    const attemptId = attemptInsert.rows[0].id;

    const transactionRef = `showcase-${parsedStoreId}-${Date.now()}`;

    await pool.query('BEGIN');
    await pool.query(
      `UPDATE stores
       SET status = 'Active', payment_status = 'paid'
       WHERE store_id = $1`,
      [parsedStoreId]
    );
    await pool.query(
      `UPDATE subscriptions
       SET paid_date = COALESCE(paid_date, NOW())
       WHERE subscription_id = $1`,
      [subscription.subscription_id]
    );
    await pool.query(
      `UPDATE store_activation_attempts
       SET status = 'success', transaction_ref = $1, error_message = NULL
       WHERE id = $2`,
      [transactionRef, attemptId]
    );
    await pool.query('COMMIT');

    return res.json({ success: true, storeId: parsedStoreId, status: 'Active' });
  } catch (err) {
    try { await pool.query('ROLLBACK'); } catch (_) {}
    console.error('store POST /api/store/go-live:', err);
    return res.status(500).json({ error: 'Failed to activate store' });
  }
});

router.get('/preview', async (req, res) => {
  const pool = req.app.locals.pool;
  const { store_owner_id } = req.user;
  try {
    await ensureActivationFlowSchema(pool);
    const store_id = await getStoreId(pool, store_owner_id);
    if (!store_id) return res.status(404).json({ error: 'Store not found' });

    const storeResult = await pool.query(
      `SELECT store_id, store_owner_id, name, description, store_type, logo, theme, domain_name, status, payment_status, created_at
       FROM stores
       WHERE store_id = $1`,
      [store_id]
    );
    if (!storeResult.rows[0]) return res.status(404).json({ error: 'Store not found' });

    const settingsResult = await pool.query(
      `SELECT info, branding, domain, payments, shipping, policies, footer
       FROM store_settings
       WHERE store_id = $1`,
      [store_id]
    );

    const productsResult = await pool.query(
      `SELECT p.product_id, p.store_id, p.product_name, p.title, p.description, p.category, p.price, p.status, p.images,
              (SELECT COALESCE(SUM(po.stock_qty), 0)::INTEGER FROM product_options po WHERE po.product_id = p.product_id) AS total_stock
       FROM products p
       WHERE p.store_id = $1
       ORDER BY p.product_id DESC`,
      [store_id]
    );

    return res.json({
      store: storeResult.rows[0],
      settings: settingsResult.rows[0] || {},
      products: productsResult.rows || [],
      previewMode: true,
    });
  } catch (err) {
    console.error('store GET /api/store/preview:', err);
    return res.status(500).json({ error: 'Failed to fetch store preview' });
  }
});

module.exports = router;