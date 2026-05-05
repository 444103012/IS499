import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../api/axios';
import StorefrontHeader from '../components/StorefrontHeader';
import StorefrontFooter from '../components/storefront/StorefrontFooter';
import CurrencyAmount from '../components/common/CurrencyAmount';
import StarRating from '../components/reviews/StarRating';
import ReviewCard from '../components/reviews/ReviewCard';
import { getNormalizedStoreBranding } from '../utils/storeBranding';
import { normalizeStoreName } from '../utils/storefrontRoutes';

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

function previewFakeStoreReviews(isRTL, storeLabel) {
  const label = storeLabel || (isRTL ? 'المتجر' : 'this store');
  return [
    {
      review_id: 'preview-sr-1',
      reviewer_name: isRTL ? 'نورة العتيبي' : 'Nora A.',
      rating: 5,
      comment: isRTL
        ? `تجربة رائعة مع ${label}، الشحن سريع والتغليف ممتاز. أنصح به بشدة!`
        : `Great experience shopping at ${label} — fast shipping and neat packaging. Highly recommend!`,
      review_date: '2026-02-12T10:00:00.000Z',
      product_name: isRTL ? 'تقييم المتجر' : 'Store review',
    },
    {
      review_id: 'preview-sr-2',
      reviewer_name: isRTL ? 'خالد السبيعي' : 'Khaled S.',
      rating: 4,
      comment: isRTL
        ? 'جودة المنتجات كما في الوصف، وسهل التواصل مع المتجر.'
        : 'Product quality matches the descriptions, and the store was easy to reach.',
      review_date: '2026-02-05T14:30:00.000Z',
      product_name: isRTL ? 'تقييم المتجر' : 'Store review',
    },
    {
      review_id: 'preview-sr-3',
      reviewer_name: isRTL ? 'لينا الشهري' : 'Lina Al-Sh.',
      rating: 5,
      comment: isRTL
        ? `أول طلب لي من ${label} ولن يكون الأخير، شكراً للفريق.`
        : `First order from ${label} — definitely not the last. Thanks to the team!`,
      review_date: '2026-01-28T09:15:00.000Z',
      product_name: isRTL ? 'تقييم المتجر' : 'Store review',
    },
  ];
}

function previewFakeProductReviews(isRTL, productName) {
  const pn = productName || (isRTL ? 'هذا المنتج' : 'this product');
  return [
    {
      review_id: 'preview-pr-1',
      reviewer_name: isRTL ? 'فهد العنزي' : 'Fahad A.',
      rating: 5,
      comment: isRTL ? `جودة ممتازة، يطابق الوصف تماماً.` : `Excellent quality — exactly as described.`,
      review_date: '2026-02-10T11:00:00.000Z',
      product_name: pn,
    },
    {
      review_id: 'preview-pr-2',
      reviewer_name: isRTL ? 'ريم المطيري' : 'Reem M.',
      rating: 4,
      comment: isRTL
        ? `راضية عن ${pn}، التوصيل كان أسرع من المتوقع.`
        : `Happy with ${pn}, delivery was faster than expected.`,
      review_date: '2026-02-01T16:45:00.000Z',
      product_name: pn,
    },
  ];
}

