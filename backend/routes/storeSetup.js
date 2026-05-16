const express = require('express');
const { uploadStoreLogo } = require('../middleware/upload');
const { allocateUniqueInitialDomainName } = require('../utils/storeDomain');
const {
  getPlatformPlans,
  getPlatformPlanBySlug,
} = require('../services/platformPlansService');
const {
  paymentProviderNameToFrontendId,
  shippingCarrierNameToFrontendId,
  syncPaymentProvidersToSettings,
  syncShippingProvidersToSettings,
} = require('../utils/providerSync');

const router = express.Router();
const PAYMENT_PROVIDER_MIN_PLAN = {
  'bank transfer': 'basic',
  mada: 'pro',
  'stc pay': 'pro',
  'apple pay': 'advanced',
};
const SHIPPING_PROVIDER_MIN_PLAN = {
  'no shipping needed': 'basic',
  smsa: 'advanced',
  aramex: 'advanced',
  spl: 'pro',
};
const STORE_NAME_MIN_LENGTH = 3;
const STORE_NAME_MAX_LENGTH = 40;
const STORE_NAME_LENGTH_ERROR = 'Store name must be 3-40 characters.';

function isValidStoreNameLength(name) {
  const length = String(name || '').trim().length;
  return length >= STORE_NAME_MIN_LENGTH && length <= STORE_NAME_MAX_LENGTH;
}

// paymentProviderNameToFrontendId and shippingCarrierNameToFrontendId
// are imported from ../utils/providerSync (single source of truth).

function normalizeThemeIdFromDb(theme) {
  const t = String(theme || '').trim().toLowerCase();
  if (['default', 'minimal', 'modern', 'classic'].includes(t)) return t;
  if (t === '' || t === 'default') return 'default';
  return 'default';
}

async function buildResumePayload(pool, store_owner_id, store_id) {
  if (!store_id) return null;
  const s = await pool.query(
    'SELECT name, logo, store_type, description, theme FROM stores WHERE store_id = $1 AND store_owner_id = $2',
    [store_id, store_owner_id]
  );
  if (s.rows.length === 0) return null;
  const row = s.rows[0];
  const resume = {
    store_details: {
      name: row.name || '',
      store_type: row.store_type || '',
      description: row.description || '',
      logo_url: row.logo || null,
    },
    theme: normalizeThemeIdFromDb(row.theme),
    branding: { productLayout: 'grid-classic', layerColors: null },
    plan_type: null,
    payment_selected_ids: [],
    bank_transfer: { bank_name: '', account_name: '', iban: '', notes: '' },
    shipping_selected_ids: [],
  };

  await ensureStoreSettingsTable(pool);
  const settings = await pool.query('SELECT branding FROM store_settings WHERE store_id = $1', [store_id]);
  const branding = settings.rows[0] && settings.rows[0].branding ? settings.rows[0].branding : {};
  if (branding && typeof branding === 'object') {
    resume.branding.productLayout = branding.productLayout || 'grid-classic';
    resume.branding.layerColors =
      branding.layerColors && typeof branding.layerColors === 'object' ? branding.layerColors : null;
  }

  const sub = await pool.query(
    `SELECT plan_type FROM subscriptions WHERE store_id = $1 ORDER BY subscription_id DESC LIMIT 1`,
    [store_id]
  );
  if (sub.rows[0] && sub.rows[0].plan_type) {
    resume.plan_type = String(sub.rows[0].plan_type).trim().toLowerCase();
  }

  const payments = await pool.query(
    'SELECT provider_name, credentials FROM payment_providers WHERE store_id = $1',
    [store_id]
  );
  const paySeen = new Set();
  for (const p of payments.rows) {
    const id = paymentProviderNameToFrontendId(p.provider_name);
    if (id && !paySeen.has(id)) {
      paySeen.add(id);
      resume.payment_selected_ids.push(id);
    }
    if (id === 'bankTransfer') {
      let creds = p.credentials;
      if (typeof creds === 'string') {
        try {
          creds = JSON.parse(creds);
        } catch {
          creds = {};
        }
      }
      if (creds && typeof creds === 'object') {
        resume.bank_transfer = {
          bank_name: String(creds.bank_name || ''),
          account_name: String(creds.account_name || ''),
          iban: String(creds.iban || ''),
          notes: String(creds.notes || ''),
        };
      }
    }
  }

  const ships = await pool.query('SELECT carrier_name FROM shipping_providers WHERE store_id = $1', [store_id]);
  const shipSeen = new Set();
  for (const r of ships.rows) {
    const id = shippingCarrierNameToFrontendId(r.carrier_name);
    if (id && !shipSeen.has(id)) {
      shipSeen.add(id);
      resume.shipping_selected_ids.push(id);
    }
  }

  return resume;
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
const COLOR_KEYS = Object.keys(DEFAULT_LAYER_COLORS);
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
  const safe = branding && typeof branding === 'object' ? branding : {};
  const safeLayerColors = safe.layerColors && typeof safe.layerColors === 'object' ? safe.layerColors : {};
  const layerColors = COLOR_KEYS.reduce((acc, key) => {
    acc[key] = normalizeColor(safeLayerColors[key], DEFAULT_LAYER_COLORS[key]);
    return acc;
  }, {});
  return {
    productLayout: normalizeProductLayout(safe.productLayout),
    layerColors,
  };
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
}

