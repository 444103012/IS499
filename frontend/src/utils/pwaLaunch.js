import { isValidStoreName, normalizeStoreName } from './storefrontRoutes';

export const PWA_LAUNCH_PATH_KEY = 'storelaunch_pwa_launch_path';

const RESERVED_SEGMENTS = new Set([
  'admin',
  'api',
  'customer',
  'dashboard',
  'login',
  'register',
  'store-setup',
  'store-suspended',
  'store-preview',
  'shop',
]);

/**
 * @param {string} path - pathname, or pathname+search+hash
 * @returns {string|null} normalized same-origin path or null if unsafe
 */
export function sanitizeInternalPath(path) {
  if (typeof path !== 'string' || !path.length) return null;
  const trimmed = path.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) return null;
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) {
    return null;
  }

  try {
    const url = new URL(trimmed, window.location.origin);
    if (url.origin !== window.location.origin) return null;
    url.searchParams.delete('pwa');
    const search = url.searchParams.toString() ? `?${url.searchParams.toString()}` : '';
    return `${url.pathname}${search}${url.hash}`;
  } catch {
    return null;
  }
}

export function shouldSavePwaLaunchPath(pathname) {
  if (typeof pathname !== 'string') return false;
  const base = pathname.split('?')[0].split('#')[0];
  if (!sanitizeInternalPath(base)) return false;
  if (base.startsWith('/admin')) return false;

  if (base === '/' || base === '/login' || base === '/register') return true;
  if (base.startsWith('/dashboard')) return true;
  if (base.startsWith('/store-setup')) return true;
  if (base === '/store-suspended') return true;
  if (base.startsWith('/store-preview/')) return true;

  const segments = base.split('/').filter(Boolean);
  if (segments.length === 0) return true;
  const first = segments[0];
  if (RESERVED_SEGMENTS.has(first)) return false;
  return isValidStoreName(normalizeStoreName(first));
}

export function isValidPwaRedirectPath(path) {
  return shouldSavePwaLaunchPath(path);
}

export function savePwaLaunchPath(path) {
  if (typeof window === 'undefined') return;
  const normalized = sanitizeInternalPath(path);
  if (!normalized || !shouldSavePwaLaunchPath(normalized.split('?')[0].split('#')[0])) {
    return;
  }
  try {
    localStorage.setItem(PWA_LAUNCH_PATH_KEY, normalized);
  } catch {
    /* quota / private mode */
  }
}

export function getPwaLaunchPath() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(PWA_LAUNCH_PATH_KEY);
    return sanitizeInternalPath(raw);
  } catch {
    return null;
  }
}

export function clearPwaLaunchPath() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(PWA_LAUNCH_PATH_KEY);
  } catch {
    /* ignore */
  }
}

export function isDisplayStandalone() {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia('(display-mode: standalone)').matches) return true;
  if (window.navigator.standalone === true) return true;
  if (document.referrer && document.referrer.includes('android-app://')) return true;
  return false;
}

function isLandingPath(path) {
  if (!path) return true;
  const base = path.split('?')[0].split('#')[0];
  return base === '/' || base === '';
}

/**
 * Resolve where standalone PWA should navigate on cold start.
 * @param {string|null} token
 * @param {string|null} savedPath
 * @returns {string|null} internal path to navigate to, or null to keep current
 */
export function resolvePwaLaunchRedirect(token, savedPath) {
  const saved = savedPath ? sanitizeInternalPath(savedPath) : null;

  if (token) {
    if (!saved || isLandingPath(saved)) {
      return '/dashboard';
    }
    if (isValidPwaRedirectPath(saved)) {
      return saved;
    }
    return '/dashboard';
  }

  if (saved && isValidPwaRedirectPath(saved) && !isLandingPath(saved)) {
    return saved;
  }

  return null;
}

export function stripPwaQuery(search) {
  if (!search) return '';
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  params.delete('pwa');
  const next = params.toString();
  return next ? `?${next}` : '';
}
