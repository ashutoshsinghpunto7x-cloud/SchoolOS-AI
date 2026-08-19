import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, Trash2, CheckCircle2, AlertTriangle, Plus, BookOpen } from 'lucide-react';
import { useSavedChapters, useTeachingWeeksInfo, useMyPlanner, useGeneratePlanner, useConfirmPlanner } from '../hooks/useTeacherPlanner';
import type { PlannerDraftWeek, PlannerTaskType } from '@schoolos/types';

const TASK_TYPES: PlannerTaskType[] = ['explain', 'activity', 'worksheet', 'homework', 'doubt_session', 'revision', 'unit_test', 'other'];

function labelize(s: string): string {
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function PlannerBuildPage() {
  const { cls = '', subject = '' } = useParams();
  const navigate = useNavigate();

  const { data: chapters, isLoading: chaptersLoading } = useSavedChapters(cls, subject);
  const { data: teachingWeeks } = useTeachingWeeksInfo(cls, subject);
  const { data: existingPlanner, isLoading: plannerLoading } = useMyPlanner(cls, subject);
  const generate = useGeneratePlanner();
  const confirm = useConfirmPlanner();

  const [durations, setDurations] = useState<Record<string, number>>({});
  const [warnings, setWarnings] = useState<string[]>([]);
  const [weeks, setWeeks] = useState<PlannerDraftWeek[] | null>(null);
  const [seeded, setSeeded] = useState(false);

  // Seed the review list from an existing plan (if any) exactly once, so
  // this same screen doubles as the edit surface — new chapters picked below
  // get appended after these rather than starting the year over.
  useEffect(() => {
    if (seeded || plannerLoading) return;
    if (existingPlanner) {
      setWeeks(existingPlanner.weeks.map((w) => ({
        weekNumber: w.weekNumber,
        chapterName: w.chapterName,
        topic: w.topic,
        tasks: w.tasks.map((t) => ({ title: t.title, type: t.type })),
      })));
    }
    setSeeded(true);
  }, [seeded, plannerLoading, existingPlanner]);

  const usedWeeks = weeks?.length ?? 0;
  const totalTeachingWeeks = teachingWeeks?.totalTeachingWeeks ?? 0;
  const selectedTotal = useMemo(() => Object.values(durations).reduce((a, b) => a + b, 0), [durations]);
  const remaining = totalTeachingWeeks - usedWeeks - selectedTotal;

  function toggleChapter(chapterId: string, checked: boolean) {
    setDurations((prev) => {
      const next = { ...prev };
      if (checked) next[chapterId] = next[chapterId] ?? 1;
      else delete next[chapterId];
      return next;
    });
  }

  function setDuration(chapterId: string, value: number) {
    setDurations((prev) => ({ ...prev, [chapterId]: Math.max(1, value) }));
  }

  async function handleGenerate() {
    const chapterPlans = Object.entries(durations).map(([chapterId, weeksCount]) => ({ chapterId, weeks: weeksCount }));
    if (chapterPlans.length === 0) return;
    try {
      const result = await generate.mutateAsync({ class: cls, subject, chapterPlans, startFromWeek: usedWeeks });
      setWeeks((prev) => [...(prev ?? []), ...result.weeks]);
      setWarnings(result.warnings);
      setDurations({});
      if (result.weeks.length === 0) toast.error('Nothing generated — check the durations picked');
      else toast.success(`${result.weeks.length} week(s) added — review below before saving`);
    } catch (err) {
      toast.error('Could not generate the plan', { description: err instanceof Error ? err.message : undefined });
    }
  }

  function updateWeek(index: number, patch: Partial<PlannerDraftWeek>) {
    setWeeks((prev) => prev?.map((w, i) => (i === index ? { ...w, ...patch } : w)) ?? null);
  }

  function removeWeek(index: number) {
    setWeeks((prev) => prev?.filter((_, i) => i !== index) ?? null);
  }

  function addTask(weekIndex: number) {
    setWeeks((prev) =>
      prev?.map((w, i) => (i === weekIndex ? { ...w, tasks: [...w.tasks, { title: 'New task', type: 'explain' as PlannerTaskType }] } : w)) ?? null,
    );
  }

  function removeTask(weekIndex: number, taskIndex: number) {
    setWeeks((prev) =>
      prev?.map((w, i) => (i === weekIndex ? { ...w, tasks: w.tasks.filter((_, ti) => ti !== taskIndex) } : w)) ?? null,
    );
  }

  function updateTaskTitle(weekIndex: number, taskIndex: number, title: string) {
    setWeeks((prev) =>
      prev?.map((w, i) => (i === weekIndex ? { ...w, tasks: w.tasks.map((t, ti) => (ti === taskIndex ? { ...t, title } : t)) } : w)) ?? null,
    );
  }

  function updateTaskType(weekIndex: number, taskIndex: number, type: PlannerTaskType) {
    setWeeks((prev) =>
      prev?.map((w, i) =>
        i === weekIndex ? { ...w, tasks: w.tasks.map((t, ti) => (ti === taskIndex ? { ...t, type } : t)) } : w,
      ) ?? null,
    );
  }

  function addChapterBlock() {
    setWeeks((prev) => [...(prev ?? []), { weekNumber: (prev?.length ?? 0) + 1, chapterName: 'New chapter', topic: '', tasks: [] }]);
  }

  async function handleSave() {
    if (!weeks || weeks.length === 0) return;
    try {
      await confirm.mutateAsync({ class: cls, subject, weeks });
      toast.success('Planner saved');
      navigate(`/teacher/planner/${cls}/${encodeURIComponent(subject)}`);
    } catch (err) {
      toast.error('Could not save the planner', { description: err instanceof Error ? err.message : undefined });
    }
  }

  return (
    <div className="min-h-screen bg-[#FAFBFF] dark:bg-transparent pb-24">
      <div className="sticky top-0 z-10 bg-white/90 dark:bg-black/40 backdrop-blur border-b border-gray-100 dark:border-white/10 px-5 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} type="button" className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 dark:text-white/50">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <h1 className="text-sm font-bold text-gray-900 dark:text-white">Build Planner — Class {cls} {subject}</h1>
      </div>

      <div className="max-w-3xl mx-auto px-5 py-6 space-y-5">
        {totalTeachingWeeks > 0 && (
          <p className="text-xs text-gray-400">
            This academic year has <strong className="text-gray-600 dark:text-white/60">{totalTeachingWeeks}</strong> teaching weeks —{' '}
            <strong className={remaining < 0 ? 'text-red-500' : 'text-gray-600 dark:text-white/60'}>{Math.max(remaining, 0)}</strong> unassigned so far
            {remaining < 0 && <span className="text-red-500"> (over by {Math.abs(remaining)})</span>}.
          </p>
        )}

        <div className="bg-white dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/10 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">Pick chapters &amp; duration</p>
          {chaptersLoading ? (
            <div className="h-16 bg-gray-50 dark:bg-white/5 rounded-xl animate-pulse" />
          ) : !chapters || chapters.length === 0 ? (
            <div className="text-center py-6">
              <BookOpen className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-gray-700 dark:text-white/80">No saved chapters yet</p>
              <p className="text-xs text-gray-400 mt-1 mb-3">Save chapters in Question Bank first, then come back here to plan them out.</p>
              <button
                type="button" onClick={() => navigate('/teacher/question-bank/capture')}
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-[#1C2B4A] text-white text-xs font-semibold"
              >
                Save chapters
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {chapters.map((c) => {
                const checked = c._id in durations;
                return (
                  <div key={c._id} className="flex items-center gap-3">
                    <input
                      type="checkbox" checked={checked}
                      onChange={(e) => toggleChapter(c._id, e.target.checked)}
                      className="w-4 h-4 shrink-0"
                    />
                    <span className="flex-1 text-sm text-gray-700 dark:text-white/80 truncate">{c.chapterName}</span>
                    {checked && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <input
                          type="number" min={1} value={durations[c._id]}
                          onChange={(e) => setDuration(c._id, Number(e.target.value) || 1)}
                          className="w-14 h-8 px-2 rounded-lg border border-gray-200 dark:border-white/10 dark:bg-white/5 dark:text-white text-xs text-center"
                        />
                        <span className="text-[11px] text-gray-400">week(s)</span>
                      </div>
                    )}
                  </div>
                );
              })}
              <button
                type="button" onClick={handleGenerate} disabled={generate.isPending || Object.keys(durations).length === 0}
                className="w-full h-10 mt-2 rounded-xl bg-[#1C2B4A] text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {generate.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Generate
              </button>
            </div>
          )}
        </div>

        {warnings.length > 0 && (
          <div className="rounded-xl p-3.5 bg-amber-50 border border-amber-200 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <ul className="text-xs text-amber-700 list-disc pl-4 space-y-0.5">
              {warnings.map((w, i) => <li key={i}>{w}</li>)}
            </ul>
          </div>
        )}

        {weeks && weeks.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Review &amp; edit — {weeks.length} week(s)</p>
              <button type="button" onClick={addChapterBlock} className="text-xs font-semibold text-[#6D4AFF] flex items-center gap-1">
                <Plus className="w-3.5 h-3.5" /> Add chapter block
              </button>
            </div>
            {weeks.map((w, wi) => (
              <div key={`${w.weekNumber}-${wi}`} className="bg-white dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/10 p-4 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-gray-400">Week {w.weekNumber}</span>
                  <button type="button" onClick={() => removeWeek(wi)} className="text-gray-300 hover:text-red-500">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input value={w.chapterName} onChange={(e) => updateWeek(wi, { chapterName: e.target.value })}
                    placeholder="Chapter" className="h-8 px-2 rounded-lg border border-gray-200 dark:border-white/10 dark:bg-white/5 dark:text-white text-xs" />
                  <input value={w.topic ?? ''} onChange={(e) => updateWeek(wi, { topic: e.target.value })}
                    placeholder="Topic" className="h-8 px-2 rounded-lg border border-gray-200 dark:border-white/10 dark:bg-white/5 dark:text-white text-xs" />
                </div>
                <div className="space-y-1.5">
                  {w.tasks.map((t, ti) => (
                    <div key={ti} className="flex items-center gap-2">
                      <input value={t.title} onChange={(e) => updateTaskTitle(wi, ti, e.target.value)}
                        className="flex-1 h-7 px-2 rounded-md border border-gray-200 dark:border-white/10 dark:bg-white/5 dark:text-white text-xs" />
                      <select value={t.type} onChange={(e) => updateTaskType(wi, ti, e.target.value as PlannerTaskType)}
                        className="h-7 px-1.5 rounded-md border border-gray-200 dark:border-white/10 dark:bg-white/5 dark:text-white text-[11px]">
                        {TASK_TYPES.map((t2) => <option key={t2} value={t2}>{labelize(t2)}</option>)}
                      </select>
                      <button type="button" onClick={() => removeTask(wi, ti)} className="text-gray-300 hover:text-red-500 shrink-0">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  <button type="button" onClick={() => addTask(wi)} className="text-[11px] font-semibold text-[#6D4AFF] flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Add task
                  </button>
                </div>
              </div>
            ))}

            <button
              type="button" onClick={handleSave} disabled={confirm.isPending}
              className="w-full h-11 rounded-xl bg-[#1C2B4A] text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {confirm.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Save planner ({weeks.length} week(s))
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
