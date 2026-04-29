

import axiosInstance from '../api/axios';

const BASE = '/api/admin';

export async function getAllStores() {
  const { data } = await axiosInstance.get(`${BASE}/stores`);
  return data.stores || [];
}

export async function getStoreById(id) {
  const { data } = await axiosInstance.get(`${BASE}/stores/${id}`);
  return data;
}

export async function updateStoreStatus(id, status) {
  const { data } = await axiosInstance.patch(`${BASE}/stores/${id}/status`, { status });
  return data;
}

export async function sendStoreNotification(id, message) {
  const { data } = await axiosInstance.post(`${BASE}/stores/${id}/notify`, { message });
  return data;
}

