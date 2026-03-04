/**
 * axios.js - API Client (fetch-based, axios-style)
 * ------------------------------------------------
 * EN: Calls the StoreLaunch backend from the React app (login, register, etc.). Uses fetch()
 *     instead of axios to avoid webpack 5 polyfill issues. Same usage: post(url, body) → { data } or throw.
 * AR: استدعاء خادم StoreLaunch من تطبيق React (تسجيل الدخول، التسجيل، إلخ). يستخدم fetch()
 *     بدلاً من axios لتجنب مشاكل webpack 5. الاستخدام: post(url, body) → { data } أو رمي خطأ.
 */

// EN: Backend base URL. React reads REACT_APP_API_URL from .env; default localhost:5000 in development.
// AR: عنوان الخادم الأساسي. React يقرأ REACT_APP_API_URL من .env؛ الافتراضي localhost:5000 في التطوير.
const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

/**
 * EN: Send one HTTP request to the backend. Used by post/get/put/patch/delete below.
 * AR: إرسال طلب HTTP واحد للخادم. تُستخدمه الدوال post/get/put/patch/delete أدناه.
 */
async function request(method, url, body = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };
  // EN: For POST/PUT/PATCH we send a JSON body; convert the object to a string.
  // AR: لـ POST/PUT/PATCH نرسل body بصيغة JSON؛ تحويل الكائن إلى سلسلة.
  if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    options.body = JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch(`${BASE_URL}${url}`, options);
  } catch (networkErr) {
    // EN: fetch failed (e.g. backend not running, no internet). We throw an error with .response so UI can show message.
    // AR: فشل fetch (مثلًا الخادم لا يعمل أو لا إنترنت). نرمي خطأ مع .response لعرض رسالة في الواجهة.
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

  // EN: If status is 4xx or 5xx, treat as error so the caller can catch and show err.response.data.error.
  // AR: إذا كانت الحالة 4xx أو 5xx نعتبرها خطأ ليقوم المستدعي بعرض err.response.data.error.
  if (!res.ok) {
    const err = new Error(data.error || `Request failed: ${res.status}`);
    err.response = { data, status: res.status };
    throw err;
  }

  return { data };
}

// EN: Export an object with post, get, put, patch, delete — same style as axios. Login/Register use axiosInstance.post(...).
// AR: تصدير كائن فيه post, get, put, patch, delete — بنفس أسلوب axios. تسجيل الدخول والتسجيل يستخدمان axiosInstance.post(...).
const axiosInstance = {
  post: (url, body) => request('POST', url, body),
  get: (url) => request('GET', url),
  put: (url, body) => request('PUT', url, body),
  patch: (url, body) => request('PATCH', url, body),
  delete: (url) => request('DELETE', url),
};

export default axiosInstance;
