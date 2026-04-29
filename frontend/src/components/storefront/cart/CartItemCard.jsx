

import React from 'react';
import { useCart } from '../../../context/cart/CartContext';
import { API_BASE_URL } from '../../../config/api';

const toImageUrl = (path) => (path && !path.startsWith('http') ? `${API_BASE_URL}/${path.replace(/^\//, '')}` : path);

export default function CartItemCard({ item, isRTL }) {
  const { updateItem, removeItem } = useCart();
  const { key, title, image, unitPrice, quantity, subtotal } = item;

  const handleIncrease = () => {
    updateItem(key, (quantity || 0) + 1).catch(() => {});
  };

  const handleDecrease = () => {
    const q = (quantity || 0) - 1;
    updateItem(key, q).catch(() => {});
  };

  const handleRemove = () => {
    removeItem(key);
  };

  const formatPrice = (n) => new Intl.NumberFormat(isRTL ? 'ar-SA' : 'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

  return (
    <div className="cart-item-card" dir={isRTL ? 'rtl' : 'ltr'} style={{ flexDirection: isRTL ? 'row-reverse' : 'row' }}>
      <div style={{ flexShrink: 0 }}>
        {image ? (
          <img src={toImageUrl(image)} alt="" className="cart-item-image" />
        ) : (
          <div className="cart-item-image" style={{ background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: '1.5rem' }}>—</div>
        )}
      </div>
      <div className="cart-item-details" style={{ textAlign: isRTL ? 'right' : 'left' }}>
        <h4 className="cart-item-title">{title}</h4>
        <div className="cart-item-price">{formatPrice(unitPrice)} SAR</div>
        <div className="cart-item-stepper" style={{ justifyContent: isRTL ? 'flex-end' : 'flex-start' }}>
          <button type="button" onClick={handleDecrease} aria-label="Decrease">−</button>
          <span style={{ minWidth: '1.5rem', textAlign: 'center' }}>{quantity}</span>
          <button type="button" onClick={handleIncrease} aria-label="Increase">+</button>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: isRTL ? 'flex-start' : 'flex-end', justifyContent: 'space-between' }}>
        <span className="cart-item-price">{formatPrice(subtotal ?? unitPrice * quantity)} SAR</span>
        <button type="button" className="cart-item-remove" onClick={handleRemove}>
          {isRTL ? 'إزالة' : 'Remove'}
        </button>
      </div>
    </div>
  );
}