async function getStoreId(pool, store_owner_id) {
  const r = await pool.query(
    'SELECT store_id FROM stores WHERE store_owner_id = $1 ORDER BY created_at DESC LIMIT 1',
    [store_owner_id]
  );
  return r.rows[0] ? r.rows[0].store_id : null;
}

async function updateSetupStep(pool, store_owner_id, step) {
  try {
    await pool.query(
      'UPDATE store_owners SET setup_step = $1 WHERE store_owner_id = $2',
      [step, store_owner_id]
    );
  } catch (err) {
    if (err.code === '42703' || (err.message && err.message.includes('setup_step'))) {
      return;
    }
    throw err;
  }
}

async function getSubscriptionPlan(pool, store_id) {
  const rankMap = await getPlanRankMap(pool);
  const row = await pool.query(
    `SELECT plan_type
     FROM subscriptions
     WHERE store_id = $1
     ORDER BY subscription_id DESC LIMIT 1`,
    [store_id]
  );
  if (!row.rows[0] || !row.rows[0].plan_type) return 'basic';
  const plan = String(row.rows[0].plan_type).toLowerCase();
  return rankMap[plan] !== undefined ? plan : 'basic';
}

async function getPlanRankMap(pool) {
  const plans = await getPlatformPlans(pool, { enabledOnly: false });
  const map = {};
  for (const p of plans) map[p.slug] = Number(p.rank);
  return map;
}

function isAllowedByPlan(rankMap, plan, minPlan) {
  if (!Object.prototype.hasOwnProperty.call(rankMap, plan)) return false;
  if (!Object.prototype.hasOwnProperty.call(rankMap, minPlan)) return false;
  return rankMap[plan] >= rankMap[minPlan];
}


router.get('/check-name', async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const name = (req.query.name || '').trim();
    if (!isValidStoreNameLength(name)) {
      return res.json({ available: false, message: STORE_NAME_LENGTH_ERROR });
    }
    const { store_owner_id } = req.user;
    
    const existingStore = await pool.query(
      'SELECT store_id, store_owner_id FROM stores WHERE LOWER(name) = LOWER($1)',
      [name]
    );
    if (existingStore.rows.length === 0) {
      return res.json({ available: true });
    }
    
    const ownedByCurrentOwner = existingStore.rows.some(r => r.store_owner_id === store_owner_id);
    if (ownedByCurrentOwner) {
      return res.json({ available: true });
    }
    return res.json({ available: false, message: 'This store name is already taken. Please choose a different name.' });
  } catch (err) {
    console.error('check-name:', err);
    res.status(500).json({ available: false, message: 'Could not check name availability' });
  }
});


