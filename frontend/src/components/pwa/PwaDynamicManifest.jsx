import { useEffect } from 'react';
import { useLocation } from '../../router';

/**
 * Keeps the <link rel="manifest"> href in sync with the current route so that
 * the browser's "install" prompt uses a manifest whose start_url matches the
 * page the user is actually on (e.g. /live2 → start_url "/live2?pwa=1").
 *
 * The endpoint /api/pwa-manifest is proxied to the backend by Vercel, so it is
 * served from the same origin and requires no CORS handling.
 */
export default function PwaDynamicManifest() {
  const location = useLocation();

  useEffect(() => {
    const path = location.pathname;
    const manifestUrl = `/api/pwa-manifest?path=${encodeURIComponent(path)}`;

    let link = document.querySelector('link[rel="manifest"]');
    if (link) {
      if (link.getAttribute('href') !== manifestUrl) {
        link.setAttribute('href', manifestUrl);
      }
    } else {
      link = document.createElement('link');
      link.rel = 'manifest';
      link.href = manifestUrl;
      document.head.appendChild(link);
    }
  }, [location.pathname]);

  return null;
}