function PreviewProductPanel({
  product,
  branding,
  isRTL,
  t,
  onBack,
}) {
  const [selectedVariantId, setSelectedVariantId] = useState(null);

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

  useEffect(() => {
    if (!normalizedVariants.length) {
      setSelectedVariantId(null);
      return;
    }
    const defaultVariant = normalizedVariants.find((variant) => variant.stock > 0) || normalizedVariants[0];
    setSelectedVariantId(defaultVariant?.variantId ?? null);
  }, [product?.product_id, normalizedVariants]);

  const effectivePrice = useMemo(() => {
    if (!product) return 0;
    const basePrice = parseFloat(product.price) || 0;
    if (!selectedVariant) return basePrice;
    if (selectedVariant.price != null) return parseFloat(selectedVariant.price);
    const priceDelta = selectedVariant.additional_price;
    if (priceDelta != null) return basePrice + parseFloat(priceDelta);
    return basePrice;
  }, [product, selectedVariant]);

  const handleSelectVariant = useCallback(
    (variantId) => {
      const variant = variantById.get(variantId);
      if (!variant) return;
      setSelectedVariantId(variantId);
    },
    [variantById]
  );

  const hasVariants = Boolean(product?.options?.length);
  const ratingSummary = product?.rating_summary || { average_rating: 4.6, total_reviews: 12 };
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

  const availableStock = useMemo(() => {
    if (!product) return 0;
    if (selectedVariant != null) return selectedVariant.stock;
    if (product.options?.length) {
      return product.options.reduce((sum, opt) => sum + (opt.stock_qty || 0), 0);
    }
    if (product.total_stock != null) return Number(product.total_stock);
    return 999999;
  }, [product, selectedVariant]);

  const isInStock = availableStock > 0;
  const fakeProductReviews = useMemo(
    () => previewFakeProductReviews(isRTL, product?.product_name),
    [isRTL, product?.product_name]
  );

  return (
    <div className="max-w-7xl mx-auto w-full px-3 sm:px-6 lg:px-8 py-4 sm:py-6 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className={`mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-lg py-1 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-storelaunch-green focus:ring-offset-1"
          style={{ color: branding.buttons }}
        >
          <svg className={`h-4 w-4 shrink-0 ${isRTL ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {isRTL ? 'العودة إلى المعاينة' : 'Back to preview catalog'}
        </button>
      </div>

      <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5 text-sm leading-snug text-amber-950 sm:text-[15px]">
        {isRTL
          ? 'معاينة فقط — لا يمكن للعملاء الشراء من هذه الصفحة. افتح المتجر المباشر لاختبار السلة والدفع.'
          : 'Preview only — customers cannot purchase from this screen. Use your live storefront to test cart and checkout.'}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 p-4 sm:p-6 md:p-8">
          <div className="min-w-0 space-y-3">
            {showMobileImageCarousel ? (
              <>
                <div className="md:hidden">
                  <p className="sr-only">{isRTL ? 'معرض الصور، مرّر للتنقل' : 'Image gallery, swipe to browse'}</p>
                  <div
                    className="-mx-0.5 flex snap-x snap-mandatory overflow-x-auto scroll-smooth motion-reduce:scroll-auto rounded-xl border border-gray-100"
                    style={{ WebkitOverflowScrolling: 'touch' }}
                  >
                    {uniqueGalleryUrls.map((url, idx) => (
                      <div key={`${url}-${idx}`} className="min-w-full shrink-0 snap-center aspect-square bg-gray-100">
                        <img
                          src={url}
                          alt={`${product.product_name} — ${isRTL ? 'صورة' : 'image'} ${idx + 1}`}
                          className="h-full w-full object-cover"
                        />
                      </div>
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
                    className={`h-16 w-16 min-h-[44px] min-w-[44px] rounded-lg overflow-hidden border-2 shrink-0 focus:outline-none focus:ring-2 focus:ring-storelaunch-green transition-opacity sm:h-16 sm:w-16 sm:min-h-0 sm:min-w-0 ${
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

          <div className={`min-w-0 ${isRTL ? 'text-right' : 'text-left'}`}>
            <h1 className="text-2xl sm:text-3xl font-bold mb-2 leading-tight" style={{ color: branding.text }}>
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

            <div className="mb-6">
              <div className={`flex items-baseline gap-2 mb-2 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
                <span className="text-sm font-medium text-gray-600">{t('storefront.price')}:</span>
                <span className="text-3xl font-bold" style={{ color: branding.priceLabels || branding.buttons }}>
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
                <span className="text-sm text-gray-600">
                  {Number(ratingSummary.average_rating || 0).toFixed(1)} ({ratingSummary.total_reviews}{' '}
                  {isRTL ? 'تقييم' : 'reviews'})
                </span>
              </div>
            </div>

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
                      className={`min-h-[44px] rounded-lg px-3 py-2.5 text-sm font-medium transition-all sm:px-4 sm:py-2 ${
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

            <div className="mb-6 rounded-xl border-2 border-dashed border-amber-300/80 bg-amber-50/90 px-4 py-5 text-center text-sm font-medium leading-snug text-amber-950 sm:text-[15px]">
              {isRTL ? 'السلة والدفع غير متاحين في وضع المعاينة.' : 'Cart and checkout are disabled in preview mode.'}
            </div>

            {product.description ? (
              <div className="mb-6">
                <h3 className="text-lg font-bold mb-2" style={{ color: branding.text }}>
                  {t('storefront.description')}
                </h3>
                <p className="text-gray-800 text-base leading-relaxed whitespace-pre-line break-words">{product.description}</p>
              </div>
            ) : null}

            <div className="mt-8">
              <h3 className="text-lg font-bold mb-3" style={{ color: branding.text }}>
                {isRTL ? 'آراء تجريبية (معاينة)' : 'Sample reviews (preview)'}
              </h3>
              <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2 snap-x snap-mandatory scroll-smooth motion-reduce:scroll-auto">
                {fakeProductReviews.map((review) => (
                  <div key={review.review_id} className="min-w-[85%] md:min-w-[45%] lg:min-w-[31%] snap-start">
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const StorePreviewPage = () => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detailProductId, setDetailProductId] = useState(null);
  const [detailProduct, setDetailProduct] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await axiosInstance.get('/api/store/preview');
        if (!cancelled) setPreview(data);
      } catch (err) {
        try {
          const [storeRes, productsRes] = await Promise.all([
            axiosInstance.get('/api/store'),
            axiosInstance.get('/api/store/products'),
          ]);
          if (!cancelled) {
            setPreview({
              store: storeRes.data?.store || null,
              settings: storeRes.data?.settings || {},
              products: productsRes.data?.products || [],
              previewMode: true,
            });
            setError('');
          }
        } catch (fallbackErr) {
          if (!cancelled) setError(fallbackErr.response?.data?.error || 'Failed to load preview');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const products = preview?.products || [];
  const store = preview?.store || null;
  const settings = preview?.settings || {};
  const branding = getNormalizedStoreBranding(store?.theme, settings?.branding);

  const storeForFooter = useMemo(() => {
    if (!store) return null;
    return {
      ...store,
      footer: settings.footer || {},
      info: settings.info || {},
    };
  }, [store, settings]);

  const previewSlug = normalizeStoreName(store?.domain_name || store?.name || String(store?.store_id || 'store'));

  const dateLabel = useMemo(() => new Date().toLocaleString(), []);

  const fakeStoreReviews = useMemo(
    () => previewFakeStoreReviews(isRTL, store?.name),
    [isRTL, store?.name]
  );

  const reviewAccent = branding.buttons || '#6366F1';
  const reviewBg = `${reviewAccent}0D`;

  useEffect(() => {
    if (!detailProductId) {
      setDetailProduct(null);
      return;
    }
    const listRow = products.find((p) => Number(p.product_id) === Number(detailProductId));
    let cancelled = false;
    (async () => {
      setDetailLoading(true);
      setDetailError('');
      try {
        const { data } = await axiosInstance.get(`/api/store/products/${detailProductId}`);
        if (cancelled) return;
        const d = data.product;
        const merged = {
          ...d,
          description: listRow?.description ?? d.description,
          category: listRow?.category ?? d.category,
          total_stock: listRow?.total_stock ?? d.total_stock,
          rating_summary: { average_rating: 4.6, total_reviews: 12 },
        };
        setDetailProduct(merged);
      } catch {
        if (!cancelled) {
          setDetailError(isRTL ? 'تعذر تحميل المنتج' : 'Could not load product');
          setDetailProduct(null);
        }
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [detailProductId, products, isRTL]);

  if (loading) {
    return <div className="p-6 text-gray-600">Loading preview...</div>;
  }
  if (error) {
    return <div className="p-6 text-red-600">{error}</div>;
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: branding.background }} dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="sticky top-0 z-[60] border-b-4 border-storelaunch-green bg-storelaunch-dark pt-[env(safe-area-inset-top,0px)] text-white">
        <div className="max-w-7xl mx-auto flex flex-col gap-3 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-4">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-storelaunch-green sm:text-xs">Preview Mode</p>
            <h1 className="truncate text-base font-semibold sm:text-lg">{store?.name || 'Store Preview'}</h1>
          </div>
          
          <Link
            to="/dashboard"
            className="inline-flex min-h-[44px] w-full items-center justify-center rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-storelaunch-dark hover:bg-gray-100 sm:ms-auto sm:w-auto sm:min-w-0"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>

      <StorefrontHeader storeSlug={previewSlug} storeInfo={storeForFooter} branding={branding} previewMode />

      <div className="flex-1 flex flex-col w-full min-h-0">
        {detailProductId ? (
          detailLoading ? (
            <div className="flex-1 flex items-center justify-center py-24 text-gray-600">
              <div className="text-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-storelaunch-green mx-auto mb-3" />
                {isRTL ? 'جارٍ تحميل المنتج…' : 'Loading product…'}
              </div>
            </div>
          ) : detailError || !detailProduct ? (
            <div className="max-w-lg mx-auto px-4 py-12 text-center">
              <p className="text-red-600 mb-4">{detailError || (isRTL ? 'المنتج غير متوفر' : 'Product unavailable')}</p>
              <button
                type="button"
                onClick={() => setDetailProductId(null)}
                className="px-4 py-2 rounded-lg bg-storelaunch-green text-white text-sm font-medium"
              >
                {isRTL ? 'العودة' : 'Back'}
              </button>
            </div>
          ) : (
            <PreviewProductPanel
              product={detailProduct}
              branding={branding}
              isRTL={isRTL}
              t={t}
              onBack={() => setDetailProductId(null)}
            />
          )
        ) : (
          <div className="max-w-7xl mx-auto flex w-full flex-1 flex-col px-3 py-4 sm:px-6 sm:py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            <div className="mb-5 rounded-xl border border-gray-200 p-4 sm:p-5" style={{ backgroundColor: branding.productCard }}>
              <h2 className="text-lg font-bold sm:text-xl" style={{ color: branding.text }}>{store?.name || 'Store'}</h2>
              {store?.description ? <p className="mt-2 text-sm leading-relaxed opacity-90 sm:text-[15px]" style={{ color: branding.text }}>{store.description}</p> : null}
            </div>

            <div className={branding.productLayout === 'compact-list' ? 'flex flex-col gap-3 sm:gap-4' : 'grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6'}>
              {products.map((p) => {
                const totalStock = Number(p.total_stock ?? p.stock_qty ?? p.stock ?? 0);
                const outOfStock = totalStock <= 0;
                return (
                  <button
                    key={p.product_id}
                    type="button"
                    onClick={() => setDetailProductId(p.product_id)}
                    className={`text-left w-full ${branding.productLayout === 'compact-list'
                      ? 'flex gap-3 sm:gap-4 rounded-xl overflow-hidden shadow-sm border'
                      : 'border rounded-xl overflow-hidden shadow-sm'} transition hover:shadow-md focus:outline-none focus:ring-2 focus:ring-storelaunch-green`}
                    style={{ backgroundColor: branding.productCard, borderColor: branding.isDarkBackground ? '#334155' : '#e5e7eb' }}
                  >
                    <div className={`relative ${branding.productLayout === 'compact-list' ? 'w-24 min-h-[5.5rem] sm:min-h-0 sm:w-36 shrink-0 self-stretch sm:self-auto' : 'aspect-[4/3] sm:aspect-square'} bg-gray-100 flex items-center justify-center`}>
                      {outOfStock && (
                        <span className="absolute top-2 left-2 z-10 rounded-full bg-red-600 px-2 py-1 text-[11px] font-semibold text-white shadow">
                          {isRTL ? 'غير متوفر' : 'Out of stock'}
                        </span>
                      )}
                      {(() => {
                        const parsedImages = Array.isArray(p.images)
                          ? p.images
                          : (typeof p.images === 'string'
                            ? (() => { try { return JSON.parse(p.images); } catch (_) { return []; } })()
                            : []);
                        return Array.isArray(parsedImages) && parsedImages[0] ? (
                          <img src={parsedImages[0]} alt={p.product_name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-gray-400 text-sm">No image</span>
                        );
                      })()}
                    </div>
                    <div className="p-3 sm:p-4 flex-1 min-w-0">
                      <p className="font-semibold text-sm sm:text-base line-clamp-2 sm:line-clamp-1" style={{ color: branding.text }}>{p.product_name}</p>
                      {p.category ? <p className="text-xs mt-1 opacity-80" style={{ color: branding.text }}>{p.category}</p> : null}
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <p className="font-bold" style={{ color: branding.priceLabels }}>
                          <CurrencyAmount value={p.price} isRTL={isRTL} />
                        </p>
                        <span
                          className="text-xs px-2 py-1 rounded-full font-semibold shrink-0"
                          style={outOfStock ? { backgroundColor: '#fee2e2', color: '#991b1b' } : { backgroundColor: branding.badges, color: branding.badgeText }}
                        >
                          {outOfStock ? (isRTL ? 'نفد المخزون' : 'Out of stock') : (isRTL ? 'معاينة' : 'Preview')}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        {isRTL ? 'اضغط لمعاينة صفحة المنتج' : 'Click to preview product page'}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            <section
              className="mt-8 sm:mt-12 mb-4 rounded-2xl sm:rounded-3xl border p-4 sm:p-6 md:p-8 overflow-hidden"
              style={{ backgroundColor: reviewBg, borderColor: `${reviewAccent}33` }}
            >
              <div className={`mb-6 ${isRTL ? 'text-right' : 'text-left'}`}>
                <h2 className="text-2xl md:text-3xl font-bold" style={{ color: branding.text }}>
                  {isRTL ? 'ماذا يقول عملاؤنا' : 'What Our Customers Say'}
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  {isRTL ? 'أمثلة للعرض فقط — كما يظهر في المتجر المباشر' : 'Sample testimonials for preview — similar to your live storefront'}
                </p>
              </div>
              <div className="-mx-1 flex gap-3 sm:gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth motion-reduce:scroll-auto px-1 pb-2">
                {fakeStoreReviews.map((review) => (
                  <div key={review.review_id} className="min-w-[85%] md:min-w-[31%] snap-start">
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
            </section>
          </div>
        )}
      </div>

      {storeForFooter ? (
        <StorefrontFooter storeInfo={storeForFooter} branding={branding} isRTL={isRTL} />
      ) : null}
    </div>
  );
};

export default StorePreviewPage;
