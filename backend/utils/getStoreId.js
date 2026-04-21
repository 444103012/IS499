async function getStoreId(pool, store_owner_id) {
  const r = await pool.query(
    'SELECT store_id FROM stores WHERE store_owner_id = $1 ORDER BY created_at DESC LIMIT 1',
    [store_owner_id]
  );
  return r.rows[0] ? r.rows[0].store_id : null;
}
module.exports = { getStoreId };