import React from 'react';
import CurrencyAmount from '../common/CurrencyAmount';

const SummaryCard = ({ items = [], itemsTotal, shippingAmount, taxAmount, grandTotal, isRTL }) => {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
      <h2 className={`text-base font-semibold text-storelaunch-dark mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
        {isRTL ? 'ملخص الطلب' : 'Order Summary'}
      </h2>
      {items.length > 0 ? (
        <div className="mb-5 space-y-2.5">
          {items.map((item) => (
            <div key={item.key || `${item.productId}-${item.variantId || 'base'}`} className="flex items-start justify-between gap-3 text-sm">
              <div className={`min-w-0 ${isRTL ? 'text-right' : 'text-left'}`}>
                <p className="text-storelaunch-dark font-medium truncate">{item.title || (isRTL ? 'منتج' : 'Product')}</p>
                <p className="text-xs text-gray-500 mt-0.5">{isRTL ? 'الكمية' : 'Qty'}: {item.quantity || 0}</p>
              </div>
              <span className="text-storelaunch-dark font-medium shrink-0">
                <CurrencyAmount value={item.subtotal ?? ((item.unitPrice || 0) * (item.quantity || 0))} isRTL={isRTL} />
              </span>
            </div>
          ))}
          <hr className="my-3 border-gray-100" />
        </div>
      ) : null}
      <div className={`space-y-2 text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
        <div className="flex justify-between">
          <span className="text-gray-600">{isRTL ? 'مجموع المنتجات' : 'Items total'}</span>
          <span className="font-medium text-storelaunch-dark"><CurrencyAmount value={itemsTotal} isRTL={isRTL} /></span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">{isRTL ? 'الشحن' : 'Shipping'}</span>
          <span className="font-medium text-storelaunch-dark"><CurrencyAmount value={shippingAmount} isRTL={isRTL} /></span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">{isRTL ? 'الضريبة' : 'Tax'}</span>
          <span className="font-medium text-storelaunch-dark"><CurrencyAmount value={taxAmount} isRTL={isRTL} /></span>
        </div>
        <hr className="my-3 border-gray-100" />
        <div className="flex justify-between text-base font-semibold">
          <span className="text-storelaunch-dark">
            {isRTL ? 'الإجمالي' : 'Grand total'}
          </span>
          <span style={{ color: 'var(--store-text)' }}>
            <CurrencyAmount value={grandTotal} isRTL={isRTL} />
          </span>
        </div>
      </div>
    
    </div>
  );
};

export default SummaryCard;

