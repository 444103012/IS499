const BASE_URL = process.env.REACT_APP_BASE_URL || process.env.REACT_APP_API_URL || '';

function withQueryParams(url, params) {
  if (!params || typeof params !== 'object') return url;
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    if (value === '') continue;
    sp.append(key, String(value));
  }
  const q = sp.toString();
  return q ? `${url}?${q}` : url;
}

async function request(method, url, body = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };
  let token = null;
  if (typeof localStorage !== 'undefined') {
    const pathOnly = url.split('?')[0];
    const isOwnerCustomersApi =
      pathOnly === '/api/customers' ||
      pathOnly === '/api/customers/' ||
      /^\/api\/customers\/\d+$/.test(pathOnly);
    const isCustomerRoute =
      (pathOnly.startsWith('/api/customers') &&
        !isOwnerCustomersApi &&
        !pathOnly.includes('/api/customers/login') &&
        !pathOnly.includes('/api/customers/register') &&
        !pathOnly.includes('/api/customers/logout')) ||
      url.startsWith('/api/cart') ||
      url.startsWith('/api/checkout') ||
      url.startsWith('/api/payments');
    const isAdminRoute = url.startsWith('/api/admin/');
    if (isAdminRoute) {
      token = localStorage.getItem('admin_token');
    } else {
      token = isCustomerRoute ? localStorage.getItem('customer_token') : localStorage.getItem('token');
    }
  }
  if (token) options.headers['Authorization'] = `Bearer ${token}`;
 
 
  if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    options.body = JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch(`${BASE_URL}${url}`, options);
  } catch (networkErr) {
   
   
    const err = new Error(
      networkErr.message === 'Failed to fetch'
        ? 'NetworkError'
        : networkErr.message || 'NetworkError'
    );
    err.response = { data: { error: 'NetworkError' } };
    throw err;
  }

  let data;
  const contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    try {
      data = await res.json();
    } catch {
      data = {};
    }
  } else {
    data = {};
  }

 
 
  if (!res.ok) {
    const err = new Error(data.error || `Request failed: ${res.status}`);
    err.response = { data, status: res.status };
    throw err;
  }

  return { data };
}

async function postForm(url, formData) {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
  const options = {
    method: 'POST',
    body: formData,
    headers: {},
  };
  if (token) options.headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}${url}`, options);
  let data = {};
  const contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    try {
      data = await res.json();
    } catch {}
  }
  if (!res.ok) {
    const err = new Error(data.error || `Request failed: ${res.status}`);
    err.response = { data, status: res.status };
    throw err;
  }
  return { data };
}

async function putForm(url, formData) {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
  const options = {
    method: 'PUT',
    body: formData,
    headers: {},
  };
  if (token) options.headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}${url}`, options);
  let data = {};
  const contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    try {
      data = await res.json();
    } catch {}
  }
  if (!res.ok) {
    const err = new Error(data.error || `Request failed: ${res.status}`);
    err.response = { data, status: res.status };
    throw err;
  }
  return { data };
}

const axiosInstance = {
  post: (url, body) => request('POST', url, body),
  get: (url, config = {}) => request('GET', withQueryParams(url, config.params)),
  put: (url, body) => request('PUT', url, body),
  patch: (url, body) => request('PATCH', url, body),
  delete: (url) => request('DELETE', url),
  postForm: (url, formData) => postForm(url, formData),
  putForm: (url, formData) => putForm(url, formData),
};

export default axiosInstance;