router.get('/status', async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const { store_owner_id } = req.user;
    let setup_step = 0;
    try {
      const r = await pool.query(
        'SELECT setup_step FROM store_owners WHERE store_owner_id = $1',
        [store_owner_id]
      );
      setup_step = r.rows[0] && r.rows[0].setup_step != null ? Number(r.rows[0].setup_step) : 0;
    } catch (colErr) {
      if (colErr.code === '42703' || (colErr.message && colErr.message.includes('setup_step'))) {
        setup_step = 0;
      } else throw colErr;
    }
    let store_id = null;
    let store_name = null;
    let store_logo = null;
    let resume = null;
    const storeRow = await pool.query(
      'SELECT store_id, name, logo FROM stores WHERE store_owner_id = $1 ORDER BY created_at DESC LIMIT 1',
      [store_owner_id]
    );
    if (storeRow.rows[0]) {
      store_id = storeRow.rows[0].store_id;
      store_name = storeRow.rows[0].name || null;
      store_logo = storeRow.rows[0].logo || null;
      resume = await buildResumePayload(pool, store_owner_id, store_id);
    }
    res.json({ setup_step, store_id, store_name, store_logo, resume });
  } catch (err) {
    console.error('store-setup status:', err);
    res.status(500).json({ error: 'Failed to get status' });
  }
});


router.post('/store-details', uploadStoreLogo.single('logo'), async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const { store_owner_id } = req.user;
    const name = (req.body && req.body.name ? String(req.body.name) : '').trim();
    if (!name) return res.status(400).json({ error: 'Store name is required' });
    if (!isValidStoreNameLength(name)) return res.status(400).json({ error: STORE_NAME_LENGTH_ERROR });

    let setupStep = 0;
    try {
      const sr = await pool.query(
        'SELECT setup_step FROM store_owners WHERE store_owner_id = $1',
        [store_owner_id]
      );
      setupStep = sr.rows[0] && sr.rows[0].setup_step != null ? Number(sr.rows[0].setup_step) : 0;
    } catch (e) {
      if (e.code !== '42703' && !(e.message && e.message.includes('setup_step'))) throw e;
    }

    const existing = await pool.query(
      'SELECT store_id FROM stores WHERE store_owner_id = $1 ORDER BY created_at DESC LIMIT 1',
      [store_owner_id]
    );
    const store_type = (req.body.store_type || '').trim() || null;
    const description = (req.body.description || '').trim() || null;
    const logoUrl = req.file && req.file.location ? req.file.location : null;

    const nameTakenByOther = async (excludeStoreId) => {
      const q = excludeStoreId
        ? 'SELECT store_id, store_owner_id FROM stores WHERE LOWER(TRIM(name)) = LOWER(TRIM($1)) AND store_id != $2'
        : 'SELECT store_id, store_owner_id FROM stores WHERE LOWER(TRIM(name)) = LOWER(TRIM($1))';
      const params = excludeStoreId ? [name, excludeStoreId] : [name];
      const nameCheck = await pool.query(q, params);
      return nameCheck.rows.some((r) => r.store_owner_id !== store_owner_id);
    };

    if (existing.rows.length > 0 && setupStep < 6) {
      const store_id = existing.rows[0].store_id;
      if (await nameTakenByOther(store_id)) {
        return res.status(409).json({ error: 'This store name is already taken. Please choose a different name.' });
      }
      if (logoUrl) {
        await pool.query(
          `UPDATE stores
           SET name = $1, store_type = $2, description = $3, logo = $4
           WHERE store_id = $5 AND store_owner_id = $6`,
          [name, store_type, description, logoUrl, store_id, store_owner_id]
        );
      } else {
        await pool.query(
          `UPDATE stores
           SET name = $1, store_type = $2, description = $3
           WHERE store_id = $4 AND store_owner_id = $5`,
          [name, store_type, description, store_id, store_owner_id]
        );
      }
      const domain_name = await allocateUniqueInitialDomainName(pool, store_id, name);
      await pool.query('UPDATE stores SET domain_name = $1 WHERE store_id = $2', [domain_name, store_id]);
      await ensureStoreSettingsTable(pool);
      await pool.query(
        `INSERT INTO store_settings (store_id, domain)
         VALUES ($1, $2)
         ON CONFLICT (store_id) DO UPDATE SET domain = EXCLUDED.domain`,
        [store_id, { slug: domain_name, fullUrl: `storelaunch.site/${domain_name}` }]
      );
      if (setupStep < 1) await updateSetupStep(pool, store_owner_id, 1);
      return res.status(200).json({ success: true, store_id, next_step: 2 });
    }

    if (await nameTakenByOther(null)) {
      return res.status(409).json({ error: 'This store name is already taken. Please choose a different name.' });
    }

    const result = await pool.query(
      `INSERT INTO stores (store_owner_id, name, domain_name, logo, store_type, description, status)
       VALUES ($1, $2, NULL, $3, $4, $5, 'Pending')
       RETURNING store_id`,
      [store_owner_id, name, logoUrl, store_type, description]
    );
    const store_id = result.rows[0].store_id;
    const domain_name = await allocateUniqueInitialDomainName(pool, store_id, name);
    await pool.query('UPDATE stores SET domain_name = $1 WHERE store_id = $2', [domain_name, store_id]);
    await ensureStoreSettingsTable(pool);
    await pool.query(
      `INSERT INTO store_settings (store_id, domain)
       VALUES ($1, $2)
       ON CONFLICT (store_id) DO UPDATE SET domain = EXCLUDED.domain`,
      [store_id, { slug: domain_name, fullUrl: `storelaunch.site/${domain_name}` }]
    );
    await updateSetupStep(pool, store_owner_id, 1);
    res.status(201).json({ success: true, store_id, next_step: 2 });
  } catch (err) {
    console.error('store-setup store-details:', err);
    const message = process.env.NODE_ENV !== 'production' && err.message ? err.message : 'Failed to save store details';
    res.status(500).json({ error: message });
  }
});


