import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { receptionTaskApi } from '../api/reception-task.api';
import type { CreateReceptionTaskPayload, UpdateReceptionTaskPayload, ReceptionTaskListOptions } from '@schoolos/types';

export const receptionTaskKeys = {
  all:   ['reception-tasks'] as const,
  lists: () => [...receptionTaskKeys.all, 'list'] as const,
  list:  (o: ReceptionTaskListOptions) => [...receptionTaskKeys.lists(), o] as const,
};

export const useReceptionTasks = (opts: ReceptionTaskListOptions = {}) =>
  useQuery({
    queryKey: receptionTaskKeys.list(opts),
    queryFn:  () => receptionTaskApi.list(opts),
    placeholderData: keepPreviousData,
    // Picks up tasks the auto-wait cron just raised (runs every 5 min
    // server-side) without reception needing to refresh manually.
    refetchInterval: 30_000,
  });

export const useCreateReceptionTask = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateReceptionTaskPayload) => receptionTaskApi.create(payload),
    onSuccess:  () => qc.invalidateQueries({ queryKey: receptionTaskKeys.all }),
  });
};

export const useUpdateReceptionTask = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateReceptionTaskPayload }) =>
      receptionTaskApi.update(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: receptionTaskKeys.all }),
  });
};

export const useSetReceptionTaskStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: Parameters<typeof receptionTaskApi.setStatus>[1] }) =>
      receptionTaskApi.setStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: receptionTaskKeys.all }),
  });
};

export const useCompleteReceptionTask = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, completionNotes }: { id: string; completionNotes?: string }) =>
      receptionTaskApi.complete(id, completionNotes),
    onSuccess: () => qc.invalidateQueries({ queryKey: receptionTaskKeys.all }),
  });
};

export const useSnoozeReceptionTask = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dueDate }: { id: string; dueDate: string }) => receptionTaskApi.snooze(id, dueDate),
    onSuccess: () => qc.invalidateQueries({ queryKey: receptionTaskKeys.all }),
  });
};

export const useDeleteReceptionTask = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => receptionTaskApi.deleteTask(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: receptionTaskKeys.all }),
  });
};
