

import React from 'react';
import { useCart } from '../../../context/cart/CartContext';
import CartItemCard from './CartItemCard';

export default function CartDrawer() {
  const { items, totals, drawerOpen, closeDrawer, loading } = useCart();
  const isRTL = typeof document !== 'undefined' && document.documentElement.dir === 'rtl';

  const formatPrice = (n) => new Intl.NumberFormat(isRTL ? 'ar-SA' : 'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

  if (!drawerOpen) return null;

  return (
    <>
      <div className="cart-drawer-overlay" onClick={closeDrawer} aria-hidden="true" />
      <div className="cart-drawer" dir={isRTL ? 'rtl' : 'ltr'} role="dialog" aria-label="Cart">
        <div className="cart-drawer-header">
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>{isRTL ? 'السلة' : 'Cart'}</h2>
          <button type="button" onClick={closeDrawer} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem', fontSize: '1.5rem', lineHeight: 1 }} aria-label="Close">×</button>
        </div>
        <div className="cart-drawer-body">
          {loading ? (
            <p style={{ textAlign: 'center', color: '#6b7280' }}>{isRTL ? 'جاري التحميل...' : 'Loading...'}</p>
          ) : items.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#6b7280', padding: '2rem 0' }}>{isRTL ? 'السلة فارغة' : 'Your cart is empty'}</p>
          ) : (
            items.map((item) => <CartItemCard key={item.key} item={item} isRTL={isRTL} />)
          )}
        </div>
        <div className="cart-drawer-footer">
          <div className="cart-drawer-totals" style={{ textAlign: isRTL ? 'right' : 'left' }}>
            <div className="cart-drawer-grand">
              {isRTL ? 'المجموع' : 'Total'}: {formatPrice(totals.grand || 0)} SAR
            </div>
          </div>
          <button type="button" className="cart-btn-primary" style={{ width: '100%', padding: '0.75rem 1rem' }} disabled>
            {isRTL ? 'إتمام الطلب (قريباً)' : 'Checkout (placeholder)'}
          </button>
        </div>
      </div>
    </>
  );
}