router.post('/select-plan', async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const { store_owner_id } = req.user;
    const { store_id, plan_type } = req.body || {};
    if (!store_id || !plan_type) return res.status(400).json({ error: 'store_id and plan_type required' });
    const normalizedPlan = String(plan_type).trim().toLowerCase();
    const targetPlan = await getPlatformPlanBySlug(pool, normalizedPlan, { enabledOnly: true });
    if (!targetPlan) return res.status(400).json({ error: 'Invalid or disabled plan_type' });
    const check = await pool.query(
      'SELECT store_id FROM stores WHERE store_id = $1 AND store_owner_id = $2',
      [store_id, store_owner_id]
    );
    if (check.rows.length === 0) return res.status(403).json({ error: 'Store not found' });
    await pool.query('DELETE FROM subscriptions WHERE store_id = $1', [store_id]);
    await pool.query(
      `INSERT INTO subscriptions (store_id, admin_id, plan_type, start_date, end_date, status)
       VALUES ($1, NULL, $2, CURRENT_DATE, NULL, 'Active')`,
      [store_id, normalizedPlan]
    );
    await updateSetupStep(pool, store_owner_id, 2);
    res.json({ success: true, next_step: 3 });
  } catch (err) {
    console.error('store-setup select-plan:', err);
    res.status(500).json({ error: 'Failed to save plan' });
  }
});


router.post('/select-theme', async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const { store_owner_id } = req.user;
    const { store_id, theme, branding } = req.body || {};
    if (!store_id || !theme) return res.status(400).json({ error: 'store_id and theme required' });
    const check = await pool.query(
      'SELECT store_id FROM stores WHERE store_id = $1 AND store_owner_id = $2',
      [store_id, store_owner_id]
    );
    if (check.rows.length === 0) return res.status(403).json({ error: 'Store not found' });
    await pool.query('UPDATE stores SET theme = $1 WHERE store_id = $2', [String(theme).substring(0, 100), store_id]);
    await ensureStoreSettingsTable(pool);
    await pool.query(
      `INSERT INTO store_settings (store_id, branding)
       VALUES ($1, $2)
       ON CONFLICT (store_id) DO UPDATE SET branding = EXCLUDED.branding`,
      [store_id, normalizeBranding(branding)]
    );
    await updateSetupStep(pool, store_owner_id, 3);
    res.json({ success: true, next_step: 4 });
  } catch (err) {
    console.error('store-setup select-theme:', err);
    res.status(500).json({ error: 'Failed to save theme' });
  }
});


