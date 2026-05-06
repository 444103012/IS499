export const RIYAL_SYMBOL = '\uFDFC';
export const RIYAL_FONT_GLYPH = '\u00EA';

export function formatLocalizedNumber(value, locale = 'en-US', options = {}) {
  const num = Number(value || 0);
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...options,
  }).format(num);
}

export function formatPriceWithCurrency(value, { isRTL = false, locale } = {}) {
  const resolvedLocale = locale || (isRTL ? 'ar-SA' : 'en-US');
  return `${formatLocalizedNumber(value, resolvedLocale)} ${RIYAL_SYMBOL}`;
}

/**
 * Compact money string for chart axes / tooltips where space is tight.
 * Uses the same ﷼ suffix as {@link formatPriceWithCurrency} (plain text, not the icon font).
 */
export function formatCompactPriceWithCurrency(value, { isRTL = false, locale } = {}) {
  const resolvedLocale = locale || (isRTL ? 'ar-SA' : 'en-US');
  const n = Number(value);
  if (value == null || Number.isNaN(n)) return '—';
  if (n >= 1_000_000) {
    return `${(n / 1_000_000).toFixed(1)}M ${RIYAL_SYMBOL}`;
  }
  if (n >= 1000) {
    return `${(n / 1000).toFixed(1)}K ${RIYAL_SYMBOL}`;
  }
  return formatPriceWithCurrency(n, { isRTL, locale: resolvedLocale });
}
