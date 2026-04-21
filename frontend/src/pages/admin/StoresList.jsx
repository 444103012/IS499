

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAllStores, updateStoreStatus } from '../../services/adminStoreApi';

function StatusBadge({ status }) {
  const normalized = status || 'Pending';
  const classes = {
    Active: 'bg-green-100 text-green-800',
    Suspended: 'bg-red-100 text-red-800',
    Pending: 'bg-yellow-100 text-yellow-800',
  };
  return (
    <span
      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
        classes[normalized] || 'bg-gray-100 text-gray-800'
      }`}
    >
      {normalized}
    </span>
  );
}

function formatDate(d) {
  if (!d) return '—';
  const date = new Date(d);
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function StoresList() {
  const [stores, setStores] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState(null);

  useEffect(() => {
    getAllStores()
      .then((rows) => {
        setStores(rows);
      })
      .catch((err) => {
        setError(err.response?.data?.error || err.message || 'Failed to load stores');
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!search.trim()) {
      setFiltered(stores);
      return;
    }
    const q = search.trim().toLowerCase();
    setFiltered(
      stores.filter((s) => {
        const ownerName = [s.owner_first_name, s.owner_last_name].filter(Boolean).join(' ');
        return (
          (s.store_name && s.store_name.toLowerCase().includes(q)) ||
          (ownerName && ownerName.toLowerCase().includes(q)) ||
          (s.plan && String(s.plan).toLowerCase().includes(q))
        );
      })
    );
  }, [stores, search]);

  const handleToggleStatus = async (store_id, currentStatus) => {
    const nextStatus = currentStatus === 'Suspended' ? 'Active' : 'Suspended';
    setUpdatingId(store_id);
    try {
      await updateStoreStatus(store_id, nextStatus);
      setStores((prev) =>
        prev.map((s) => (s.store_id === store_id ? { ...s, status: nextStatus } : s))
      );
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to update status');
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-gray-500">Loading stores...</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <h1 className="text-xl font-bold text-storelaunch-dark">Moderate Stores</h1>
        <div className="w-full sm:w-auto">
          <input
            type="search"
            placeholder="Search by store, owner, or plan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-72 px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>
      </div>
      {error && (
        <p className="mb-4 text-red-600 text-sm">{error}</p>
      )}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 font-medium text-gray-700">Store Name</th>
                <th className="px-4 py-3 font-medium text-gray-700">Owner</th>
                <th className="px-4 py-3 font-medium text-gray-700">Plan</th>
                <th className="px-4 py-3 font-medium text-gray-700">Status</th>
                <th className="px-4 py-3 font-medium text-gray-700">Created At</th>
                <th className="px-4 py-3 font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    No stores found
                  </td>
                </tr>
              ) : (
                filtered.map((s) => {
                  const ownerName = [s.owner_first_name, s.owner_last_name]
                    .filter(Boolean)
                    .join(' ') || '—';
                  const status = s.status || 'Pending';
                  const isSuspended = status === 'Suspended';
                  const actionLabel = isSuspended ? 'Reactivate' : 'Suspend';
                  return (
                    <tr key={s.store_id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <Link
                          to={`/admin/dashboard/stores/${s.store_id}`}
                          className="text-storelaunch-green hover:underline font-medium"
                        >
                          {s.store_name || '—'}
                        </Link>
                      </td>
                      <td className="px-4 py-3">{ownerName}</td>
                      <td className="px-4 py-3 capitalize">{s.plan || '—'}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={status} />
                      </td>
                      <td className="px-4 py-3">{formatDate(s.created_at)}</td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(s.store_id, status)}
                          disabled={updatingId === s.store_id}
                          className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                            isSuspended
                              ? 'border-green-600 text-green-700 hover:bg-green-50'
                              : 'border-red-600 text-red-700 hover:bg-red-50'
                          } ${updatingId === s.store_id ? 'opacity-60 cursor-not-allowed' : ''}`}
                        >
                          {actionLabel}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

