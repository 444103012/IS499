

import React from 'react';
import { useAdminAuth } from '../../context/AdminAuthContext';

export default function AdminDashboardPage() {
  const { admin, logout } = useAdminAuth();

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-8">
        <h1 className="text-storelaunch-dark text-xl sm:text-2xl font-bold">Admin Dashboard</h1>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
          <span className="text-gray-600 text-sm break-all">{admin?.email}</span>
          <button
            type="button"
            onClick={logout}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100"
          >
            Sign out
          </button>
        </div>
      </header>
      <main className="bg-white rounded-xl shadow p-6">
        <p className="text-gray-600">Welcome, {admin?.name || admin?.email}. Admin dashboard content goes here.</p>
      </main>
    </div>
  );
}
