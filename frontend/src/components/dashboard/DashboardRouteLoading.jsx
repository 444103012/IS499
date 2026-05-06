import React from 'react';

/**
 * Inline placeholder for lazy dashboard routes (Suspense) and plan-gated screens.
 * Keeps shell visible; only the main column shows this pattern.
 */
export default function DashboardRouteLoading() {
  return (
    <div className="animate-pulse space-y-4 max-w-6xl" aria-busy="true" aria-label="Loading">
      <div className="h-9 bg-gray-200 rounded-lg w-48" />
      <div className="h-4 bg-gray-100 rounded w-full max-w-2xl" />
      <div className="h-4 bg-gray-100 rounded w-full max-w-xl" />
      <div className="h-52 bg-gray-100 rounded-xl border border-gray-100" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="h-28 bg-gray-100 rounded-xl" />
        <div className="h-28 bg-gray-100 rounded-xl" />
        <div className="h-28 bg-gray-100 rounded-xl hidden lg:block" />
      </div>
    </div>
  );
}
