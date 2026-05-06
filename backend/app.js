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

const app = express();

function parseCorsOrigins(value) {
  const defaultOrigins = ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:3001'];
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

const corsOrigins = parseCorsOrigins(process.env.CORS_ORIGIN);
const allowVercelPreviews = process.env.CORS_ALLOW_VERCEL_PREVIEWS === 'true';

function isAllowedCorsOrigin(origin) {
  if (!origin) return true;
  if (corsOrigins.includes(origin)) return true;
  if (allowVercelPreviews && /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin)) {
    return true;
  }
  return false;
}

const appReady = ensureAdminsTableAndSeed(pool).catch((err) => {
  console.error('Failed to seed admin users:', err);
});

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

app.get('/api/stores/:slug', async (req, res) => {
  const db = req.app.locals.pool;
  if (!db) return res.status(500).json({ error: 'Database not configured' });
  const normalizedSlug = req.params.slug.trim().toLowerCase();
  try {
    const result = await db.query(
      `SELECT store_id, name, domain_name, description, logo, theme, status
       FROM stores
       WHERE LOWER(name) = $1 OR LOWER(domain_name) = $1
       ORDER BY store_id DESC
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

module.exports = { app, appReady };
