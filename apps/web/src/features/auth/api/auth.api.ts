import { apiClient, extractErrorMessage, ApiError } from '@/services/api';
import type { ApiResponse, LoginPayload, LoginResponse, AuthUser, ChangePasswordPayload } from '@schoolos/types';

export const authApi = {
  async login(payload: LoginPayload): Promise<LoginResponse> {
    try {
      const res = await apiClient.post<ApiResponse<LoginResponse>>('/auth/login', payload);
      return res.data.data!;
    } catch (err) {
      throw new ApiError(err);
    }
  },

  // Note: the actual token-refresh-on-401 flow lives in services/api.ts's
  // response interceptor (it needs to attach the CSRF header and update
  // sessionStorage directly) — this method isn't currently called anywhere,
  // kept only in case a caller needs to trigger a refresh outside that flow.
  async refresh(): Promise<{ accessToken: string }> {
    try {
      const res = await apiClient.post<ApiResponse<{ accessToken: string }>>('/auth/refresh', null, {
        headers: { 'X-CSRF-Token': '1' },
      });
      return res.data.data!;
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },

  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // Silently ignore — local state cleared regardless
    }
  },

  async me(): Promise<AuthUser> {
    try {
      const res = await apiClient.get<ApiResponse<AuthUser>>('/auth/me');
      return res.data.data!;
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },

  async changePassword(payload: ChangePasswordPayload): Promise<void> {
    try {
      await apiClient.post('/auth/change-password', payload);
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },
};
