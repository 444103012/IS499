import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function StoreSuspendedPage() {
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('store_owner_id');
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="max-w-lg w-full bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center">
        <div className="mx-auto mb-4 h-14 w-14 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-storelaunch-dark mb-2">
          {isRTL ? 'تم تعليق المتجر' : 'Store Suspended'}
        </h1>
        <p className="text-gray-700 mb-2">
          {isRTL
            ? 'تم تعليق متجرك. يرجى التواصل مع الإدارة.'
            : 'Your store has been suspended. Please contact the admin.'}
        </p>
        <p className="text-sm text-gray-500 mb-6">
          {isRTL
            ? 'لن تتمكن من الوصول إلى لوحة التحكم حتى يتم رفع التعليق.'
            : 'You cannot access dashboard features until suspension is removed.'}
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-medium"
          >
            {isRTL ? 'العودة للرئيسية' : 'Back to Home'}
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="px-4 py-2 rounded-lg bg-storelaunch-dark text-white hover:bg-storelaunch-teal text-sm font-medium"
          >
            {isRTL ? 'تسجيل الخروج' : 'Logout'}
          </button>
        </div>
      </div>
    </div>
  );
}
