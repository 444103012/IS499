





import React from 'react';
import { useCart } from '../../../context/cart/CartContext';
import CartItemCard from './CartItemCard';
import CurrencyAmount from '../../common/CurrencyAmount';

export default function CartDrawer() {
  const { items, totals, warnings, drawerOpen, closeDrawer, loading } = useCart();
  const isRTL = typeof document !== 'undefined' && document.documentElement.dir === 'rtl';
  const checkoutPath = (() => {
    if (typeof window === 'undefined') return '/cart';
    const [, maybeStore] = window.location.pathname.split('/');
    return maybeStore ? `/${maybeStore}/cart` : '/cart';
  })();

  if (!drawerOpen) return null;

  return (
    <>
      <div className="cart-drawer-overlay" onClick={closeDrawer} aria-hidden="true" />
      <div className="cart-drawer" dir={isRTL ? 'rtl' : 'ltr'} role="dialog" aria-label="Cart">
        <div className="cart-drawer-header">
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>{isRTL ? 'السلة' : 'Cart'}</h2>
          <button
            type="button"
            onClick={closeDrawer}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-xl leading-none text-[var(--store-text)] hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-storelaunch-green"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="cart-drawer-body">
          {Array.isArray(warnings) && warnings.length > 0 && (
            <div className={`mb-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs ${isRTL ? 'text-right' : 'text-left'}`}>
              {warnings.map((warning) => (
                <p key={`${warning.key}-${warning.code}`} className="text-amber-800">
                  {warning.message}
                </p>
              ))}
            </div>
          )}
          {loading ? (
            <p style={{ textAlign: 'center', color: 'var(--store-text)' }}>{isRTL ? 'جاري التحميل...' : 'Loading...'}</p>
          ) : items.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--store-text)', padding: '2rem 0' }}>{isRTL ? 'السلة فارغة' : 'Your cart is empty'}</p>
          ) : (
            items.map((item) => <CartItemCard key={item.key} item={item} isRTL={isRTL} />)
          )}
        </div>
        <div className="cart-drawer-footer">
          <div className="cart-drawer-totals" style={{ textAlign: isRTL ? 'right' : 'left' }}>
            <div className="cart-drawer-grand">
              {isRTL ? 'المجموع' : 'Total'}: <CurrencyAmount value={totals.grand || 0} isRTL={isRTL} />
            </div>
          </div>
          <button
            type="button"
            className="cart-btn-primary"
            style={{ width: '100%', padding: '0.75rem 1rem' }}
            disabled={loading || items.length === 0}
            onClick={() => {
              if (loading || items.length === 0) return;
              window.location.href = checkoutPath;
            }}
          >
            {isRTL ? 'عرض السلة' : 'View Cart'}
          </button>
        </div>
      </div>
    </>
  );
}