router.post('/payment', async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const { store_owner_id } = req.user;
    const { store_id, providers } = req.body || {};
    if (!store_id || !Array.isArray(providers)) return res.status(400).json({ error: 'store_id and providers array required' });
    const namedProviders = providers.filter((p) => String(p.provider_name || '').trim());
    if (namedProviders.length === 0) {
      return res.status(400).json({
        error: 'At least one payment provider is required',
        code: 'PROVIDERS_REQUIRED',
      });
    }
    const check = await pool.query(
      'SELECT store_id FROM stores WHERE store_id = $1 AND store_owner_id = $2',
      [store_id, store_owner_id]
    );
    if (check.rows.length === 0) return res.status(403).json({ error: 'Store not found' });
    const rankMap = await getPlanRankMap(pool);
    const plan = await getSubscriptionPlan(pool, store_id);
    await pool.query('DELETE FROM payment_providers WHERE store_id = $1', [store_id]);
    for (const p of namedProviders) {
      const name = String(p.provider_name || '').substring(0, 100);
      const normalized = name.toLowerCase();
      const minPlan = PAYMENT_PROVIDER_MIN_PLAN[normalized];
      const creds = typeof p.credentials === 'object' ? p.credentials : {};
      if (minPlan && !isAllowedByPlan(rankMap, plan, minPlan)) {
        return res.status(403).json({
          error: 'Provider is not available for current subscription plan',
          providerKey: normalized,
          requiredPlan: minPlan,
          currentPlan: plan,
        });
      }
      if (name) {
        await pool.query(
          'INSERT INTO payment_providers (store_id, provider_name, credentials) VALUES ($1, $2, $3)',
          [store_id, name, JSON.stringify(creds)]
        );
      }
    }
    // Sync table rows → store_settings.payments so dashboard shows selections immediately.
    await ensureStoreSettingsTable(pool);
    await syncPaymentProvidersToSettings(pool, store_id);
    await updateSetupStep(pool, store_owner_id, 4);
    res.json({ success: true, next_step: 5 });
  } catch (err) {
    console.error('store-setup payment:', err);
    res.status(500).json({ error: 'Failed to save payment' });
  }
});


router.post('/shipping', async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const { store_owner_id } = req.user;
    const { store_id, providers } = req.body || {};
    if (!store_id || !Array.isArray(providers)) return res.status(400).json({ error: 'store_id and providers array required' });
    const namedCarriers = providers.filter((p) => String(p.carrier_name || '').trim());
    if (namedCarriers.length === 0) {
      return res.status(400).json({
        error: 'At least one shipping provider is required',
        code: 'SHIPPING_REQUIRED',
      });
    }
    const check = await pool.query(
      'SELECT store_id FROM stores WHERE store_id = $1 AND store_owner_id = $2',
      [store_id, store_owner_id]
    );
    if (check.rows.length === 0) return res.status(403).json({ error: 'Store not found' });
    const rankMap = await getPlanRankMap(pool);
    const plan = await getSubscriptionPlan(pool, store_id);
    await pool.query('DELETE FROM shipping_providers WHERE store_id = $1', [store_id]);
    for (const p of namedCarriers) {
      const name = String(p.carrier_name || '').substring(0, 100);
      const normalized = name.toLowerCase();
      const minPlan = SHIPPING_PROVIDER_MIN_PLAN[normalized];
      const creds = typeof p.credentials === 'object' ? p.credentials : {};
      if (minPlan && !isAllowedByPlan(rankMap, plan, minPlan)) {
        return res.status(403).json({
          error: 'Provider is not available for current subscription plan',
          carrierKey: normalized,
          requiredPlan: minPlan,
          currentPlan: plan,
        });
      }
      if (name) {
        await pool.query(
          'INSERT INTO shipping_providers (store_id, carrier_name, credentials) VALUES ($1, $2, $3)',
          [store_id, name, JSON.stringify(creds)]
        );
      }
    }
    // Sync table rows → store_settings.shipping so dashboard shows selections immediately.
    await ensureStoreSettingsTable(pool);
    await syncShippingProvidersToSettings(pool, store_id);
    await updateSetupStep(pool, store_owner_id, 5);
    res.json({ success: true, next_step: 6 });
  } catch (err) {
    console.error('store-setup shipping:', err);
    res.status(500).json({ error: 'Failed to save shipping' });
  }
});


router.post('/finish', async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const { store_owner_id } = req.user;
    await updateSetupStep(pool, store_owner_id, 6);
    res.json({ success: true, next_step: 6 });
  } catch (err) {
    console.error('store-setup finish:', err);
    res.status(500).json({ error: 'Failed to finish' });
  }
});

module.exports = router;