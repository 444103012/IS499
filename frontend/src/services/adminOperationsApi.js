/**
 * A-007 Admin error handling — authenticated GETs under `/api/admin/operations/*` (read-only SQL).
 * See `backend/routes/adminOperationsRoutes.js` for predicates and test-data exclusions.
 */

import axiosInstance from '../api/axios';

const BASE = '/api/admin/operations';

export async function getOperationsSummary() {
  const { data } = await axiosInstance.get(`${BASE}/summary`);
  return data;
}

export async function getCheckoutPaymentIssues(params = {}) {
  const { data } = await axiosInstance.get(`${BASE}/checkout-payments`, { params });
  return data;
}

export async function getStoreActivationFailures(params = {}) {
  const { data } = await axiosInstance.get(`${BASE}/store-activations`, { params });
  return data;
}

export async function getShippingSignals(params = {}) {
  const { data } = await axiosInstance.get(`${BASE}/shipping-signals`, { params });
  return data;
}

export async function getPendingCustomerRequests(params = {}) {
  const { data } = await axiosInstance.get(`${BASE}/customer-requests`, { params });
  return data;
}

/** Alias for `getPendingCustomerRequests` (GET `/customer-requests`). */
export const getCustomerRequests = getPendingCustomerRequests;
