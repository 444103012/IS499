





import axiosInstance from '../api/axios';

const BASE = '/api/admin';

export async function getDashboardStats() {
  const { data } = await axiosInstance.get(`${BASE}/dashboard/stats`);
  return data;
}

export async function getAllUsers(params = {}) {
  const { page = 1, limit = 10, search = '' } = params;
  const { data } = await axiosInstance.get(`${BASE}/manage/users`, {
    params: {
      page,
      limit,
      ...(search ? { search } : {}),
    },
  });
  return {
    users: data.users || [],
    total: typeof data.total === 'number' ? data.total : 0,
    page: typeof data.page === 'number' ? data.page : page,
    limit: typeof data.limit === 'number' ? data.limit : limit,
  };
}

export async function getAllStoreOwners(params = {}) {
  const { page = 1, limit = 10, search = '' } = params;
  const { data } = await axiosInstance.get(`${BASE}/manage/store-owners`, {
    params: {
      page,
      limit,
      ...(search ? { search } : {}),
    },
  });
  return {
    store_owners: data.store_owners || [],
    total: typeof data.total === 'number' ? data.total : 0,
    page: typeof data.page === 'number' ? data.page : page,
    limit: typeof data.limit === 'number' ? data.limit : limit,
  };
}

export async function updateUserStatus(id, status) {
  const { data } = await axiosInstance.patch(`${BASE}/manage/users/${id}/status`, { status });
  return data;
}

export async function updateStoreOwnerStatus(id, status) {
  const { data } = await axiosInstance.patch(`${BASE}/manage/store-owners/${id}/status`, { status });
  return data;
}

export async function accessUserAsAdmin(id) {
  try {
    const { data } = await axiosInstance.post(`${BASE}/manage/users/${id}/access-token`);
    return data.access;
  } catch (err) {
    if (err?.response?.status !== 404) throw err;
    const { data } = await axiosInstance.post(`${BASE}/users/${id}/access-token`);
    return data.access;
  }
}

export async function accessStoreOwnerAsAdmin(id) {
  try {
    const { data } = await axiosInstance.post(`${BASE}/manage/store-owners/${id}/access-token`);
    return data.access;
  } catch (err) {
    if (err?.response?.status !== 404) throw err;
    const { data } = await axiosInstance.post(`${BASE}/store-owners/${id}/access-token`);
    return data.access;
  }
}
