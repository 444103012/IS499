

import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../../context/AdminAuthContext';

const navClass = ({ isActive }) =>
  `block px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
    isActive
      ? 'bg-storelaunch-green text-white'
      : 'text-gray-700 hover:bg-gray-100'
  }`;

export default function AdminSidebar({ mobileOpen = false, onClose = () => {} }) {
  const { admin, logout } = useAdminAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/admin/login', { replace: true });
  };

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-gray-200 min-h-screen flex flex-col transform transition-transform duration-200 lg:static lg:translate-x-0 lg:w-56 ${
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      <div className="p-4 border-b border-gray-100">
        <h2 className="text-storelaunch-dark font-bold text-lg">StoreLaunch</h2>
        <p className="text-xs text-gray-500 mt-0.5">Admin</p>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        <NavLink to="/admin/dashboard" end className={navClass} onClick={onClose}>
          Dashboard
        </NavLink>
        <NavLink to="/admin/dashboard/users" className={navClass} onClick={onClose}>
          Manage Customers
        </NavLink>
        <NavLink to="/admin/dashboard/ModerateStores" className={navClass} onClick={onClose}>
          Moderate Stores
        </NavLink>

        <NavLink to="/admin/dashboard/platform" className={navClass} onClick={onClose}>
          Platform Settings
        </NavLink>
      </nav>
      <div className="p-3 border-t border-gray-100">
        <p className="text-xs text-gray-500 px-4 truncate" title={admin?.email}>
          {admin?.email}
        </p>
        <button
          type="button"
          onClick={handleLogout}
          className="mt-2 w-full px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
        >
          Logout
        </button>
      </div>
    </aside>
  );
}
