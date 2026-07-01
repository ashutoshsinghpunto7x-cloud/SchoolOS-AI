import { apiClient, extractErrorMessage } from '@/services/api';
import type {
  ApiResponse,
  WorkflowId,
  WorkflowDefinition,
  WorkflowConfig,
  UpdateWorkflowConfigPayload,
  AutomationDashboardMetrics,
} from '@schoolos/types';

const handle = async <T>(promise: Promise<{ data: ApiResponse<T> }>): Promise<T> => {
  try {
    const res = await promise;
    return res.data.data!;
  } catch (err) {
    throw new Error(extractErrorMessage(err));
  }
};

export type WorkflowWithConfig = WorkflowDefinition & {
  config: WorkflowConfig;
  savedAt: string | null;
};

export type WorkflowStats = {
  totalExecutions: number;
  successCount: number;
  failureCount: number;
  avgDurationMs: number;
  lastExecutedAt?: string;
};

export type TriggerResult = {
  workflowId: WorkflowId;
  jobId: string;
  status: string;
};

export const workflowApi = {
  list: () =>
    handle(apiClient.get<ApiResponse<WorkflowWithConfig[]>>('/workflows')),

  getOne: (id: WorkflowId) =>
    handle(apiClient.get<ApiResponse<WorkflowWithConfig>>(`/workflows/${id}`)),

  updateConfig: (id: WorkflowId, payload: UpdateWorkflowConfigPayload) =>
    handle(apiClient.patch<ApiResponse<WorkflowWithConfig>>(`/workflows/${id}/config`, payload)),

  trigger: (payload: { workflowId: WorkflowId; payload: Record<string, unknown> }) =>
    handle(apiClient.post<ApiResponse<TriggerResult>>('/workflows/trigger', payload)),

  getStats: (id: WorkflowId) =>
    handle(apiClient.get<ApiResponse<WorkflowStats>>(`/workflows/${id}/stats`)),

  getDashboardMetrics: () =>
    handle(apiClient.get<ApiResponse<AutomationDashboardMetrics>>('/workflows/dashboard')),
};
