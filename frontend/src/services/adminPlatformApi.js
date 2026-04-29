

import axiosInstance from '../api/axios';

const BASE = '/api/admin/platform';

export async function getPolicies() {
  const { data } = await axiosInstance.get(`${BASE}/policies`);
  return data;
}

export async function updatePolicies(payload) {
  const { data } = await axiosInstance.patch(`${BASE}/policies`, payload);
  return data;
}

export async function getPlans() {
  const { data } = await axiosInstance.get(`${BASE}/plans`);
  return data.plans || [];
}

export async function createPlan(payload) {
  const { data } = await axiosInstance.post(`${BASE}/plans`, payload);
  return data;
}

export async function updatePlan(id, payload) {
  const { data } = await axiosInstance.patch(`${BASE}/plans/${id}`, payload);
  return data;
}

export async function updatePlanStatus(id, status) {
  const { data } = await axiosInstance.patch(`${BASE}/plans/${id}/status`, { status });
  return data;
}

export async function getPlatformConfig() {
  const { data } = await axiosInstance.get(`${BASE}/config`);
  return data;
}

export async function updatePlatformConfig(payload) {
  const { data } = await axiosInstance.patch(`${BASE}/config`, payload);
  return data;
}

