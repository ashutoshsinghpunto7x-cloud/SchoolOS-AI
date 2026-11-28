import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { academicPlanApi, PlanTarget, ChapterSizingPayload } from '../api/academic-plan.api';
import type { GenerateAcademicPlanPayload, SetPlanDayStatusPayload, EditPlanDayPayload, AddPlanDayPayload, MovePlanDayPayload, SetMonthlyRowPayload, SetPlanDaysStatusPayload } from '@schoolos/types';

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

export const useMyChecklist = (from: string, to: string) =>
  useQuery({
    queryKey: [...academicPlanKeys.all, 'checklist', from, to],
    queryFn:  () => academicPlanApi.getMyChecklist(from, to),
  });

/** Ticks / un-ticks days across one or several plans in one go. */
export const useTickPlanDays = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ status, days }: { status: SetPlanDaysStatusPayload['status']; days: { planId: string; date: string }[] }) => {
      const byPlan = new Map<string, string[]>();
      for (const d of days) byPlan.set(d.planId, [...(byPlan.get(d.planId) ?? []), d.date]);
      return Promise.all([...byPlan].map(([planId, dates]) => academicPlanApi.setDaysStatus(planId, { dates, status })));
    },
    // Show the tick at once: patch every cached checklist / plan, roll back on failure.
    onMutate: async ({ status, days }) => {
      await qc.cancelQueries({ queryKey: academicPlanKeys.all });
      const snapshot = qc.getQueriesData({ queryKey: academicPlanKeys.all });
      const want = new Set(days.map((d) => `${d.planId}|${d.date.slice(0, 10)}`));
      const apply = (data: unknown): unknown => {
        if (Array.isArray(data)) {
          return data.map((i) => (i && typeof i === 'object' && 'planId' in i && 'date' in i && want.has(`${(i as { planId: string }).planId}|${(i as { date: string }).date.slice(0, 10)}`)
            ? { ...i, status } : i));
        }
        const plan = data as { _id?: string; days?: { date: string; status: string; blockType: string }[] } | null;
        if (plan && plan._id && Array.isArray(plan.days)) {
          return { ...plan, days: plan.days.map((d) => (want.has(`${plan._id}|${d.date.slice(0, 10)}`) && d.blockType !== 'buffer' ? { ...d, status } : d)) };
        }
        return data;
      };
      qc.setQueriesData({ queryKey: academicPlanKeys.all }, apply);
      return { snapshot };
    },
    onError: (_err, _vars, ctx) => ctx?.snapshot.forEach(([key, data]) => qc.setQueryData(key, data)),
    // Re-sync quietly in the background; never hold the tick waiting for it.
    onSettled: () => { void qc.invalidateQueries({ queryKey: academicPlanKeys.all }); },
  });
};

export const useAddPlanDay = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ planId, payload }: { planId: string; payload: AddPlanDayPayload }) => academicPlanApi.addDay(planId, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: academicPlanKeys.all }),
  });
};

/** Edit one lesson of the teacher's own plan by plan id (used from the dashboard checklist). */
export const useEditChecklistDay = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ planId, payload }: { planId: string; payload: EditPlanDayPayload }) => academicPlanApi.editDay(planId, payload),
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

export const useSetMonthlyRow = (planId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: SetMonthlyRowPayload) => academicPlanApi.setMonthlyRow(planId, payload),
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
    refetchInterval: 30_000, // picks up teachers' ticks while the screen is open
  });

export const usePrincipalPlanDetail = (teacherId: string, target: PlanTarget) =>
  useQuery({
    queryKey: academicPlanKeys.principalDetail(teacherId, target),
    queryFn:  () => academicPlanApi.getForTeacher(teacherId, target),
    enabled:  !!teacherId && !!target.class && !!target.subject,
    refetchInterval: 30_000,
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
