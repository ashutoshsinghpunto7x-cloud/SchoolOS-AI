import type {
  ApiResponse,
  AuthUser,
  LoginPayload,
  LoginResponse,
  LoginWithPinPayload,
  SetupPinPayload,
} from '@schoolos/types';
import { apiClient } from '@/services/api/client';

export const authApi = {
  async login(payload: LoginPayload): Promise<LoginResponse> {
    const res = await apiClient.post<ApiResponse<LoginResponse>>('/auth/login', payload);
    if (!res.data.data) throw new Error('Login response missing data');
    return res.data.data;
  },

  async loginWithPin(payload: LoginWithPinPayload): Promise<LoginResponse> {
    const res = await apiClient.post<ApiResponse<LoginResponse>>('/auth/login-pin', payload);
    if (!res.data.data) throw new Error('Login response missing data');
    return res.data.data;
  },

  async me(): Promise<AuthUser> {
    const res = await apiClient.get<ApiResponse<AuthUser>>('/auth/me');
    if (!res.data.data) throw new Error('Profile response missing data');
    return res.data.data;
  },

  async logout(): Promise<void> {
    await apiClient.post('/auth/logout');
  },

  async setupPin(payload: SetupPinPayload): Promise<{ deviceId: string }> {
    const res = await apiClient.post<ApiResponse<{ deviceId: string }>>('/auth/setup-pin', payload);
    if (!res.data.data) throw new Error('Setup PIN response missing data');
    return res.data.data;
  },
};
