import { apiClient, extractErrorMessage } from '@/services/api';
import type {
  ApiResponse,
  InternalMessage,
  InternalMessageListResult,
  MessageTemplate,
  StaffDirectoryEntry,
  SendInternalMessagePayload,
  SendInternalMessageResult,
  CreateMessageTemplatePayload,
} from '@schoolos/types';

export const internalMessagesApi = {
  async list(): Promise<InternalMessageListResult> {
    try {
      const res = await apiClient.get<ApiResponse<InternalMessageListResult>>('/internal-messages/me');
      return res.data.data ?? { messages: [], unreadCount: 0 };
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },

  async pendingAcknowledgment(): Promise<InternalMessage[]> {
    try {
      const res = await apiClient.get<ApiResponse<InternalMessage[]>>('/internal-messages/me/pending-acknowledgment');
      return res.data.data ?? [];
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },

  async markRead(id: string): Promise<void> {
    try {
      await apiClient.patch(`/internal-messages/${id}/read`);
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },

  async acknowledge(id: string): Promise<void> {
    try {
      await apiClient.post(`/internal-messages/${id}/acknowledge`);
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },

  async send(payload: SendInternalMessagePayload): Promise<SendInternalMessageResult> {
    try {
      const res = await apiClient.post<ApiResponse<SendInternalMessageResult>>('/internal-messages/send', payload);
      return res.data.data!;
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },

  async listSent(): Promise<InternalMessage[]> {
    try {
      const res = await apiClient.get<ApiResponse<InternalMessage[]>>('/internal-messages/sent');
      return res.data.data ?? [];
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },

  async listTemplates(): Promise<MessageTemplate[]> {
    try {
      const res = await apiClient.get<ApiResponse<MessageTemplate[]>>('/internal-messages/templates');
      return res.data.data ?? [];
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },

  async createTemplate(payload: CreateMessageTemplatePayload): Promise<MessageTemplate> {
    try {
      const res = await apiClient.post<ApiResponse<MessageTemplate>>('/internal-messages/templates', payload);
      return res.data.data!;
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },

  async deleteTemplate(id: string): Promise<void> {
    try {
      await apiClient.delete(`/internal-messages/templates/${id}`);
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },

  async staffDirectory(): Promise<StaffDirectoryEntry[]> {
    try {
      const res = await apiClient.get<ApiResponse<StaffDirectoryEntry[]>>('/internal-messages/staff-directory');
      return res.data.data ?? [];
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },
};
