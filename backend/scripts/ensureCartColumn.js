/**
 * Runs automatically on every server/serverless cold start.
 * Adds the `cart` JSONB column to the customers table when it does not
 * already exist.  Safe to call multiple times (IF NOT EXISTS guard).
 */
async function ensureCartColumn(pool) {
  if (!pool) return;
  try {
    await pool.query(
      `ALTER TABLE customers
         ADD COLUMN IF NOT EXISTS cart JSONB NOT NULL DEFAULT '[]'::jsonb`
    );
    console.log('Cart column: ready');
  } catch (err) {
    // 42P07 = duplicate object (some Postgres versions), safe to ignore.
    // Any other error is logged so it is visible in Vercel Function logs.
    if (err.code !== '42P07') {
      console.error('ensureCartColumn failed:', err.message, '(code:', err.code, ')');
      throw err;
    }
  }
}

module.exports = { ensureCartColumn };
