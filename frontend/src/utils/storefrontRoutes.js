/**
 * Storefront routing helpers.
 *
 * Valid slug characters: ASCII a-z, 0-9, Arabic (U+0600–U+06FF, U+0750–U+077F), hyphen.
 * No leading/trailing hyphens. Length 3–40.
 * Mirrors backend/utils/storeDomain.js isValidUnicodeStoreSlug.
 */

/**
 * Valid Unicode store slug pattern:
 *   - Starts and ends with a non-hyphen allowed char
 *   - Middle may contain allowed chars + hyphens
 *   - Length is checked separately (3–40)
 */
export const STORE_NAME_PATTERN =
  /^[a-z0-9\u0600-\u06FF\u0750-\u077F](?:[a-z0-9\u0600-\u06FF\u0750-\u077F-]*[a-z0-9\u0600-\u06FF\u0750-\u077F])?$/;

/**
 * Normalise a slug value: NFC, trim, lowercase ASCII portion.
 * Does NOT strip characters — use isValidStoreName to check the result.
 */
export const normalizeStoreName = (value) =>
  String(value || '').normalize('NFC').trim().toLowerCase();

/** Returns true when the normalised slug passes all Unicode slug rules. */
export const isValidStoreName = (value) => {
  const s = normalizeStoreName(value);
  return s.length >= 3 && s.length <= 40 && STORE_NAME_PATTERN.test(s);
};

/**
 * Builds a storefront path for React Router navigation.
 * Uses un-encoded path so React Router handles percent-encoding internally.
 * The browser address bar will show Arabic characters (not percent-encoded)
 * for better readability, which is standard for IDN/Unicode URLs.
 */
export const buildStorefrontPath = (storeName, servicePath = '') => {
  const normalized = normalizeStoreName(storeName);
  if (!isValidStoreName(normalized)) return '/';
  const cleanService = String(servicePath || '').replace(/^\/+/, '');
  return cleanService ? `/${normalized}/${cleanService}` : `/${normalized}`;
};
