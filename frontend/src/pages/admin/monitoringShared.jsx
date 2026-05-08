import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export const BTN_PRIMARY =
  'inline-flex items-center justify-center min-h-9 px-3 py-2 rounded-lg text-sm font-semibold bg-storelaunch-green text-white hover:bg-emerald-600 transition-colors shadow-sm';
export const BTN_SECONDARY =
  'inline-flex items-center justify-center min-h-9 px-3 py-2 rounded-lg text-sm font-semibold border border-gray-300 text-gray-800 bg-white hover:bg-gray-50 transition-colors';

export function formatDateTime(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return String(iso);
  }
}

export function formatOrderReference(row) {
  const seq = row?.store_order_seq;
  if (seq != null && String(seq).trim() !== '') return `Order #${seq}`;
  return `Order ${row?.order_id ?? '—'}`;
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function safeJson(obj) {
  try {
    return JSON.stringify(obj, null, 2);
  } catch {
    return String(obj);
  }
}

export function DetailDisclosure({ rows, copyPayload }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  return (
    <div className="mt-2 pt-2 border-t border-gray-100">
      <button type="button" className="text-xs font-medium text-gray-600 hover:text-gray-900" onClick={() => setOpen((o) => !o)}>
        {open ? 'Hide' : 'Details'}
      </button>
      {open ? (
        <div className="mt-2 space-y-1.5 text-xs text-gray-700">
          {rows.map(({ label, value }) => (
            <div key={label} className="flex flex-col sm:flex-row sm:gap-2">
              <span className="text-gray-500 shrink-0 w-36">{label}</span>
              <span className="break-words">{value ?? '—'}</span>
            </div>
          ))}
          {copyPayload ? (
            <button
              type="button"
              className={`${BTN_SECONDARY} mt-1 text-xs`}
              onClick={async () => {
                const ok = await copyText(copyPayload);
                setCopied(ok);
                if (ok) setTimeout(() => setCopied(false), 2000);
              }}
            >
              {copied ? 'Copied' : 'Copy for support'}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function OpenStoreLink({ storeId }) {
  const { t } = useTranslation();
  if (storeId == null) return null;
  const label = t('admin.openStoreDetails', { defaultValue: 'Open store details' });
  return (
    <Link to={`/admin/dashboard/stores/${storeId}`} className={BTN_PRIMARY} aria-label={label}>
      {label}
    </Link>
  );
}

const EH_HUB = '/admin/dashboard/error-handling';

export function ErrorHandlingDetailChrome({ title, loading, error, tableMissing, onRefresh, children }) {
  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-4">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <Link to={EH_HUB} className="font-medium text-storelaunch-green hover:underline">
          ← Error handling
        </Link>
      </div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-xl font-bold text-storelaunch-dark">{title}</h1>
        <button type="button" onClick={onRefresh} disabled={loading} className={BTN_SECONDARY}>
          {loading ? '…' : 'Refresh'}
        </button>
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {tableMissing ? (
        <p className="text-sm text-amber-800 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
          Data source not available.
        </p>
      ) : null}
      {!tableMissing ? children : null}
    </div>
  );
}
