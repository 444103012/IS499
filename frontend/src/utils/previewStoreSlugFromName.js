/**
 * Client-side preview of the initial store path slug from a display name.
 * Mirrors backend deriveInitialSlugFromStoreName + finalizeInitialStoreSlug.
 *
 * Allowed characters: ASCII a-z, 0-9, Arabic letters (U+0600–U+06FF, U+0750–U+077F).
 * Spaces are removed (no hyphens) to keep initial slugs tight.
 * Uniqueness suffixes are applied only on the server.
 */
const SLUG_STRIP = /[^a-z0-9\u0600-\u06FF\u0750-\u077F]/g;

export function previewStoreSlugFromName(name) {
  let s = String(name || '')
    .normalize('NFC')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(SLUG_STRIP, '')
    .slice(0, 40);
  if (!s.length) return '';
  let guard = 0;
  while (s.length < 3 && s.length < 40 && guard < 10) {
    s = `${s}x`;
    guard += 1;
  }
  return s.slice(0, 40);
}
