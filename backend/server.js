require('dotenv').config();
const express = require('express');
const cors = require('cors');
const pool = require('./config/db');
const storeOwnersAuthRouter = require('./routes/storeOwnersAuth');
const storeSetupRouter = require('./routes/storeSetup');
const customersAuthRouter = require('./routes/customersAuth');
const productsRouter = require('./routes/products');
const authMiddleware = require('./middleware/authMiddleware');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: process.env.CORS_ORIGIN || ['http://localhost:3000', 'http://127.0.0.1:3000'],
  optionsSuccessStatus: 200,
}));
app.use(express.json());

app.locals.pool = pool;

app.use('/api/store-owners', storeOwnersAuthRouter);
app.use('/api/customers', customersAuthRouter);
app.use('/api/products', productsRouter);
app.use('/api/store-setup', authMiddleware, storeSetupRouter);
app.use('/api/onboarding', authMiddleware, storeSetupRouter);

app.get('/api/store-owners/me', authMiddleware, (req, res) => {
  res.json({
    message: 'Authenticated',
    store_owner_id: req.user.store_owner_id,
  });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Store Owner routes: POST /api/store-owners/register, /login');
  console.log('Customer routes: POST /api/customers/register, /login, /logout');
  console.log('Products routes: GET /api/products, /api/products/:id, /api/products/categories/list');
  console.log('Store setup routes: GET/POST /api/store-setup/status, /store-details, /select-plan, /select-theme, /payment, /shipping, /finish');
});