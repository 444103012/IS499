# StoreLaunch PWA

## What is cached

| Resource | Strategy | Notes |
|----------|----------|--------|
| JS/CSS/HTML shell (build output) | Precache | Hashed bundles + `index.html` |
| Same-origin images/fonts | StaleWhileRevalidate | Public `/` assets only |
| `/api/*` | **Network only** | Never cached |
| Requests with `Authorization` | **Network only** | |
| Non-GET | **Network only** | |
| Cross-origin (Stripe, etc.) | **Network only** | |

## Development

Service worker is **off** in `npm start` unless:

```bash
REACT_APP_ENABLE_SW=true npm start
```

(Requires a production build in `build/` first.)

## Production build & local test

```bash
cd frontend
npm install --legacy-peer-deps
npm run build
npx serve -s build -l 3000
```

Open `http://localhost:3000` (HTTPS required for install on some hosts; `localhost` is treated as secure).

## Verify

1. **Chrome DevTools → Application**
   - Manifest: name, icons, `start_url`, `display: standalone`
   - Service Workers: activated, scope `/`
2. **Lighthouse → Progressive Web App**
3. **Install**: Chrome address bar install icon; Android; iOS Safari → Add to Home Screen
4. **Offline**: DevTools → Network → Offline → reload; landing shell loads; API calls fail with app offline bar
5. **Update**: Change build, `npm run build`, reload twice or use “skip waiting” flow; green banner → Refresh

## Deploy (Vercel)

- `service-worker.js` and `manifest.json` use short / no-cache headers (`vercel.json`).
- After deploy, users get update banner when a new SW is waiting.

## Limitations

- **iOS**: No Web Push; install via Add to Home Screen only.
- **Checkout / payments / auth**: Require network; never cached by design.
- **Deep links** offline: Only if app shell was precached; uncached routes show shell then client routing may fail API calls clearly.
