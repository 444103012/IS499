/**
 * Go Live CTA is shown only when the store is genuinely pre-launch:
 *   - status is Pending (not yet Active, Suspended, etc.)
 *   - payment has not been completed
 *
 * Returning false on null prevents the CTA from flashing during
 * a failed or slow API request.
 */
export function shouldShowGoLiveCta(goLiveStatus) {
  if (goLiveStatus == null) return false;
  const status = String(goLiveStatus.storeStatus ?? '').toLowerCase();
  if (status === 'active') return false;
  const paid = String(goLiveStatus.paymentStatus ?? '').toLowerCase() === 'paid';
  if (paid) return false;
  return status === 'pending';
}
