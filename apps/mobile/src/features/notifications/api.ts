import type { RegisterDeviceTokenPayload } from '@schoolos/types';
import { apiClient } from '@/services/api/client';

export const notificationsApi = {
  async registerDeviceToken(payload: RegisterDeviceTokenPayload): Promise<void> {
    await apiClient.post('/users/me/device-tokens', payload);
  },

  async unregisterDeviceToken(token: string): Promise<void> {
    await apiClient.delete(`/users/me/device-tokens/${encodeURIComponent(token)}`);
  },
};
