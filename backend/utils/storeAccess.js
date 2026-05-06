async function canOwnerAccessStore(pool, storeId, storeOwnerId) {
  const parsedStoreId = parseInt(storeId, 10);
  const parsedOwnerId = parseInt(storeOwnerId, 10);
  if (Number.isNaN(parsedStoreId) || Number.isNaN(parsedOwnerId)) return false;

  const result = await pool.query(
    `SELECT 1
     FROM stores
     WHERE store_id = $1
       AND store_owner_id = $2
       AND status IN ('Pending', 'Active')
     LIMIT 1`,
    [parsedStoreId, parsedOwnerId]
  );

  return result.rows.length > 0;
}

module.exports = {
  canOwnerAccessStore,
};