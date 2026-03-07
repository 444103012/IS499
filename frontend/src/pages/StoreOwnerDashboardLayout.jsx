import React from 'react';
import { useNavigate } from 'react-router-dom';

const StoreOwnerDashboardLayout = () => {
  const navigate = useNavigate();

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
