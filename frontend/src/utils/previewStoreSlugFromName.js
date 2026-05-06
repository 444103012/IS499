/**
 * Client-side preview of the initial store path slug from a display name (mirrors setup:
 * spaces removed, non-alphanumeric stripped, lowercased). Uniqueness suffixes are applied only on the server.
 */
export function previewStoreSlugFromName(name) {
  let s = String(name || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 40);
  if (!s.length) return '';
  let guard = 0;
  while (s.length < 3 && s.length < 40 && guard < 10) {
    s = `${s}x`;
    guard += 1;
  }
  return s.slice(0, 40);
}
