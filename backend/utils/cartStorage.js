const { getFallbackCart, setFallbackCart } = require('./cartFallbackStore');

let hasCustomerCartColumnCache = null;

async function hasCustomerCartColumn(pool) {
  if (hasCustomerCartColumnCache !== null) return hasCustomerCartColumnCache;
  const probe = await pool.query(
    `SELECT 1
     FROM information_schema.columns
     WHERE table_name = 'customers'
       AND column_name = 'cart'
     LIMIT 1`
  );
  hasCustomerCartColumnCache = probe.rowCount > 0;
  return hasCustomerCartColumnCache;
}

function parseCartPayload(cartValue) {
  if (Array.isArray(cartValue)) return cartValue;
  if (typeof cartValue === 'string') {
    try {
      const parsed = JSON.parse(cartValue);
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return [];
    }
  }
  return [];
}

async function getCart(pool, customerId) {
  try {
    const r = await pool.query(
      'SELECT cart FROM customers WHERE customer_id = $1',
      [customerId]
    );
    if (!r.rows[0]) return [];
    return parseCartPayload(r.rows[0].cart);
  } catch (err) {
    if (err.code === '42703') return getFallbackCart(customerId);
    throw err;
  }
}

async function setCart(pool, customerId, items) {
  const payload = Array.isArray(items) ? items : [];
  try {
    await pool.query(
      'UPDATE customers SET cart = $1 WHERE customer_id = $2',
      [JSON.stringify(payload), customerId]
    );
  } catch (err) {
    if (err.code === '42703') {
      setFallbackCart(customerId, payload);
      return;
    }
    throw err;
  }
}

module.exports = {
  getCart,
  setCart,
  hasCustomerCartColumn,
  parseCartPayload,
};

