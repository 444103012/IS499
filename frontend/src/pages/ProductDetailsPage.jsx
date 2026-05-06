








import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useParams, useLocation } from '../router';
import { useTranslation } from 'react-i18next';
import StorefrontHeader from '../components/StorefrontHeader';
import StorefrontFooter from '../components/storefront/StorefrontFooter';
import axiosInstance from '../api/axios';
import { useCart } from '../context/cart/CartContext';
import { buildStorefrontPath, normalizeStoreName } from '../utils/storefrontRoutes';
import useStoreBranding from '../hooks/useStoreBranding';
import { formatLocalizedNumber } from '../utils/currency';
import CurrencyAmount from '../components/common/CurrencyAmount';
import StarRating from '../components/reviews/StarRating';
import ReviewCard from '../components/reviews/ReviewCard';

const API_BASE = process.env.REACT_APP_API_URL || '';
const toImageUrl = (path) => (path && !path.startsWith('http') ? `${API_BASE.replace(/\/$/, '')}/${path.replace(/^\//, '')}` : path);
const getVariantImage = (variant) => (
  (Array.isArray(variant?.images) && variant.images.length > 0 ? variant.images[0] : null)
  || variant?.images?.[0]?.url
  || variant?.image_url
  || variant?.imageUrl
  || variant?.image
  || variant?.option_image
  || variant?.optionImage
  || variant?.media?.primary?.url
  || variant?.media?.url
  || variant?.thumbnail
  || null
);

