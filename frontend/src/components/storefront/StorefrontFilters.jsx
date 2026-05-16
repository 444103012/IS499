import React from 'react';
import { darkenHex } from '../../hooks/useStoreBranding';

const DEFAULT_FILTERS = {
  search: '',
  category: '',
  minPrice: '',
  maxPrice: '',
  sort: 'newest',
  availability: '',
  pricePreset: '',
};

const noop = () => {};

const SelectField = ({ id, label, value, onChange, children, isRTL, compact }) => (
  <div className="min-w-0 w-full">
    <label htmlFor={id} className={`block text-[11px] font-medium text-gray-500 mb-1.5 ${isRTL ? 'text-right' : 'text-left'}`}>
      {label}
    </label>
    <select
      id={id}
      value={value}
      onChange={onChange}
      aria-label={label}
      className={`${compact ? 'h-11 min-h-[44px] sm:h-9 sm:min-h-0' : 'h-10 min-h-[40px] sm:min-h-0 sm:h-9'} w-full rounded-md border border-gray-200 bg-white px-2.5 text-sm sm:text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-storelaunch-green focus:border-storelaunch-green ${
        isRTL ? 'text-right' : 'text-left'
      }`}
      style={{
        color: '#111827',
        backgroundColor: '#FFFFFF',
      }}
    >
      {children}
    </select>
  </div>
);

const Option = ({ value, children }) => (
  <option
    value={value}
    style={{
      color: '#111827',
      backgroundColor: '#FFFFFF',
    }}
  >
    {children}
  </option>
);

const FilterFields = ({ categories, draftFilters, onDraftChange, isRTL, t, compact }) => (
  <>
    <SelectField
      id="filter-category"
      label={t('storefront.category')}
      value={draftFilters.category}
      onChange={(e) => onDraftChange('category', e.target.value)}
      isRTL={isRTL}
      compact={compact}
    >
      <Option value="">{t('storefront.allCategories')}</Option>
      {categories.map((cat) => (
        <Option key={cat} value={cat}>
          {cat}
        </Option>
      ))}
    </SelectField>

    <SelectField
      id="filter-price"
      label={t('storefront.filtersPanel.priceRange')}
      value={draftFilters.pricePreset}
      onChange={(e) => onDraftChange('pricePreset', e.target.value)}
      isRTL={isRTL}
      compact={compact}
    >
      <Option value="">{t('storefront.filtersPanel.allPrices')}</Option>
      <Option value="0-100">0 - 100</Option>
      <Option value="100-500">100 - 500</Option>
      <Option value="500-1000">500 - 1000</Option>
      <Option value="1000-999999">1000+</Option>
    </SelectField>

    <SelectField
      id="filter-availability"
      label={t('storefront.filtersPanel.availability')}
      value={draftFilters.availability}
      onChange={(e) => onDraftChange('availability', e.target.value)}
      isRTL={isRTL}
      compact={compact}
    >
      <Option value="">{t('storefront.filtersPanel.all')}</Option>
      <Option value="in-stock">{t('storefront.filtersPanel.inStock')}</Option>
      <Option value="out-of-stock">{t('storefront.outOfStock')}</Option>
    </SelectField>

    <SelectField
      id="filter-sort"
      label={t('storefront.filtersPanel.sort')}
      value={draftFilters.sort}
      onChange={(e) => onDraftChange('sort', e.target.value)}
      isRTL={isRTL}
      compact={compact}
    >
      <Option value="newest">{t('storefront.newest')}</Option>
      <Option value="price_asc">{t('storefront.priceAsc')}</Option>
      <Option value="price_desc">{t('storefront.priceDesc')}</Option>
      <Option value="name_asc">{t('storefront.nameAsc')}</Option>
      <Option value="name_desc">{t('storefront.nameDesc')}</Option>
    </SelectField>
  </>
);

const StorefrontFilters = ({
  categories = [],
  draftFilters = DEFAULT_FILTERS,
  onDraftChange = noop,
  onApply = noop,
  onReset = noop,
  hasActiveFilters = false,
  isRTL = false,
  t = (key) => key,
  compact = false,
  accentColor = 'var(--store-primary, #1FAE77)',
}) => {
  const applyHoverColor = darkenHex(accentColor.startsWith('var') ? '#1FAE77' : accentColor);
  return (
  <div className={compact ? 'space-y-2' : 'space-y-3'}>
    <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-2 ${isRTL ? 'text-right' : 'text-left'}`}>
      <FilterFields categories={categories} draftFilters={draftFilters} onDraftChange={onDraftChange} isRTL={isRTL} t={t} compact={compact} />
    </div>
    <div className={`flex flex-wrap items-center gap-2 pt-1 ${isRTL ? 'justify-start flex-row-reverse' : 'justify-end'}`}>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onApply(e);
        }}
        className="min-h-[44px] h-11 sm:h-8 sm:min-h-0 px-4 sm:px-3 rounded-md text-sm sm:text-xs font-semibold text-white focus:outline-none focus:ring-2 focus:ring-offset-1"
        style={{ backgroundColor: accentColor }}
        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = applyHoverColor; }}
        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = accentColor; }}
      >
        {t('storefront.filtersPanel.apply')}
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onReset(e);
        }}
        className="min-h-[44px] h-11 sm:h-8 sm:min-h-0 px-4 sm:px-3 rounded-md border border-gray-300 text-sm sm:text-xs font-semibold text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300"
      >
        {t('storefront.filtersPanel.reset')}
      </button>
      {hasActiveFilters && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onReset(e);
          }}
          className="min-h-[44px] px-2 text-sm sm:text-xs font-semibold sm:h-8 sm:min-h-0"
          style={{ color: accentColor }}
        >
          {t('storefront.filtersPanel.clearAll')}
        </button>
      )}
    </div>
  </div>
  );
};

export default React.memo(StorefrontFilters);
