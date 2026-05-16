/**
 * Post-build: inject precache manifest into src/service-worker.js → build/service-worker.js
 * Run automatically after `react-scripts build`.
 */
const path = require('path');
const { injectManifest } = require('workbox-build');

const root = path.join(__dirname, '..');
const buildDir = path.join(root, 'build');

injectManifest({
  swSrc: path.join(root, 'src', 'service-worker.js'),
  swDest: path.join(buildDir, 'service-worker.js'),
  globDirectory: buildDir,
  globPatterns: [
    '**/*.{js,css,html,ico,png,svg,jpg,jpeg,gif,webp,woff,woff2,json}',
  ],
  globIgnores: [
    '**/service-worker.js',
    '**/*.map',
    '**/asset-manifest.json',
  ],
  maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
})
  .then(({ count, size, warnings }) => {
    warnings.forEach((w) => console.warn('[workbox]', w));
    console.log(`[workbox] Precached ${count} files (${size} bytes) → build/service-worker.js`);
  })
  .catch((err) => {
    console.error('[workbox] injectManifest failed:', err);
    process.exit(1);
  });
