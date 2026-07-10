import { apiClient, extractErrorMessage } from '@/services/api';
import type { ApiResponse, LoginPayload, LoginResponse, AuthUser, ChangePasswordPayload } from '@schoolos/types';

export const authApi = {
  async login(payload: LoginPayload): Promise<LoginResponse> {
    try {
      const res = await apiClient.post<ApiResponse<LoginResponse>>('/auth/login', payload);
      return res.data.data!;
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },

  async refresh(
    refreshToken: string
  ): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      const res = await apiClient.post<
        ApiResponse<{ accessToken: string; refreshToken: string }>
      >('/auth/refresh', { refreshToken });
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
