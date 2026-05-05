const DEFAULT_LAYER_COLORS = {
  topBar: '#0A3C5A',
  buttons: '#1FAE77',
  buttonText: '#FFFFFF',
  background: '#F9FAFB',
  text: '#111827',
  priceLabels: '#047857',
  badges: '#F59E0B',
  badgeText: '#FFFFFF',
  productCard: '#FFFFFF',
};

const THEME_DEFAULTS = {
  default: {
    layerColors: { ...DEFAULT_LAYER_COLORS },
    productLayout: 'grid-classic',
  },
  minimal: {
    layerColors: {
      ...DEFAULT_LAYER_COLORS,
      topBar: '#334155',
      buttons: '#64748B',
      background: '#FFFFFF',
      text: '#111827',
      priceLabels: '#64748B',
      badges: '#334155',
      productCard: '#F8FAFC',
    },
    productLayout: 'grid-classic',
  },
  modern: {
    layerColors: {
      ...DEFAULT_LAYER_COLORS,
      topBar: '#0F172A',
      buttons: '#14B8A6',
      background: '#ECFEFF',
      text: '#0F172A',
      priceLabels: '#14B8A6',
      badges: '#0F172A',
      productCard: '#FFFFFF',
    },
    productLayout: 'grid-classic',
  },
  classic: {
    layerColors: {
      ...DEFAULT_LAYER_COLORS,
      topBar: '#6B4F3A',
      buttons: '#B08968',
      background: '#FAF3E8',
      text: '#3E2F23',
      priceLabels: '#B08968',
      badges: '#6B4F3A',
      productCard: '#FFFFFF',
    },
    productLayout: 'grid-classic',
  },
};

const VALID_COLOR_KEYS = Object.keys(DEFAULT_LAYER_COLORS);
const HEX_COLOR_RE = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

function normalizeThemeId(themeId) {
  const normalized = String(themeId || '').toLowerCase();
  return THEME_DEFAULTS[normalized] ? normalized : 'default';
}

function sanitizeColor(color, fallback) {
  if (typeof color !== 'string') return fallback;
  const trimmed = color.trim();
  return HEX_COLOR_RE.test(trimmed) ? trimmed : fallback;
}

function getReadableLayout(layout) {
  const normalized = String(layout || '').toLowerCase();
  if (normalized === 'compact-list' || normalized === 'list') return 'compact-list';
  if (normalized === 'grid-classic' || normalized === 'grid' || normalized === 'wide') return 'grid-classic';
  return 'grid-classic';
}

function isDarkColor(hex) {
  const value = sanitizeColor(hex, '#FFFFFF').replace('#', '');
  const expanded = value.length === 3
    ? value.split('').map((char) => char + char).join('')
    : value;
  const r = parseInt(expanded.slice(0, 2), 16);
  const g = parseInt(expanded.slice(2, 4), 16);
  const b = parseInt(expanded.slice(4, 6), 16);
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luminance < 0.45;
}

export function getNormalizedStoreBranding(themeId, branding) {
  const safeBranding = branding && typeof branding === 'object' ? branding : {};
  const safeLayerColors = safeBranding.layerColors && typeof safeBranding.layerColors === 'object'
    ? safeBranding.layerColors
    : {};
  const safeThemeId = normalizeThemeId(themeId);
  const themeDefaults = THEME_DEFAULTS[safeThemeId];

  const layerColors = VALID_COLOR_KEYS.reduce((acc, key) => {
    acc[key] = sanitizeColor(safeLayerColors[key], themeDefaults.layerColors[key]);
    return acc;
  }, {});

  const productLayout = getReadableLayout(safeBranding.productLayout);
  const brandColors = [layerColors.buttons, layerColors.topBar, layerColors.background].filter(Boolean);
  const primaryColor = layerColors.buttons;

  return {
    ...safeBranding,
    ...layerColors,
    layerColors,
    productLayout,
    primaryColor,
    brandColors,
    isDarkTopBar: isDarkColor(layerColors.topBar),
    isDarkBackground: isDarkColor(layerColors.background),
  };
}

