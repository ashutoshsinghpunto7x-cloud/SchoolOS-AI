import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { academicPlanApi, PlanTarget, ChapterSizingPayload } from '../api/academic-plan.api';
import type { GenerateAcademicPlanPayload, SetPlanDayStatusPayload, EditPlanDayPayload, MovePlanDayPayload } from '@schoolos/types';

function targetKey(t: PlanTarget) {
  return [t.class, t.section ?? '', t.subject] as const;
}

export const academicPlanKeys = {
  all:  ['academic-plan'] as const,
  mine: (t: PlanTarget) => [...academicPlanKeys.all, 'mine', ...targetKey(t)] as const,
  principalOverview: ['academic-plan', 'principal', 'overview'] as const,
  principalDetail:   (teacherId: string, t: PlanTarget) => ['academic-plan', 'principal', 'detail', teacherId, ...targetKey(t)] as const,
  alerts: ['academic-plan', 'alerts'] as const,
};

export const useMyAcademicPlan = (target: PlanTarget) =>
  useQuery({
    queryKey: academicPlanKeys.mine(target),
    queryFn:  () => academicPlanApi.getMine(target),
    enabled:  !!target.class && !!target.subject,
  });

export const useGenerateAcademicPlan = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: GenerateAcademicPlanPayload) => academicPlanApi.generate(payload),
    onSuccess:  () => qc.invalidateQueries({ queryKey: academicPlanKeys.all }),
  });
};

export const useSetPlanDayStatus = (planId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: SetPlanDayStatusPayload) => academicPlanApi.setDayStatus(planId, payload),
    // Carry-forward can append a brand-new day to the plan, so re-fetch the
    // whole plan rather than patching one day in the cache locally.
    onSuccess: () => qc.invalidateQueries({ queryKey: academicPlanKeys.all }),
  });
};

export const useEditPlanDay = (planId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: EditPlanDayPayload) => academicPlanApi.editDay(planId, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: academicPlanKeys.all }),
  });
};

export const useMovePlanDay = (planId: string) => {
  const qc = useQueryClient();
  return useMutation({
    // Swaps two days at once — always re-fetch rather than patch the cache.
    mutationFn: (payload: MovePlanDayPayload) => academicPlanApi.moveDay(planId, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: academicPlanKeys.all }),
  });
};

// ── Principal (read-only) ─────────────────────────────────────────────────────

export const usePrincipalPlanOverview = () =>
  useQuery({
    queryKey: academicPlanKeys.principalOverview,
    queryFn:  () => academicPlanApi.getPrincipalOverview(),
  });

export const usePrincipalPlanDetail = (teacherId: string, target: PlanTarget) =>
  useQuery({
    queryKey: academicPlanKeys.principalDetail(teacherId, target),
    queryFn:  () => academicPlanApi.getForTeacher(teacherId, target),
    enabled:  !!teacherId && !!target.class && !!target.subject,
  });

// ── Coordinator (syllabus sizing) ─────────────────────────────────────────────

export const useUpdateChapterSizing = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ chapterId, payload }: { chapterId: string; payload: ChapterSizingPayload }) =>
      academicPlanApi.updateChapterSizing(chapterId, payload),
    // Chapters are cached under question-bank's own key (useChapters), not
    // this feature's — invalidate broadly rather than reaching into another
    // feature's query-key internals.
    onSuccess: (_data, { chapterId: _chapterId }) => qc.invalidateQueries({ queryKey: ['question-bank'] }),
  });
};

// ── Plan Alerts (automation) ───────────────────────────────────────────────────

export const usePlanAlerts = () =>
  useQuery({
    queryKey: academicPlanKeys.alerts,
    queryFn:  () => academicPlanApi.listAlerts(),
    staleTime: 60_000,
  });

export const useResolvePlanAlert = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (alertId: string) => academicPlanApi.resolveAlert(alertId),
    onSuccess: () => qc.invalidateQueries({ queryKey: academicPlanKeys.alerts }),
  });
};
