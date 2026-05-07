import React from 'react';

const noop = () => {};

const StorefrontSearchBar = ({
  value = '',
  onChange = noop,
  onClear = noop,
  placeholder = 'Search products...',
  isRTL = false,
  autoFocus = false,
  compact = false,
}) => (
  <div className="relative w-full">
    <label htmlFor="storefront-search" className="sr-only">
      Search products
    </label>
    <span
      className={`pointer-events-none absolute top-1/2 -translate-y-1/2 ${isRTL ? 'right-3' : 'left-3'} text-gray-400`}
      aria-hidden="true"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    </span>
    <input
      id="storefront-search"
      type="search"
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      autoFocus={autoFocus}
      placeholder={placeholder}
      aria-label="Search storefront products"
      className={`w-full ${compact ? 'h-11 min-h-[44px] sm:h-9 sm:min-h-0' : 'h-11 min-h-[44px]'} rounded-xl border border-gray-200 bg-white text-black ${
        isRTL ? 'pr-10 pl-10 text-right' : 'pl-10 pr-10 text-left'
      } text-base sm:text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-storelaunch-green focus:border-storelaunch-green transition-colors`}
    />
    {value && (
      <button
        type="button"
        onClick={onClear}
        aria-label="Clear search"
        className={`absolute top-1/2 -translate-y-1/2 ${isRTL ? 'left-1.5' : 'right-1.5'} inline-flex h-9 w-9 min-h-[36px] min-w-[36px] items-center justify-center rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-storelaunch-green`}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    )}
  </div>
);

export default React.memo(StorefrontSearchBar);
