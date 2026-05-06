import React from 'react';
import '@abdulrysr/saudi-riyal-new-symbol-font/style.css';
import { formatLocalizedNumber, RIYAL_FONT_GLYPH, RIYAL_SYMBOL } from '../../utils/currency';

const SIZE_MAP = {
  sm: 'text-sm',
  md: '',
  lg: 'text-lg',
  xl: 'text-2xl',
  '2xl': 'text-3xl',
};

export default function CurrencyAmount({
  value,
  isRTL = false,
  locale,
  size = 'md',
  className = '',
  amountClassName = '',
  symbolClassName = '',
  symbolAriaLabel = 'Saudi Riyal',
}) {
  const resolvedLocale = locale || (isRTL ? 'ar-SA' : 'en-US');
  const textSize = SIZE_MAP[size] || SIZE_MAP.md;
  const amount = formatLocalizedNumber(value, resolvedLocale);

  return (
    <span className={`${textSize} inline-flex items-baseline gap-1 ${className}`.trim()}>
      <span className={amountClassName}>{amount}</span>
      <span
        className={`icon-saudi_riyal inline-block ${symbolClassName}`.trim()}
        role="img"
        aria-label={symbolAriaLabel}
        style={{ lineHeight: 1, verticalAlign: '-0.08em' }}
      >
        {RIYAL_FONT_GLYPH}
      </span>
      <span className="sr-only">{RIYAL_SYMBOL}</span>
    </span>
  );
}
