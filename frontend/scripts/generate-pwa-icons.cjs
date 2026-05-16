/**
 * Build StoreLaunch PWA / iOS home-screen icons from Logo_only512.png.
 * Square mark with safe padding on white (any) or brand green (maskable).
 *
 * Usage: node scripts/generate-pwa-icons.cjs
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.join(__dirname, '..');
const SOURCE = path.join(ROOT, 'public', 'Logo_only512.png');
const OUT_DIR = path.join(ROOT, 'public', 'icons');

const BRAND_GREEN = { r: 31, g: 174, b: 119, alpha: 1 };
const WHITE = { r: 255, g: 255, b: 255, alpha: 1 };

/** Logo occupies this fraction of canvas width/height (rest is margin). */
const PADDING_ANY = 0.14;
/** Maskable safe zone ~80% — logo uses 72% of canvas (14% margin each side). */
const PADDING_MASKABLE = 0.14;

async function renderIcon(size, { background, padding }) {
  const inner = Math.max(1, Math.round(size * (1 - 2 * padding)));
  const logo = await sharp(SOURCE)
    .resize(inner, inner, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background,
    },
  })
    .composite([{ input: logo, gravity: 'center' }])
    .png()
    .toBuffer();
}

async function writeIcon(filename, size, opts) {
  const buf = await renderIcon(size, opts);
  const outPath = path.join(OUT_DIR, filename);
  await sharp(buf).png().toFile(outPath);
  const meta = await sharp(outPath).metadata();
  console.log(`  ${filename} → ${meta.width}×${meta.height}`);
}

async function main() {
  if (!fs.existsSync(SOURCE)) {
    console.error('Missing source:', SOURCE);
    process.exit(1);
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });

  console.log('Generating icons from', path.basename(SOURCE));

  await writeIcon('apple-touch-icon.png', 180, {
    background: WHITE,
    padding: PADDING_ANY,
  });
  await writeIcon('apple-touch-icon-167.png', 167, {
    background: WHITE,
    padding: PADDING_ANY,
  });
  await writeIcon('apple-touch-icon-152.png', 152, {
    background: WHITE,
    padding: PADDING_ANY,
  });
  await writeIcon('icon-192.png', 192, {
    background: WHITE,
    padding: PADDING_ANY,
  });
  await writeIcon('icon-512.png', 512, {
    background: WHITE,
    padding: PADDING_ANY,
  });
  await writeIcon('icon-192-maskable.png', 192, {
    background: BRAND_GREEN,
    padding: PADDING_MASKABLE,
  });
  await writeIcon('icon-512-maskable.png', 512, {
    background: BRAND_GREEN,
    padding: PADDING_MASKABLE,
  });
  await writeIcon('favicon-32.png', 32, {
    background: WHITE,
    padding: 0.12,
  });
  await writeIcon('favicon-16.png', 16, {
    background: WHITE,
    padding: 0.1,
  });

  const toIco = require('to-ico');
  const faviconIco = await toIco([
    fs.readFileSync(path.join(OUT_DIR, 'favicon-16.png')),
    fs.readFileSync(path.join(OUT_DIR, 'favicon-32.png')),
  ]);
  fs.writeFileSync(path.join(ROOT, 'public', 'favicon.ico'), faviconIco);
  console.log('  favicon.ico → public/favicon.ico');

  console.log('Done → public/icons/');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
