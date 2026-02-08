const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { Pool } = require('pg');
const { initDb } = require('./db/init');
const createRegisterRoutes = require('./routes/register');

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const pool = new Pool({
  host: process.env.PGHOST,
  port: process.env.PGPORT || 5432,
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : false,
});

app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Backend is running' });
});

app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', dbConnected: true });
  } catch (err) {
    console.error('Database health-check error:', err.message);
    res.status(500).json({ status: 'error', dbConnected: false });
  }
});

app.use('/api/register', createRegisterRoutes(pool));

async function start() {
  try {
    await initDb(pool);
  } catch (err) {
    console.error('DB init error:', err.message);
  }
  app.listen(port, () => {
    console.log(`Backend server listening on http://localhost:${port}`);
  });
}

start();
