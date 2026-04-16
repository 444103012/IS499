require('dotenv').config();
const express = require('express');
const cors = require('cors');
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
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: process.env.CORS_ORIGIN || ['http://localhost:3000', 'http://127.0.0.1:3000'],
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

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/stores/:slug', async (req, res) => {
  const pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });
  const normalizedSlug = req.params.slug.trim().toLowerCase();
  try {
    const result = await pool.query(
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

const multer = require('multer');
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: err.message || 'Upload failed' });
  }
  if (err) {
    console.error('Upload error:', err);
    return res.status(500).json({ error: err.message || 'Upload failed' });
  }
  next();
});

async function start() {
  await ensureAdminsTableAndSeed(pool);
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log('Store Owner routes: POST /api/store-owners/register, /login');
    console.log('Customer routes: POST /api/customers/register, /login, /logout');
    console.log('Admin routes: POST /api/admin/auth/login, /logout, GET /api/admin/auth/me');
    console.log('Browse products routes: GET /api/products, /api/products/:id, /api/products/categories/list');
    console.log('Store setup routes: GET/POST /api/store-setup/status, /store-details, /select-plan, /select-theme, /payment, /shipping, /finish');
  });
}
start();
