

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useSearchParams, useLocation, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import StorefrontHeader from '../components/StorefrontHeader';
import axiosInstance from '../api/axios';

const StorefrontPage = () => {
  const { t, i18n } = useTranslation();
  const { storeSlug } = useParams(); 
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const isRTL = i18n.language === 'ar';

  
  const [store, setStore] = useState(null);
  const [storeStatus, setStoreStatus] = useState(storeSlug ? 'loading' : 'ok');
  const [storeRetry, setStoreRetry] = useState(0);
  

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [hasMore, setHasMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);

  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');
  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    category: searchParams.get('category') || '',
    minPrice: searchParams.get('minPrice') || '',
    maxPrice: searchParams.get('maxPrice') || '',
    sort: searchParams.get('sort') || 'newest'
  });

  const observerTarget = useRef(null);
  const scrollPositionKey = 'storefront_scroll_position';

  useEffect(() => {
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = i18n.language;
  }, [i18n.language, isRTL]);


  useEffect(() => {
    if (!storeSlug) return;
    setStoreStatus('loading');
    const BLOCKED = ['Suspended', 'Blocked', 'Inactive'];
    axiosInstance.get(`/api/stores/${encodeURIComponent(storeSlug.trim().toLowerCase())}`)
      .then(({ data }) => {
        if (data.store) {
          if (BLOCKED.includes(data.store.status)) {
            setStoreStatus('inactive');
          } else {
            setStore(data.store);
            setStoreStatus('ok');
          }
        } else {
          setStoreStatus('not_found');
        }
      })
      .catch((err) => {
        if (err.response?.status === 404) {
          setStoreStatus('not_found');
        } else {
         
          setStoreStatus('error');
        }
      });
  }, [storeSlug, storeRetry]);

  useEffect(() => {
   
    if (storeSlug && (storeStatus === 'loading' || storeStatus !== 'ok')) return;
    fetchCategories();
  }, [storeStatus]);

 
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
    setCurrentPage(1);
    setProducts([]);
    fetchProducts(1, true);
  }, [searchParams, storeStatus]);

  
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
      setCategories(data.categories || []);
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
      
      if (reset) {
        setProducts(data.products || []);
      } else {
        setProducts(prev => [...prev, ...(data.products || [])]);
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

  const handleSearch = (e) => {
    e.preventDefault();
    applyFilters({ ...filters, search: searchInput });
  };

  const applyFilters = (newFilters) => {
    const params = new URLSearchParams();
    if (newFilters.search) params.set('search', newFilters.search);
    if (newFilters.category) params.set('category', newFilters.category);
    if (newFilters.minPrice) params.set('minPrice', newFilters.minPrice);
    if (newFilters.maxPrice) params.set('maxPrice', newFilters.maxPrice);
    if (newFilters.sort) params.set('sort', newFilters.sort);
    
    setFilters(newFilters);
    setSearchParams(params);
  };

  const removeFilter = (filterKey) => {
    const newFilters = { ...filters, [filterKey]: '' };
    if (filterKey === 'search') {
      setSearchInput('');
    }
    applyFilters(newFilters);
  };

  const clearAllFilters = () => {
    setSearchInput('');
    setFilters({
      search: '',
      category: '',
      minPrice: '',
      maxPrice: '',
      sort: 'newest'
    });
    setSearchParams({});
  };

  const hasActiveFilters = () => {
    return filters.search || filters.category || filters.minPrice || filters.maxPrice;
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat(isRTL ? 'ar-SA' : 'en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(price);
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
            onClick={() => { setStore(null); setStoreRetry(n => n + 1); }}
            className="px-6 py-2 bg-storelaunch-green text-white rounded-lg font-medium hover:bg-storelaunch-deep-green transition-colors text-sm"
          >
            {isRTL ? 'إعادة المحاولة' : 'Retry'}
          </button>
        </div>
      </div>
    );
  }


  if (storeSlug && storeStatus === 'not_found') {
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
            {isRTL ? 'هذا المتجر موقوف مؤقتاً أو غير نشط.' : 'This store is currently suspended or inactive.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" dir={isRTL ? 'rtl' : 'ltr'}>
      <StorefrontHeader storeSlug={storeSlug} />

      
      <div className="sticky top-14 md:top-16 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        
          <form onSubmit={handleSearch} className="mb-3">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder={t('storefront.searchPlaceholder')}
                  className={`w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-storelaunch-green focus:border-transparent ${isRTL ? 'text-right' : 'text-left'}`}
                />
                <button
                  type="submit"
                  className={`absolute top-1/2 -translate-y-1/2 ${isRTL ? 'left-3' : 'right-3'} text-gray-400 hover:text-storelaunch-green`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
              </div>
            </div>
          </form>

         
          <div className={`flex flex-wrap gap-2 items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
            
            <select
              value={filters.category}
              onChange={(e) => applyFilters({ ...filters, category: e.target.value })}
              className={`px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-storelaunch-green focus:border-transparent ${isRTL ? 'text-right' : 'text-left'}`}
            >
              <option value="">{t('storefront.allCategories')}</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

           
            <input
              type="number"
              value={filters.minPrice}
              onChange={(e) => applyFilters({ ...filters, minPrice: e.target.value })}
              placeholder={t('storefront.minPrice')}
              min="0"
              className={`w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-storelaunch-green focus:border-transparent ${isRTL ? 'text-right' : 'text-left'}`}
            />
            <span className="text-gray-400">-</span>
            <input
              type="number"
              value={filters.maxPrice}
              onChange={(e) => applyFilters({ ...filters, maxPrice: e.target.value })}
              placeholder={t('storefront.maxPrice')}
              min="0"
              className={`w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-storelaunch-green focus:border-transparent ${isRTL ? 'text-right' : 'text-left'}`}
            />

           
            <select
              value={filters.sort}
              onChange={(e) => applyFilters({ ...filters, sort: e.target.value })}
              className={`px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-storelaunch-green focus:border-transparent ${isRTL ? 'text-right' : 'text-left'}`}
            >
              <option value="newest">{t('storefront.newest')}</option>
              <option value="price_asc">{t('storefront.priceAsc')}</option>
              <option value="price_desc">{t('storefront.priceDesc')}</option>
              <option value="name_asc">{t('storefront.nameAsc')}</option>
              <option value="name_desc">{t('storefront.nameDesc')}</option>
            </select>

            
            {hasActiveFilters() && (
              <button
                onClick={clearAllFilters}
                className="px-3 py-2 text-sm text-storelaunch-green hover:text-storelaunch-deep-green font-medium"
              >
                {t('storefront.clearFilters')}
              </button>
            )}
          </div>

          
          {hasActiveFilters() && (
            <div className={`flex flex-wrap gap-2 mt-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
              {filters.search && (
                <div className="inline-flex items-center gap-1 px-3 py-1 bg-storelaunch-green/10 text-storelaunch-green rounded-full text-sm">
                  <span>{t('storefront.search')}: {filters.search}</span>
                  <button
                    onClick={() => removeFilter('search')}
                    className="hover:text-storelaunch-deep-green"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}
              {filters.category && (
                <div className="inline-flex items-center gap-1 px-3 py-1 bg-storelaunch-green/10 text-storelaunch-green rounded-full text-sm">
                  <span>{filters.category}</span>
                  <button
                    onClick={() => removeFilter('category')}
                    className="hover:text-storelaunch-deep-green"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}
              {(filters.minPrice || filters.maxPrice) && (
                <div className="inline-flex items-center gap-1 px-3 py-1 bg-storelaunch-green/10 text-storelaunch-green rounded-full text-sm">
                  <span>
                    {filters.minPrice || '0'} - {filters.maxPrice || '∞'} {t('storefront.sar')}
                  </span>
                  <button
                    onClick={() => {
                      const newFilters = { ...filters, minPrice: '', maxPrice: '' };
                      applyFilters(newFilters);
                    }}
                    className="hover:text-storelaunch-deep-green"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Results Count */}
        {!loading && products.length > 0 && (
          <div className={`mb-4 text-sm text-gray-600 ${isRTL ? 'text-right' : 'text-left'}`}>
            {t('storefront.showingResults', { count: totalProducts })}
          </div>
        )}

        {/* Loading State (Initial) */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <ProductSkeleton key={i} />
            ))}
          </div>
        ) : error ? (
          /* Error State */
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
          /* Empty State */
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <svg className="w-20 h-20 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <h3 className="text-2xl font-bold text-storelaunch-dark mb-2">{t('storefront.noResults')}</h3>
            <p className="text-gray-600 mb-6 text-lg">{t('storefront.noResultsDesc')}</p>
            {hasActiveFilters() && (
              <button
                onClick={clearAllFilters}
                className="px-6 py-3 bg-storelaunch-green text-white rounded-lg font-medium hover:bg-storelaunch-deep-green transition-colors"
              >
                {t('storefront.clearFilters')}
              </button>
            )}
          </div>
        ) : (
          /* Product Grid */
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map((product) => (
                <Link
                  key={product.product_id}
                  to={storeSlug ? `/${storeSlug}/customer/product/${product.product_id}` : `/shop/product/${product.product_id}`}
                  onClick={saveScrollPosition}
                  state={{ fromStorefront: true, storeSlug }}
                  className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg hover:border-storelaunch-green/30 transition-all duration-200"
                >
                  <div className="aspect-square bg-gray-100 flex items-center justify-center overflow-hidden">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.product_name}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
                      />
                    ) : (
                      <svg className="w-20 h-20 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className={`font-semibold text-storelaunch-dark mb-1 line-clamp-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                      {product.product_name}
                    </h3>
                    {product.category && (
                      <p className={`text-xs text-gray-500 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                        {product.category}
                      </p>
                    )}
                    <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <span className="text-lg font-bold text-storelaunch-green">
                        {formatPrice(product.price)} {t('storefront.sar')}
                      </span>
                      <span className="text-sm text-storelaunch-green font-medium group-hover:translate-x-1 transition-transform">
                        →
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Infinite Scroll Trigger & Loading More */}
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

            {/* End of Results */}
            {!hasMore && products.length > 0 && (
              <div className="py-8 text-center text-sm text-gray-500">
                {t('storefront.endOfResults')}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default StorefrontPage;
