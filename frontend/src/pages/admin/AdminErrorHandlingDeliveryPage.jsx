import React, { useCallback, useEffect, useState } from 'react';
import { getOperationsSummary, getShippingSignals } from '../../services/adminOperationsApi';
import {
  DetailDisclosure,
  ErrorHandlingDetailChrome,
  formatDateTime,
  formatOrderReference,
  OpenStoreLink,
  safeJson,
} from './monitoringShared';

function deliveryLabel() {
  return 'Packed or shipped for over 10 days with no delivery confirmation';
}

function isPackedOrShipped(status) {
  const s = String(status ?? '').trim().toUpperCase();
  return s === 'SHIPPED' || s === 'PACKED';
}

/** Rows in this list always have delivered_at null by rule; never show a date dash for “not delivered”. */
function formatDeliveryConfirmedAt(row) {
  return row.delivered_at ? formatDateTime(row.delivered_at) : 'Not delivered';
}

function formatShippedAtDetail(row) {
  if (row.shipped_at) return formatDateTime(row.shipped_at);
  if (isPackedOrShipped(row.order_status) || isPackedOrShipped(row.shipment_status)) {
    const od = formatDateTime(row.order_date);
    return od && od !== '—'
      ? `Not recorded on shipment (order date ${od})`
      : 'Not recorded on shipment';
  }
  return 'Not recorded on shipment';
}

function formatShipmentStatusDetail(row) {
  const st = String(row.shipment_status ?? '').trim();
  if (st) return st;
  const os = String(row.order_status ?? '').trim();
  if (os) return `Order status: ${os}`;
  return 'Not set on shipment or order';
}

function formatTrackingDetail(row) {
  const t = String(row.tracking_number ?? '').trim();
  return t || 'None on file';
}

function deliveryDetailRows(row) {
  return [
    { label: 'Stale since', value: formatDateTime(row.aging_anchor_at) },
    { label: 'Shipped at', value: formatShippedAtDetail(row) },
    { label: 'Delivery confirmed at', value: formatDeliveryConfirmedAt(row) },
    { label: 'Tracking', value: formatTrackingDetail(row) },
    { label: 'Shipment status', value: formatShipmentStatusDetail(row) },
  ];
}

export default function AdminErrorHandlingDeliveryPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [count, setCount] = useState(null);
  const [data, setData] = useState({ items: [], tableMissing: false });

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [sum, ship] = await Promise.all([getOperationsSummary(), getShippingSignals({ limit: 80 })]);
      setCount(sum?.shipping_signals ?? null);
      setData(ship);
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
      title="Delivery / fulfillment"
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
            <li key={row.order_id} className="px-4 py-3">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                <div className="min-w-0 text-sm space-y-0.5">
                  <p className="font-semibold text-gray-900">{row.store_name || '—'}</p>
                  <p>
                    <span className="text-gray-800">{formatOrderReference(row)}</span>
                    <span className="text-gray-400 mx-1">·</span>
                    <span className="text-gray-700">{deliveryLabel()}</span>
                  </p>
                  <p className="text-xs text-gray-500">
                    Status {row.order_status || '—'} · {formatDateTime(row.order_date)}
                  </p>
                </div>
                <OpenStoreLink storeId={row.store_id} />
              </div>
              <DetailDisclosure
                rows={deliveryDetailRows(row)}
                copyPayload={safeJson({
                  order_id: row.order_id,
                  store_order_seq: row.store_order_seq,
                  store_id: row.store_id,
                  signal_type: row.signal_type,
                  shipment_id: row.shipment_id,
                  order_status: row.order_status,
                  order_date: row.order_date,
                  aging_anchor_at: row.aging_anchor_at ?? row.order_date,
                  shipped_at: row.shipped_at,
                  delivered_at: row.delivered_at,
                  tracking_number: row.tracking_number,
                  shipment_status: row.shipment_status,
                })}
              />
            </li>
          ))}
        </ul>
      ) : null}
    </ErrorHandlingDetailChrome>
  );
}
