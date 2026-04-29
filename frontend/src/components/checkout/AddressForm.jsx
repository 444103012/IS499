import React from 'react';

const AddressForm = ({ value, onChange, isRTL }) => {
  const handleChange = (e) => {
    const { name, value: v } = e.target;
    onChange({ ...value, [name]: v });
  };

  const inputClass =
    'w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-storelaunch-green';

  return (
    <div>
      <h2 className="text-lg font-bold text-storelaunch-dark mb-3">
        {isRTL ? 'معلومات العميل والعنوان' : 'Customer Info & Address'}
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {isRTL ? 'الاسم الكامل' : 'Full Name'}
          </label>
          <input
            name="full_name"
            value={value.full_name || ''}
            onChange={handleChange}
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {isRTL ? 'البريد الإلكتروني' : 'Email'}
          </label>
          <input
            type="email"
            name="email"
            value={value.email || ''}
            onChange={handleChange}
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {isRTL ? 'رقم الجوال' : 'Phone'}
          </label>
          <input
            name="phone"
            value={value.phone || ''}
            onChange={handleChange}
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {isRTL ? 'المدينة' : 'City'}
          </label>
          <input
            name="city"
            value={value.city || ''}
            onChange={handleChange}
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {isRTL ? 'المنطقة' : 'Region'}
          </label>
          <input
            name="region"
            value={value.region || ''}
            onChange={handleChange}
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {isRTL ? 'الرمز البريدي' : 'Postal Code'}
          </label>
          <input
            name="postal_code"
            value={value.postal_code || ''}
            onChange={handleChange}
            className={inputClass}
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {isRTL ? 'العنوان الأول' : 'Address Line 1'}
          </label>
          <input
            name="address1"
            value={value.address1 || ''}
            onChange={handleChange}
            className={inputClass}
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {isRTL ? 'العنوان الثاني (اختياري)' : 'Address Line 2 (optional)'}
          </label>
          <input
            name="address2"
            value={value.address2 || ''}
            onChange={handleChange}
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {isRTL ? 'الدولة' : 'Country'}
          </label>
          <input
            name="country"
            value={value.country || 'SA'}
            onChange={handleChange}
            className={inputClass}
            disabled
          />
        </div>
      </div>
    </div>
  );
};

export default AddressForm;

