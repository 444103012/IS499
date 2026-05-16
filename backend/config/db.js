
const { Pool } = require('pg');


require('dotenv').config();





const useSSL = process.env.PG_SSL === 'true' || process.env.PG_SSL === '1';


const sslForUrl =
  process.env.PG_SSL === 'false' || process.env.PG_SSL === '0'
    ? false
    : { rejectUnauthorized: false };

// connectionTimeoutMillis: max time to wait for a new connection from the pool.
// idleTimeoutMillis: close idle connections after this long (keeps pool lean in serverless).
// query_timeout: if a query takes longer than this, abort it — prevents forever-hangs
//   caused by stale TCP connections that were silently dropped by the DB or a NAT gateway.
// keepAlive: sends TCP keepalive probes so the OS detects dead connections instead of
//   silently handing them back to the pool as "healthy".
const CONNECT_TIMEOUT_MS = 5000;
const IDLE_TIMEOUT_MS = 10000;
const QUERY_TIMEOUT_MS = 8000;

const sharedPoolConfig = {
  connectionTimeoutMillis: CONNECT_TIMEOUT_MS,
  idleTimeoutMillis: IDLE_TIMEOUT_MS,
  query_timeout: QUERY_TIMEOUT_MS,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
};

const pool = new Pool(
  process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: sslForUrl,
        ...sharedPoolConfig,
      }
    : {
        user: process.env.PG_USER,
        host: process.env.PG_HOST || 'localhost',
        database: process.env.PG_DATABASE,
        password: process.env.PG_PASSWORD,
        port: parseInt(process.env.PG_PORT, 10) || 5432,
        ...(useSSL && { ssl: { rejectUnauthorized: false } }),
        ...sharedPoolConfig,
      }
);



module.exports = pool;