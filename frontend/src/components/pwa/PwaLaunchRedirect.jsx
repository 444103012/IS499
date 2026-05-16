import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from '../../router';
import {
  getPwaLaunchPath,
  isDisplayStandalone,
  resolvePwaLaunchRedirect,
  stripPwaQuery,
} from '../../utils/pwaLaunch';

const TOKEN_KEY = 'token';

export default function PwaLaunchRedirect() {
  const navigate = useNavigate();
  const location = useLocation();
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return undefined;
    ranRef.current = true;

    const cleanPwaQuery = () => {
      const nextSearch = stripPwaQuery(location.search);
      const current = `${location.pathname}${location.search}${location.hash}`;
      const cleaned = `${location.pathname}${nextSearch}${location.hash}`;
      if (current !== cleaned) {
        navigate(cleaned, { replace: true });
      }
    };

    if (!isDisplayStandalone()) {
      if (location.search.includes('pwa=')) {
        cleanPwaQuery();
      }
      return undefined;
    }

    const currentPath = `${location.pathname}${stripPwaQuery(location.search)}${location.hash}`;

    // Only apply the localStorage-based redirect when launching from the root URL.
    // On iOS, "Add to Home Screen" bookmarks the exact install URL (e.g. /live2), so
    // the launch URL is already correct — we must not override it with a stale
    // localStorage value. On Android the dynamic manifest sets start_url to the
    // install path, so the same rule applies: if we're already at a specific page,
    // trust it and only strip the ?pwa= marker.
    const launchingFromRoot =
      location.pathname === '/' || location.pathname === '';

    if (launchingFromRoot) {
      const token = localStorage.getItem(TOKEN_KEY);
      const saved = getPwaLaunchPath();
      const target = resolvePwaLaunchRedirect(token, saved);

      if (target && currentPath !== target) {
        navigate(target, { replace: true });
        return undefined;
      }
    }

    if (location.search.includes('pwa=')) {
      cleanPwaQuery();
    }

    return undefined;
    // Mount-only: restore launch URL once when standalone PWA starts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
