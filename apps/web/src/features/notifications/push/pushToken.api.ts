import { apiClient, extractErrorMessage } from '@/services/api';
import type { RegisterDeviceTokenPayload } from '@schoolos/types';

// Wraps the existing /users/me/device-tokens endpoints (device-token.routes.ts)
// rather than introducing a second registration API for the same concept.
export const pushTokenApi = {
  async register(payload: RegisterDeviceTokenPayload): Promise<void> {
    try {
      await apiClient.post('/users/me/device-tokens', payload);
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },

  async unregister(token: string): Promise<void> {
    try {
      await apiClient.delete(`/users/me/device-tokens/${encodeURIComponent(token)}`);
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },
};
