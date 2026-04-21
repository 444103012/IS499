

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axiosInstance from '../api/axios';

const ADMIN_TOKEN_KEY = 'admin_token';
const ADMIN_USER_KEY = 'admin_user';

const AdminAuthContext = createContext(null);

export function AdminAuthProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadSession = useCallback(async () => {
    const token = localStorage.getItem(ADMIN_TOKEN_KEY);
    if (!token) {
      setAdmin(null);
      setLoading(false);
      return;
    }
    try {
      const { data } = await axiosInstance.get('/api/admin/auth/me');
      setAdmin(data.admin || { id: data.admin_id, ...data });
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(data.admin || { id: data.admin_id, ...data }));
      }
    } catch {
      localStorage.removeItem(ADMIN_TOKEN_KEY);
      localStorage.removeItem(ADMIN_USER_KEY);
      setAdmin(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  const login = useCallback(async (email, password) => {
    const { data } = await axiosInstance.post('/api/admin/auth/login', { email, password });
    localStorage.setItem(ADMIN_TOKEN_KEY, data.token);
    const adminData = data.admin || { id: data.admin_id, name: data.name, email: data.email, role: data.role };
    localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(adminData));
    setAdmin(adminData);
    return data;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    localStorage.removeItem(ADMIN_USER_KEY);
    setAdmin(null);
  }, []);

  const value = {
    admin,
    isAuthenticated: !!admin,
    loading,
    login,
    logout,
    loadSession,
  };

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) {
    throw new Error('useAdminAuth must be used within AdminAuthProvider');
  }
  return ctx;
}

export default AdminAuthContext;
