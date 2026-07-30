import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { lessonPlannerApi } from '../api/lesson-planner.api';
import type { LessonPlanListOptions, GenerateLessonPlanPayload, SaveLessonPlanPayload, UpdateLessonPlanPayload } from '@schoolos/types';

export const lessonPlannerKeys = {
  all:    ['lesson-planner']                        as const,
  lists:  () => [...lessonPlannerKeys.all, 'list']    as const,
  list:   (o: LessonPlanListOptions) => [...lessonPlannerKeys.lists(), o] as const,
  detail: (id: string) => [...lessonPlannerKeys.all, 'detail', id] as const,
};

export const useLessonPlans = (opts: LessonPlanListOptions = {}) =>
  useQuery({
    queryKey: lessonPlannerKeys.list(opts),
    queryFn:  () => lessonPlannerApi.list(opts),
    enabled:  !!opts.chapterId,
  });

export const useLessonPlan = (id: string) =>
  useQuery({
    queryKey: lessonPlannerKeys.detail(id),
    queryFn:  () => lessonPlannerApi.getById(id),
    enabled:  !!id,
  });

// AI generation never saves anything, so no query invalidation on success.
export const useGenerateLessonPlan = () =>
  useMutation({ mutationFn: (payload: GenerateLessonPlanPayload) => lessonPlannerApi.generate(payload) });

function useInvalidatingMutation<TPayload, TResult>(fn: (payload: TPayload) => Promise<TResult>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess:  () => qc.invalidateQueries({ queryKey: lessonPlannerKeys.all }),
  });
}

export const useSaveLessonPlan = () => useInvalidatingMutation((payload: SaveLessonPlanPayload) => lessonPlannerApi.save(payload));
export const useDeleteLessonPlan = () => useInvalidatingMutation((id: string) => lessonPlannerApi.delete(id));

export const useUpdateLessonPlan = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateLessonPlanPayload) => lessonPlannerApi.update(id, payload),
    onSuccess:  () => qc.invalidateQueries({ queryKey: lessonPlannerKeys.all }),
  });
};
