import React from 'react';

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
      label={isRTL ? 'الفئة' : 'Category'}
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
      label={isRTL ? 'السعر' : 'Price range'}
      value={draftFilters.pricePreset}
      onChange={(e) => onDraftChange('pricePreset', e.target.value)}
      isRTL={isRTL}
      compact={compact}
    >
      <Option value="">{isRTL ? 'كل الأسعار' : 'All prices'}</Option>
      <Option value="0-100">0 - 100</Option>
      <Option value="100-500">100 - 500</Option>
      <Option value="500-1000">500 - 1000</Option>
      <Option value="1000-999999">1000+</Option>
    </SelectField>

    <SelectField
      id="filter-availability"
      label={isRTL ? 'التوفر' : 'Availability'}
      value={draftFilters.availability}
      onChange={(e) => onDraftChange('availability', e.target.value)}
      isRTL={isRTL}
      compact={compact}
    >
      <Option value="">{isRTL ? 'الكل' : 'All'}</Option>
      <Option value="in-stock">{isRTL ? 'متوفر' : 'In stock'}</Option>
      <Option value="out-of-stock">{isRTL ? 'غير متوفر' : 'Out of stock'}</Option>
    </SelectField>

    <SelectField
      id="filter-sort"
      label={isRTL ? 'الترتيب' : 'Sort'}
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
}) => (
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
        className="min-h-[44px] h-11 sm:h-8 sm:min-h-0 px-4 sm:px-3 rounded-md text-sm sm:text-xs font-semibold text-white bg-storelaunch-green hover:bg-storelaunch-deep-green focus:outline-none focus:ring-2 focus:ring-storelaunch-green focus:ring-offset-1"
      >
        {isRTL ? 'تطبيق' : 'Apply'}
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
        {isRTL ? 'إعادة تعيين' : 'Reset'}
      </button>
      {hasActiveFilters && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onReset(e);
          }}
          className="min-h-[44px] px-2 text-sm sm:text-xs font-semibold text-storelaunch-green hover:text-storelaunch-deep-green sm:h-8 sm:min-h-0"
        >
          {isRTL ? 'مسح الكل' : 'Clear all'}
        </button>
      )}
    </div>
  </div>
);

export default React.memo(StorefrontFilters);
