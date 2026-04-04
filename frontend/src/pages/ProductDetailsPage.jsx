import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import StorefrontHeader from '../components/StorefrontHeader';
import axiosInstance from '../api/axios';

const ProductDetailsPage = () => {
  const { t, i18n } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const isRTL = i18n.language === 'ar';

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = i18n.language;
  }, [i18n.language, isRTL]);

  useEffect(() => {
    fetchProductDetails();
  }, [id]);

  const fetchProductDetails = async () => {
    setLoading(true);
    setError('');

    try {
      const { data } = await axiosInstance.get(`/api/products/${id}`);
      setProduct(data.product);
    } catch (err) {
      console.error('Failed to fetch product details:', err);
      if (err.response?.status === 404) {
        setError(t('storefront.productNotFound'));
      } else {
        setError(t('storefront.error'));
      }
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat(isRTL ? 'ar-SA' : 'en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(price);
  };

  const getTotalStock = (options) => {
    if (!options || options.length === 0) return null;
    return options.reduce((sum, opt) => sum + (opt.stock_qty || 0), 0);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50" dir={isRTL ? 'rtl' : 'ltr'}>
        <StorefrontHeader />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-storelaunch-green mx-auto mb-4"></div>
              <p className="text-gray-600">{t('storefront.loading')}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-gray-50" dir={isRTL ? 'rtl' : 'ltr'}>
        <StorefrontHeader />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-xl font-bold text-storelaunch-dark mb-2">
              {error || t('storefront.productNotAvailable')}
            </h3>
            <Link
              to="/shop"
              className="inline-block mt-6 px-6 py-3 bg-storelaunch-green text-white rounded-lg font-medium hover:bg-storelaunch-deep-green transition-colors"
            >
              {t('storefront.backToCatalog')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const totalStock = getTotalStock(product.options);
  const isInStock = totalStock === null || totalStock > 0;

  return (
    <div className="min-h-screen bg-gray-50" dir={isRTL ? 'rtl' : 'ltr'}>
      <StorefrontHeader />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className={`mb-6 ${isRTL ? 'text-right' : 'text-left'}`}>
          <Link
            to="/shop"
            state={{ fromDetails: true }}
            className="inline-flex items-center gap-1 text-storelaunch-green hover:text-storelaunch-deep-green font-medium text-sm transition-colors"
          >
            <svg className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {t('storefront.backToCatalog')}
          </Link>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-6 md:p-8">
            <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
              {product.image_url ? (
                <img
                  src={product.image_url}
                  alt={product.product_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <svg className="w-32 h-32 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              )}
            </div>

            <div className={isRTL ? 'text-right' : 'text-left'}>
              <h1 className="text-3xl font-bold text-storelaunch-dark mb-2">
                {product.product_name}
              </h1>

              {product.title && product.title !== product.product_name && (
                <p className="text-lg text-gray-600 mb-4">{product.title}</p>
              )}

              {product.category && (
                <div className="mb-4">
                  <span className="inline-block px-3 py-1 bg-storelaunch-green/10 text-storelaunch-green text-sm font-medium rounded-full">
                    {product.category}
                  </span>
                </div>
              )}

              <div className="mb-6">
                <div className={`flex items-baseline gap-2 mb-2 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
                  <span className="text-sm font-medium text-gray-600">{t('storefront.price')}:</span>
                  <span className="text-3xl font-bold text-storelaunch-green">
                    {formatPrice(product.price)} {t('storefront.sar')}
                  </span>
                </div>
              </div>

              <div className="mb-6 pb-6 border-b border-gray-200">
                <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
                  <span className="text-sm font-medium text-gray-600">{t('storefront.availability')}:</span>
                  {isInStock ? (
                    <span className="flex items-center gap-1 text-green-600 font-medium">
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

              {product.description && (
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-storelaunch-dark mb-2">
                    {t('storefront.description')}
                  </h3>
                  <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                    {product.description}
                  </p>
                </div>
              )}

              {product.options && product.options.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-storelaunch-dark mb-3">
                    {t('storefront.options')}
                  </h3>
                  <div className="space-y-2">
                    {product.options.map((option) => (
                      <div
                        key={option.option_id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className={isRTL ? 'text-right' : 'text-left'}>
                          <span className="font-medium text-storelaunch-dark">
                            {option.option_name}: {option.option_value}
                          </span>
                          {option.additional_price > 0 && (
                            <span className="text-sm text-gray-600 ml-2">
                              (+{formatPrice(option.additional_price)} {t('storefront.sar')})
                            </span>
                          )}
                        </div>
                        <span className={`text-sm ${option.stock_qty > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {option.stock_qty > 0 ? `${option.stock_qty} ${isRTL ? 'متوفر' : 'available'}` : (isRTL ? 'غير متوفر' : 'Out of stock')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

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
      </div>
    </div>
  );
};

export default ProductDetailsPage;
