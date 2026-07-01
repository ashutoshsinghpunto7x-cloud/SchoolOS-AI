import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workflowApi, WorkflowWithConfig } from '../api/workflow.api';
import type { WorkflowId, UpdateWorkflowConfigPayload } from '@schoolos/types';

export const workflowKeys = {
  all: ['workflows'] as const,
  lists: () => [...workflowKeys.all, 'list'] as const,
  detail: (id: WorkflowId) => [...workflowKeys.all, 'detail', id] as const,
  stats: (id: WorkflowId) => [...workflowKeys.all, 'stats', id] as const,
  dashboard: () => [...workflowKeys.all, 'dashboard'] as const,
};

export const useWorkflows = () =>
  useQuery({
    queryKey: workflowKeys.lists(),
    queryFn: workflowApi.list,
  });

export const useWorkflow = (id: WorkflowId | null) =>
  useQuery({
    queryKey: workflowKeys.detail(id ?? 'WF-001'),
    queryFn: () => workflowApi.getOne(id!),
    enabled: Boolean(id),
  });

export const useWorkflowStats = (id: WorkflowId | null) =>
  useQuery({
    queryKey: workflowKeys.stats(id ?? 'WF-001'),
    queryFn: () => workflowApi.getStats(id!),
    enabled: Boolean(id),
  });

export const useAutomationDashboard = () =>
  useQuery({
    queryKey: workflowKeys.dashboard(),
    queryFn: workflowApi.getDashboardMetrics,
    refetchInterval: 30_000,
  });

export const useUpdateWorkflowConfig = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: WorkflowId; payload: UpdateWorkflowConfigPayload }) =>
      workflowApi.updateConfig(id, payload),
    onSuccess: (data: WorkflowWithConfig) => {
      qc.invalidateQueries({ queryKey: workflowKeys.lists() });
      qc.invalidateQueries({ queryKey: workflowKeys.detail(data.id as WorkflowId) });
    },
  });
};

export const useTriggerWorkflow = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: workflowApi.trigger,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: workflowKeys.dashboard() });
    },
  });
};
