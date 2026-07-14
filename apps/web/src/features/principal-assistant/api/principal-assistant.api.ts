import { apiClient, extractErrorMessage } from '@/services/api';
import type { ApiResponse } from '@schoolos/types';

export interface ChatReply {
  reply: string;
}

export const principalAssistantApi = {
  async sendMessage(message: string): Promise<ChatReply> {
    try {
      const res = await apiClient.post<ApiResponse<ChatReply>>('/principal-assistant/chat', { message });
      return res.data.data!;
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },
};
