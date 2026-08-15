import { apiClient, extractErrorMessage } from '@/services/api';
import type { ApiResponse } from '@schoolos/types';
import type { ParentWorkspaceBundle } from '../types';

export const parentWorkspaceApi = {
  async getWorkspace(childId?: string): Promise<ParentWorkspaceBundle> {
    try {
      const res = await apiClient.get<ApiResponse<ParentWorkspaceBundle>>('/parent-workspace', {
        params: childId ? { childId } : undefined,
      });
      return res.data.data!;
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },

  async askAI(childId: string, question: string): Promise<string> {
    try {
      const res = await apiClient.post<ApiResponse<{ text: string }>>('/parent-workspace/ai/ask', {
        childId,
        question,
      });
      return res.data.data!.text;
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },
};
