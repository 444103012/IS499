const ACTIVE_STORE_EXISTS_SQL = `
EXISTS (
  SELECT 1
  FROM stores s2
  JOIN subscriptions sub2 ON sub2.store_id = s2.store_id
  WHERE s2.store_id = p.store_id
    AND s2.status = 'Active'
    AND sub2.paid_date IS NOT NULL
)`;

async function isStoreActive(pool, storeId) {
  const parsedStoreId = parseInt(storeId, 10);
  if (Number.isNaN(parsedStoreId)) return false;

  const result = await pool.query(
    `SELECT 1
     FROM stores s
     JOIN subscriptions sub ON sub.store_id = s.store_id
     WHERE s.store_id = $1
       AND s.status = 'Active'
       AND sub.paid_date IS NOT NULL
     LIMIT 1`,
    [parsedStoreId]
  );

  return result.rows.length > 0;
}

module.exports = {
  ACTIVE_STORE_EXISTS_SQL,
  isStoreActive,
};