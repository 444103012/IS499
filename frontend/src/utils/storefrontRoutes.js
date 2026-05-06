export const STORE_NAME_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

export const normalizeStoreName = (value) => (value || '').trim().toLowerCase();

export const isValidStoreName = (value) => STORE_NAME_PATTERN.test(normalizeStoreName(value));

export const buildStorefrontPath = (storeName, servicePath = '') => {
  const normalized = normalizeStoreName(storeName);
  if (!isValidStoreName(normalized)) return '/';
  const cleanService = String(servicePath || '').replace(/^\/+/, '');
  return cleanService ? `/${normalized}/${cleanService}` : `/${normalized}`;
};
