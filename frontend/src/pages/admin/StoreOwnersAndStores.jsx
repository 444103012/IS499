import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAllStores, updateStoreStatus } from '../../services/adminStoreApi';
import AdminTablePagination from '../../components/admin/AdminTablePagination';

const PAGE_SIZE = 10;

function StoreStatusBadge({ status }) {
  const raw = String(status || 'Pending').trim();
  const normalized =
    raw.length === 0 ? 'Pending' : raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
  const classes = {
    Active: 'bg-green-100 text-green-800',
    Suspended: 'bg-red-100 text-red-800',
    Pending: 'bg-amber-100 text-amber-800',
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

/** Active / Pending only (for dropdown when store is not suspended). */
function operationalChoice(status) {
  return String(status ?? '')
    .trim()
    .toLowerCase() === 'active'
    ? 'Active'
    : 'Pending';
}

export default function StoreOwnersAndStores() {
  const [stores, setStores] = useState([]);
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

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const storesData = await getAllStores({ page, limit: PAGE_SIZE, search: debouncedSearch });
      setStores(storesData.stores || []);
      setTotal(typeof storesData.total === 'number' ? storesData.total : 0);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const totalPages = total > 0 ? Math.max(1, Math.ceil(total / PAGE_SIZE)) : 1;
    if (page > totalPages) setPage(totalPages);
  }, [total, page]);

  const handleStoreSuspendToggle = async (storeId, status) => {
    const isSuspended = String(status || '').trim().toLowerCase() === 'suspended';
    const action = isSuspended ? 'reactivate' : 'suspend';
    setUpdatingId(storeId);
    setError('');
    try {
      await updateStoreStatus(storeId, action);
      await load();
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        (typeof err.response?.data === 'string' ? err.response.data : null) ||
        err.message ||
        'Failed to update store';
      setError(msg);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleSetOperationalStatus = async (storeId, currentStatus, nextStatus) => {
    if (String(currentStatus || '').trim().toLowerCase() === 'suspended') return;
    if (operationalChoice(currentStatus) === nextStatus) return;
    setUpdatingId(storeId);
    setError('');
    try {
      await updateStoreStatus(storeId, { action: 'set_status', status: nextStatus });
      await load();
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        (typeof err.response?.data === 'string' ? err.response.data : null) ||
        err.message ||
        'Failed to update store status';
      setError(msg);
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading && stores.length === 0 && !error) {
    return (
      <div className="p-4 sm:p-6">
        <p className="text-gray-500">Loading stores…</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <h1 className="text-xl font-bold text-storelaunch-dark">Stores & Owners</h1>
        <input
          type="search"
          placeholder="Search by store, owner, or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-sm px-3 py-2 border border-gray-300 rounded-lg text-sm"
        />
      </div>
      {error ? <p className="mb-4 text-red-600 text-sm">{error}</p> : null}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className={`overflow-x-auto ${loading ? 'opacity-60' : ''}`}>
          <table className="w-full text-left text-sm min-w-[640px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 font-medium text-gray-700">Store Name</th>
                <th className="px-4 py-3 font-medium text-gray-700">Owner Name</th>
                <th className="px-4 py-3 font-medium text-gray-700">Owner Email</th>
                <th className="px-4 py-3 font-medium text-gray-700">Plan</th>
                <th className="px-4 py-3 font-medium text-gray-700">Store Status</th>
                <th className="px-4 py-3 font-medium text-gray-700">Created At</th>
                <th className="px-4 py-3 font-medium text-gray-700 min-w-[200px]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {stores.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    No stores found
                  </td>
                </tr>
              ) : (
                stores.map((s) => {
                  const ownerName = [s.owner_first_name, s.owner_last_name].filter(Boolean).join(' ') || '—';
                  const storeStatus = s.status || 'Pending';
                  const isSuspended = String(storeStatus).trim().toLowerCase() === 'suspended';
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
                      <td className="px-4 py-3">{s.owner_email || '—'}</td>
                      <td className="px-4 py-3 capitalize">{s.plan || '—'}</td>
                      <td className="px-4 py-3">
                        <StoreStatusBadge status={storeStatus} />
                      </td>
                      <td className="px-4 py-3">{formatDate(s.created_at)}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                          {!isSuspended ? (
                            <select
                              aria-label={`Store status for ${s.store_name || 'store'}`}
                              className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 bg-white min-w-[7rem]"
                              value={operationalChoice(storeStatus)}
                              disabled={updatingId === s.store_id || loading}
                              onChange={(e) =>
                                void handleSetOperationalStatus(
                                  s.store_id,
                                  storeStatus,
                                  e.target.value
                                )
                              }
                            >
                              <option value="Active">Active</option>
                              <option value="Pending">Pending</option>
                            </select>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => handleStoreSuspendToggle(s.store_id, storeStatus)}
                            disabled={updatingId === s.store_id || loading}
                            className={`inline-flex items-center justify-center px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                              isSuspended
                                ? 'border-green-600 text-green-700 hover:bg-green-50'
                                : 'border-red-600 text-red-700 hover:bg-red-50'
                            } ${updatingId === s.store_id || loading ? 'opacity-60 cursor-not-allowed' : ''}`}
                          >
                            {isSuspended ? 'Reactivate' : 'Suspend'}
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
