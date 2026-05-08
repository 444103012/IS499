

import React, { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';

export default function AdminLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!mobileMenuOpen) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileMenuOpen]);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {mobileMenuOpen ? (
        <button
          type="button"
          aria-label="Close admin menu"
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      ) : null}
      <AdminSidebar mobileOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
      <main className="flex-1 overflow-auto min-w-0">
        <header className="sticky top-0 z-20 lg:hidden border-b border-gray-200 bg-white/95 backdrop-blur px-4 py-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700"
          >
            Menu
          </button>
          <p className="text-sm font-semibold text-storelaunch-dark">Admin</p>
        </header>
        <Outlet />
      </main>
    </div>
  );
}
