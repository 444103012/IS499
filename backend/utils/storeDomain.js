const STORE_SLUG_REGEX = /^[a-z0-9-]{3,40}$/;

function normalizeStoreSlug(input) {
  return String(input || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}


function deriveInitialSlugFromStoreName(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 40);
}


function finalizeInitialStoreSlug(derived) {
  let s = String(derived || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 40);
  if (!s.length) s = 'store';
  let guard = 0;
  while (s.length < 3 && s.length < 40 && guard < 10) {
    s = `${s}x`;
    guard += 1;
  }
  if (s.length < 3) s = 'str';
  return s.slice(0, 40);
}

function isValidStoreSlug(slug) {
  return STORE_SLUG_REGEX.test(String(slug || ''));
}

async function allocateUniqueInitialDomainName(pool, store_id, displayName) {
  const raw = deriveInitialSlugFromStoreName(displayName);
  let base = finalizeInitialStoreSlug(raw);
  if (!isValidStoreSlug(base)) {
    base = finalizeInitialStoreSlug('store');
  }
  const tryCandidate = async (candidate) => {
    const c = String(candidate).toLowerCase().slice(0, 40);
    if (!isValidStoreSlug(c)) return null;
    const r = await pool.query(
      `SELECT 1 FROM stores
       WHERE LOWER(domain_name) = LOWER($1) AND store_id != $2
       LIMIT 1`,
      [c, store_id]
    );
    return r.rows.length === 0 ? c : null;
  };
  let first = await tryCandidate(base);
  if (first) return first;
  for (let n = 2; n < 1000; n += 1) {
    const suffix = String(n);
    const maxBaseLen = Math.max(1, 40 - suffix.length);
    const truncated = base.slice(0, maxBaseLen);
    const candidate = `${truncated}${suffix}`.toLowerCase().slice(0, 40);
    const ok = await tryCandidate(candidate);
    if (ok) return ok;
  }
  const fallback = `s${String(store_id).slice(0, 20)}`.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 40);
  const padded = finalizeInitialStoreSlug(fallback.length >= 3 ? fallback : `${fallback}xyz`);
  const last = await tryCandidate(padded);
  return last || padded;
}

module.exports = {
  STORE_SLUG_REGEX,
  normalizeStoreSlug,
  deriveInitialSlugFromStoreName,
  finalizeInitialStoreSlug,
  isValidStoreSlug,
  allocateUniqueInitialDomainName,
};