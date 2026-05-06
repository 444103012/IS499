import React from 'react';

const AddressForm = ({ value, onChange, isRTL, lockedContactFields = false, contactHint = '', errors = {} }) => {
  const handleChange = (e) => {
    const { name, value: v } = e.target;
    onChange({ ...value, [name]: v });
  };

  const inputClass =
    'w-full border border-gray-200 bg-white rounded-lg px-3 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-storelaunch-green focus:border-transparent';
  const getInputClass = (field) => `${inputClass} ${errors[field] ? 'border-red-300 ring-1 ring-red-200' : ''}`;
  const ErrorText = ({ field }) => (errors[field] ? <p className="mt-1 text-xs text-red-600">{errors[field]}</p> : null);

  return (
    <div className="space-y-5">
      <section className="bg-white border border-gray-100 rounded-2xl p-4 md:p-5 shadow-sm">
        <h2 className={`text-base font-semibold text-storelaunch-dark mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
          {isRTL ? 'معلومات التواصل' : 'Contact Information'}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="checkout-full-name" className="block text-xs font-medium text-gray-600 mb-1.5">
              {isRTL ? 'الاسم الكامل' : 'Full Name'}
            </label>
            <input
              id="checkout-full-name"
              name="full_name"
              value={value.full_name || ''}
              onChange={handleChange}
              className={getInputClass('full_name')}
            />
            <ErrorText field="full_name" />
          </div>
          <div>
            <label htmlFor="checkout-email" className="block text-xs font-medium text-gray-600 mb-1.5">
              {isRTL ? 'البريد الإلكتروني' : 'Email'}
            </label>
            <input
              id="checkout-email"
              type="email"
              name="email"
              value={value.email || ''}
              onChange={handleChange}
              readOnly={lockedContactFields}
              aria-readonly={lockedContactFields}
              className={getInputClass('email')}
            />
            <ErrorText field="email" />
          </div>
          <div className="md:col-span-2">
            <label htmlFor="checkout-phone" className="block text-xs font-medium text-gray-600 mb-1.5">
              {isRTL ? 'رقم الجوال' : 'Phone'}
            </label>
            <input
              id="checkout-phone"
              name="phone"
              value={value.phone || ''}
              onChange={handleChange}
              readOnly={lockedContactFields}
              aria-readonly={lockedContactFields}
              className={getInputClass('phone')}
            />
            {lockedContactFields && contactHint ? (
              <p className="mt-1 text-xs text-gray-500">{contactHint}</p>
            ) : null}
            <ErrorText field="phone" />
          </div>
        </div>
      </section>

      <section className="bg-white border border-gray-100 rounded-2xl p-4 md:p-5 shadow-sm">
        <h2 className={`text-base font-semibold text-storelaunch-dark mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
          {isRTL ? 'عنوان الشحن' : 'Shipping Address'}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="checkout-city" className="block text-xs font-medium text-gray-600 mb-1.5">
            {isRTL ? 'المدينة' : 'City'}
          </label>
          <input
            id="checkout-city"
            name="city"
            value={value.city || ''}
            onChange={handleChange}
            className={getInputClass('city')}
          />
          <ErrorText field="city" />
        </div>
        <div>
          <label htmlFor="checkout-region" className="block text-xs font-medium text-gray-600 mb-1.5">
            {isRTL ? 'المنطقة' : 'Region'}
          </label>
          <input
            id="checkout-region"
            name="region"
            value={value.region || ''}
            onChange={handleChange}
            className={getInputClass('region')}
          />
          <ErrorText field="region" />
        </div>
        <div>
          <label htmlFor="checkout-postal-code" className="block text-xs font-medium text-gray-600 mb-1.5">
            {isRTL ? 'الرمز البريدي' : 'Postal Code'}
          </label>
          <input
            id="checkout-postal-code"
            name="postal_code"
            value={value.postal_code || ''}
            onChange={handleChange}
            className={getInputClass('postal_code')}
          />
          <ErrorText field="postal_code" />
        </div>
        <div className="md:col-span-2">
          <label htmlFor="checkout-address1" className="block text-xs font-medium text-gray-600 mb-1.5">
            {isRTL ? 'العنوان الأول' : 'Address Line 1'}
          </label>
          <input
            id="checkout-address1"
            name="address1"
            value={value.address1 || ''}
            onChange={handleChange}
            className={getInputClass('address1')}
          />
          <ErrorText field="address1" />
        </div>
        <div className="md:col-span-2">
          <label htmlFor="checkout-address2" className="block text-xs font-medium text-gray-600 mb-1.5">
            {isRTL ? 'العنوان الثاني (اختياري)' : 'Address Line 2 (optional)'}
          </label>
          <input
            id="checkout-address2"
            name="address2"
            value={value.address2 || ''}
            onChange={handleChange}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="checkout-country" className="block text-xs font-medium text-gray-600 mb-1.5">
            {isRTL ? 'الدولة' : 'Country'}
          </label>
          <input
            id="checkout-country"
            name="country"
            value={value.country || 'SA'}
            onChange={handleChange}
            className={inputClass}
            disabled
          />
        </div>
      </div>
      </section>
    </div>
  );
};

export default AddressForm;

