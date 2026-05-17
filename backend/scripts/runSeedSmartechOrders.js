/**
 * One-time runner: seeds 20 sample orders for the SmarTech store.
 * Run: node scripts/runSeedSmartechOrders.js
 */

require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const useSSL = process.env.PG_SSL === 'true' || process.env.PG_SSL === '1';

const pool = new Pool(
  process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL }
    : {
        user: process.env.PG_USER,
        host: process.env.PG_HOST || 'localhost',
        database: process.env.PG_DATABASE,
        password: process.env.PG_PASSWORD,
        port: parseInt(process.env.PG_PORT, 10) || 5432,
        ...(useSSL && { ssl: { rejectUnauthorized: false } }),
      }
);

async function run() {
  const sqlPath = path.join(__dirname, '..', 'migrations', 'seed_smartech_orders.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  const client = await pool.connect();
  try {
    console.log('Connected to database. Running seed script…');

    // Show NOTICE messages from the DO block
    client.on('notice', (msg) => console.log('[DB NOTICE]', msg.message));

    await client.query(sql);
    console.log('Seed completed successfully.');
  } catch (err) {
    console.error('Seed failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
