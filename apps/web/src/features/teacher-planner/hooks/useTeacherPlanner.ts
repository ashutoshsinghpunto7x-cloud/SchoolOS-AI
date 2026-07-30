import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { teacherPlannerApi } from '../api/teacher-planner.api';
import type { ConfirmPlannerPayload } from '@schoolos/types';

export const teacherPlannerKeys = {
  all:      ['teacher-planner']                                    as const,
  mine:     (cls: string, subject: string) => [...teacherPlannerKeys.all, 'mine', cls, subject] as const,
  progress: (id: string) => [...teacherPlannerKeys.all, 'progress', id] as const,
  pace:     (id: string) => [...teacherPlannerKeys.all, 'pace', id] as const,
};

export const useMyPlanner = (cls: string, subject: string) =>
  useQuery({
    queryKey: teacherPlannerKeys.mine(cls, subject),
    queryFn:  () => teacherPlannerApi.getMine(cls, subject),
    enabled:  !!cls && !!subject,
  });

export const usePlannerProgress = (plannerId: string) =>
  useQuery({
    queryKey: teacherPlannerKeys.progress(plannerId),
    queryFn:  () => teacherPlannerApi.getProgress(plannerId),
    enabled:  !!plannerId,
  });

export const usePlannerPace = (plannerId: string) =>
  useQuery({
    queryKey: teacherPlannerKeys.pace(plannerId),
    queryFn:  () => teacherPlannerApi.getPace(plannerId),
    enabled:  !!plannerId,
  });

export const useConfirmPlanner = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ConfirmPlannerPayload) => teacherPlannerApi.confirmPlanner(payload),
    onSuccess:  () => qc.invalidateQueries({ queryKey: teacherPlannerKeys.all }),
  });
};

export const useToggleTask = (plannerId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, status }: { taskId: string; status: 'pending' | 'completed' }) =>
      teacherPlannerApi.toggleTask(plannerId, taskId, status),
    // Invalidates the whole feature key, not just progress/pace — the weeks
    // accordion reads task status from the "mine" planner query directly, so
    // that needs to refetch too or it shows stale per-week completion counts.
    onSuccess: () => qc.invalidateQueries({ queryKey: teacherPlannerKeys.all }),
  });
};

// AI extraction never saves anything, so no query invalidation on success.
export const useExtractPlannerFromImage = () =>
  useMutation({ mutationFn: ({ target, file }: { target: { class: string; subject: string }; file: File }) => teacherPlannerApi.extractFromImage(target, file) });

export const useExtractPlannerFromPdf = () =>
  useMutation({ mutationFn: ({ target, file }: { target: { class: string; subject: string }; file: File }) => teacherPlannerApi.extractFromPdf(target, file) });
