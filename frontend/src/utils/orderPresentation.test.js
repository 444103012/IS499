import {
  formatItemCount,
  getSecondaryOrderAction,
  isReviewEligible,
  localizeOrderStatus,
} from './orderPresentation';

describe('orderPresentation', () => {
  test('formats english item counts with correct pluralization', () => {
    expect(formatItemCount(1, false)).toBe('1 item');
    expect(formatItemCount(2, false)).toBe('2 items');
  });

  test('formats arabic item counts for singular dual and plural', () => {
    expect(formatItemCount(1, true)).toBe('عنصر واحد');
    expect(formatItemCount(2, true)).toBe('عنصران');
    expect(formatItemCount(3, true)).toContain('٣');
  });

  test('localizes statuses in arabic and english', () => {
    expect(localizeOrderStatus('Shipped', false)).toBe('Shipped');
    expect(localizeOrderStatus('Shipped', true)).toBe('تم الشحن');
    expect(localizeOrderStatus('Returned', true)).toBe('تم الإرجاع');
  });

  test('selects lifecycle secondary action by status', () => {
    expect(getSecondaryOrderAction({ fulfillment_status: 'Processing' }, false).label).toBe('Cancel Order');
    expect(getSecondaryOrderAction({ fulfillment_status: 'Delivered' }, false).label).toBe('Request Return');
  });

  test('review eligibility requires paid + delivered', () => {
    expect(isReviewEligible({ payment_status: 'Paid', fulfillment_status: 'Delivered' })).toBe(true);
    expect(isReviewEligible({ payment_status: 'Pending', fulfillment_status: 'Delivered' })).toBe(false);
    expect(isReviewEligible({ payment_status: 'Paid', fulfillment_status: 'Processing' })).toBe(false);
  });
});
