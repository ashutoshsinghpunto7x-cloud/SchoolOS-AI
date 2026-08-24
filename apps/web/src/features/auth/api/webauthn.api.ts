import { apiClient, extractErrorMessage, ApiError } from '@/services/api';
import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from '@simplewebauthn/browser';

interface ApiResponse<T> {
  data: T;
}

export interface WebAuthnCredentialSummary {
  _id: string;
  deviceLabel?: string;
  deviceType: 'singleDevice' | 'multiDevice';
  lastUsedAt: string;
  createdAt: string;
}

export const webauthnApi = {
  async getRegistrationOptions(): Promise<PublicKeyCredentialCreationOptionsJSON> {
    try {
      const res = await apiClient.post<ApiResponse<PublicKeyCredentialCreationOptionsJSON>>('/auth/webauthn/register/options');
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  async verifyRegistration(response: RegistrationResponseJSON, deviceLabel?: string): Promise<void> {
    try {
      await apiClient.post('/auth/webauthn/register/verify', { response, deviceLabel });
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  async listCredentials(): Promise<WebAuthnCredentialSummary[]> {
    try {
      const res = await apiClient.get<ApiResponse<WebAuthnCredentialSummary[]>>('/auth/webauthn/credentials');
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  async deleteCredential(id: string): Promise<void> {
    try {
      await apiClient.delete(`/auth/webauthn/credentials/${id}`);
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  async getLoginOptions(): Promise<PublicKeyCredentialRequestOptionsJSON> {
    try {
      const res = await apiClient.post<ApiResponse<PublicKeyCredentialRequestOptionsJSON>>('/auth/webauthn/login/options');
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  async verifyLogin(response: AuthenticationResponseJSON, challenge: string): Promise<{ accessToken: string; sessionId: string }> {
    try {
      const res = await apiClient.post<ApiResponse<{ accessToken: string; sessionId: string }>>('/auth/webauthn/login/verify', { response, challenge });
      return res.data.data;
    } catch (err) { throw new ApiError(err); }
  },
};
