require('dotenv').config();
const express = require('express');
const cors = require('cors');
const pool = require('./config/db');
const storeOwnersAuthRouter = require('./routes/storeOwnersAuth');
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
});
