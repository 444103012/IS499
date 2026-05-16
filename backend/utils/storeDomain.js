/**
 * Unicode-aware store slug utilities.
 *
 * Allowed slug characters:
 *   - ASCII lowercase letters (a-z) and digits (0-9)
 *   - Arabic letters (U+0600–U+06FF, U+0750–U+077F)
 *   - Hyphens (-) — never leading, trailing, or consecutive
 *
 * All slugs are NFC-normalised before storage and comparison.
 * ASCII portion is lowercased; Arabic has no case, so toLowerCase() is a no-op for it.
 */

/** Character class shared by regex and normalizer. */
const SLUG_ALLOWED_CHAR = /[^a-z0-9\u0600-\u06FF\u0750-\u077F-]/g;

/**
 * Regex that matches a fully valid, already-normalised Unicode store slug:
 *   - Starts and ends with a non-hyphen allowed char
 *   - Middle may contain any mix of allowed chars + hyphens
 *   - Length check is done separately (3–40)
 */
const UNICODE_STORE_SLUG_REGEX =
  /^[a-z0-9\u0600-\u06FF\u0750-\u077F](?:[a-z0-9\u0600-\u06FF\u0750-\u077F-]*[a-z0-9\u0600-\u06FF\u0750-\u077F])?$/;

/** Kept as a named export so callers that import STORE_SLUG_REGEX keep working. */
const STORE_SLUG_REGEX = UNICODE_STORE_SLUG_REGEX;

/**
 * normalizeUnicodeStoreSlug — canonical slug normaliser.
 * Spaces → hyphens; strips disallowed chars; collapses/trims hyphens; NFC.
 */
function normalizeUnicodeStoreSlug(input) {
  return String(input || '')
    .normalize('NFC')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(SLUG_ALLOWED_CHAR, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Public alias used by PUT /api/store/domain (mirrors old normalizeStoreSlug). */
function normalizeStoreSlug(input) {
  return normalizeUnicodeStoreSlug(input);
}

/**
 * Derives the initial slug candidate from a store display-name.
 * Spaces are collapsed (not hyphenated) to keep initial slugs tight.
 */
function deriveInitialSlugFromStoreName(name) {
  return String(name || '')
    .normalize('NFC')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(SLUG_ALLOWED_CHAR, '')
    .replace(/-/g, '')
    .slice(0, 40);
}

/**
 * Ensures a derived slug meets the 3-char minimum by padding with 'x'.
 * Falls back to 'str' if the derived slug is empty.
 */
function finalizeInitialStoreSlug(derived) {
  let s = String(derived || '')
    .normalize('NFC')
    .toLowerCase()
    .replace(SLUG_ALLOWED_CHAR, '')
    .replace(/-/g, '')
    .slice(0, 40);
  if (!s.length) s = 'store';
  let guard = 0;
  while (s.length < 3 && s.length < 40 && guard < 10) {
    s = `${s}x`;
    guard += 1;
  }
  if (s.length < 3) s = 'str';
  return s.slice(0, 40);
}

/** Returns true when slug is a fully valid, normalised Unicode store slug. */
function isValidUnicodeStoreSlug(slug) {
  const s = String(slug || '');
  return s.length >= 3 && s.length <= 40 && UNICODE_STORE_SLUG_REGEX.test(s);
}

/** Public alias kept for backward compat. */
function isValidStoreSlug(slug) {
  return isValidUnicodeStoreSlug(slug);
}

/**
 * Finds or allocates a unique domain_name for a store.
 * Tries the derived base, then base2, base3, … up to base999.
 * Duplicate comparison uses exact match on the normalised slug
 * (NFC + lowercased ASCII portion), which is correct for both ASCII and Arabic.
 */
async function allocateUniqueInitialDomainName(pool, store_id, displayName) {
  const raw = deriveInitialSlugFromStoreName(displayName);
  let base = finalizeInitialStoreSlug(raw);
  if (!isValidStoreSlug(base)) {
    base = finalizeInitialStoreSlug('store');
  }

  const tryCandidate = async (candidate) => {
    const c = String(candidate).normalize('NFC').toLowerCase().slice(0, 40);
    if (!isValidStoreSlug(c)) return null;
    const r = await pool.query(
      `SELECT 1 FROM stores
       WHERE domain_name = $1 AND store_id != $2
       LIMIT 1`,
      [c, store_id]
    );
    return r.rows.length === 0 ? c : null;
  };

  const first = await tryCandidate(base);
  if (first) return first;

  for (let n = 2; n < 1000; n += 1) {
    const suffix = String(n);
    const maxBaseLen = Math.max(1, 40 - suffix.length);
    const truncated = base.slice(0, maxBaseLen);
    const candidate = `${truncated}${suffix}`.normalize('NFC').toLowerCase().slice(0, 40);
    const ok = await tryCandidate(candidate);
    if (ok) return ok;
  }

  const fallback = `s${String(store_id).slice(0, 20)}`
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 40);
  const padded = finalizeInitialStoreSlug(fallback.length >= 3 ? fallback : `${fallback}xyz`);
  const last = await tryCandidate(padded);
  return last || padded;
}

module.exports = {
  STORE_SLUG_REGEX,
  UNICODE_STORE_SLUG_REGEX,
  normalizeUnicodeStoreSlug,
  normalizeStoreSlug,
  deriveInitialSlugFromStoreName,
  finalizeInitialStoreSlug,
  isValidUnicodeStoreSlug,
  isValidStoreSlug,
  allocateUniqueInitialDomainName,
};
