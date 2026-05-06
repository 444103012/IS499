





import React from 'react';
import { useCart } from '../../../context/cart/CartContext';
import CurrencyAmount from '../../common/CurrencyAmount';

const API_BASE = process.env.REACT_APP_API_URL || '';
const toImageUrl = (path) => (path && !path.startsWith('http') ? `${API_BASE.replace(/\/$/, '')}/${path.replace(/^\//, '')}` : path);

export default function CartItemCard({ item, isRTL }) {
  const { updateItem, removeItem } = useCart();
  const { key, title, image, unitPrice, quantity, subtotal, options, productId, variantId } = item;
  const editPath = (() => {
    if (typeof window === 'undefined') return '#';
    const [, maybeStore] = window.location.pathname.split('/');
    const storePrefix = maybeStore ? `/${maybeStore}` : '';
    const variantQuery = variantId ? `?variantId=${variantId}&from=cart` : '?from=cart';
    return `${storePrefix}/product/${productId}${variantQuery}`;
  })();

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

  return (
    <div
      className={`cart-item-card flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-3 ${isRTL ? 'sm:flex-row-reverse' : ''}`}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <div className="shrink-0 sm:self-start">
        {image ? (
          <img src={toImageUrl(image)} alt="" className="cart-item-image" />
        ) : (
          <div className="cart-item-image" style={{ background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: '1.5rem' }}>—</div>
        )}
      </div>
      <div className="cart-item-details" style={{ textAlign: isRTL ? 'right' : 'left' }}>
        <h4 className="cart-item-title">{title}</h4>
        {Array.isArray(options) && options.length > 0 && (
          <div className="text-xs text-gray-600 mb-1">
            {options.map((opt) => `${opt.option_name}: ${opt.option_value}`).join(' • ')}
          </div>
        )}
        <div className="text-xs text-gray-500 mb-1">
          {isRTL ? 'سعر الوحدة' : 'Unit'}: <CurrencyAmount value={unitPrice} isRTL={isRTL} />
        </div>
        <div className="cart-item-price"><CurrencyAmount value={unitPrice} isRTL={isRTL} /></div>
        <div className="cart-item-stepper" style={{ justifyContent: isRTL ? 'flex-end' : 'flex-start' }}>
          <button type="button" onClick={handleDecrease} aria-label="Decrease">−</button>
          <span style={{ minWidth: '1.5rem', textAlign: 'center' }}>{quantity}</span>
          <button type="button" onClick={handleIncrease} aria-label="Increase">+</button>
        </div>
      </div>
      <div
        className={`flex w-full min-w-0 flex-row flex-wrap items-center justify-between gap-2 sm:w-auto sm:flex-col sm:justify-between ${isRTL ? 'sm:items-start' : 'sm:items-end'}`}
      >
        <span className={`cart-item-price w-full sm:w-auto ${isRTL ? 'text-right' : 'text-left'}`}>
          {isRTL ? 'الإجمالي الفرعي' : 'Subtotal'}: <CurrencyAmount value={subtotal ?? unitPrice * quantity} isRTL={isRTL} />
        </span>
        <div className={`flex flex-wrap gap-2 ${isRTL ? 'justify-start' : 'justify-end'} sm:justify-start`}>
          <button type="button" className="cart-item-remove" onClick={handleRemove}>
            {isRTL ? 'إزالة' : 'Remove'}
          </button>
          <button
            type="button"
            className="cart-item-remove"
            onClick={() => {
              window.location.href = editPath;
            }}
          >
            {isRTL ? 'تعديل' : 'Edit item'}
          </button>
        </div>
      </div>
    </div>
  );
}
