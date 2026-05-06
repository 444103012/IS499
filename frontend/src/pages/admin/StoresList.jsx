



import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { getAllStores, updateStoreStatus, accessStoreAsAdmin } from '../../services/adminStoreApi';
import AdminTablePagination from '../../components/admin/AdminTablePagination';

const PAGE_SIZE = 10;

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

function operationalChoice(status) {
  return String(status ?? '')
    .trim()
    .toLowerCase() === 'active'
    ? 'Active'
    : 'Pending';
}

export default function StoresList() {
  const [stores, setStores] = useState([]);
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

  const fetchStores = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getAllStores({ page, limit: PAGE_SIZE, search: debouncedSearch });
      setStores(data.stores);
      setTotal(data.total);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to load stores');
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch]);

  useEffect(() => {
    fetchStores();
  }, [fetchStores]);

  useEffect(() => {
    const totalPages = total > 0 ? Math.max(1, Math.ceil(total / PAGE_SIZE)) : 1;
    if (page > totalPages) setPage(totalPages);
  }, [total, page]);

  const handleToggleStatus = async (store_id, currentStatus) => {
    const isSuspended = String(currentStatus ?? '').trim().toLowerCase() === 'suspended';
    const action = isSuspended ? 'reactivate' : 'suspend';
    setUpdatingId(store_id);
    try {
      await updateStoreStatus(store_id, action);
      await fetchStores();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to update status');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleSetOperationalStatus = async (store_id, currentStatus, nextStatus) => {
    if (String(currentStatus ?? '').trim().toLowerCase() === 'suspended') return;
    if (operationalChoice(currentStatus) === nextStatus) return;
    setUpdatingId(store_id);
    setError('');
    try {
      await updateStoreStatus(store_id, { action: 'set_status', status: nextStatus });
      await fetchStores();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to update store status');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleAccessStore = async (storeId) => {
    setAccessingId(storeId);
    setError('');
    try {
      const access = await accessStoreAsAdmin(storeId);
      localStorage.setItem('admin_token_backup', localStorage.getItem('admin_token') || '');
      localStorage.setItem('token', access.token);
      localStorage.removeItem('customer_token');
      localStorage.removeItem('user_type');
      window.location.assign(access.redirect_to || '/dashboard/store');
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to access store');
    } finally {
      setAccessingId(null);
    }
  };

  if (loading && stores.length === 0 && !error) {
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
        <div className={`overflow-x-auto ${loading ? 'opacity-60' : ''}`}>
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
              {stores.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    No stores found
                  </td>
                </tr>
              ) : (
                stores.map((s) => {
                  const ownerName = [s.owner_first_name, s.owner_last_name]
                    .filter(Boolean)
                    .join(' ') || '—';
                  const status = s.status || 'Pending';
                  const isSuspended = String(status).trim().toLowerCase() === 'suspended';
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
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-wrap">
                          {!isSuspended ? (
                            <select
                              aria-label={`Store status for ${s.store_name || 'store'}`}
                              className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 bg-white min-w-[7rem]"
                              value={operationalChoice(status)}
                              disabled={updatingId === s.store_id || loading}
                              onChange={(e) =>
                                void handleSetOperationalStatus(s.store_id, status, e.target.value)
                              }
                            >
                              <option value="Active">Active</option>
                              <option value="Pending">Pending</option>
                            </select>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(s.store_id, status)}
                            disabled={updatingId === s.store_id || loading}
                            className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                              isSuspended
                                ? 'border-green-600 text-green-700 hover:bg-green-50'
                                : 'border-red-600 text-red-700 hover:bg-red-50'
                            } ${updatingId === s.store_id || loading ? 'opacity-60 cursor-not-allowed' : ''}`}
                          >
                            {actionLabel}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAccessStore(s.store_id)}
                            disabled={accessingId === s.store_id || loading}
                            className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold border border-storelaunch-green text-storelaunch-green transition-colors ${
                              accessingId === s.store_id || loading ? 'opacity-60 cursor-not-allowed' : 'hover:bg-green-50'
                            }`}
                          >
                            Access
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <AdminTablePagination
          page={page}
          total={total}
          limit={PAGE_SIZE}
          loading={loading}
          itemLabel="stores"
          onPageChange={setPage}
        />
      </div>
    </div>
  );
}
