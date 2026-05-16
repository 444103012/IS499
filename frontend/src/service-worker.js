/* eslint-disable no-restricted-globals */
/**
 * StoreLaunch service worker — built with workbox injectManifest (see scripts/build-sw.cjs).
 * Cache policy:
 * - Precache: hashed JS/CSS + index.html + static icons from production build
 * - StaleWhileRevalidate: same-origin images/fonts
 * - NetworkOnly: /api/*, non-GET, Authorization header, cross-origin (payments/SDKs)
 */
import { clientsClaim } from 'workbox-core';
import { ExpirationPlugin } from 'workbox-expiration';
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { NetworkOnly, StaleWhileRevalidate } from 'workbox-strategies';

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// SPA: serve precached app shell for navigations (offline + client-side routes)
const navigationHandler = createHandlerBoundToURL('/index.html');
registerRoute(
  new NavigationRoute(navigationHandler, {
    denylist: [/^\/api\//, new RegExp('/[^/?]+\\.[^/]+$')],
  })
);

registerRoute(
  ({ request, url }) =>
    request.destination === 'image' &&
    url.origin === self.location.origin &&
    !url.pathname.startsWith('/api/'),
  new StaleWhileRevalidate({
    cacheName: 'storelaunch-images',
    plugins: [new ExpirationPlugin({ maxEntries: 80, maxAgeSeconds: 30 * 24 * 60 * 60 })],
  })
);

registerRoute(
  ({ request, url }) =>
    (request.destination === 'font' || request.destination === 'style') &&
    url.origin === self.location.origin,
  new StaleWhileRevalidate({
    cacheName: 'storelaunch-static-assets',
    plugins: [new ExpirationPlugin({ maxEntries: 40 })],
  })
);

registerRoute(
  ({ url, request }) =>
    url.pathname.startsWith('/api/') ||
    request.method !== 'GET' ||
    request.headers.has('Authorization') ||
    request.credentials === 'include',
  new NetworkOnly()
);

registerRoute(({ url }) => url.origin !== self.location.origin, new NetworkOnly());

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clientsClaim());
});
