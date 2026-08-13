import axios from 'axios';

declare module 'axios' {
  export interface AxiosRequestConfig {
    __isRefresh?: boolean;
  }
  export interface InternalAxiosRequestConfig {
    __isRefresh?: boolean;
  }
}

const getBaseURL = () => {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  // Local Laravel dev server (php artisan serve, port 4000) — falls back only when NEXT_PUBLIC_API_URL is unset
  return 'http://localhost:4000/api';
};

const api = axios.create({
  baseURL: getBaseURL(),
  timeout: 15000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

let csrfReady: Promise<void> | null = null;

function csrfCookieUrl(): string {
  return `${getBaseURL().replace(/\/api$/, '')}/sanctum/csrf-cookie`;
}

function ensureCsrfCookie(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (!csrfReady) {
    csrfReady = axios
      .get(csrfCookieUrl(), { withCredentials: true })
      .then(() => {})
      .catch(() => {})
      .finally(() => {
        csrfReady = null;
      });
  }
  return csrfReady;
}

function getXsrfToken(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

api.interceptors.request.use(async (config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    const method = (config.method || 'get').toLowerCase();
    if (method !== 'get' && method !== 'head' && method !== 'options') {
      await ensureCsrfCookie();
      const xsrf = getXsrfToken();
      if (xsrf) {
        config.headers['X-XSRF-TOKEN'] = xsrf;
      }
    }
  }
  return config;
});

declare global {
  interface Window {
    __authRedirecting?: boolean;
  }
}

let refreshPromise: Promise<string | null> | null = null;

/**
 * Single-flight refresh: concurrent 401s all wait on the SAME in-flight
 * /auth/refresh instead of each rotating (and invalidating) the token.
 */
function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = performRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

async function performRefresh(): Promise<string | null> {
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) return null;

  try {
    const { data } = await api.request({
      url: '/auth/refresh',
      method: 'POST',
      data: { refreshToken },
      __isRefresh: true,
    });
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    return data.accessToken as string;
  } catch {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    return null;
  }
}

function redirectToLogin(): void {
  if (typeof window === 'undefined' || window.__authRedirecting) return;
  window.__authRedirecting = true;
  const path = window.location.pathname;
  const target = path.startsWith('/admin') ? '/admin/login' : '/auth/login';
  window.location.href = target;
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      // A failed /auth/refresh itself must never loop back into this handler.
      if (originalRequest.__isRefresh) {
        return Promise.reject(error);
      }

      const accessToken = await refreshAccessToken();

      if (accessToken) {
        originalRequest.headers = originalRequest.headers ?? {};
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      }

      redirectToLogin();
    }

    return Promise.reject(error);
  }
);

export default api;
