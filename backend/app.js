require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const pool = require('./config/db');
const storeOwnersAuthRouter = require('./routes/storeOwnersAuth');
const storeSetupRouter = require('./routes/storeSetup');
const storeManagementRouter = require('./routes/storeManagement');
const subscriptionRouter = require('./routes/subscription');
const settingsRouter = require('./routes/settings');
const productsRouter = require('./routes/products');
const ordersRouter = require('./routes/orders');
const customersAuthRouter = require('./routes/customersAuth');
const customersRouter = require('./routes/customers');
const browseProductsRouter = require('./routes/BrowseProducts');
const cartRouter = require('./routes/cart');
const checkoutRouter = require('./routes/checkout');
const paymentsRouter = require('./routes/payments');
const authMiddleware = require('./middleware/authMiddleware');
const adminAuthRouter = require('./routes/adminAuth');
const adminAuthMiddleware = require('./middleware/adminAuth');
const { router: adminManagementRouter, getDashboardStats } = require('./routes/adminManagementRoutes');
const adminStoreRoutes = require('./routes/adminStoreRoutes');
const adminPlatformRoutes = require('./routes/adminPlatformRoutes');
const { ensureAdminsTableAndSeed } = require('./scripts/ensureAdmins');
const { ensureCartColumn } = require('./scripts/ensureCartColumn');

const app = express();

function parseCorsOrigins(value) {
  const defaultOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:3001',
    'https://storelaunch.site',
    'https://www.storelaunch.site',
    'https://api.storelaunch.site',
  ];
  if (!value) {
    return defaultOrigins;
  }
  if (Array.isArray(value)) return [...defaultOrigins, ...value];
  const envOrigins = String(value)
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  return [...defaultOrigins, ...envOrigins];
}

function normalizeOrigins(origins) {
  return [...new Set(origins.map((origin) => normalizeOrigin(origin)).filter(Boolean))];
}

function normalizeOrigin(origin) {
  if (!origin) return '';
  const raw = String(origin).trim();
  if (!raw) return '';

  const wildcardMatch = raw.match(/^(https?):\/\/\*\.(.+)$/i);
  if (wildcardMatch) {
    return `${wildcardMatch[1].toLowerCase()}://*.${wildcardMatch[2].toLowerCase()}`;
  }

  try {
    const parsed = new URL(raw);
    return `${parsed.protocol}//${parsed.host}`.toLowerCase();
  } catch (_err) {
    return raw.replace(/\/+$/, '').toLowerCase();
  }
}

const corsOrigins = normalizeOrigins([
  ...parseCorsOrigins(process.env.CORS_ORIGIN),
  process.env.FRONTEND_BASE_URL,
]);
const allowVercelPreviews =
  process.env.CORS_ALLOW_VERCEL_PREVIEWS === 'true' ||
  (process.env.CORS_ALLOW_VERCEL_PREVIEWS == null && process.env.NODE_ENV === 'production');

function isAllowedCorsOrigin(origin) {
  if (!origin) return true;
  const normalizedOrigin = normalizeOrigin(origin);

  if (/^https?:\/\/localhost(?::\d+)?$/i.test(normalizedOrigin)) return true;
  if (/^https?:\/\/127\.0\.0\.1(?::\d+)?$/i.test(normalizedOrigin)) return true;
  if (corsOrigins.includes(normalizedOrigin)) return true;
  if (allowVercelPreviews && /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(normalizedOrigin)) {
    return true;
  }

  // Allow wildcard origin entries, e.g. https://*.storelaunch.site
  for (const configuredOrigin of corsOrigins) {
    const wildcardMatch = configuredOrigin.match(/^(https?):\/\/\*\.(.+)$/i);
    if (!wildcardMatch) continue;

    const protocol = wildcardMatch[1].toLowerCase();
    const domain = wildcardMatch[2].toLowerCase();
    const requestMatch = normalizedOrigin.match(/^(https?):\/\/(.+)$/i);
    if (!requestMatch) continue;

    const requestProtocol = requestMatch[1].toLowerCase();
    const requestHost = requestMatch[2].toLowerCase();
    if (requestProtocol !== protocol) continue;

    if (requestHost === domain || requestHost.endsWith(`.${domain}`)) {
      return true;
    }
  }

  return false;
}

const appReady = Promise.all([
  ensureAdminsTableAndSeed(pool).catch((err) => {
    console.error('Failed to seed admin users:', err);
  }),
  ensureCartColumn(pool).catch((err) => {
    console.error('Failed to ensure cart column:', err);
  }),
]);

app.use(async (_req, _res, next) => {
  await appReady;
  next();
});

app.use(cors({
  origin: (origin, callback) => {
    if (isAllowedCorsOrigin(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  optionsSuccessStatus: 200,
}));
app.use(express.json());

app.locals.pool = pool;

app.use('/api/store-owners', storeOwnersAuthRouter);
app.use('/api/customers', customersRouter);
app.use('/api/customers', customersAuthRouter);
app.use('/api/admin/auth', adminAuthRouter);
app.get('/api/admin/dashboard/stats', adminAuthMiddleware, getDashboardStats);
app.use('/api/admin/manage', adminManagementRouter);
app.use('/api/admin', adminStoreRoutes);
app.use('/api/admin/platform', adminPlatformRoutes);
app.use('/api/products', browseProductsRouter);
app.use('/api/cart', cartRouter);
app.use('/api/checkout', checkoutRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/store/products', authMiddleware, productsRouter);
app.use('/api/store-setup', authMiddleware, storeSetupRouter);
app.use('/api/onboarding', authMiddleware, storeSetupRouter);
app.use('/api/store', authMiddleware, storeManagementRouter);
app.use('/api/orders', authMiddleware, ordersRouter);
app.use('/api/subscription', authMiddleware, subscriptionRouter);
app.use('/api/settings', authMiddleware, settingsRouter);

app.get('/api/store-owners/me', authMiddleware, (req, res) => {
  res.json({
    message: 'Authenticated',
    store_owner_id: req.user.store_owner_id,
  });
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.get('/', (_req, res) => {
  res.json({ status: 'ok', service: 'backend', health: '/api/health' });
});

app.get('/api/stores/:slug', async (req, res) => {
  const db = req.app.locals.pool;
  if (!db) return res.status(500).json({ error: 'Database not configured' });
  const normalizedSlug = req.params.slug.trim().toLowerCase();
  try {
    const result = await db.query(
      `SELECT
         s.store_id,
         s.name,
         s.domain_name,
         s.description,
         s.logo,
         s.theme,
         s.status,
         COALESCE(ss.branding, '{}'::jsonb) AS branding,
         COALESCE(ss.info, '{}'::jsonb) AS info,
         COALESCE(ss.footer, '{}'::jsonb) AS footer
       FROM stores s
       LEFT JOIN store_settings ss ON ss.store_id = s.store_id
       WHERE LOWER(s.name) = $1 OR LOWER(s.domain_name) = $1
       ORDER BY s.store_id DESC
       LIMIT 1`,
      [normalizedSlug]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Store not found' });
    }
    return res.json({ store: result.rows[0] });
  } catch (err) {
    console.error('Store lookup error:', err);
    return res.status(500).json({ error: 'Failed to fetch store' });
  }
});

app.use((err, _req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: err.message || 'Upload failed' });
  }
  if (err) {
    console.error('Upload error:', err);
    return res.status(500).json({ error: err.message || 'Upload failed' });
  }
  next();
});

module.exports = app;
module.exports.appReady = appReady;
