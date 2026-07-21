import axios from 'axios';

export const API_BASE_URL = import.meta.env.PROD ? '' : 'http://localhost:8080';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT to every request automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('piggyback_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-logout on 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 || err.response?.status === 403) {
      localStorage.removeItem('piggyback_token');
      localStorage.removeItem('piggyback_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
