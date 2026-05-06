import React, { useCallback, useEffect, useState } from 'react';
import { getOperationsSummary, getPendingCustomerRequests } from '../../services/adminOperationsApi';
import {
  DetailDisclosure,
  ErrorHandlingDetailChrome,
  formatDateTime,
  formatOrderReference,
  OpenStoreLink,
  safeJson,
} from './monitoringShared';

const PAYLOAD_MESSAGE_KEYS = ['reason', 'message', 'comment', 'notes', 'details', 'description'];

function requestTitle(actionType) {
  const a = String(actionType || '').toLowerCase();
  if (a === 'cancel_request' || a === 'cancel') return 'Cancellation';
  if (a === 'return_request' || a === 'return') return 'Return';
  return 'Request';
}

function parsePayloadObject(payload) {
  if (payload == null) return null;
  if (typeof payload === 'object') return payload;
  if (typeof payload === 'string') {
    try {
      return JSON.parse(payload);
    } catch {
      return null;
    }
  }
  return null;
}

const NO_REASON = '(no reason provided)';

/** First non-empty string among common payload keys (cancel/return use `reason` today). */
function customerRequestMessage(payload) {
  const obj = parsePayloadObject(payload);
  if (!obj || typeof obj !== 'object') return NO_REASON;
  for (const key of PAYLOAD_MESSAGE_KEYS) {
    const v = obj[key];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return NO_REASON;
}

function snippet(payload) {
  const full = customerRequestMessage(payload);
  if (full.length > 120) return `${full.slice(0, 120)}…`;
  return full;
}

export default function AdminErrorHandlingCustomerRequestsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [count, setCount] = useState(null);
  const [data, setData] = useState({ items: [], tableMissing: false });

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [sum, req] = await Promise.all([getOperationsSummary(), getPendingCustomerRequests({ limit: 80 })]);
      setCount(sum?.pending_customer_order_requests ?? null);
      setData(req);
    } catch (e) {
      setError(e.response?.data?.error || e.message || 'Load failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <ErrorHandlingDetailChrome
      title="Customer requests (returns & cancellations)"
      loading={loading}
      error={error}
      tableMissing={data.tableMissing}
      onRefresh={() => void load()}
    >
      {loading ? (
        <p className="text-sm text-gray-600">Loading…</p>
      ) : count != null ? (
        <p className="text-sm text-gray-600 tabular-nums">
          {count} open · {data.items.length} shown (max 80)
        </p>
      ) : error ? null : (
        <p className="text-sm text-gray-500">—</p>
      )}
      {!loading && !data.tableMissing && !data.items.length ? (
        <p className="text-sm text-gray-600">None.</p>
      ) : null}
      {!loading && !data.tableMissing && data.items.length > 0 ? (
        <ul className="divide-y divide-gray-200 rounded-xl border border-gray-200 bg-white">
          {data.items.map((row) => {
            const sn = snippet(row.payload);
            const fm = customerRequestMessage(row.payload);
            const detailRows = [
              { label: 'Type', value: requestTitle(row.action_type) },
              { label: 'Message', value: fm },
            ];
            return (
              <li key={row.id} className="px-4 py-3">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                  <div className="min-w-0 text-sm space-y-0.5">
                    <p className="font-semibold text-gray-900">{row.store_name || '—'}</p>
                    <p>
                      <span className="text-gray-800">{requestTitle(row.action_type)}</span>
                      <span className="text-gray-400 mx-1">·</span>
                      <span className="text-gray-800">{formatOrderReference(row)}</span>
                    </p>
                    <p className="text-gray-600">&ldquo;{sn}&rdquo;</p>
                    <p className="text-xs text-gray-500">{formatDateTime(row.created_at)}</p>
                    {row.customer_email ? <p className="text-xs text-gray-500">{row.customer_email}</p> : null}
                  </div>
                  <OpenStoreLink storeId={row.store_id} />
                </div>
                <DetailDisclosure rows={detailRows} copyPayload={safeJson(row)} />
              </li>
            );
          })}
        </ul>
      ) : null}
    </ErrorHandlingDetailChrome>
  );
}
