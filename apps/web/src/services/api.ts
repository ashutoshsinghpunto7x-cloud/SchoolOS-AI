import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000/api/v1';

// 60s (not the usual 30s) because the free-tier host spins the server down
// after inactivity — the first request after a cold start can take 30-50s.
export const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 60_000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Fire-and-forget ping to start waking a cold-started free-tier server the
// moment the login page mounts, so the real login request (sent once the
// user finishes typing) is more likely to hit an already-warm instance.
export const pingServerAwake = () => {
  axios.get(`${BASE_URL}/health`, { timeout: 60_000 }).catch(() => {});
};

// ── Request Interceptor ───────────────────────────────────────────────────────
apiClient.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Refresh token state ───────────────────────────────────────────────────────

type PendingRequest = {
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
};

let isRefreshing = false;
let pendingRequests: PendingRequest[] = [];

// Called on logout so a refresh started under the previous session can't
// resolve into a newly-logged-in user's queued requests on a shared device.
export const resetAuthRefreshState = () => {
  isRefreshing = false;
  pendingRequests = [];
};

const clearAuthAndRedirect = () => {
  sessionStorage.removeItem('accessToken');
  sessionStorage.removeItem('refreshToken');
  window.location.href = '/login';
};

// ── Response Interceptor ──────────────────────────────────────────────────────
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    // A 401 from the login endpoint means wrong credentials, not an expired
    // session — let LoginPage show its own inline error instead of redirecting.
    if (originalRequest.url?.includes('/auth/login')) {
      return Promise.reject(error);
    }

    // Don't try to refresh if this is the refresh endpoint itself
    if (originalRequest.url?.includes('/auth/refresh')) {
      clearAuthAndRedirect();
      return Promise.reject(error);
    }

    const refreshToken = sessionStorage.getItem('refreshToken');
    if (!refreshToken) {
      clearAuthAndRedirect();
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    if (isRefreshing) {
      // Queue requests while a refresh is in progress
      return new Promise<string>((resolve, reject) => {
        pendingRequests.push({ resolve, reject });
      }).then((newToken) => {
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(originalRequest);
      });
    }

    isRefreshing = true;

    try {
      const res = await axios.post<{
        data: { accessToken: string; refreshToken: string };
      }>(`${BASE_URL}/auth/refresh`, { refreshToken });

      const { accessToken, refreshToken: newRefreshToken } = res.data.data;
      sessionStorage.setItem('accessToken', accessToken);
      sessionStorage.setItem('refreshToken', newRefreshToken);

      pendingRequests.forEach(({ resolve }) => resolve(accessToken));
      pendingRequests = [];

      originalRequest.headers.Authorization = `Bearer ${accessToken}`;
      return apiClient(originalRequest);
    } catch {
      pendingRequests.forEach(({ reject }) => reject(error));
      pendingRequests = [];
      clearAuthAndRedirect();
      return Promise.reject(error);
    } finally {
      isRefreshing = false;
    }
  }
);

export const extractErrorMessage = (error: unknown): string => {
  if (error instanceof AxiosError) {
    const data = error.response?.data as { error?: { message?: string } } | undefined;
    return data?.error?.message ?? error.message ?? 'An unexpected error occurred';
  }
  if (error instanceof Error) return error.message;
  return 'An unexpected error occurred';
};
