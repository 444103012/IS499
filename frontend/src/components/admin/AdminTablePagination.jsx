import React from 'react';

/** Up to 7 page slots: compact window with ellipsis when totalPages is large */
export function buildPaginationPages(currentPage, totalPages) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const set = new Set([1, totalPages]);
  for (let d = -2; d <= 2; d += 1) {
    const p = currentPage + d;
    if (p >= 1 && p <= totalPages) set.add(p);
  }
  const sorted = [...set].sort((a, b) => a - b);
  const out = [];
  for (let i = 0; i < sorted.length; i += 1) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) out.push('ellipsis');
    out.push(sorted[i]);
  }
  return out;
}

export default function AdminTablePagination({
  page,
  total,
  limit,
  loading,
  onPageChange,
  itemLabel = 'items',
}) {
  const totalPages = total > 0 ? Math.max(1, Math.ceil(total / limit)) : 1;
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const start = total === 0 ? 0 : (safePage - 1) * limit + 1;
  const end = Math.min(safePage * limit, total);
  const pageSlots = buildPaginationPages(safePage, totalPages);
  const disableNav = loading || total === 0;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 border-t border-gray-200 bg-gray-50 text-sm text-gray-700">
      <div className="flex flex-wrap items-center gap-3">
        <span>
          {total === 0 ? (
            <>No {itemLabel}</>
          ) : (
            <>
              Showing <span className="font-medium">{start}</span>–
              <span className="font-medium">{end}</span> of{' '}
              <span className="font-medium">{total}</span>
              <span className="text-gray-500"> ({limit} per page)</span>
            </>
          )}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-gray-500 mr-1">
          Page {total === 0 ? 1 : safePage} of {totalPages}
        </span>
        <button
          type="button"
          disabled={disableNav || safePage <= 1}
          onClick={() => onPageChange(safePage - 1)}
          className="px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium"
        >
          Prev
        </button>
        <div className="flex items-center gap-1">
          {pageSlots.map((slot, idx) =>
            slot === 'ellipsis' ? (
              <span key={`e-${idx}`} className="px-1 text-gray-400 select-none">
                …
              </span>
            ) : (
              <button
                key={slot}
                type="button"
                disabled={loading}
                onClick={() => onPageChange(slot)}
                className={`min-w-[2rem] px-2 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  slot === safePage
                    ? 'border-storelaunch-green bg-storelaunch-green/10 text-storelaunch-dark'
                    : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-100'
                } disabled:opacity-50`}
              >
                {slot}
              </button>
            )
          )}
        </div>
        <button
          type="button"
          disabled={disableNav || safePage >= totalPages}
          onClick={() => onPageChange(safePage + 1)}
          className="px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium"
        >
          Next
        </button>
      </div>
    </div>
  );
}
