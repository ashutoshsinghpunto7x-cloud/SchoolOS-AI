import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Sparkles, Loader2, RefreshCw, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import { useMyAcademicPlan, useGenerateAcademicPlan, useSetPlanDayStatus, useEditPlanDay, useMovePlanDay } from '../hooks/useAcademicPlan';
import { PlanDayRow } from '../components/PlanDayRow';
import { PlanWeekView } from '../components/PlanWeekView';
import { PlanMonthView } from '../components/PlanMonthView';
import { buildMonthCalendar, buildWeekCalendar, mondayOf, weekRangeLabel } from '../lib/monthCalendar';
import { useAcademicYear } from '@/features/academic-year/hooks/useAcademicYear';
import { useEvents } from '@/features/events/hooks/useEvents';
import type { AcademicPlanDay, AcademicPlanDayStatus, SchoolEvent } from '@schoolos/types';

type Tab = 'today' | 'week' | 'month';

function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function AcademicPlanDashboardPage() {
  const { cls = '', section = '', subject = '' } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('today');

  const today = useMemo(() => new Date(), []);
  const [weekAnchor, setWeekAnchor] = useState(() => mondayOf(today));
  const [monthAnchor, setMonthAnchor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));

  const target = { class: cls, section, subject };
  const { data: plan, isLoading } = useMyAcademicPlan(target);
  const generate = useGenerateAcademicPlan();
  const setDayStatus = useSetPlanDayStatus(plan?._id ?? '');
  const editDay = useEditPlanDay(plan?._id ?? '');
  const moveDay = useMovePlanDay(plan?._id ?? '');
  const [savingDate, setSavingDate] = useState<string | null>(null);

  const { data: academicYear } = useAcademicYear();

  // Holidays for whichever range is currently on screen — a week can
  // straddle two months, so fetch both months touched and merge; when the
  // week/month tab is showing a single month these are the same query and
  // React Query's key-based cache collapses them to one request.
  const visibleRangeStart = tab === 'week' ? weekAnchor : monthAnchor;
  const visibleRangeEnd = tab === 'week' ? new Date(weekAnchor.getFullYear(), weekAnchor.getMonth(), weekAnchor.getDate() + 6) : new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() + 1, 0);
  const { data: holidaysStartPage } = useEvents({
    eventType: 'holiday', month: visibleRangeStart.getMonth() + 1, year: visibleRangeStart.getFullYear(), limit: 100,
  });
  const { data: holidaysEndPage } = useEvents({
    eventType: 'holiday', month: visibleRangeEnd.getMonth() + 1, year: visibleRangeEnd.getFullYear(), limit: 100,
  });
  const holidays = useMemo(() => {
    const byId = new Map<string, SchoolEvent>();
    for (const ev of [...(holidaysStartPage?.data ?? []), ...(holidaysEndPage?.data ?? [])]) byId.set(ev._id, ev);
    return [...byId.values()];
  }, [holidaysStartPage, holidaysEndPage]);

  async function handleGenerate() {
    try {
      const result = await generate.mutateAsync({ class: cls, section, subject });
      if (result.warnings.length > 0) {
        toast.warning(`Plan generated with ${result.warnings.length} note${result.warnings.length > 1 ? 's' : ''}`, {
          description: result.warnings[0].message,
        });
      } else {
        toast.success('Plan generated');
      }
    } catch (err) {
      toast.error('Could not generate plan', { description: err instanceof Error ? err.message : undefined });
    }
  }

  async function handleSetStatus(day: AcademicPlanDay, status: AcademicPlanDayStatus) {
    setSavingDate(day.date);
    try {
      await setDayStatus.mutateAsync({ date: day.date, status });
    } catch (err) {
      toast.error('Could not update day', { description: err instanceof Error ? err.message : undefined });
    } finally {
      setSavingDate(null);
    }
  }

  async function handleEditDay(day: AcademicPlanDay, patch: { chapterId?: string; chapterName?: string; topicTitle?: string }) {
    setSavingDate(day.date);
    try {
      await editDay.mutateAsync({ date: day.date, ...patch, blockType: day.blockType === 'buffer' && patch.chapterId ? 'teach' : undefined });
      toast.success('Day updated');
    } catch (err) {
      toast.error('Could not save', { description: err instanceof Error ? err.message : undefined });
    } finally {
      setSavingDate(null);
    }
  }

  async function handleMoveDay(fromDate: string, toDate: string) {
    setSavingDate(toDate);
    try {
      await moveDay.mutateAsync({ fromDate, toDate });
      toast.success('Days swapped');
    } catch (err) {
      toast.error('Could not swap days', { description: err instanceof Error ? err.message : undefined });
    } finally {
      setSavingDate(null);
    }
  }

  const todayKey = isoDay(today);
  const days = plan?.days ?? [];
  const todayEntry = days.find((d) => isoDay(new Date(d.date)) === todayKey);

  const weeklyOffDays = academicYear?.weeklyOffDays ?? [0, 6];
  const specialDays = academicYear?.specialDays ?? [];

  const weekDays = useMemo(
    () => buildWeekCalendar(weekAnchor, days, weeklyOffDays, holidays, specialDays),
    [weekAnchor, days, weeklyOffDays, holidays, specialDays],
  );
  const monthWeeks = useMemo(
    () => buildMonthCalendar(monthAnchor, days, weeklyOffDays, holidays, specialDays),
    [monthAnchor, days, weeklyOffDays, holidays, specialDays],
  );

  const teachDays = days.filter((d) => d.blockType === 'teach');
  const completedCount = teachDays.filter((d) => d.status === 'completed').length;
  const percentComplete = teachDays.length > 0 ? Math.round((completedCount / teachDays.length) * 100) : 0;

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-[#FAFBFF]">
        <Loader2 className="w-6 h-6 text-[#6D4AFF] animate-spin" />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="min-h-screen bg-[#FAFBFF] dark:bg-transparent">
        <div className="px-5 pt-6 pb-4 max-w-2xl mx-auto">
          <button onClick={() => navigate(-1)} type="button" className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 mb-4 -ml-1 p-1">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <div className="bg-white teacher-glass-card rounded-2xl border border-gray-100 dark:border-transparent p-10 text-center">
            <Sparkles className="w-10 h-10 text-[#6D4AFF]/40 mx-auto mb-3" />
            <p className="text-base font-semibold text-gray-700 dark:text-white/80">No plan yet for Class {cls}-{section} {subject}</p>
            <p className="text-sm text-gray-400 mt-1 mb-4 max-w-sm mx-auto">
              Generate it from your syllabus, the school calendar, and upcoming exam dates — no typing required.
            </p>
            <button
              type="button"
              disabled={generate.isPending}
              onClick={handleGenerate}
              className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-[#1C2B4A] text-white text-sm font-semibold disabled:opacity-60"
            >
              {generate.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Generate my plan
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isSaving = setDayStatus.isPending || editDay.isPending || moveDay.isPending;

  return (
    <div className="min-h-screen bg-[#FAFBFF] dark:bg-transparent pb-24">
      <div className="sticky top-0 z-10 bg-white/90 dark:bg-black/40 backdrop-blur border-b border-gray-100 dark:border-white/10 px-5 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} type="button" className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 dark:text-white/50">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <h1 className="text-sm font-bold text-gray-900 dark:text-white flex-1 truncate">Class {cls}-{section} · {subject}</h1>
        <button
          type="button" disabled={generate.isPending} onClick={handleGenerate}
          className="h-9 px-3 rounded-lg bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 text-xs font-semibold text-gray-700 dark:text-white flex items-center gap-1.5 disabled:opacity-60"
        >
          {generate.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          Regenerate
        </button>
      </div>

      <div className="max-w-3xl mx-auto px-5 py-6">
        <div className="bg-white teacher-glass-card rounded-2xl border border-gray-100 dark:border-transparent shadow-sm p-5 mb-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-bold text-gray-900 dark:text-white">Syllabus progress</p>
            <p className="text-sm font-bold text-[#6D4AFF]">{percentComplete}%</p>
          </div>
          <div className="h-2 rounded-full bg-gray-100 dark:bg-white/10 overflow-hidden">
            <div className="h-full rounded-full bg-[#6D4AFF] transition-all" style={{ width: `${percentComplete}%` }} />
          </div>
          <p className="text-xs text-gray-400 dark:text-white/40 mt-2">{completedCount} of {teachDays.length} teaching periods completed · v{plan.version}</p>
        </div>

        <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-white/5 rounded-xl p-1 w-fit">
            {(['today', 'week', 'month'] as Tab[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={
                  tab === t
                    ? 'h-8 px-4 rounded-lg bg-white dark:bg-white/10 text-gray-900 dark:text-white text-xs font-bold shadow-sm capitalize'
                    : 'h-8 px-4 rounded-lg text-gray-500 dark:text-white/40 text-xs font-semibold capitalize'
                }
              >
                {t}
              </button>
            ))}
          </div>

          {tab === 'week' && (
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => setWeekAnchor((w) => new Date(w.getFullYear(), w.getMonth(), w.getDate() - 7))}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100 dark:text-white/50 dark:hover:bg-white/5" aria-label="Previous week">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <p className="text-xs font-bold text-gray-700 dark:text-white/70 w-32 text-center">{weekRangeLabel(weekAnchor)}</p>
              <button type="button" onClick={() => setWeekAnchor((w) => new Date(w.getFullYear(), w.getMonth(), w.getDate() + 7))}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100 dark:text-white/50 dark:hover:bg-white/5" aria-label="Next week">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {tab === 'month' && (
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => setMonthAnchor((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100 dark:text-white/50 dark:hover:bg-white/5" aria-label="Previous month">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <p className="text-xs font-bold text-gray-700 dark:text-white/70 w-32 text-center">
                {monthAnchor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
              </p>
              <button type="button" onClick={() => setMonthAnchor((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100 dark:text-white/50 dark:hover:bg-white/5" aria-label="Next month">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {tab !== 'month' && (
          <p className="text-xs text-gray-400 dark:text-white/40 mb-4 -mt-2">
            Drag a lesson onto another day to swap them, or tap ✎ to edit it.
          </p>
        )}

        {tab === 'today' ? (
          todayEntry ? (
            <PlanDayRow
              day={todayEntry}
              cls={cls}
              subject={subject}
              showDate={false}
              onSetStatus={(status) => handleSetStatus(todayEntry, status)}
              onEdit={(patch) => handleEditDay(todayEntry, patch)}
              onMove={(fromDate) => handleMoveDay(fromDate, todayEntry.date)}
              isSaving={savingDate === todayEntry.date && isSaving}
            />
          ) : (
            <div className="bg-white teacher-glass-card rounded-2xl border border-gray-100 dark:border-transparent p-8 text-center">
              <AlertTriangle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-gray-600 dark:text-white/60">No period scheduled today.</p>
            </div>
          )
        ) : tab === 'week' ? (
          <PlanWeekView
            days={weekDays}
            cls={cls}
            subject={subject}
            savingDate={savingDate}
            isPending={isSaving}
            onSetStatus={handleSetStatus}
            onEdit={handleEditDay}
            onMove={handleMoveDay}
          />
        ) : (
          <PlanMonthView
            weeks={monthWeeks}
            onSelectWeek={(ws) => { setWeekAnchor(ws); setTab('week'); }}
          />
        )}
      </div>
    </div>
  );
}
