import { apiClient, extractErrorMessage } from '@/services/api';
import type { ApiResponse } from '@schoolos/types';

export interface PreviewField {
  key: string;
  label: string;
  value: unknown;
  type: 'text' | 'date' | 'time' | 'multiselect' | 'textarea';
  editable: boolean;
  options?: { value: string; label: string }[];
}

export interface ActionPreview {
  title: string;
  fields: PreviewField[];
  warnings?: string[];
}

export interface ChatHistoryTurn {
  role: 'user' | 'assistant';
  content: string;
}

export type ChatReply =
  | { type: 'text'; reply: string; quickReplies?: string[] }
  | { type: 'navigate'; reply: string; path: string; label: string }
  | { type: 'substitution_plan'; reply: string; date: string }
  | { type: 'action_preview'; actionId: string; params: Record<string, unknown>; preview: ActionPreview };

export interface ActionPreviewResponse {
  actionId: string;
  params: Record<string, unknown>;
  preview: ActionPreview;
}

export interface ActionExecuteResponse {
  actionId: string;
  summary: string;
  notifiedCount?: number;
}

export const principalAssistantApi = {
  async sendMessage(message: string, history?: ChatHistoryTurn[], signal?: AbortSignal): Promise<ChatReply> {
    try {
      const res = await apiClient.post<ApiResponse<ChatReply>>('/principal-assistant/chat', { message, history }, { signal });
      return res.data.data!;
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },

  /** Downloads an assistant answer as a PDF or Excel file. */
  async exportAnswer(title: string, text: string, format: 'pdf' | 'xlsx'): Promise<void> {
    try {
      const res = await apiClient.post('/principal-assistant/export', { title, text, format }, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data as Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title.replace(/[^a-z0-9]+/gi, '_').slice(0, 40) || 'answer'}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },

  async previewAction(actionId: string, params: Record<string, unknown>): Promise<ActionPreviewResponse> {
    try {
      const res = await apiClient.post<ApiResponse<ActionPreviewResponse>>('/principal-assistant/action/preview', {
        actionId,
        params,
      });
      return res.data.data!;
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },

  async executeAction(actionId: string, params: Record<string, unknown>): Promise<ActionExecuteResponse> {
    try {
      const res = await apiClient.post<ApiResponse<ActionExecuteResponse>>('/principal-assistant/action/execute', {
        actionId,
        params,
        confirmed: true,
      });
      return res.data.data!;
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },
};
