import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { teacherPlannerApi } from '../api/teacher-planner.api';
import type { ConfirmPlannerPayload, GeneratePlannerPayload, AddPlannerTaskPayload } from '@schoolos/types';

export const teacherPlannerKeys = {
  all:          ['teacher-planner']                                    as const,
  mine:         (cls: string, subject: string) => [...teacherPlannerKeys.all, 'mine', cls, subject] as const,
  chapters:     (cls: string, subject: string) => [...teacherPlannerKeys.all, 'chapters', cls, subject] as const,
  teachingWeeks: (cls: string, subject: string) => [...teacherPlannerKeys.all, 'teaching-weeks', cls, subject] as const,
  progress:     (id: string) => [...teacherPlannerKeys.all, 'progress', id] as const,
  pace:         (id: string) => [...teacherPlannerKeys.all, 'pace', id] as const,
  principalOverview: ['teacher-planner', 'principal', 'overview'] as const,
  principalDetail:   (teacherId: string, cls: string, subject: string) => ['teacher-planner', 'principal', 'detail', teacherId, cls, subject] as const,
};

export const useMyPlanner = (cls: string, subject: string) =>
  useQuery({
    queryKey: teacherPlannerKeys.mine(cls, subject),
    queryFn:  () => teacherPlannerApi.getMine(cls, subject),
    enabled:  !!cls && !!subject,
  });

export const useSavedChapters = (cls: string, subject: string) =>
  useQuery({
    queryKey: teacherPlannerKeys.chapters(cls, subject),
    queryFn:  () => teacherPlannerApi.getChapters(cls, subject),
    enabled:  !!cls && !!subject,
  });

export const useTeachingWeeksInfo = (cls: string, subject: string) =>
  useQuery({
    queryKey: teacherPlannerKeys.teachingWeeks(cls, subject),
    queryFn:  () => teacherPlannerApi.getTeachingWeeks(cls, subject),
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

// Never saves anything — just computes a draft for review.
export const useGeneratePlanner = () =>
  useMutation({ mutationFn: (payload: GeneratePlannerPayload) => teacherPlannerApi.generate(payload) });

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

// ── Principal (read-only) ─────────────────────────────────────────────────────

export const usePrincipalPlannerOverview = () =>
  useQuery({
    queryKey: teacherPlannerKeys.principalOverview,
    queryFn:  () => teacherPlannerApi.getPrincipalOverview(),
  });

export const usePrincipalPlannerDetail = (teacherId: string, cls: string, subject: string) =>
  useQuery({
    queryKey: teacherPlannerKeys.principalDetail(teacherId, cls, subject),
    queryFn:  () => teacherPlannerApi.getForTeacher(teacherId, cls, subject),
    enabled:  !!teacherId && !!cls && !!subject,
  });

// Adding a task changes yearPercent/pace everywhere it's shown (this detail
// view, the subject grouping, and the teacher overview), so invalidate the
// whole feature key rather than just this one query.
export const useAddPrincipalTask = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ plannerId, payload }: { plannerId: string; payload: AddPlannerTaskPayload }) =>
      teacherPlannerApi.addTaskForTeacher(plannerId, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: teacherPlannerKeys.all }),
  });
};
