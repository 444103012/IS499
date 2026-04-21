

import axiosInstance from '../api/axios';

const BASE = '/api/admin';

export async function getDashboardStats() {
  const { data } = await axiosInstance.get(`${BASE}/dashboard/stats`);
  return data;
}

export async function getAllUsers() {
  const { data } = await axiosInstance.get(`${BASE}/manage/users`);
  return data.users || [];
}

export async function getAllStoreOwners() {
  const { data } = await axiosInstance.get(`${BASE}/manage/store-owners`);
  return data.store_owners || [];
}

export async function updateUserStatus(id, status) {
  const { data } = await axiosInstance.patch(`${BASE}/manage/users/${id}/status`, { status });
  return data;
}

export async function updateStoreOwnerStatus(id, status) {
  const { data } = await axiosInstance.patch(`${BASE}/manage/store-owners/${id}/status`, { status });
  return data;
}
