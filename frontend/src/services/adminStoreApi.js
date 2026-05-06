





import axiosInstance from '../api/axios';

const BASE = '/api/admin';

export async function getAllStores(params = {}) {
  const { page = 1, limit = 10, search = '' } = params;
  const { data } = await axiosInstance.get(`${BASE}/stores`, {
    params: {
      page,
      limit,
      ...(search ? { search } : {}),
    },
  });
  return {
    stores: data.stores || [],
    total: typeof data.total === 'number' ? data.total : 0,
    page: typeof data.page === 'number' ? data.page : page,
    limit: typeof data.limit === 'number' ? data.limit : limit,
  };
}

export async function getStoreById(id) {
  const { data } = await axiosInstance.get(`${BASE}/stores/${id}`, {
    params: { _ts: Date.now() },
  });
  return data;
}

/** Patch `/stores/:id/status`: pass `'suspend' | 'reactivate'` or `{ action: 'set_status', status: 'Active' | 'Pending' }`. */
export async function updateStoreStatus(id, actionOrBody) {
  const body = typeof actionOrBody === 'string' ? { action: actionOrBody } : actionOrBody;
  const { data } = await axiosInstance.patch(`${BASE}/stores/${id}/status`, body);
  return data;
}

export async function sendStoreNotification(id, message) {
  const { data } = await axiosInstance.post(`${BASE}/stores/${id}/notify`, { message });
  return data;
}

export async function accessStoreAsAdmin(id) {
  const { data } = await axiosInstance.post(`${BASE}/stores/${id}/access-token`);
  return data.access;
}
