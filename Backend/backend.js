const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { Pool } = require('pg');

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Configure PostgreSQL connection using environment variables
const pool = new Pool({
  host: process.env.PGHOST,
  port: process.env.PGPORT || 5432,
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : false,
});

// Simple route to check API is up
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Backend is running' });
});

// Health-check route that tests PostgreSQL connection
// (kept for production monitoring, but simplified)
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', dbConnected: true });
  } catch (err) {
    console.error('Database health-check error:', err.message);
    res.status(500).json({ status: 'error', dbConnected: false });
  }
});

app.listen(port, () => {
  console.log(`Backend server listening on http://localhost:${port}`);
});

