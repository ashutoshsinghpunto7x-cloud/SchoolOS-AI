import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import type { ApiResponse, LoginResponse } from '@schoolos/types';
import { API_BASE_URL } from '@/constants/env';
import { secureStorage } from '@/services/secureStorage';

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30_000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Set by the auth store at startup so the interceptor can clear session state
// without the services layer depending on the store (avoids an import cycle).
let onSessionExpired: (() => void) | null = null;
export const registerSessionExpiredHandler = (handler: () => void): void => {
  onSessionExpired = handler;
};

// ── Request Interceptor ───────────────────────────────────────────────────────
apiClient.interceptors.request.use(
  async (config) => {
    const token = await secureStorage.getAccessToken();
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
export const resetAuthRefreshState = (): void => {
  isRefreshing = false;
  pendingRequests = [];
};

const clearSessionAndNotify = async (): Promise<void> => {
  await secureStorage.clearTokens();
  onSessionExpired?.();
};

// ── Response Interceptor ──────────────────────────────────────────────────────
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    // A 401 from the login endpoints means wrong credentials, not an expired
    // session — let the login screen show its own inline error.
    if (originalRequest.url?.includes('/auth/login') || originalRequest.url?.includes('/auth/login-pin')) {
      return Promise.reject(error);
    }

    if (originalRequest.url?.includes('/auth/refresh')) {
      await clearSessionAndNotify();
      return Promise.reject(error);
    }

    const refreshToken = await secureStorage.getRefreshToken();
    if (!refreshToken) {
      await clearSessionAndNotify();
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        pendingRequests.push({ resolve, reject });
      }).then((newToken) => {
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(originalRequest);
      });
    }

    isRefreshing = true;

    try {
      const res = await axios.post<ApiResponse<Pick<LoginResponse, 'accessToken' | 'refreshToken'>>>(
        `${API_BASE_URL}/auth/refresh`,
        { refreshToken }
      );

      const tokens = res.data.data;
      if (!tokens) throw new Error('Refresh response missing tokens');

      await secureStorage.setTokens(tokens.accessToken, tokens.refreshToken);

      pendingRequests.forEach(({ resolve }) => resolve(tokens.accessToken));
      pendingRequests = [];

      originalRequest.headers.Authorization = `Bearer ${tokens.accessToken}`;
      return apiClient(originalRequest);
    } catch (refreshError) {
      pendingRequests.forEach(({ reject }) => reject(refreshError));
      pendingRequests = [];
      await clearSessionAndNotify();
      return Promise.reject(error);
    } finally {
      isRefreshing = false;
    }
  }
);

export const extractErrorMessage = (error: unknown): string => {
  if (error instanceof AxiosError) {
    const data = error.response?.data as ApiResponse | undefined;
    return data?.error?.message ?? error.message ?? 'An unexpected error occurred';
  }
  if (error instanceof Error) return error.message;
  return 'An unexpected error occurred';
};
