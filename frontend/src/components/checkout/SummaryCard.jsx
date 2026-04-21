import React from 'react';

const formatSar = (n) =>
  new Intl.NumberFormat('ar-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
    Number(n || 0)
  );

const SummaryCard = ({ itemsTotal, shippingAmount, taxAmount, grandTotal, isRTL }) => {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <h2 className="text-lg font-bold text-storelaunch-dark mb-3">
        {isRTL ? 'ملخص الطلب' : 'Order Summary'}
      </h2>
      <div className={`space-y-2 text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
        <div className="flex justify-between">
          <span className="text-gray-600">{isRTL ? 'مجموع المنتجات' : 'Items total'}</span>
          <span className="font-medium text-storelaunch-dark">{formatSar(itemsTotal)} SAR</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">{isRTL ? 'الشحن' : 'Shipping'}</span>
          <span className="font-medium text-storelaunch-dark">{formatSar(shippingAmount)} SAR</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">{isRTL ? 'الضريبة' : 'Tax'}</span>
          <span className="font-medium text-storelaunch-dark">{formatSar(taxAmount)} SAR</span>
        </div>
        <hr className="my-2" />
        <div className="flex justify-between text-base font-bold">
          <span className="text-storelaunch-dark">
            {isRTL ? 'الإجمالي' : 'Grand total'}
          </span>
          <span className="text-storelaunch-green">{formatSar(grandTotal)} SAR</span>
        </div>
      </div>
    </div>
  );
};

export default SummaryCard;

