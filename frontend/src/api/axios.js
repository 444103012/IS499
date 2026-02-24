const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

async function request(method, url, body = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };
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

const axiosInstance = {
  post: (url, body) => request('POST', url, body),
  get: (url) => request('GET', url),
  put: (url, body) => request('PUT', url, body),
  patch: (url, body) => request('PATCH', url, body),
  delete: (url) => request('DELETE', url),
};

export default axiosInstance;
