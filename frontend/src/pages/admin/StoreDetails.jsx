



import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getStoreById,
  updateStoreStatus,
  sendStoreNotification,
} from '../../services/adminStoreApi';

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
  return date.toLocaleString();
}

function operationalChoice(status) {
  return String(status ?? '')
    .trim()
    .toLowerCase() === 'active'
    ? 'Active'
    : 'Pending';
}

function progressLabel(step) {
  if (!step || step <= 0) return 'Not started';
  if (step === 1) return 'Store details completed';
  if (step === 2) return 'Plan selected';
  if (step === 3) return 'Theme selected';
  if (step === 4) return 'Payment configured';
  if (step >= 5) return 'Setup completed';
  return `Step ${step}`;
}

export default function StoreDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [notifying, setNotifying] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [notificationResult, setNotificationResult] = useState('');

  useEffect(() => {
    if (!id) return;
    getStoreById(id)
      .then((res) => {
        setData(res);
      })
      .catch((err) => {
        setError(err.response?.data?.error || err.message || 'Failed to load store');
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleBack = () => {
    navigate('/admin/dashboard/store-owners');
  };

  const handleToggleStatus = async () => {
    if (!data || !data.store) return;
    const currentStatus = data.store.status || 'Pending';
    const action =
      String(currentStatus).trim().toLowerCase() === 'suspended' ? 'reactivate' : 'suspend';
    setUpdatingStatus(true);
    setError('');
    try {
      await updateStoreStatus(data.store.store_id, action);
      const refreshed = await getStoreById(data.store.store_id);
      setData(refreshed);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to update status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleSetOperationalStatus = async (nextStatus) => {
    if (!data || !data.store) return;
    const currentStatus = data.store.status || 'Pending';
    if (String(currentStatus).trim().toLowerCase() === 'suspended') return;
    if (operationalChoice(currentStatus) === nextStatus) return;
    setUpdatingStatus(true);
    setError('');
    try {
      await updateStoreStatus(data.store.store_id, { action: 'set_status', status: nextStatus });
      const refreshed = await getStoreById(data.store.store_id);
      setData(refreshed);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to update store status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleSendNotification = async (e) => {
    e.preventDefault();
    if (!notificationMessage.trim()) {
      setNotificationResult('Please enter a message before sending.');
      return;
    }
    if (!data || !data.store) return;
    setNotifying(true);
    setNotificationResult('');
    setError('');
    try {
      const res = await sendStoreNotification(data.store.store_id, notificationMessage.trim());
      setNotificationResult(res.message || 'Notification simulated.');
      setNotificationMessage('');
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to send notification');
    } finally {
      setNotifying(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-6">
        <p className="text-gray-500">Loading store details...</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="p-4 sm:p-6">
        <button
          type="button"
          onClick={handleBack}
          className="mb-4 text-sm text-storelaunch-green hover:underline"
        >
          ← Back to stores & owners
        </button>
        <p className="text-red-600 text-sm">{error}</p>
      </div>
    );
  }

  const store = data?.store;
  const owner = data?.owner;
  const plan = data?.plan;
  const setupStep = data?.setup_progress?.step || owner?.setup_step || 0;
  const status = store?.status || 'Pending';
  const isSuspended = String(status).trim().toLowerCase() === 'suspended';
  const actionLabel = isSuspended ? 'Reactivate Store' : 'Suspend Store';

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <button
        type="button"
        onClick={handleBack}
        className="text-sm text-storelaunch-green hover:underline"
      >
        ← Back to stores & owners
      </button>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-storelaunch-dark">
            {store?.store_name || 'Store'}
          </h1>
          <p className="text-sm text-gray-500">
            Store ID #{store?.store_id} • Created {formatDate(store?.created_at)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge status={status} />
          {!isSuspended ? (
            <select
              aria-label="Set store to Active or Pending"
              className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 bg-white w-full sm:w-auto"
              value={operationalChoice(status)}
              disabled={updatingStatus}
              onChange={(e) => void handleSetOperationalStatus(e.target.value)}
            >
              <option value="Active">Active</option>
              <option value="Pending">Pending</option>
            </select>
          ) : null}
          <button
            type="button"
            onClick={handleToggleStatus}
            disabled={updatingStatus}
            className={`inline-flex items-center justify-center w-full sm:w-auto px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
              isSuspended
                ? 'border-green-600 text-green-700 hover:bg-green-50'
                : 'border-red-600 text-red-700 hover:bg-red-50'
            } ${updatingStatus ? 'opacity-60 cursor-not-allowed' : ''}`}
          >
            {actionLabel}
          </button>
        </div>
      </div>

      {error && (
        <p className="text-red-600 text-sm">{error}</p>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
          <h2 className="text-sm font-semibold text-gray-800">Store Information</h2>
          {store?.logo && (
            <img
              src={store.logo}
              alt={store.store_name || 'Store logo'}
              className="w-20 h-20 object-cover rounded-md border border-gray-200"
            />
          )}
          <div className="text-sm space-y-1">
            <p>
              <span className="font-medium text-gray-700">Name:</span>{' '}
              {store?.store_name || '—'}
            </p>
            <p>
              <span className="font-medium text-gray-700">Type:</span>{' '}
              {store?.store_type || '—'}
            </p>
            <p>
              <span className="font-medium text-gray-700">Theme:</span>{' '}
              {store?.theme || 'Default'}
            </p>
            <p>
              <span className="font-medium text-gray-700">Description:</span>{' '}
              {store?.description || '—'}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
          <h2 className="text-sm font-semibold text-gray-800">Owner Information</h2>
          <div className="text-sm space-y-1">
            <p>
              <span className="font-medium text-gray-700">Name:</span>{' '}
              {[owner?.first_name, owner?.last_name].filter(Boolean).join(' ') || '—'}
            </p>
            <p>
              <span className="font-medium text-gray-700">Email:</span>{' '}
              {owner?.email || '—'}
            </p>
            <p>
              <span className="font-medium text-gray-700">Phone:</span>{' '}
              {owner?.phone || '—'}
            </p>
            <p>
              <span className="font-medium text-gray-700">Setup Progress:</span>{' '}
              {progressLabel(setupStep)}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-2">
          <h2 className="text-sm font-semibold text-gray-800">Plan Information</h2>
          <div className="text-sm space-y-1">
            <p>
              <span className="font-medium text-gray-700">Store Status:</span>{' '}
              {status}
            </p>
            <p>
              <span className="font-medium text-gray-700">Plan:</span>{' '}
              {plan?.plan_type ? plan.plan_type : '—'}
            </p>
            {plan && (
              <>
                <p>
                  <span className="font-medium text-gray-700">Subscription Status:</span>{' '}
                  {plan.status || '—'}
                </p>
                <p>
                  <span className="font-medium text-gray-700">Start Date:</span>{' '}
                  {formatDate(plan.start_date)}
                </p>
                <p>
                  <span className="font-medium text-gray-700">End Date:</span>{' '}
                  {plan.end_date ? formatDate(plan.end_date) : '—'}
                </p>
              </>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
          <h2 className="text-sm font-semibold text-gray-800">Notify Store Owner (Optional)</h2>
          <p className="text-xs text-gray-500">
            Send a short explanation when suspending or reactivating a store. This only simulates
            a notification for now.
          </p>
          <form onSubmit={handleSendNotification} className="space-y-2">
            <textarea
              rows={3}
              value={notificationMessage}
              onChange={(e) => setNotificationMessage(e.target.value)}
              placeholder="Your store was suspended due to..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none"
            />
            <div className="flex items-center justify-between gap-2">
              <button
                type="submit"
                disabled={notifying}
                className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-storelaunch-green hover:bg-emerald-600 ${
                  notifying ? 'opacity-60 cursor-not-allowed' : ''
                }`}
              >
                {notifying ? 'Sending...' : 'Send Notification'}
              </button>
              {notificationResult && (
                <p className="text-xs text-gray-600">{notificationResult}</p>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

