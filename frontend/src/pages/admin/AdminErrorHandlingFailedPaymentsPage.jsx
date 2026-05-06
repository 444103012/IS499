import React, { useCallback, useEffect, useState } from 'react';
import { getCheckoutPaymentIssues, getOperationsSummary } from '../../services/adminOperationsApi';
import {
  DetailDisclosure,
  ErrorHandlingDetailChrome,
  formatDateTime,
  formatOrderReference,
  OpenStoreLink,
  safeJson,
} from './monitoringShared';

export default function AdminErrorHandlingFailedPaymentsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [count, setCount] = useState(null);
  const [data, setData] = useState({ items: [], tableMissing: false });

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [sum, pay] = await Promise.all([getOperationsSummary(), getCheckoutPaymentIssues({ limit: 80 })]);
      setCount(sum?.failed_checkout_payments ?? null);
      setData(pay);
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
      title="Failed payments"
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
          {data.items.map((row) => (
            <li key={`${row.payment_id}-${row.order_id}`} className="px-4 py-3">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                <div className="min-w-0 text-sm space-y-0.5">
                  <p className="font-semibold text-gray-900">{row.store_name || '—'}</p>
                  <p>
                    <span className="text-gray-800">{formatOrderReference(row)}</span>
                    <span className="text-gray-400 mx-1">·</span>
                    <span className="text-gray-700">Failed</span>
                  </p>
                  <p className="text-xs text-gray-500">{formatDateTime(row.payment_created_at)}</p>
                  {row.customer_email ? <p className="text-xs text-gray-500">{row.customer_email}</p> : null}
                </div>
                <OpenStoreLink storeId={row.store_id} />
              </div>
              <DetailDisclosure
                rows={[
                  { label: 'Status', value: row.payment_status },
                  { label: 'Method', value: row.method || '—' },
                  { label: 'Provider ref', value: row.provider_ref || '—' },
                ]}
                copyPayload={safeJson({
                  order_id: row.order_id,
                  store_order_seq: row.store_order_seq,
                  store_id: row.store_id,
                  payment_id: row.payment_id,
                  payment_status: row.payment_status,
                  method: row.method,
                  provider_ref: row.provider_ref,
                })}
              />
            </li>
          ))}
        </ul>
      ) : null}
    </ErrorHandlingDetailChrome>
  );
}
