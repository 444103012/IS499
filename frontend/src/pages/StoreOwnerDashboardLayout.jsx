/**
 * StoreOwnerDashboardLayout.jsx - Store Owner Dashboard (IS498)
 * --------------------------------------------------------------
 * EN: Main dashboard at /dashboard. Only visible when logged in (ProtectedRoute). Implements
 *     post-login destination (SO-002) and Store Owner Logout (Table 8 / SO-015): logout clears
 *     session (token + store_owner_id) and redirects to /login. Can be extended later with
 *     store setup (SO-003), products (SO-004), orders (SO-005), reports (SO-011), etc.
 * AR: لوحة التحكم الرئيسية على /dashboard. تظهر فقط عند تسجيل الدخول (ProtectedRoute). تنفذ
 *     وجهة ما بعد الدخول (SO-002) وتسجيل الخروج (جدول 8 / SO-015): الخروج يمسح الجلسة ويحوّل
 *     إلى /login. يمكن توسيعها لاحقاً بإعداد المتجر، المنتجات، الطلبات، التقارير، إلخ.
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';

const StoreOwnerDashboardLayout = () => {
  const navigate = useNavigate();

  /** EN: IS498 Table 8 Logout: clear session and redirect to login. AR: جدول 8 تسجيل الخروج: مسح الجلسة والتحويل لصفحة الدخول. */
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('store_owner_id');
    navigate('/login');
  };

  return (
    <div dir="rtl" className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex justify-between items-center">
        <h1 className="text-storelaunch-dark font-bold text-lg">لوحة تحكم التاجر</h1>
        <button
          type="button"
          onClick={handleLogout}
          className="px-4 py-2 bg-storelaunch-dark text-white rounded-md text-sm font-medium hover:bg-storelaunch-teal"
        >
          تسجيل الخروج
        </button>
      </header>
      <main className="p-4 sm:p-6 max-w-4xl mx-auto">
        <p className="text-storelaunch-dark text-xl">مرحباً بك في لوحة التحكم</p>
      </main>
    </div>
  );
};

export default StoreOwnerDashboardLayout;
