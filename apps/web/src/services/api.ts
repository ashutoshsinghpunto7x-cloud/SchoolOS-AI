import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000/api/v1';

// 60s (not the usual 30s) because the free-tier host spins the server down
// after inactivity — the first request after a cold start can take 30-50s.
export const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 60_000,
  // Required so the browser attaches the httpOnly refresh-token cookie (and
  // sends/receives it) on cross-origin requests to the API.
  withCredentials: true,
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
let refreshTimeoutId: ReturnType<typeof setTimeout> | null = null;

// Access tokens are opaque to us except for their exp claim, which we only
// read (never verify) to time the proactive refresh below.
const decodeTokenExpiryMs = (token: string): number | null => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
};

// Refresh this long before actual expiry so the token never goes stale while
// the SPA is idle/open — avoids every in-flight widget request 401-ing at
// once when the 15m access token lapses mid-session.
const REFRESH_BUFFER_MS = 60_000;

export const scheduleProactiveRefresh = (token: string) => {
  if (refreshTimeoutId) clearTimeout(refreshTimeoutId);

  const expiresAt = decodeTokenExpiryMs(token);
  if (!expiresAt) return;

  const delay = Math.max(expiresAt - Date.now() - REFRESH_BUFFER_MS, 0);
  refreshTimeoutId = setTimeout(() => {
    performRefresh().catch(() => {});
  }, delay);
};

const clearProactiveRefresh = () => {
  if (refreshTimeoutId) {
    clearTimeout(refreshTimeoutId);
    refreshTimeoutId = null;
  }
};

// Called on logout so a refresh started under the previous session can't
// resolve into a newly-logged-in user's queued requests on a shared device.
export const resetAuthRefreshState = () => {
  isRefreshing = false;
  pendingRequests = [];
  clearProactiveRefresh();
};

const clearAuthAndRedirect = () => {
  sessionStorage.removeItem('accessToken');
  clearProactiveRefresh();
  window.location.href = '/login';
};

// Shared by the reactive 401 handler below and by the proactive timer, so a
// refresh is never started twice at once — concurrent callers queue on
// pendingRequests and resolve off the single in-flight call.
const performRefresh = async (): Promise<string> => {
  if (isRefreshing) {
    return new Promise<string>((resolve, reject) => {
      pendingRequests.push({ resolve, reject });
    });
  }

  isRefreshing = true;

  try {
    const res = await axios.post<{
      data: { accessToken: string };
    }>(`${BASE_URL}/auth/refresh`, null, {
      withCredentials: true,
      // Presence-only CSRF defense — see server/src/middlewares/csrf.ts.
      headers: { 'X-CSRF-Token': '1' },
    });

    const { accessToken } = res.data.data;
    sessionStorage.setItem('accessToken', accessToken);
    scheduleProactiveRefresh(accessToken);

    pendingRequests.forEach(({ resolve }) => resolve(accessToken));
    pendingRequests = [];
    return accessToken;
  } catch (err) {
    pendingRequests.forEach(({ reject }) => reject(err));
    pendingRequests = [];
    clearAuthAndRedirect();
    throw err;
  } finally {
    isRefreshing = false;
  }
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

    originalRequest._retry = true;

    try {
      const newToken = await performRefresh();
      originalRequest.headers.Authorization = `Bearer ${newToken}`;
      return apiClient(originalRequest);
    } catch {
      return Promise.reject(error);
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

const extractErrorCode = (error: unknown): string | undefined => {
  if (!(error instanceof AxiosError)) return undefined;
  const data = error.response?.data as { error?: { code?: string } } | undefined;
  return data?.error?.code;
};

/** Thrown by api.ts callers in place of a plain Error so a caller can branch
 *  on the server's error code (e.g. MAINTENANCE_MODE) without depending on
 *  message text — the plain-Error-with-just-a-message convention elsewhere
 *  in this codebase loses that code, which login blocking needs. */
export class ApiError extends Error {
  readonly code?: string;
  constructor(error: unknown) {
    super(extractErrorMessage(error));
    this.code = extractErrorCode(error);
    this.name = 'ApiError';
  }
}
