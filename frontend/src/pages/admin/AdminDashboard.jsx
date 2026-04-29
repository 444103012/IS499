

import React, { useState, useEffect } from 'react';
import { getDashboardStats } from '../../services/adminManagementApi';

function StatCard({ title, value, loading }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
      <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">{title}</p>
      {loading ? (
        <div className="h-8 w-16 mt-2 bg-gray-200 rounded animate-pulse" />
      ) : (
        <p className="text-2xl font-bold text-storelaunch-dark mt-1">{value}</p>
      )}
    </div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getDashboardStats()
      .then(setStats)
      .catch((err) => setError(err.response?.data?.error || err.message))
      .finally(() => setLoading(false));
  }, []);

  if (error) {
    return (
      <div className="p-6">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold text-storelaunch-dark mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Users" value={stats?.total_users} loading={loading} />
        <StatCard title="Total Store Owners" value={stats?.total_store_owners} loading={loading} />
        <StatCard title="Total Stores" value={stats?.total_stores} loading={loading} />
        <StatCard title="Total Products" value={stats?.total_products} loading={loading} />
      </div>
    </div>
  );
}
