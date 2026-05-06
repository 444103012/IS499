









import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Link, useSearchParams, useLocation, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import StorefrontHeader from '../components/StorefrontHeader';
import StorefrontFooter from '../components/storefront/StorefrontFooter';
import axiosInstance from '../api/axios';
import { buildStorefrontPath, isValidStoreName, normalizeStoreName } from '../utils/storefrontRoutes';
import useDebouncedValue from '../hooks/useDebouncedValue';
import useStoreBranding from '../hooks/useStoreBranding';
import CurrencyAmount from '../components/common/CurrencyAmount';
import StarRating from '../components/reviews/StarRating';
import ReviewCard from '../components/reviews/ReviewCard';

const StorefrontPage = () => {
  const { t, i18n } = useTranslation();
  const { storeSlug } = useParams();
  const normalizedStoreSlug = normalizeStoreName(storeSlug);
  const hasInvalidStoreSlug = Boolean(storeSlug) && !isValidStoreName(storeSlug);
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const isRTL = i18n.language === 'ar';

  
  const {
    storeInfo: store,
    branding: storeBranding,
    status: storeStatus,
    retry: retryStoreLookup,
  } = useStoreBranding(normalizedStoreSlug);
  

  const productCacheKey = `sf_products_${normalizedStoreSlug}`;
  const categoryCacheKey = `sf_categories_${normalizedStoreSlug}`;

  const [products, setProducts] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem(productCacheKey) || 'null') || []; } catch { return []; }
  });
  const [categories, setCategories] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem(categoryCacheKey) || 'null') || []; } catch { return []; }
  });
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [hasMore, setHasMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [storeReviews, setStoreReviews] = useState([]);
  const [loadingStoreReviews, setLoadingStoreReviews] = useState(false);

  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');
  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    category: searchParams.get('category') || '',
    minPrice: searchParams.get('minPrice') || '',
    maxPrice: searchParams.get('maxPrice') || '',
    sort: searchParams.get('sort') || 'newest',
    availability: searchParams.get('availability') || '',
    pricePreset: searchParams.get('pricePreset') || '',
  });
  const [draftFilters, setDraftFilters] = useState(filters);
  const debouncedSearch = useDebouncedValue(searchInput, 350);

  const observerTarget = useRef(null);
  const reviewsScrollerRef = useRef(null);
  const scrollPositionKey = 'storefront_scroll_position';

  useEffect(() => {
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = i18n.language;
  }, [i18n.language, isRTL]);

  
  
  useEffect(() => {
    
    if (storeSlug && (storeStatus === 'loading' || storeStatus !== 'ok')) return;
    fetchCategories();
  }, [storeStatus]);

  useEffect(() => {
    const fetchStoreReviews = async () => {
      if (!store?.store_id) {
        setStoreReviews([]);
        return;
      }
      setLoadingStoreReviews(true);
      try {
        const { data } = await axiosInstance.get(`/api/products/reviews/store?store_id=${store.store_id}&limit=6`);
        setStoreReviews(data?.reviews || []);
      } catch (_) {
        setStoreReviews([]);
      } finally {
        setLoadingStoreReviews(false);
      }
    };
    fetchStoreReviews();
  }, [store?.store_id]);

  
  useEffect(() => {
    const savedPosition = sessionStorage.getItem(scrollPositionKey);
    if (savedPosition && location.state?.fromDetails) {
      setTimeout(() => {
        window.scrollTo(0, parseInt(savedPosition, 10));
        sessionStorage.removeItem(scrollPositionKey);
      }, 100);
    }
  }, [location]);

  
  const saveScrollPosition = () => {
    sessionStorage.setItem(scrollPositionKey, window.scrollY.toString());
  };

  useEffect(() => {
    if (storeSlug && (storeStatus === 'loading' || storeStatus !== 'ok')) return;
    const isBackNav = Boolean(location.state?.fromDetails);
    const hasCached = products.length > 0;
    if (isBackNav && hasCached) {
      // Restore from cache instantly; skip full reload
      setLoading(false);
      return;
    }
    setCurrentPage(1);
    setProducts([]);
    fetchProducts(1, true);
  }, [filters, storeStatus]);

  
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [hasMore, loading, loadingMore, currentPage]);

  const fetchCategories = async () => {
    try {
      const catParams = store?.store_id ? `?store_id=${store.store_id}` : '';
      const { data } = await axiosInstance.get(`/api/products/categories/list${catParams}`);
      const cats = data.categories || [];
      setCategories(cats);
      try { sessionStorage.setItem(categoryCacheKey, JSON.stringify(cats)); } catch (_) {}
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  };

  const fetchProducts = async (page = 1, reset = false) => {
    if (reset) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    setError('');

    try {
      const paramObj = {
        search: filters.search,
        category: filters.category,
        minPrice: filters.minPrice,
        maxPrice: filters.maxPrice,
        sort: filters.sort,
        page: page.toString(),
        limit: '12'
      };
      if (store?.store_id) paramObj.store_id = store.store_id.toString();
      const params = new URLSearchParams(paramObj);

      const { data } = await axiosInstance.get(`/api/products?${params.toString()}`);
      const serverProducts = data.products || [];
      const filteredProducts = filters.availability
        ? serverProducts.filter((product) => {
            const stock = Number(product.total_stock ?? 0);
            if (filters.availability === 'in-stock') return stock > 0;
            if (filters.availability === 'out-of-stock') return stock <= 0;
            return true;
          })
        : serverProducts;

      if (reset) {
        setProducts(filteredProducts);
        try { sessionStorage.setItem(productCacheKey, JSON.stringify(filteredProducts)); } catch (_) {}
      } else {
        setProducts((prev) => {
          const next = [...prev, ...filteredProducts];
          try { sessionStorage.setItem(productCacheKey, JSON.stringify(next)); } catch (_) {}
          return next;
        });
      }
      
      setHasMore(data.pagination?.hasMore || false);
      setTotalProducts(data.pagination?.total || 0);
      setCurrentPage(page);
    } catch (err) {
      console.error('Failed to fetch products:', err);
      setError(t('storefront.error'));
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      fetchProducts(currentPage + 1, false);
    }
  }, [currentPage, loadingMore, hasMore]);

  const applyFilters = (newFilters) => {
    const params = new URLSearchParams();
    if (newFilters.search) params.set('search', newFilters.search);
    if (newFilters.category) params.set('category', newFilters.category);
    if (newFilters.minPrice) params.set('minPrice', newFilters.minPrice);
    if (newFilters.maxPrice) params.set('maxPrice', newFilters.maxPrice);
    if (newFilters.sort) params.set('sort', newFilters.sort);
    if (newFilters.availability) params.set('availability', newFilters.availability);
    if (newFilters.pricePreset) params.set('pricePreset', newFilters.pricePreset);
    
    setFilters(newFilters);
    setDraftFilters(newFilters);
    setSearchParams(params);
  };

  const clearAllFilters = () => {
    setSearchInput('');
    const reset = {
      search: '',
      category: '',
      minPrice: '',
      maxPrice: '',
      sort: 'newest',
      availability: '',
      pricePreset: '',
    };
    setFilters(reset);
    setDraftFilters(reset);
    setSearchParams({});
  };

  const hasActiveFilters = useMemo(
    () => Boolean(filters.search || filters.category || filters.minPrice || filters.maxPrice || filters.availability),
    [filters]
  );

  useEffect(() => {
    const min = searchParams.get('minPrice') || '';
    const max = searchParams.get('maxPrice') || '';
    const next = {
      search: searchParams.get('search') || '',
      category: searchParams.get('category') || '',
      minPrice: min,
      maxPrice: max,
      sort: searchParams.get('sort') || 'newest',
      availability: searchParams.get('availability') || '',
      pricePreset: searchParams.get('pricePreset') || (min && max ? `${min}-${max}` : ''),
    };
    setFilters(next);
    setDraftFilters(next);
    setSearchInput(next.search);
  }, [searchParams]);

  useEffect(() => {
    if (debouncedSearch === filters.search) return;
    applyFilters({ ...draftFilters, search: debouncedSearch });
  }, [debouncedSearch]);

  const updateDraftFilter = (key, value) => {
    if (key === 'pricePreset') {
      if (!value) {
        setDraftFilters((prev) => ({ ...prev, pricePreset: '', minPrice: '', maxPrice: '' }));
        return;
      }
      const [min, max] = value.split('-');
      setDraftFilters((prev) => ({ ...prev, pricePreset: value, minPrice: min || '', maxPrice: max || '' }));
      return;
    }
    setDraftFilters((prev) => ({ ...prev, [key]: value }));
  };

  
  const ProductSkeleton = () => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden animate-pulse">
      <div className="aspect-square bg-gray-200"></div>
      <div className="p-4 space-y-3">
        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
        <div className="h-5 bg-gray-200 rounded w-1/3"></div>
      </div>
    </div>
  );

  
  if (storeSlug && storeStatus === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-storelaunch-green"></div>
      </div>
    );
  }

  
  if (storeSlug && storeStatus === 'error') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center max-w-md mx-auto">
          <svg className="w-16 h-16 text-red-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h2 className="text-xl font-bold text-gray-800 mb-2">
            {isRTL ? 'تعذر تحميل المتجر' : 'Could Not Load Store'}
          </h2>
          <p className="text-gray-500 text-sm mb-4">
            {isRTL ? 'حدث خطأ مؤقت. يرجى المحاولة مجدداً.' : 'A temporary error occurred. Please try again.'}
          </p>
          <button
            onClick={retryStoreLookup}
            className="px-6 py-2 bg-storelaunch-green text-white rounded-lg font-medium hover:bg-storelaunch-deep-green transition-colors text-sm"
          >
            {isRTL ? 'إعادة المحاولة' : 'Retry'}
          </button>
        </div>
      </div>
    );
  }

  
  if (hasInvalidStoreSlug || (storeSlug && storeStatus === 'not_found')) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center max-w-md mx-auto">
          <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <h2 className="text-xl font-bold text-gray-800 mb-2">
            {isRTL ? 'المتجر غير موجود' : 'Store Not Found'}
          </h2>
          <p className="text-gray-500 text-sm">
            {isRTL ? `لم يتم العثور على متجر باسم "${storeSlug}".` : `No store found for "${storeSlug}".`}
          </p>
        </div>
      </div>
    );
  }

  
  if (storeSlug && storeStatus === 'inactive') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center max-w-md mx-auto">
          <svg className="w-16 h-16 text-yellow-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h2 className="text-xl font-bold text-gray-800 mb-2">
            {isRTL ? 'المتجر غير متاح حالياً' : 'Store Unavailable'}
          </h2>
          <p className="text-gray-500 text-sm">
            {isRTL ? 'عذرًا، هذا المتجر غير متاح حاليًا.' : 'Sorry, this store is not available at the moment.'}
          </p>
        </div>
      </div>
    );
  }

  
  const primaryColor = storeBranding.primaryColor;
  const productLayout = storeBranding.productLayout || 'grid-classic';
  const reviewAccent = storeBranding.buttons || '#6366F1';
  const reviewBg = `${reviewAccent}0D`;

  return (
    <div
      className="min-h-screen flex flex-col overflow-x-hidden"
      style={{ backgroundColor: storeBranding.background }}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <StorefrontHeader
        storeSlug={normalizedStoreSlug}
        storeInfo={store}
        branding={storeBranding}
        searchValue={searchInput}
        onSearchChange={setSearchInput}
        onSearchClear={() => setSearchInput('')}
        categories={categories}
        draftFilters={draftFilters}
        onDraftFilterChange={updateDraftFilter}
        onApplyFilters={() => applyFilters({ ...draftFilters, search: debouncedSearch })}
        onResetFilters={clearAllFilters}
        hasActiveFilters={hasActiveFilters}
      />

      <div className="flex-1 max-w-7xl mx-auto w-full px-3 sm:px-6 lg:px-8 py-3 sm:py-5 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {}
        {!loading && products.length > 0 && (
          <div
            className={`mb-3 sm:mb-4 text-sm font-medium ${isRTL ? 'text-right' : 'text-left'}`}
            style={{ color: storeBranding.text }}
          >
            {t('storefront.showingResults', { count: totalProducts })}
          </div>
        )}

        {}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
            {[...Array(8)].map((_, i) => (
              <ProductSkeleton key={i} />
            ))}
          </div>
        ) : error ? (
          
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <svg className="w-16 h-16 text-red-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-red-600 mb-4 text-lg font-medium">{error}</p>
            <button
              onClick={() => fetchProducts(1, true)}
              className="px-6 py-3 bg-storelaunch-green text-white rounded-lg font-medium hover:bg-storelaunch-deep-green transition-colors"
            >
              {t('storefront.retry')}
            </button>
          </div>
        ) : products.length === 0 ? (
          
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <svg className="w-20 h-20 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <h3 className="text-2xl font-bold text-storelaunch-dark mb-2">{t('storefront.noResults')}</h3>
            <p className="text-gray-600 mb-6 text-lg">{t('storefront.noResultsDesc')}</p>
            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="px-6 py-3 bg-storelaunch-green text-white rounded-lg font-medium hover:bg-storelaunch-deep-green transition-colors"
              >
                {t('storefront.clearFilters')}
              </button>
            )}
          </div>
        ) : (
          
          <>
            {}
            <div className={
              productLayout === 'compact-list'
                ? 'flex flex-col gap-3 sm:gap-4'
                : 'grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6'
            }>
              {products.map((product) => {
                const cardBg = storeBranding.productCard;
                const cardBorder = storeBranding.isDarkBackground ? '#334155' : '#e5e7eb';
                const textColor = storeBranding.text;
                const subColor = storeBranding.text;
                const accentColor = storeBranding.priceLabels || primaryColor || '#1FAE77';
                const badgeBg = storeBranding.badges;
                const badgeColor = storeBranding.badgeText;
                const totalStock = Number(product.total_stock ?? 0);
                const outOfStock = totalStock <= 0;

                if (productLayout === 'compact-list') {
                  return (
                    <Link
                      key={product.product_id}
                      to={storeSlug ? buildStorefrontPath(normalizedStoreSlug, `product/${product.product_id}`) : `/product/${product.product_id}`}
                      onClick={saveScrollPosition}
                      state={{ fromStorefront: true, storeSlug: normalizedStoreSlug }}
                      className="text-left w-full flex gap-3 sm:gap-4 rounded-xl overflow-hidden shadow-sm border transition hover:shadow-md focus:outline-none focus:ring-2 focus:ring-storelaunch-green"
                      style={{ backgroundColor: cardBg, borderColor: cardBorder }}
                    >
                      <div className="relative w-24 min-h-[5.5rem] sm:min-h-0 sm:w-36 shrink-0 self-stretch sm:self-auto bg-gray-100 flex items-center justify-center">
                        {outOfStock && (
                          <span className="absolute top-2 left-2 z-10 rounded-full bg-red-600 px-2 py-1 text-[11px] font-semibold text-white shadow">
                            {isRTL ? 'غير متوفر' : 'Out of stock'}
                          </span>
                        )}
                        {product.image_url ? (
                          <img src={product.image_url} alt={product.product_name} className="w-full h-full object-cover" />
                        ) : (
                          <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                          </svg>
                        )}
                      </div>
                      <div className="p-3 sm:p-4 flex-1 min-w-0">
                        <p className="font-semibold text-sm sm:text-base line-clamp-2 sm:line-clamp-1" style={{ color: textColor }}>
                          {product.product_name}
                        </p>
                        {product.category && (
                          <p className="text-xs mt-1 opacity-80" style={{ color: subColor }}>{product.category}</p>
                        )}
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <p className="font-bold" style={{ color: accentColor }}>
                            <CurrencyAmount value={product.price} isRTL={isRTL} />
                          </p>
                          <span
                            className="text-xs px-2 py-1 rounded-full font-semibold shrink-0"
                            style={outOfStock ? { backgroundColor: '#fee2e2', color: '#991b1b' } : { color: badgeColor, backgroundColor: badgeBg }}
                          >
                            {outOfStock ? (isRTL ? 'نفد المخزون' : 'Out of stock') : (isRTL ? 'عرض' : 'View')}
                          </span>
                        </div>
                        <div className={`mt-2 flex items-center gap-1.5 ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <StarRating
                            value={product?.rating_summary?.average_rating || 0}
                            accentColor={reviewAccent}
                            sizeClass="w-3.5 h-3.5"
                          />
                          {(product?.rating_summary?.total_reviews || 0) > 0 ? (
                            <span className="text-xs text-gray-500">
                              {Number(product.rating_summary.average_rating || 0).toFixed(1)} ({product.rating_summary.total_reviews})
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">{isRTL ? 'لا توجد تقييمات بعد' : 'No reviews yet'}</span>
                          )}
                        </div>
                      </div>
                    </Link>
                  );
                }

                return (
                  <Link
                    key={product.product_id}
                    to={storeSlug ? buildStorefrontPath(normalizedStoreSlug, `product/${product.product_id}`) : `/product/${product.product_id}`}
                    onClick={saveScrollPosition}
                    state={{ fromStorefront: true, storeSlug: normalizedStoreSlug }}
                    className="text-left w-full border rounded-xl overflow-hidden shadow-sm transition hover:shadow-md focus:outline-none focus:ring-2 focus:ring-storelaunch-green"
                    style={{ backgroundColor: cardBg, borderColor: cardBorder }}
                  >
                    <div className="relative aspect-[4/3] sm:aspect-square bg-gray-100 flex items-center justify-center">
                      {outOfStock && (
                        <span className="absolute top-2 left-2 z-10 rounded-full bg-red-600 px-2 py-1 text-[11px] font-semibold text-white shadow">
                          {isRTL ? 'غير متوفر' : 'Out of stock'}
                        </span>
                      )}
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.product_name}
                          className="w-full h-full object-cover motion-safe:hover:scale-[1.02] motion-reduce:hover:scale-100 transition-transform duration-200 motion-reduce:transition-none"
                        />
                      ) : (
                        <svg className="w-20 h-20 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                      )}
                    </div>
                    <div className="p-3 sm:p-4 flex-1 min-w-0">
                      <p className={`font-semibold text-sm sm:text-base line-clamp-2 sm:line-clamp-1 ${isRTL ? 'text-right' : 'text-left'}`} style={{ color: textColor }}>
                        {product.product_name}
                      </p>
                      {product.category && (
                        <p className={`text-xs mt-1 opacity-80 ${isRTL ? 'text-right' : 'text-left'}`} style={{ color: subColor }}>
                          {product.category}
                        </p>
                      )}
                      <div className={`mt-2 flex items-center justify-between gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <p className="font-bold" style={{ color: accentColor }}>
                          <CurrencyAmount value={product.price} isRTL={isRTL} />
                        </p>
                        <span
                          className="text-xs px-2 py-1 rounded-full font-semibold shrink-0"
                          style={outOfStock ? { color: '#991b1b', backgroundColor: '#fee2e2' } : { color: badgeColor, backgroundColor: badgeBg }}
                        >
                          {outOfStock ? (isRTL ? 'نفد المخزون' : 'Out of stock') : (isRTL ? 'عرض' : 'View')}
                        </span>
                      </div>
                      <div className={`mt-2 flex items-center gap-1.5 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <StarRating
                          value={product?.rating_summary?.average_rating || 0}
                          accentColor={reviewAccent}
                          sizeClass="w-3.5 h-3.5"
                        />
                        {(product?.rating_summary?.total_reviews || 0) > 0 ? (
                          <span className="text-xs text-gray-500">
                            {Number(product.rating_summary.average_rating || 0).toFixed(1)} ({product.rating_summary.total_reviews})
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">{isRTL ? 'لا توجد تقييمات بعد' : 'No reviews yet'}</span>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>

            {}
            {hasMore && (
              <div ref={observerTarget} className="py-8 flex justify-center">
                {loadingMore && (
                  <div className="flex items-center gap-2 text-storelaunch-green">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-storelaunch-green"></div>
                    <span className="text-sm font-medium">{t('storefront.loadingMore')}</span>
                  </div>
                )}
              </div>
            )}

            {}
            {!hasMore && products.length > 0 && (
              <div className="py-8 text-center text-sm text-gray-500">
                {t('storefront.endOfResults')}
              </div>
            )}
          </>
        )}

        {(loadingStoreReviews || storeReviews.length > 0) ? (
          <section
            className="mt-8 sm:mt-12 rounded-2xl sm:rounded-3xl border p-4 sm:p-6 md:p-8 overflow-hidden"
            style={{ backgroundColor: reviewBg, borderColor: `${reviewAccent}33` }}
          >
            <div className={`flex items-center justify-between mb-6 gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className={`${isRTL ? 'text-right md:ml-auto' : 'text-left'}`}>
                <h2 className="text-3xl font-bold" style={{ color: storeBranding.text }}>
                  {isRTL ? 'ماذا يقول عملاؤنا' : 'What Our Customers Say'}
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  {isRTL ? 'آراء حقيقية من متسوقين في المتجر' : 'Real feedback from recent shoppers'}
                </p>
              </div>
              <div className={`hidden md:flex items-center gap-2 shrink-0 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <button
                  type="button"
                  aria-label={isRTL ? 'السابق' : 'Previous testimonials'}
                  onClick={() => reviewsScrollerRef.current?.scrollBy({ left: isRTL ? 320 : -320, behavior: 'smooth' })}
                  className="w-10 h-10 rounded-full bg-white border border-gray-200 text-gray-700"
                >
                  {isRTL ? '>' : '<'}
                </button>
                <button
                  type="button"
                  aria-label={isRTL ? 'التالي' : 'Next testimonials'}
                  onClick={() => reviewsScrollerRef.current?.scrollBy({ left: isRTL ? -320 : 320, behavior: 'smooth' })}
                  className="w-10 h-10 rounded-full text-white"
                  style={{ backgroundColor: reviewAccent }}
                >
                  {isRTL ? '<' : '>'}
                </button>
              </div>
            </div>
            {loadingStoreReviews ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[0, 1, 2].map((i) => <div key={i} className="h-44 rounded-2xl bg-white/70 animate-pulse" />)}
              </div>
            ) : (
              <div
                ref={reviewsScrollerRef}
                className="-mx-1 flex gap-3 sm:gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth motion-reduce:scroll-auto px-1 pb-2"
              >
                {storeReviews.map((review) => (
                  <div key={review.review_id} className="min-w-[85%] md:min-w-[31%] snap-start">
                    <ReviewCard
                      review={review}
                      isRTL={isRTL}
                      accentColor={reviewAccent}
                      textColor={storeBranding.text}
                      backgroundColor="#fff"
                    />
                  </div>
                ))}
              </div>
            )}
          </section>
        ) : null}
      </div>
      {store && storeStatus === 'ok' ? (
        <StorefrontFooter storeInfo={store} branding={storeBranding} isRTL={isRTL} />
      ) : null}
    </div>
  );
};

export default StorefrontPage;
