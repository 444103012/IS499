
const { Pool } = require('pg');


require('dotenv').config();





const useSSL = process.env.PG_SSL === 'true' || process.env.PG_SSL === '1';


const sslForUrl =
  process.env.PG_SSL === 'false' || process.env.PG_SSL === '0'
    ? false
    : { rejectUnauthorized: false };

const pool = new Pool(
  process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL, ssl: sslForUrl }
    : {
        user: process.env.PG_USER,
        host: process.env.PG_HOST || 'localhost',
        database: process.env.PG_DATABASE,
        password: process.env.PG_PASSWORD,
        port: parseInt(process.env.PG_PORT, 10) || 5432,
        ...(useSSL && { ssl: { rejectUnauthorized: false } }),
      }
);



module.exports = pool;