

import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../../context/AdminAuthContext';

const navClass = ({ isActive }) =>
  `block px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
    isActive
      ? 'bg-storelaunch-green text-white'
      : 'text-gray-700 hover:bg-gray-100'
  }`;

export default function AdminSidebar() {
  const { admin, logout } = useAdminAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/admin/login', { replace: true });
  };

  return (
    <aside className="w-56 bg-white border-r border-gray-200 min-h-screen flex flex-col">
      <div className="p-4 border-b border-gray-100">
        <h2 className="text-storelaunch-dark font-bold text-lg">StoreLaunch</h2>
        <p className="text-xs text-gray-500 mt-0.5">Admin</p>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        <NavLink to="/admin/dashboard" end className={navClass}>
          Dashboard
        </NavLink>
        <NavLink to="/admin/dashboard/users" className={navClass}>
          Manage Users
        </NavLink>
        <NavLink to="/admin/dashboard/store-owners" className={navClass}>
          Manage Store Owners
        </NavLink>
        <NavLink to="/admin/dashboard/stores" className={navClass}>
          Moderate Stores
        </NavLink>
        <NavLink to="/admin/dashboard/platform" className={navClass}>
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
