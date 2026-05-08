



import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getAllStoreOwners, updateStoreOwnerStatus, accessStoreOwnerAsAdmin } from '../../services/adminManagementApi';
import AdminTablePagination from '../../components/admin/AdminTablePagination';

const STATUS_OPTIONS = ['Active', 'Suspended', 'Disabled'];
const PAGE_SIZE = 10;

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

export default function ManageStoreOwners() {
  const [owners, setOwners] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const lastAppliedSearchRef = useRef(search.trim());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState(null);
  const [accessingId, setAccessingId] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => {
      const trimmed = search.trim();
      setDebouncedSearch(trimmed);
      if (lastAppliedSearchRef.current !== trimmed) {
        lastAppliedSearchRef.current = trimmed;
        setPage(1);
      }
    }, 280);
    return () => clearTimeout(t);
  }, [search]);

  const fetchOwners = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getAllStoreOwners({ page, limit: PAGE_SIZE, search: debouncedSearch });
      setOwners(data.store_owners);
      setTotal(data.total);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch]);

  useEffect(() => {
    fetchOwners();
  }, [fetchOwners]);

  useEffect(() => {
    const totalPages = total > 0 ? Math.max(1, Math.ceil(total / PAGE_SIZE)) : 1;
    if (page > totalPages) setPage(totalPages);
  }, [total, page]);

  const handleStatusChange = async (owner_id, newStatus) => {
    setUpdatingId(owner_id);
    try {
      await updateStoreOwnerStatus(owner_id, newStatus);
      await fetchOwners();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleAccessOwner = async (ownerId) => {
    setAccessingId(ownerId);
    setError('');
    try {
      const access = await accessStoreOwnerAsAdmin(ownerId);
      localStorage.setItem('admin_token_backup', localStorage.getItem('admin_token') || '');
      localStorage.setItem('token', access.token);
      localStorage.removeItem('customer_token');
      localStorage.removeItem('user_type');
      window.location.assign(access.redirect_to || '/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to access store owner account');
    } finally {
      setAccessingId(null);
    }
  };

  if (loading && owners.length === 0 && !error) {
    return (
      <div className="p-4 sm:p-6">
        <p className="text-gray-500">Loading store owners...</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      <h1 className="text-xl font-bold text-storelaunch-dark mb-4">Manage Store Owners</h1>
      {error && (
        <p className="mb-4 text-red-600 text-sm">{error}</p>
      )}
      <div className="mb-4">
        <input
          type="search"
          placeholder="Search by name, email, or store..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg text-sm"
        />
      </div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className={`overflow-x-auto ${loading ? 'opacity-60' : ''}`}>
          <table className="w-full text-left text-sm min-w-[700px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 font-medium text-gray-700">Name</th>
                <th className="px-4 py-3 font-medium text-gray-700">Email</th>
                <th className="px-4 py-3 font-medium text-gray-700">Store</th>
                <th className="px-4 py-3 font-medium text-gray-700">Status</th>
                <th className="px-4 py-3 font-medium text-gray-700">Created</th>
                <th className="px-4 py-3 font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {owners.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    No store owners found
                  </td>
                </tr>
              ) : (
                owners.map((o) => (
                  <tr key={o.owner_id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      {[o.first_name, o.last_name].filter(Boolean).join(' ') || '—'}
                    </td>
                    <td className="px-4 py-3">{o.email || '—'}</td>
                    <td className="px-4 py-3">{o.store_name || '—'}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={o.status} />
                    </td>
                    <td className="px-4 py-3">{formatDate(o.created_at)}</td>
                    <td className="px-4 py-3">
                      <select
                        value={o.status || 'Active'}
                        onChange={(e) => handleStatusChange(o.owner_id, e.target.value)}
                        disabled={updatingId === o.owner_id || loading}
                        className="text-sm border border-gray-300 rounded px-2 py-1"
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => handleAccessOwner(o.owner_id)}
                        disabled={accessingId === o.owner_id || loading}
                        className={`mt-2 sm:mt-0 sm:ml-2 text-xs border border-storelaunch-green text-storelaunch-green px-2 py-1 rounded ${
                          accessingId === o.owner_id || loading ? 'opacity-60 cursor-not-allowed' : 'hover:bg-green-50'
                        }`}
                      >
                        Access
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <AdminTablePagination
          page={page}
          total={total}
          limit={PAGE_SIZE}
          loading={loading}
          itemLabel="store owners"
          onPageChange={setPage}
        />
      </div>
    </div>
  );
}
