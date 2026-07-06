import { apiClient, extractErrorMessage } from '@/services/api';
import type {
  ApiResponse,
  NotificationListResult,
  SendMessageToTeachersPayload,
  SendMessageToTeachersResult,
} from '@schoolos/types';

export const notificationsApi = {
  async list(): Promise<NotificationListResult> {
    try {
      const res = await apiClient.get<ApiResponse<NotificationListResult>>('/notifications/me');
      return res.data.data ?? { notifications: [], unreadCount: 0 };
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },

  async markRead(id: string): Promise<void> {
    try {
      await apiClient.patch(`/notifications/${id}/read`);
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },

  async markAllRead(): Promise<void> {
    try {
      await apiClient.patch('/notifications/read-all');
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },

  async sendMessageToTeachers(payload: SendMessageToTeachersPayload): Promise<SendMessageToTeachersResult> {
    try {
      const res = await apiClient.post<ApiResponse<SendMessageToTeachersResult>>('/notifications/broadcast', payload);
      return res.data.data!;
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },
};
