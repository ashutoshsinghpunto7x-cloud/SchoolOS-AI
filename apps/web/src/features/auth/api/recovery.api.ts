import { apiClient, extractErrorMessage } from '@/services/api';
import type {
  ApiResponse, SubmitRecoveryRequestPayload, RecoveryRequest, RejectRecoveryRequestPayload,
  ApproveRecoveryResult, SetNewPasswordPayload, SetPinPayload, SetupPinPayload, LoginWithPinPayload,
} from '@schoolos/types';

export const recoveryApi = {
  async submitRequest(payload: SubmitRecoveryRequestPayload): Promise<void> {
    try {
      await apiClient.post('/auth/recovery/request', payload);
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },

  async list(status?: string): Promise<RecoveryRequest[]> {
    try {
      const res = await apiClient.get<ApiResponse<RecoveryRequest[]>>('/auth/recovery/requests', { params: status ? { status } : {} });
      return res.data.data ?? [];
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },

  async getById(id: string): Promise<RecoveryRequest> {
    try {
      const res = await apiClient.get<ApiResponse<RecoveryRequest>>(`/auth/recovery/requests/${id}`);
      return res.data.data!;
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },

  async approve(id: string): Promise<ApproveRecoveryResult> {
    try {
      const res = await apiClient.post<ApiResponse<ApproveRecoveryResult>>(`/auth/recovery/requests/${id}/approve`);
      return res.data.data!;
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },

  async reject(id: string, payload: RejectRecoveryRequestPayload = {}): Promise<RecoveryRequest> {
    try {
      const res = await apiClient.post<ApiResponse<RecoveryRequest>>(`/auth/recovery/requests/${id}/reject`, payload);
      return res.data.data!;
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },

  async completePasswordReset(payload: SetNewPasswordPayload): Promise<void> {
    try {
      await apiClient.post('/auth/complete-password-reset', payload);
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },

  async completePinReset(payload: SetPinPayload): Promise<void> {
    try {
      await apiClient.post('/auth/complete-pin-reset', payload);
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },

  async setupPin(payload: SetupPinPayload): Promise<{ deviceId: string }> {
    try {
      const res = await apiClient.post<ApiResponse<{ deviceId: string }>>('/auth/setup-pin', payload);
      return res.data.data!;
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },

  async loginWithPin(payload: LoginWithPinPayload): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      const res = await apiClient.post<ApiResponse<{ accessToken: string; refreshToken: string }>>('/auth/login-pin', payload);
      return res.data.data!;
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },

  async forgetDevice(deviceId: string): Promise<void> {
    try {
      await apiClient.delete(`/auth/devices/${deviceId}`);
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },
};
