/**
 * Go Live is only for preview stores that have not paid yet.
 * Active + paid (or any non–preview-paid state) should not see the CTA.
 * If go-live status failed to load (null), show the CTA so a failed request does not block the flow.
 */
export function shouldShowGoLiveCta(goLiveStatus) {
  if (goLiveStatus == null) return true;
  const pending = String(goLiveStatus.storeStatus ?? '').toLowerCase() === 'pending';
  const paid = String(goLiveStatus.paymentStatus ?? '').toLowerCase() === 'paid';
  return pending && !paid;
}
