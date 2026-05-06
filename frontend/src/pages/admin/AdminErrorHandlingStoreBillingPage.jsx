import React, { useCallback, useEffect, useState } from 'react';
import { getOperationsSummary, getStoreActivationFailures } from '../../services/adminOperationsApi';
import {
  DetailDisclosure,
  ErrorHandlingDetailChrome,
  formatDateTime,
  OpenStoreLink,
  safeJson,
} from './monitoringShared';

export default function AdminErrorHandlingStoreBillingPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [count, setCount] = useState(null);
  const [data, setData] = useState({ items: [], tableMissing: false });

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [sum, act] = await Promise.all([getOperationsSummary(), getStoreActivationFailures({ limit: 80 })]);
      setCount(sum?.failed_store_activation_attempts ?? null);
      setData(act);
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
      title="Store billing failures"
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
            <li key={row.id} className="px-4 py-3">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                <div className="min-w-0 text-sm space-y-0.5">
                  <p className="font-semibold text-gray-900">{row.store_name || '—'}</p>
                  <p className="text-gray-700">{row.error_message || 'Failed'}</p>
                  <p className="text-xs text-gray-500">{formatDateTime(row.attempted_at)}</p>
                </div>
                <OpenStoreLink storeId={row.store_id} />
              </div>
              <DetailDisclosure
                rows={[
                  { label: 'Method', value: row.payment_method || '—' },
                  { label: 'Amount (SAR)', value: row.amount_sar != null ? String(row.amount_sar) : '—' },
                  { label: 'Transaction ref', value: row.transaction_ref || '—' },
                ]}
                copyPayload={safeJson(row)}
              />
            </li>
          ))}
        </ul>
      ) : null}
    </ErrorHandlingDetailChrome>
  );
}
