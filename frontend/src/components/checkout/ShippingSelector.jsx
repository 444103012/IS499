import React from 'react';
import CurrencyAmount from '../common/CurrencyAmount';

const ShippingSelector = ({ options, selectedId, onChange, isRTL }) => {
  const getEtaLabel = (id) => {
    if (id === 'NO_SHIPPING') return isRTL ? 'فوري / لا يشحن' : 'Digital / no ship';
    if (id === 'ARAMEX_STD') return isRTL ? '2-4 أيام' : '2-4 days';
    if (id === 'SMSA_EXP') return isRTL ? '1-2 يوم' : '1-2 days';
    if (id === 'SPL_STD') return isRTL ? '2-5 أيام' : '2-5 days';
    return isRTL ? 'غير محدد' : 'N/A';
  };

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-4 md:p-5 shadow-sm">
      <h2 className={`text-base font-semibold text-storelaunch-dark mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
        {isRTL ? 'طريقة التوصيل' : 'Delivery Method'}
      </h2>
      {options.length === 0 ? (
        <p className="text-sm text-gray-500 px-1">
          {isRTL ? 'لا توجد خيارات شحن متاحة.' : 'No shipping options available.'}
        </p>
      ) : (
        <div className="space-y-3">
          {options.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => onChange(opt.id)}
              className={`w-full flex items-center justify-between border rounded-xl px-4 py-3 text-left transition-all ${
                selectedId === opt.id
                  ? 'border-storelaunch-green bg-emerald-50/40 ring-1 ring-storelaunch-green/40'
                  : 'border-gray-200 hover:border-storelaunch-green/50'
              } ${isRTL ? 'flex-row-reverse text-right' : ''}`}
            >
              <div className={isRTL ? 'text-right' : 'text-left'}>
                <div className="text-sm font-semibold text-storelaunch-dark">{opt.label}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {isRTL ? 'الوقت المتوقع: ' : 'ETA: '}
                  {getEtaLabel(opt.id)}
                </div>
              </div>
              <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <span className="text-sm font-semibold text-storelaunch-dark">
                  <CurrencyAmount value={opt.amount} isRTL={isRTL} />
                </span>
                <input
                  type="radio"
                  name="shippingMethod"
                  checked={selectedId === opt.id}
                  onChange={() => onChange(opt.id)}
                  aria-label={opt.label}
                />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ShippingSelector;

