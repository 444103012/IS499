import React, { useEffect, useMemo } from 'react';
import { Link, useNavigate, useParams } from '../router';
import { useTranslation } from 'react-i18next';
import StorefrontHeader from '../components/StorefrontHeader';
import StorefrontFooter from '../components/storefront/StorefrontFooter';
import CartItemCard from '../components/storefront/cart/CartItemCard';
import CurrencyAmount from '../components/common/CurrencyAmount';
import { useCart } from '../context/cart/CartContext';
import useStoreBranding from '../hooks/useStoreBranding';
import useDocumentLanguage from '../hooks/useDocumentLanguage';
import { buildStorefrontPath, normalizeStoreName } from '../utils/storefrontRoutes';

export default function CartPage() {
  const { t } = useTranslation();
  const { storeSlug } = useParams();
  const navigate = useNavigate();
  const normalizedStoreSlug = normalizeStoreName(storeSlug);
  const { storeInfo, branding } = useStoreBranding(normalizedStoreSlug);
  const { isRTL } = useDocumentLanguage();
  const {
    items,
    totals,
    warnings,
    loading,
    error,
    clearCartError,
    revalidateCart,
  } = useCart();

  const checkoutPath = buildStorefrontPath(normalizedStoreSlug, 'checkout');
  const storefrontPath = buildStorefrontPath(normalizedStoreSlug);
  const shippingEstimate = 0;
  const taxAmount = 0;
  const grandTotal = Number(totals.grand || 0) + shippingEstimate + taxAmount;

  useEffect(() => {
    revalidateCart();
  }, [revalidateCart]);

  const warningMap = useMemo(() => {
    const map = new Map();
    for (const warning of Array.isArray(warnings) ? warnings : []) {
      const existing = map.get(warning.key) || [];
      const fallback = warning?.message || '';
      const translated = t(`storefront.cart.warnings.${warning.code}`, { defaultValue: fallback });
      map.set(warning.key, [...existing, translated]);
    }
    return map;
  }, [warnings, t]);

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: branding.background }} dir={isRTL ? 'rtl' : 'ltr'}>
      <StorefrontHeader storeSlug={normalizedStoreSlug} storeInfo={storeInfo} branding={branding} />
      <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <div className={`flex items-center justify-between mb-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <h1 className="text-2xl font-bold" style={{ color: branding.text }}>
            {t('storefront.cart.title')}
          </h1>
          <Link to={storefrontPath} className="text-sm font-medium" style={{ color: branding.buttons }}>
            {t('storefront.cart.continueShopping')}
          </Link>
        </div>

        {error && (
          <div className={`mb-4 rounded-md border border-red-200 bg-red-50 p-3 ${isRTL ? 'text-right' : 'text-left'}`}>
            <p className="text-red-700 text-sm">{error}</p>
            <button type="button" onClick={clearCartError} className="mt-2 text-xs text-red-700 underline">
              {t('storefront.dismiss')}
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <section className="lg:col-span-2 space-y-3">
            {items.length === 0 ? (
              <div className={`rounded-xl border border-gray-200 bg-white p-6 ${isRTL ? 'text-right' : 'text-left'}`}>
                <p className="text-gray-600">{t('storefront.cart.empty')}</p>
              </div>
            ) : (
              items.map((item) => (
                <div key={item.key} className="rounded-xl border border-gray-100 bg-white p-3">
                  <CartItemCard item={item} isRTL={isRTL} />
                  {warningMap.get(item.key)?.length ? (
                    <div className={`mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                      {warningMap.get(item.key).map((msg) => (
                        <p key={`${item.key}-${msg}`} className="text-xs text-amber-800">{msg}</p>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))
            )}
          </section>

          <aside className="lg:sticky lg:top-24 h-fit rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
            <h2 className={`text-lg font-semibold mb-4 ${isRTL ? 'text-right' : 'text-left'}`} style={{ color: branding.text }}>
              {t('storefront.cart.orderSummary')}
            </h2>
            <div className="space-y-3 text-sm">
              <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                <span className="text-gray-600">{t('storefront.cart.subtotal')}</span>
                <CurrencyAmount value={totals.grand || 0} isRTL={isRTL} />
              </div>
              <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                <span className="text-gray-600">{t('storefront.cart.shipping')}</span>
                <span className="text-gray-500">{t('storefront.cart.shippingAtCheckout')}</span>
              </div>
              <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                <span className="text-gray-600">{t('storefront.cart.tax')}</span>
                <span className="text-gray-500">{t('storefront.cart.taxAtCheckout')}</span>
              </div>
              <div className="border-t border-gray-200 pt-3">
                <div className={`flex items-center justify-between font-semibold ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <span>{t('storefront.cart.total')}</span>
                  <CurrencyAmount value={grandTotal} isRTL={isRTL} />
                </div>
              </div>
            </div>
            <button
              type="button"
              className="cart-btn-primary w-full mt-5 py-3 text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={loading || items.length === 0}
              onClick={() => navigate(checkoutPath)}
            >
              {loading
                ? t('storefront.cart.updating')
                : t('storefront.cart.proceedToCheckout')}
            </button>
          </aside>
        </div>
      </div>
      {storeInfo ? <StorefrontFooter storeInfo={storeInfo} branding={branding} isRTL={isRTL} /> : null}
    </div>
  );
}

