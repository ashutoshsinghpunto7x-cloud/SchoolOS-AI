import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { automationApi } from '../api/automation.api';
import type { AutomationJobStatus, AutomationJobsQueryOptions } from '@schoolos/types';

const TERMINAL: AutomationJobStatus[] = ['COMPLETED', 'FAILED', 'CANCELLED'];

export const automationKeys = {
  all: ['automation'] as const,
  lists: () => [...automationKeys.all, 'list'] as const,
  list: (opts: AutomationJobsQueryOptions) => [...automationKeys.lists(), opts] as const,
  detail: (id: string) => [...automationKeys.all, 'detail', id] as const,
};

export const useAutomationJobs = (opts: AutomationJobsQueryOptions = {}) =>
  useQuery({
    queryKey: automationKeys.list(opts),
    queryFn: () => automationApi.list(opts),
  });

export const useAutomationJob = (id: string | null) =>
  useQuery({
    queryKey: automationKeys.detail(id ?? ''),
    queryFn: () => automationApi.getById(id!),
    enabled: Boolean(id),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status && TERMINAL.includes(status) ? false : 3_000;
    },
  });

export const useCancelJob = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => automationApi.cancel(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: automationKeys.lists() });
      qc.invalidateQueries({ queryKey: automationKeys.detail(id) });
    },
  });
};

export const useRetryJob = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => automationApi.retry(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: automationKeys.lists() });
      qc.invalidateQueries({ queryKey: automationKeys.detail(id) });
    },
  });
};
