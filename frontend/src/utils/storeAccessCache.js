const STORAGE_KEY = 'sl_store_access_v1';

/**
 * Client-side cache for /api/store/access-status to avoid blocking dashboard
 * navigation on every route change. Still refreshed in background; cleared on logout.
 */
export function readAccessCache(token) {
  if (!token) return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data.token !== token) return null;
    if (typeof data.ts !== 'number' || typeof data.suspended !== 'boolean') return null;
    return { suspended: data.suspended, ts: data.ts };
  } catch {
    return null;
  }
}

export function writeAccessCache(token, suspended) {
  if (!token) return;
  try {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ token, suspended, ts: Date.now() }),
    );
  } catch {
    // ignore quota / private mode
  }
}

export function clearAccessCache() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function isAccessCacheFresh(entry, ttlMs) {
  if (!entry) return false;
  return Date.now() - entry.ts < ttlMs;
}
