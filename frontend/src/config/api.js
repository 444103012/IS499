const isProduction = process.env.NODE_ENV === 'production';

export const API_BASE_URL = (
  process.env.REACT_APP_API_URL ||
  process.env.REACT_APP_BASE_URL ||
  (isProduction ? '' : 'http://localhost:5000')
).replace(/\/$/, '');
