require('dotenv').config();
const express = require('express');
const cors = require('cors');
const pool = require('./config/db');
const storeOwnersAuthRouter = require('./routes/storeOwnersAuth');
const authMiddleware = require('./middleware/authMiddleware');

const app = express();
const PORT = process.env.PORT || 5000;

// Allow frontend origin (React dev server) and same host for production
app.use(cors({
  origin: process.env.CORS_ORIGIN || ['http://localhost:3000', 'http://127.0.0.1:3000'],
  optionsSuccessStatus: 200,
}));
app.use(express.json());

// Attach database pool so routes can use it
app.locals.pool = pool;

// ----- Store owners auth (public) -----
app.use('/api/store-owners', storeOwnersAuthRouter);

// ----- Example: protected route (requires JWT) -----
// Usage: GET /api/store-owners/me with header: Authorization: Bearer <token>
app.get('/api/store-owners/me', authMiddleware, (req, res) => {
  res.json({
    message: 'Authenticated',
    store_owner_id: req.user.store_owner_id,
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
