import { apiClient, extractErrorMessage } from '@/services/api';
import type { ApiResponse, AiConversation, AiStatus } from '@schoolos/types';

const handle = async <T>(promise: Promise<{ data: ApiResponse<T> }>): Promise<T> => {
  try {
    const res = await promise;
    return res.data.data!;
  } catch (err) {
    throw new Error(extractErrorMessage(err));
  }
};

export const aiApi = {
  /** Returns the AI conversation for a given communication, or null if none exists. */
  getConversation: (communicationId: string): Promise<AiConversation | null> =>
    handle(apiClient.get(`/ai/conversations/${communicationId}`)),

  /** Returns provider health status (admin only). */
  getStatus: (): Promise<AiStatus> =>
    handle(apiClient.get('/ai/status')),
};
