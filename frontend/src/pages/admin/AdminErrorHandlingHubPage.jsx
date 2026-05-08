import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getOperationsSummary } from '../../services/adminOperationsApi';
import { BTN_SECONDARY } from './monitoringShared';

const BASE = '/admin/dashboard/error-handling';

function SummaryCard({ to, title, count, subtitle, loading }) {
  return (
    <Link
      to={to}
      className="block rounded-xl border border-gray-200 bg-white p-4 shadow-sm ring-1 ring-gray-100 hover:border-storelaunch-green/40 hover:ring-storelaunch-green/20 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-storelaunch-green"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-gray-900">{title}</p>
          <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
        </div>
        <span className="text-gray-400 text-lg leading-none" aria-hidden>
          ›
        </span>
      </div>
      {loading ? (
        <div className="h-8 w-12 mt-3 bg-gray-100 rounded animate-pulse" />
      ) : (
        <p className="text-2xl font-bold text-storelaunch-dark mt-3 tabular-nums">{count ?? '—'}</p>
      )}
    </Link>
  );
}

function tableHint(summary) {
  if (!summary?.tables) return null;
  const t = summary.tables;
  const bad = Object.entries(t).filter(([, ok]) => ok === false);
  if (!bad.length) return null;
  return (
    <p className="text-xs text-amber-800 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
      Data source not available for some metrics; counts may be incomplete.
    </p>
  );
}

function HubSummarySkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" aria-hidden>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="rounded-xl border border-gray-200 bg-gray-100 h-28 animate-pulse" />
      ))}
    </div>
  );
}

export default function AdminErrorHandlingHubPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const sum = await getOperationsSummary();
      setSummary(sum);
    } catch (e) {
      setError(e.response?.data?.error || e.message || 'Load failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const sub = (n) => (n > 0 ? 'Needs review' : 'None pending');
  const deliverySub = (n) =>
    n > 0 ? 'Packed or shipped 10+ days, no delivery confirmation' : 'None pending';
  const customerRequestsSub = (n) =>
    n > 0 ? 'Returns and cancellations pending follow-up' : 'None pending';

  const kpiSubtitle = (fn, key) => {
    if (loading) return '…';
    if (error) return '—';
    if (!summary) return '—';
    const n = summary[key] ?? 0;
    return fn(n);
  };

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-storelaunch-dark">Error handling</h1>
        <button type="button" onClick={() => void load()} disabled={loading} className={BTN_SECONDARY}>
          {loading ? '…' : 'Refresh summaries'}
        </button>
      </div>
      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {error}
        </div>
      ) : null}
      {tableHint(summary)}

      {loading ? (
        <HubSummarySkeleton />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SummaryCard
            to={`${BASE}/failed-payments`}
            title="Failed payments"
            count={summary?.failed_checkout_payments ?? null}
            subtitle={kpiSubtitle(sub, 'failed_checkout_payments')}
            loading={false}
          />
          <SummaryCard
            to={`${BASE}/store-billing`}
            title="Store billing failures"
            count={summary?.failed_store_activation_attempts ?? null}
            subtitle={kpiSubtitle(sub, 'failed_store_activation_attempts')}
            loading={false}
          />
          <SummaryCard
            to={`${BASE}/delivery`}
            title="Delivery / fulfillment"
            count={summary?.shipping_signals ?? null}
            subtitle={kpiSubtitle(deliverySub, 'shipping_signals')}
            loading={false}
          />
          <SummaryCard
            to={`${BASE}/customer-requests`}
            title="Returns & cancellations"
            count={summary?.pending_customer_order_requests ?? null}
            subtitle={kpiSubtitle(customerRequestsSub, 'pending_customer_order_requests')}
            loading={false}
          />
        </div>
      )}
    </div>
  );
}
