const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

/**
 * Run schema.sql to create tables if they don't exist.
 * @param {Pool} pool
 */
async function initDb(pool) {
  try {
    // Check if tables already exist
    const checkResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('store_owners', 'customers')
      );
    `);
    
    if (checkResult.rows[0].exists) {
      console.log('Database tables already exist, skipping schema initialization');
      return;
    }
    
    // If tables don't exist, try to create them
    const schemaPath = path.join(__dirname, 'schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');
    await pool.query(sql);
    console.log('Database schema initialized');
  } catch (err) {
    // If tables exist or other error, just log and continue
    console.log('Database init note:', err.message);
  }
}

module.exports = { initDb };
