

import React, { useState, useEffect } from 'react';
import { getAllUsers, updateUserStatus } from '../../services/adminManagementApi';

const STATUS_OPTIONS = ['Active', 'Suspended', 'Disabled'];

function StatusBadge({ status }) {
  const classes = {
    Active: 'bg-green-100 text-green-800',
    Suspended: 'bg-yellow-100 text-yellow-800',
    Disabled: 'bg-red-100 text-red-800',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${classes[status] || 'bg-gray-100 text-gray-800'}`}>
      {status || 'Active'}
    </span>
  );
}

function formatDate(d) {
  if (!d) return '—';
  const date = new Date(d);
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function ManageUsers() {
  const [users, setUsers] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState(null);

  useEffect(() => {
    getAllUsers()
      .then(setUsers)
      .catch((err) => setError(err.response?.data?.error || err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!search.trim()) {
      setFiltered(users);
      return;
    }
    const q = search.trim().toLowerCase();
    setFiltered(
      users.filter(
        (u) =>
          (u.first_name && u.first_name.toLowerCase().includes(q)) ||
          (u.last_name && u.last_name.toLowerCase().includes(q)) ||
          (u.email && u.email.toLowerCase().includes(q))
      )
    );
  }, [users, search]);

  const handleStatusChange = async (customer_id, newStatus) => {
    setUpdatingId(customer_id);
    try {
      await updateUserStatus(customer_id, newStatus);
      setUsers((prev) =>
        prev.map((u) => (u.customer_id === customer_id ? { ...u, status: newStatus } : u))
      );
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-gray-500">Loading users...</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold text-storelaunch-dark mb-4">Manage Users</h1>
      {error && (
        <p className="mb-4 text-red-600 text-sm">{error}</p>
      )}
      <div className="mb-4">
        <input
          type="search"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg text-sm"
        />
      </div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 font-medium text-gray-700">Name</th>
                <th className="px-4 py-3 font-medium text-gray-700">Email</th>
                <th className="px-4 py-3 font-medium text-gray-700">Status</th>
                <th className="px-4 py-3 font-medium text-gray-700">Created</th>
                <th className="px-4 py-3 font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    No users found
                  </td>
                </tr>
              ) : (
                filtered.map((u) => (
                  <tr key={u.customer_id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      {[u.first_name, u.last_name].filter(Boolean).join(' ') || '—'}
                    </td>
                    <td className="px-4 py-3">{u.email || '—'}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={u.status} />
                    </td>
                    <td className="px-4 py-3">{formatDate(u.created_at)}</td>
                    <td className="px-4 py-3">
                      <select
                        value={u.status || 'Active'}
                        onChange={(e) => handleStatusChange(u.customer_id, e.target.value)}
                        disabled={updatingId === u.customer_id}
                        className="text-sm border border-gray-300 rounded px-2 py-1"
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
