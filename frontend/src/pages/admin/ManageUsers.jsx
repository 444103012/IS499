



import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getAllUsers, updateUserStatus } from '../../services/adminManagementApi';
import AdminTablePagination from '../../components/admin/AdminTablePagination';

const STATUS_OPTIONS = ['Active', 'Suspended'];
const PAGE_SIZE = 10;

function StatusBadge({ status }) {
  const classes = {
    Active: 'bg-green-100 text-green-800',
    Suspended: 'bg-yellow-100 text-yellow-800',
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
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const lastAppliedSearchRef = useRef(search.trim());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState(null);
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

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getAllUsers({ page, limit: PAGE_SIZE, search: debouncedSearch });
      setUsers(data.users);
      setTotal(data.total);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    const totalPages = total > 0 ? Math.max(1, Math.ceil(total / PAGE_SIZE)) : 1;
    if (page > totalPages) setPage(totalPages);
  }, [total, page]);

  const handleStatusChange = async (customer_id, newStatus) => {
    setUpdatingId(customer_id);
    try {
      await updateUserStatus(customer_id, newStatus);
      await fetchUsers();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading && users.length === 0 && !error) {
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
        <div className={`overflow-x-auto ${loading ? 'opacity-60' : ''}`}>
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
              {users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((u) => (
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
                        disabled={updatingId === u.customer_id || loading}
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
        <AdminTablePagination
          page={page}
          total={total}
          limit={PAGE_SIZE}
          loading={loading}
          itemLabel="users"
          onPageChange={setPage}
        />
      </div>
    </div>
  );
}
