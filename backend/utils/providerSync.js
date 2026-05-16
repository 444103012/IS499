/**
 * providerSync.js
 *
 * Shared helpers that keep `payment_providers` / `shipping_providers` tables
 * in sync with the `store_settings.payments` / `store_settings.shipping` JSON
 * columns consumed by the dashboard.
 *
 * Data-flow: setup writes rows → sync builds JSON → dashboard reads JSON.
 * On GET fallback the sync also persists so subsequent reads are instant.
 */

const PAYMENT_MIN_PLAN = {
  bankTransfer: 'basic',
  mada: 'pro',
  stcPay: 'pro',
  applePay: 'advanced',
};

const SHIPPING_MIN_PLAN = {
  noShippingNeeded: 'basic',
  smsa: 'advanced',
  aramex: 'advanced',
  spl: 'pro',
};

/** Maps DB provider_name strings → dashboard camelCase keys */
function paymentProviderNameToFrontendId(name) {
  const n = String(name || '').trim().toLowerCase();
  if (n === 'bank transfer' || n === 'banktransfer') return 'bankTransfer';
  if (n === 'mada') return 'mada';
  if (n === 'stc pay' || n === 'stcpay') return 'stcPay';
  if (n === 'apple pay' || n === 'applepay') return 'applePay';
  return null;
}

/** Maps DB carrier_name strings → dashboard camelCase keys */
function shippingCarrierNameToFrontendId(name) {
  const n = String(name || '').trim().toLowerCase();
  if (n === 'no shipping needed' || n === 'digital products' || n.includes('digital')) return 'noShippingNeeded';
  if (n === 'smsa' || n.includes('smsa')) return 'smsa';
  if (n === 'aramex' || n.includes('aramex')) return 'aramex';
  if (n === 'spl (saudi post)' || n === 'spl' || n.includes('spl')) return 'spl';
  return null;
}

async function ensureStoreSettingsRow(pool, store_id) {
  await pool.query(
    `INSERT INTO store_settings (store_id) VALUES ($1) ON CONFLICT (store_id) DO NOTHING`,
    [store_id]
  );
}

/**
 * Reads `payment_providers` rows for a store and upserts `store_settings.payments`.
 * Existing `status` and `config` values for each provider are preserved when present.
 * Returns the new payments object.
 */
async function syncPaymentProvidersToSettings(pool, store_id) {
  const [provRows, settingsRow] = await Promise.all([
    pool.query(
      'SELECT provider_name, credentials FROM payment_providers WHERE store_id = $1',
      [store_id]
    ),
    pool.query('SELECT payments FROM store_settings WHERE store_id = $1', [store_id]),
  ]);

  const existingPayments = settingsRow.rows[0]?.payments || {};
  const payments = {};

  for (const row of provRows.rows) {
    const key = paymentProviderNameToFrontendId(row.provider_name);
    if (!key) continue;
    let creds = row.credentials;
    if (typeof creds === 'string') {
      try { creds = JSON.parse(creds); } catch { creds = {}; }
    }
    creds = (creds && typeof creds === 'object') ? creds : {};
    const existing = existingPayments[key] || {};
    payments[key] = {
      enabled: true,
      status: existing.status || 'notConnected',
      config: Object.keys(creds).length > 0 ? creds : (existing.config || {}),
    };
  }

  await ensureStoreSettingsRow(pool, store_id);
  await pool.query(
    `INSERT INTO store_settings (store_id, payments)
     VALUES ($1, $2)
     ON CONFLICT (store_id) DO UPDATE SET payments = EXCLUDED.payments`,
    [store_id, JSON.stringify(payments)]
  );
  return payments;
}

/**
 * Reads `shipping_providers` rows for a store and upserts `store_settings.shipping`.
 * Existing `zones` arrays are preserved.
 * Returns the new shipping object.
 */
async function syncShippingProvidersToSettings(pool, store_id) {
  const [provRows, settingsRow] = await Promise.all([
    pool.query(
      'SELECT carrier_name FROM shipping_providers WHERE store_id = $1',
      [store_id]
    ),
    pool.query('SELECT shipping FROM store_settings WHERE store_id = $1', [store_id]),
  ]);

  const existingShipping = settingsRow.rows[0]?.shipping || {};
  const shipping = {};

  for (const row of provRows.rows) {
    const key = shippingCarrierNameToFrontendId(row.carrier_name);
    if (!key) continue;
    const existing = existingShipping[key] || {};
    shipping[key] = {
      enabled: true,
      zones: Array.isArray(existing.zones) ? existing.zones : [],
    };
  }

  await ensureStoreSettingsRow(pool, store_id);
  await pool.query(
    `INSERT INTO store_settings (store_id, shipping)
     VALUES ($1, $2)
     ON CONFLICT (store_id) DO UPDATE SET shipping = EXCLUDED.shipping`,
    [store_id, JSON.stringify(shipping)]
  );
  return shipping;
}

module.exports = {
  paymentProviderNameToFrontendId,
  shippingCarrierNameToFrontendId,
  syncPaymentProvidersToSettings,
  syncShippingProvidersToSettings,
  PAYMENT_MIN_PLAN,
  SHIPPING_MIN_PLAN,
};