const ProductDetailsPage = () => {
  const { t, i18n } = useTranslation();
  const { id, storeSlug } = useParams();
  const location = useLocation();
  const normalizedStoreSlug = normalizeStoreName(storeSlug);
  const { storeInfo, branding } = useStoreBranding(normalizedStoreSlug);
  const isRTL = i18n.language === 'ar';
  const { addItem } = useCart();

  const catalogLink = storeSlug ? buildStorefrontPath(normalizedStoreSlug) : '/';

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedVariantId, setSelectedVariantId] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [addError, setAddError] = useState('');
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [reviewsPage, setReviewsPage] = useState(1);
  const [reviewsHasMore, setReviewsHasMore] = useState(false);

  const getTotalStock = (options) => {
    if (!options || options.length === 0) return null;
    return options.reduce((sum, opt) => sum + (opt.stock_qty || 0), 0);
  };

  const normalizedVariants = useMemo(() => {
    if (!product?.options?.length) return [];
    return product.options.map((option) => ({
      ...option,
      variantId: option.option_id,
      image: getVariantImage(option),
      stock: option.stock_qty ?? option.stock ?? 0,
    }));
  }, [product]);

  const variantById = useMemo(
    () => new Map(normalizedVariants.map((variant) => [variant.variantId, variant])),
    [normalizedVariants]
  );

  const selectedVariant = useMemo(() => {
    if (!normalizedVariants.length || selectedVariantId == null) return null;
    return variantById.get(selectedVariantId) || null;
  }, [normalizedVariants, selectedVariantId, variantById]);

  const effectivePrice = useMemo(() => {
    if (!product) return 0;
    const basePrice = parseFloat(product.price) || 0;
    if (!selectedVariant) return basePrice;
    if (selectedVariant.price != null) return parseFloat(selectedVariant.price);
    const priceDelta = selectedVariant.priceDelta ?? selectedVariant.additional_price;
    if (priceDelta != null) return basePrice + parseFloat(priceDelta);
    return basePrice;
  }, [product, selectedVariant]);

  const availableStock = useMemo(() => {
    if (!product) return 0;
    if (selectedVariant != null) return selectedVariant.stock;
    const total = getTotalStock(product.options);
    if (total != null) return total;
    // No options rows — use the product-level total_stock the API returns.
    // If the field is absent (truly unlimited / no stock tracking), treat as unlimited.
    if (product.total_stock != null) return Number(product.total_stock);
    return 999999;
  }, [product, selectedVariant]);

  const isInStock = availableStock > 0;
  const canIncrease = isInStock && quantity < availableStock;
  const maxSelectableQuantity = Math.max(1, availableStock);
  const canAdd = availableStock > 0 && !(product?.options?.length && !selectedVariantId) && quantity <= availableStock;

  useEffect(() => {
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = i18n.language;
  }, [i18n.language, isRTL]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    setReviewsLoading(true);

    Promise.all([
      axiosInstance.get(`/api/products/${id}`),
      axiosInstance.get(`/api/products/${id}/reviews?page=1&limit=8`),
    ]).then(([productRes, reviewsRes]) => {
      if (cancelled) return;
      setProduct(productRes.data.product);
      setReviews(reviewsRes.data?.reviews || []);
      setReviewsPage(1);
      setReviewsHasMore(Boolean(reviewsRes.data?.has_more));
    }).catch((err) => {
      if (cancelled) return;
      if (err.response?.status === 404) {
        setError(t('storefront.productNotFound'));
      } else {
        setError(t('storefront.error'));
      }
      setReviews([]);
    }).finally(() => {
      if (cancelled) return;
      setLoading(false);
      setReviewsLoading(false);
    });

    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => {
    if (!normalizedVariants.length) {
      setSelectedVariantId(null);
      return;
    }

    const params = new URLSearchParams(location.search);
    const requestedVariant = Number(
      params.get('variantId') || params.get('variant') || params.get('optionId') || ''
    );

    const hasRequested = Number.isFinite(requestedVariant) && variantById.has(requestedVariant);
    const defaultVariant = hasRequested
      ? variantById.get(requestedVariant)
      : normalizedVariants.find((variant) => variant.stock > 0) || normalizedVariants[0];

    setSelectedVariantId(defaultVariant?.variantId ?? null);
  }, [location.search, normalizedVariants, variantById]);

  useEffect(() => {
    if (!product) return;
    if (availableStock > 0 && availableStock < 999999 && quantity > availableStock) {
      setQuantity(availableStock);
    } else if (availableStock <= 0 && quantity !== 1) {
      setQuantity(1);
    }
  }, [availableStock, selectedVariantId, product]);

  const handleSelectVariant = useCallback((variantId) => {
    const variant = variantById.get(variantId);
    if (!variant) return;
    setSelectedVariantId(variantId);
    setAddError('');
    setQuantity(1);
  }, [variantById]);

  const formatPrice = (price) => formatLocalizedNumber(price, isRTL ? 'ar-SA' : 'en-US');

  const hasVariants = Boolean(product?.options?.length);
  const ratingSummary = product?.rating_summary || { average_rating: 0, total_reviews: 0 };
  const reviewAccent = branding.buttons || '#6366F1';
  const fallbackImages = Array.isArray(product?.images) && product.images.length > 0 ? product.images : [];
  const variantThumbnails = useMemo(() => {
    if (!normalizedVariants.length) return [];
    const seen = new Set();
    return normalizedVariants.filter((variant) => {
      const key = `${variant.variantId}-${variant.image || 'fallback'}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [normalizedVariants]);
  const mainImageUrl = selectedVariant?.image || fallbackImages[0] || product?.image_url || null;

  const uniqueGalleryUrls = useMemo(() => {
    if (!product) return [];
    const raw = Array.isArray(product.images) ? product.images : [];
    const urls = raw.map((u) => toImageUrl(u)).filter(Boolean);
    const seen = new Set();
    const out = [];
    for (const u of urls) {
      if (seen.has(u)) continue;
      seen.add(u);
      out.push(u);
    }
    const hero = toImageUrl(product.image_url);
    if (hero && !seen.has(hero)) out.unshift(hero);
    return out;
  }, [product]);

  const showMobileImageCarousel = !hasVariants && uniqueGalleryUrls.length > 1;

  if (loading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: branding.background }} dir={isRTL ? 'rtl' : 'ltr'}>
        <StorefrontHeader storeSlug={normalizedStoreSlug} storeInfo={storeInfo} branding={branding} />
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-8 sm:py-12">
          <div className="flex items-center justify-center py-16 sm:py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-storelaunch-green mx-auto mb-4"></div>
              <p className="text-gray-600">{t('storefront.loading')}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || product == null) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: branding.background }} dir={isRTL ? 'rtl' : 'ltr'}>
        <StorefrontHeader storeSlug={normalizedStoreSlug} storeInfo={storeInfo} branding={branding} />
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-8 sm:py-12">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 sm:p-12 text-center">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-xl font-bold text-storelaunch-dark mb-2">
              {error || t('storefront.productNotAvailable')}
            </h3>
            <Link
              to={catalogLink}
              className="inline-block mt-6 px-6 py-3 bg-storelaunch-green text-white rounded-lg font-medium hover:bg-storelaunch-deep-green transition-colors"
            >
              {t('storefront.backToCatalog')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ backgroundColor: branding.background }} dir={isRTL ? 'rtl' : 'ltr'}>
      <StorefrontHeader storeSlug={normalizedStoreSlug} storeInfo={storeInfo} branding={branding} />

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 pb-[calc(6.5rem+env(safe-area-inset-bottom,0px))] lg:pb-8">
        {}
        <div className={`mb-4 sm:mb-6 ${isRTL ? 'text-right' : 'text-left'}`}>
          <Link
            to={catalogLink}
            state={{ fromDetails: true }}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-lg py-1 font-medium text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-storelaunch-green focus:ring-offset-1"
            style={{ color: branding.buttons }}
          >
            <svg className={`h-4 w-4 shrink-0 ${isRTL ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {t('storefront.backToCatalog')}
          </Link>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 p-4 sm:p-6 md:p-8">
            {}
            <div className="space-y-3 min-w-0">
              {showMobileImageCarousel ? (
                <>
                  <div className="md:hidden">
                    <p className="sr-only">{isRTL ? 'معرض الصور، مرّر للتنقل' : 'Image gallery, swipe to browse'}</p>
                    <div
                      className="-mx-0.5 flex h-72 snap-x snap-mandatory overflow-x-auto scroll-smooth motion-reduce:scroll-auto rounded-xl border border-gray-100"
                      style={{ WebkitOverflowScrolling: 'touch' }}
                    >
                      {uniqueGalleryUrls.map((url, idx) => (
                        <div
                          key={`${url}-${idx}`}
                          className="min-w-full shrink-0 snap-center h-72 bg-gray-100"
                        >
                          <img
                            src={url}
                            alt={`${product.product_name} — ${isRTL ? 'صورة' : 'image'} ${idx + 1}`}
                            className="h-full w-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                    <div className={`mt-2 flex items-center gap-1.5 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      {uniqueGalleryUrls.map((url, idx) => (
                        <span key={`${url}-dot-${idx}`} className="h-1.5 w-1.5 rounded-full bg-gray-300" />
                      ))}
                    </div>
                  </div>
                  <div className="hidden md:block aspect-square bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                    {mainImageUrl ? (
                      <img
                        src={toImageUrl(mainImageUrl)}
                        alt={`${product.product_name}${selectedVariant ? ` - ${selectedVariant.option_name}: ${selectedVariant.option_value}` : ''}`}
                        className="h-full w-full object-cover transition-opacity duration-200 motion-reduce:transition-none"
                      />
                    ) : (
                      <svg className="w-32 h-32 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    )}
                  </div>
                </>
              ) : (
                <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                  {mainImageUrl ? (
                    <img
                      src={toImageUrl(mainImageUrl)}
                      alt={`${product.product_name}${selectedVariant ? ` - ${selectedVariant.option_name}: ${selectedVariant.option_value}` : ''}`}
                      className="w-full h-full object-cover transition-opacity duration-200 motion-reduce:transition-none"
                    />
                  ) : (
                    <svg className="w-32 h-32 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  )}
                </div>
              )}
              {variantThumbnails.length > 0 && (
                <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 scroll-smooth motion-reduce:scroll-auto" role="listbox" aria-label={isRTL ? 'صور الخيارات' : 'Variant image thumbnails'}>
                  {variantThumbnails.map((variant) => (
                    <button
                      key={variant.variantId}
                      type="button"
                      onClick={() => handleSelectVariant(variant.variantId)}
                      disabled={variant.stock <= 0}
                      aria-label={`${variant.option_name}: ${variant.option_value}`}
                      aria-pressed={selectedVariantId === variant.variantId}
                      className={`h-16 w-16 min-h-[44px] min-w-[44px] sm:h-16 sm:w-16 sm:min-h-0 sm:min-w-0 rounded-lg overflow-hidden border-2 shrink-0 focus:outline-none focus:ring-2 focus:ring-storelaunch-green transition-opacity ${
                        selectedVariantId === variant.variantId ? 'border-storelaunch-green shadow-sm' : 'border-gray-200'
                      } ${variant.stock <= 0 ? 'opacity-40' : 'hover:border-storelaunch-green/70'}`}
                      role="option"
                      aria-selected={selectedVariantId === variant.variantId}
                    >
                      {variant.image ? (
                        <img src={toImageUrl(variant.image)} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gray-100 flex items-center justify-center text-xs text-gray-400">
                          N/A
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {}
            <div className={`min-w-0 lg:pb-0 ${isRTL ? 'text-right' : 'text-left'}`}>
              <h1 className="text-xl sm:text-2xl font-bold mb-2 leading-tight" style={{ color: branding.text }}>
                {product.product_name}
              </h1>

              {product.title && product.title !== product.product_name && (
                <p className="text-lg text-gray-600 mb-4">{product.title}</p>
              )}

              {product.category && (
                <div className="mb-4">
                  <span
                    className="inline-block px-3 py-1 text-sm font-medium rounded-full"
                    style={{ backgroundColor: `${branding.buttons}1A`, color: branding.buttons }}
                  >
                    {product.category}
                  </span>
                </div>
              )}

              {!isInStock && (
                <div className={`mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 ${isRTL ? 'text-right' : 'text-left'}`}>
                  <p className="font-semibold">{isRTL ? 'نفد المخزون' : 'Out of stock'}</p>
                  <p className="text-sm">{isRTL ? 'لا يمكن إضافة هذا المنتج إلى السلة حالياً.' : 'This product cannot be added to the cart right now.'}</p>
                </div>
              )}

              <div className="mb-6">
                <div className={`flex items-baseline gap-2 mb-2 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
                  <span className="text-sm font-medium text-gray-600">{t('storefront.price')}:</span>
                  <span className="text-2xl font-bold" style={{ color: branding.priceLabels || branding.buttons }}>
                    <CurrencyAmount value={effectivePrice} isRTL={isRTL} size="2xl" />
                  </span>
                </div>
                <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
                  <StarRating
                    value={ratingSummary.average_rating || 0}
                    accentColor={reviewAccent}
                    sizeClass="w-4 h-4"
                    ariaLabel={isRTL ? 'تقييم المنتج' : 'Product rating'}
                  />
                  {(ratingSummary.total_reviews || 0) > 0 ? (
                    <span className="text-sm text-gray-600">
                      {Number(ratingSummary.average_rating || 0).toFixed(1)} ({ratingSummary.total_reviews} {isRTL ? 'تقييم' : 'reviews'})
                    </span>
                  ) : (
                    <span className="text-sm text-gray-400">{isRTL ? 'لا توجد تقييمات بعد' : 'No reviews yet'}</span>
                  )}
                </div>
              </div>

              {}
              <div className="mb-6 pb-6 border-b border-gray-200">
                <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
                  <span className="text-sm font-medium text-gray-600">{t('storefront.availability')}:</span>
                  {isInStock ? (
                    <span className="flex items-center gap-1 font-medium" style={{ color: branding.priceLabels || branding.buttons }}>
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      {t('storefront.inStock')}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-red-600 font-medium">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      {t('storefront.outOfStock')}
                    </span>
                  )}
                </div>
              </div>

              {}
              {hasVariants && (
                <div className="mb-6">
                  <h3 className="text-lg font-bold mb-3" style={{ color: branding.text }}>{t('storefront.options')}</h3>
                  <div className={`flex flex-wrap gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    {normalizedVariants.map((opt) => (
                      <button
                        key={opt.variantId}
                        type="button"
                        onClick={() => handleSelectVariant(opt.variantId)}
                        disabled={opt.stock <= 0}
                        aria-pressed={selectedVariantId === opt.variantId}
                        className={`min-h-[44px] min-w-[44px] rounded-lg px-3 py-2.5 text-sm font-medium transition-all sm:px-4 sm:py-2 ${
                          selectedVariantId === opt.variantId ? 'cart-variant-selected' : 'border-gray-200 hover:border-storelaunch-green'
                        } ${opt.stock <= 0 ? 'opacity-40 line-through' : ''}`}
                        style={{
                          borderWidth: 2,
                          borderColor: selectedVariantId === opt.variantId ? 'var(--brand-green)' : undefined,
                          backgroundColor: selectedVariantId === opt.variantId ? `${branding.buttons}1A` : undefined,
                          color: selectedVariantId === opt.variantId ? branding.buttons : undefined,
                        }}
                      >
                        {opt.option_name}: {opt.option_value}
                        {opt.additional_price > 0 ? (
                          <>
                            {' (+'}
                            <CurrencyAmount value={opt.additional_price} isRTL={isRTL} />
                            {')'}
                          </>
                        ) : null}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {}
              <div className="mb-6 hidden lg:block">
                <label className="block text-sm font-medium text-gray-600 mb-2">{isRTL ? 'الكمية' : 'Quantity'}</label>
                <div className={`flex items-center gap-4 flex-wrap ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.max(1, Math.min(availableStock, (q || 1) - 1)))}
                      disabled={!isInStock || quantity <= 1}
                      className="min-h-[48px] min-w-[48px] px-2 bg-gray-100 text-lg font-medium hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed sm:min-h-0 sm:min-w-0 sm:px-3 sm:py-2 sm:text-base"
                    >
                      −
                    </button>
                    <input
                      id="product-qty-input"
                      type="number"
                      min={1}
                      max={maxSelectableQuantity}
                      value={quantity}
                      disabled={!isInStock}
                      onChange={(e) => {
                        const v = parseInt(e.target.value, 10);
                        if (!Number.isNaN(v)) setQuantity(Math.max(1, Math.min(maxSelectableQuantity, v)));
                      }}
                      className="w-16 min-w-[3.5rem] text-center text-base border-0 border-x border-gray-300 py-2 focus:ring-2 focus:ring-storelaunch-green focus:ring-inset disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                    />
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.min(availableStock, (q || 1) + 1))}
                      disabled={!canIncrease}
                      className="min-h-[48px] min-w-[48px] px-2 bg-gray-100 text-lg font-medium hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed sm:min-h-0 sm:min-w-0 sm:px-3 sm:py-2 sm:text-base"
                    >
                      +
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      setAddError('');
                      if (hasVariants && !selectedVariantId) {
                        setAddError(isRTL ? 'اختر صنفاً' : 'Please select a variant');
                        return;
                      }
                      if (!canAdd) {
                        setAddError(!isInStock
                          ? (isRTL ? 'هذا المنتج غير متوفر حالياً' : 'This product is out of stock')
                          : (isRTL ? 'الكمية تتجاوز المتوفر' : 'Quantity exceeds available stock'));
                        return;
                      }
                      const mainImg = selectedVariant?.image || fallbackImages[0] || product.image_url;
                      try {
                        await addItem({
                          productId: id,
                          variantId: selectedVariantId || undefined,
                          quantity,
                          title: product.product_name,
                          image: mainImg,
                          options: selectedVariant ? [{ option_name: selectedVariant.option_name, option_value: selectedVariant.option_value }] : null,
                          unitPrice: effectivePrice,
                        });
                      } catch (err) {
                        const data = err.response?.data;
                        if (err.response?.status === 409 && typeof data?.available === 'number') {
                          setQuantity(data.available);
                          setAddError(isRTL ? `الكمية غير متوفرة. المتاح الآن: ${data.available}` : `Quantity not available. Available now: ${data.available}`);
                        } else if (err.message === 'OUT_OF_STOCK') {
                          setAddError(isRTL ? 'الكمية المطلوبة غير متوفرة' : 'Requested quantity not in stock');
                        } else {
                          setAddError(data?.error || (isRTL ? 'فشل الإضافة للسلة' : 'Failed to add to cart'));
                        }
                      }
                    }}
                    disabled={!canAdd}
                    className="cart-btn-primary w-full min-h-[52px] px-6 py-3 text-base font-medium disabled:opacity-50 disabled:cursor-not-allowed sm:min-h-0 sm:w-auto"
                  >
                    {availableStock === 0 ? (isRTL ? 'غير متوفر' : 'Out of stock') : (isRTL ? 'أضف إلى السلة' : 'Add to Cart')}
                  </button>
                </div>
              </div>

              {}
              {product.description && (
                <div className="mb-6">
                  <h3 className="text-lg font-bold mb-2" style={{ color: branding.text }}>
                    {t('storefront.description')}
                  </h3>
                  <p className="text-gray-800 text-base leading-relaxed whitespace-pre-line break-words">
                    {product.description}
                  </p>
                </div>
              )}

              {}
              {product.options && product.options.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-bold mb-3" style={{ color: branding.text }}>
                    {t('storefront.options')}
                  </h3>
                  <div className="space-y-2">
                    {product.options.map((option) => (
                      <div
                        key={option.option_id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className={isRTL ? 'text-right' : 'text-left'}>
                          <span className="font-medium" style={{ color: branding.text }}>
                            {option.option_name}: {option.option_value}
                          </span>
                          {option.additional_price > 0 && (
                            <span className="text-sm text-gray-600 ml-2">
                              (+<CurrencyAmount value={option.additional_price} isRTL={isRTL} />)
                            </span>
                          )}
                        </div>
                        <span
                          className={`text-sm ${option.stock_qty > 0 ? '' : 'text-red-600'}`}
                          style={option.stock_qty > 0 ? { color: branding.priceLabels || branding.buttons } : undefined}
                        >
                          {option.stock_qty > 0 ? `${option.stock_qty} ${isRTL ? 'متوفر' : 'available'}` : (isRTL ? 'غير متوفر' : 'Out of stock')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {}
              {product.store_name && (
                <div className="pt-6 border-t border-gray-200">
                  <div className={`flex items-center gap-2 text-sm text-gray-600 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                    <span>{t('storefront.store')}: <strong>{product.store_name}</strong></span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <section
          className="mt-6 sm:mt-8 rounded-2xl sm:rounded-3xl border p-4 sm:p-6 md:p-8"
          style={{ backgroundColor: `${reviewAccent}0D`, borderColor: `${reviewAccent}33` }}
        >
          <div className={`mb-4 sm:mb-5 ${isRTL ? 'text-right' : 'text-left'}`}>
            <h2 className="text-2xl sm:text-3xl font-bold leading-tight" style={{ color: branding.text }}>
              {isRTL ? 'ماذا يقول العملاء عن هذا المنتج' : 'What Customers Say'}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {isRTL ? 'تقييمات موثقة من عملاء اشتروا المنتج' : 'Verified feedback from customers who bought this product'}
            </p>
          </div>

          {reviewsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {[0, 1, 2].map((i) => <div key={i} className="h-48 rounded-2xl bg-white/70 animate-pulse" />)}
            </div>
          ) : reviews.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-white/70 p-8 text-center text-sm text-gray-500">
              {isRTL ? 'لا توجد مراجعات لهذا المنتج حتى الآن.' : 'No reviews for this product yet.'}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
                {reviews.map((review) => (
                  <div key={review.review_id} className="w-full">
                    <ReviewCard
                      review={review}
                      isRTL={isRTL}
                      accentColor={reviewAccent}
                      textColor={branding.text}
                      backgroundColor="#fff"
                    />
                  </div>
                ))}
              </div>
              {reviewsHasMore ? (
                <div className={`mt-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                  <button
                    type="button"
                    className="px-4 py-2 rounded-lg text-sm font-medium text-white"
                    style={{ backgroundColor: reviewAccent }}
                    onClick={async () => {
                      const nextPage = reviewsPage + 1;
                      try {
                        const { data } = await axiosInstance.get(`/api/products/${id}/reviews?page=${nextPage}&limit=8`);
                        setReviews((prev) => [...prev, ...(data?.reviews || [])]);
                        setReviewsPage(nextPage);
                        setReviewsHasMore(Boolean(data?.has_more));
                      } catch (_) {
                        setReviewsHasMore(false);
                      }
                    }}
                  >
                    {isRTL ? 'عرض المزيد' : 'Load more'}
                  </button>
                </div>
              ) : null}
            </>
          )}
        </section>
      </div>
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white shadow-lg p-3 pb-[env(safe-area-inset-bottom)]">
        <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden shrink-0">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, Math.min(availableStock, (q || 1) - 1)))}
              disabled={!isInStock || quantity <= 1}
              className="min-h-[48px] min-w-[48px] px-2 bg-gray-100 text-lg font-medium hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              −
            </button>
            <input
              type="number"
              min={1}
              max={maxSelectableQuantity}
              value={quantity}
              disabled={!isInStock}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                if (!Number.isNaN(v)) setQuantity(Math.max(1, Math.min(maxSelectableQuantity, v)));
              }}
              className="w-14 text-center text-base border-0 border-x border-gray-300 py-2 focus:ring-2 focus:ring-storelaunch-green focus:ring-inset disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
            />
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.min(availableStock, (q || 1) + 1))}
              disabled={!canIncrease}
              className="min-h-[48px] min-w-[48px] px-2 bg-gray-100 text-lg font-medium hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              +
            </button>
          </div>
          <button
            type="button"
            onClick={async () => {
              setAddError('');
              if (hasVariants && !selectedVariantId) {
                setAddError(isRTL ? 'اختر صنفاً' : 'Please select a variant');
                return;
              }
              if (!canAdd) {
                setAddError(!isInStock
                  ? (isRTL ? 'هذا المنتج غير متوفر حالياً' : 'This product is out of stock')
                  : (isRTL ? 'الكمية تتجاوز المتوفر' : 'Quantity exceeds available stock'));
                return;
              }
              const mainImg = selectedVariant?.image || fallbackImages[0] || product.image_url;
              try {
                await addItem({
                  productId: id,
                  variantId: selectedVariantId || undefined,
                  quantity,
                  title: product.product_name,
                  image: mainImg,
                  options: selectedVariant ? [{ option_name: selectedVariant.option_name, option_value: selectedVariant.option_value }] : null,
                  unitPrice: effectivePrice,
                });
              } catch (err) {
                const data = err.response?.data;
                if (err.response?.status === 409 && typeof data?.available === 'number') {
                  setQuantity(data.available);
                  setAddError(isRTL ? `الكمية غير متوفرة. المتاح الآن: ${data.available}` : `Quantity not available. Available now: ${data.available}`);
                } else if (err.message === 'OUT_OF_STOCK') {
                  setAddError(isRTL ? 'الكمية المطلوبة غير متوفرة' : 'Requested quantity not in stock');
                } else {
                  setAddError(data?.error || (isRTL ? 'فشل الإضافة للسلة' : 'Failed to add to cart'));
                }
              }
            }}
            disabled={!canAdd}
            className="cart-btn-primary flex-1 min-h-[52px] px-6 py-3 text-base font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {availableStock === 0 ? (isRTL ? 'غير متوفر' : 'Out of stock') : (isRTL ? 'أضف إلى السلة' : 'Add to Cart')}
          </button>
        </div>
      </div>
      {storeInfo ? <StorefrontFooter storeInfo={storeInfo} branding={branding} isRTL={isRTL} /> : null}
    </div>
  );
};

export default ProductDetailsPage;
