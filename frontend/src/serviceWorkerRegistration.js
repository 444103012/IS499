/**
 * Service worker registration (production or REACT_APP_ENABLE_SW=true in development).
 */

const isLocalhost = Boolean(
  window.location.hostname === 'localhost' ||
    window.location.hostname === '[::1]' ||
    window.location.hostname.match(/^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/)
);

function swEnabled() {
  if (process.env.REACT_APP_ENABLE_SW === 'true') return true;
  if (process.env.REACT_APP_ENABLE_SW === 'false') return false;
  return process.env.NODE_ENV === 'production';
}

export function register(config) {
  if (!('serviceWorker' in navigator)) return;
  if (!swEnabled()) {
    if (process.env.NODE_ENV === 'development') {
      console.info('[PWA] Service worker disabled in development (set REACT_APP_ENABLE_SW=true to enable).');
    }
    return;
  }

  const publicUrl = process.env.PUBLIC_URL || '';
  const swUrl = `${publicUrl}/service-worker.js`;

  if (isLocalhost) {
    checkValidServiceWorker(swUrl, config);
    navigator.serviceWorker.ready.then(() => {
      console.info('[PWA] Service worker ready (localhost).');
    });
    return;
  }

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(swUrl, { scope: publicUrl ? `${publicUrl.replace(/\/$/, '')}/` : '/' })
      .then((registration) => {
        registration.onupdatefound = () => {
          const installing = registration.installing;
          if (!installing) return;
          installing.onstatechange = () => {
            if (installing.state === 'installed') {
              if (navigator.serviceWorker.controller) {
                config?.onUpdate?.(registration);
              } else {
                config?.onSuccess?.(registration);
              }
            }
          };
        };
      })
      .catch((error) => {
        console.error('[PWA] Service worker registration failed:', error);
      });
  });
}

export function unregister() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.ready
    .then((registration) => registration.unregister())
    .catch(() => {});
}

/** Tell waiting worker to activate; page reloads on controllerchange. */
export function applyWaitingUpdate(registration) {
  const waiting = registration?.waiting;
  if (!waiting) return;
  waiting.postMessage({ type: 'SKIP_WAITING' });
}

let reloadScheduled = false;
export function listenForControllerChange(onReload = () => window.location.reload()) {
  if (!('serviceWorker' in navigator)) return () => {};
  const handler = () => {
    if (reloadScheduled) return;
    reloadScheduled = true;
    onReload();
  };
  navigator.serviceWorker.addEventListener('controllerchange', handler);
  return () => navigator.serviceWorker.removeEventListener('controllerchange', handler);
}

function checkValidServiceWorker(swUrl, config) {
  fetch(swUrl, { headers: { 'Service-Worker': 'script' } })
    .then((response) => {
      const contentType = response.headers.get('content-type');
      if (
        response.status === 404 ||
        (contentType != null && contentType.indexOf('javascript') === -1)
      ) {
        navigator.serviceWorker.ready.then((registration) => {
          registration.unregister();
        });
        return;
      }
      registerValidSW(swUrl, config);
    })
    .catch(() => {
      console.warn('[PWA] No service worker found. App may be offline.');
    });
}

function registerValidSW(swUrl, config) {
  navigator.serviceWorker
    .register(swUrl)
    .then((registration) => {
      registration.onupdatefound = () => {
        const installing = registration.installing;
        if (!installing) return;
        installing.onstatechange = () => {
          if (installing.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              config?.onUpdate?.(registration);
            } else {
              config?.onSuccess?.(registration);
            }
          }
        };
      };
    })
    .catch((error) => {
      console.error('[PWA] Service worker registration failed:', error);
    });
}
