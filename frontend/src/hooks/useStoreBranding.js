import { useEffect, useMemo, useState } from 'react';
import axiosInstance from '../api/axios';
import { getNormalizedStoreBranding } from '../utils/storeBranding';
import { normalizeStoreName } from '../utils/storefrontRoutes';

const DEFAULT_BRANDING = getNormalizedStoreBranding('default', {});
const BLOCKED_STORE_STATUSES = new Set(['Suspended', 'Blocked', 'Inactive']);
const storeCache = new Map();

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function darkenHex(hex, ratio = 0.18) {
  const normalized = String(hex || '').replace('#', '');
  const full = normalized.length === 3
    ? normalized.split('').map((c) => `${c}${c}`).join('')
    : normalized;
  if (!/^[0-9a-f]{6}$/i.test(full)) return '#0C7A5C';

  const r = clamp(Math.round(parseInt(full.slice(0, 2), 16) * (1 - ratio)), 0, 255);
  const g = clamp(Math.round(parseInt(full.slice(2, 4), 16) * (1 - ratio)), 0, 255);
  const b = clamp(Math.round(parseInt(full.slice(4, 6), 16) * (1 - ratio)), 0, 255);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function applyBrandingCssVariables(branding) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const b = branding || DEFAULT_BRANDING;
  root.style.setProperty('--store-primary', b.primaryColor || b.buttons || '#1FAE77');
  root.style.setProperty('--brand-green', b.buttons || '#1FAE77');
  root.style.setProperty('--brand-deep-green', darkenHex(b.buttons || '#1FAE77'));
  root.style.setProperty('--brand-teal', b.priceLabels || b.buttons || '#0E8F96');
  root.style.setProperty('--brand-dark-blue-green', b.topBar || '#0A3C5A');
  root.style.setProperty('--brand-button-text', b.buttonText || '#FFFFFF');
  root.style.setProperty('--store-bg', b.background || '#F9FAFB');
  root.style.setProperty('--store-text', b.text || '#111827');
  root.style.setProperty('--store-card', b.productCard || '#FFFFFF');
  root.style.setProperty('--store-topbar', b.topBar || '#0A3C5A');
}

export default function useStoreBranding(storeSlug, options = {}) {
  const normalizedStoreSlug = useMemo(
    () => normalizeStoreName(storeSlug),
    [storeSlug]
  );
  const [storeInfo, setStoreInfo] = useState(null);
  const [branding, setBranding] = useState(DEFAULT_BRANDING);
  const [status, setStatus] = useState(storeSlug ? 'loading' : 'ok');
  const [retry, setRetry] = useState(0);
  const { disableStoreFetch = false } = options;

  useEffect(() => {
    if (!normalizedStoreSlug || disableStoreFetch) {
      setStoreInfo(null);
      setBranding(DEFAULT_BRANDING);
      setStatus('ok');
      return;
    }

    const cacheKey = normalizedStoreSlug;
    const cached = storeCache.get(cacheKey);
    if (cached) {
      setStoreInfo(cached.storeInfo);
      setBranding(cached.branding);
      setStatus(cached.status);
      // Keep cached paint for UX, but always revalidate from backend.
    }

    let mounted = true;
    if (!cached) setStatus('loading');
    Promise.resolve(axiosInstance.get(`/api/stores/${encodeURIComponent(normalizedStoreSlug)}`))
      .then(({ data }) => {
        if (!mounted) return;
        const store = data?.store || null;
        if (!store) {
          setStatus('not_found');
          return;
        }
        if (BLOCKED_STORE_STATUSES.has(store.status)) {
          const blocked = { storeInfo: store, branding: getNormalizedStoreBranding(store.theme, store.branding), status: 'inactive' };
          storeCache.set(cacheKey, blocked);
          setStoreInfo(blocked.storeInfo);
          setBranding(blocked.branding);
          setStatus('inactive');
          return;
        }
        const normalized = getNormalizedStoreBranding(store.theme, store.branding);
        const next = { storeInfo: store, branding: normalized, status: 'ok' };
        storeCache.set(cacheKey, next);
        setStoreInfo(store);
        setBranding(normalized);
        setStatus('ok');
      })
      .catch((err) => {
        if (!mounted) return;
        if (err.response?.status === 404) {
          setStatus('not_found');
          return;
        }
        if (err.response?.status === 403) {
          const reason = String(err.response?.data?.reason || '').toUpperCase();
          if (reason === 'SUSPENDED' || reason === 'INACTIVE') {
            setStatus('inactive');
            return;
          }
        }
        setStatus('error');
      });

    return () => {
      mounted = false;
    };
  }, [normalizedStoreSlug, retry, disableStoreFetch]);

  useEffect(() => {
    applyBrandingCssVariables(branding);
  }, [branding]);

  return {
    normalizedStoreSlug,
    storeInfo,
    branding,
    status,
    retry: () => {
      storeCache.delete(normalizedStoreSlug);
      setRetry((n) => n + 1);
    },
  };
}
