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
app.get('/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW() AS now');
    res.json({
      status: 'ok',
      dbConnected: true,
      serverTime: result.rows[0].now,
    });
  } catch (err) {
    console.error('Database connection error:', err.message);
    res.status(500).json({
      status: 'error',
      dbConnected: false,
      error: err.message,
    });
  }
});

// Simple query route to test real table access: count customers
app.get('/test-customers', async (req, res) => {
  try {
    const result = await pool.query('SELECT COUNT(*) AS count FROM customers');
    res.json({
      status: 'ok',
      table: 'customers',
      rowCount: parseInt(result.rows[0].count, 10),
    });
  } catch (err) {
    console.error('Query error on customers table:', err.message);
    res.status(500).json({
      status: 'error',
      error: err.message,
    });
  }
});

// Insert example customer to test DB write
app.post('/customers-test-insert', async (req, res) => {
  const {
    first_name = 'Test',
    last_name = 'Customer',
    email = `test.customer.${Date.now()}@example.com`,
    phone = '+966500000000',
    password_hash = 'dummy_hashed_password_here',
    status = 'Active',
  } = req.body || {};

  try {
    const insertQuery = `
      INSERT INTO customers (
        first_name, last_name, email, phone, password_hash, status
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING customer_id, first_name, last_name, email, phone, status, created_at
    `;

    const result = await pool.query(insertQuery, [
      first_name,
      last_name,
      email,
      phone,
      password_hash,
      status,
    ]);

    res.status(201).json({
      status: 'ok',
      message: 'Customer inserted successfully',
      customer: result.rows[0],
    });
  } catch (err) {
    console.error('Insert error on customers table:', err.message);
    res.status(500).json({
      status: 'error',
      error: err.message,
    });
  }
});

app.listen(port, () => {
  console.log(`Backend server listening on http://localhost:${port}`);
});

