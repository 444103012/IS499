import React from 'react';

const ShippingSelector = ({ options, selectedId, onChange, isRTL }) => {
  return (
    <div>
      <h2 className="text-lg font-bold text-storelaunch-dark mb-3">
        {isRTL ? 'طريقة الشحن' : 'Shipping Method'}
      </h2>
      {options.length === 0 ? (
        <p className="text-sm text-gray-500">
          {isRTL ? 'لا توجد خيارات شحن متاحة.' : 'No shipping options available.'}
        </p>
      ) : (
        <div className="space-y-2">
          {options.map((opt) => (
            <label
              key={opt.id}
              className="flex items-center justify-between border rounded-lg px-3 py-2 cursor-pointer hover:border-storelaunch-green"
              style={selectedId === opt.id ? { borderWidth: 2, borderColor: 'var(--brand-green)' } : {}}
            >
              <div className={isRTL ? 'text-right' : 'text-left'}>
                <div className="text-sm font-medium text-storelaunch-dark">{opt.label}</div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-storelaunch-green">
                  {opt.amount.toFixed(2)} SAR
                </span>
                <input
                  type="radio"
                  name="shippingMethod"
                  checked={selectedId === opt.id}
                  onChange={() => onChange(opt.id)}
                />
              </div>
            </label>
          ))}
        </div>
      )}
    </div>
  );
};

export default ShippingSelector;

