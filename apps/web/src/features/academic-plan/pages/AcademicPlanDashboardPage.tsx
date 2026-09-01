import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Sparkles, Loader2, RefreshCw, AlertTriangle } from 'lucide-react';
import { useMyAcademicPlan, useGenerateAcademicPlan, useSetPlanDayStatus } from '../hooks/useAcademicPlan';
import { PlanDayRow } from '../components/PlanDayRow';
import type { AcademicPlanDay, AcademicPlanDayStatus } from '@schoolos/types';

type Tab = 'today' | 'week' | 'month';

function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function startOfWeek(d: Date): Date {
  const day = d.getDay();
  const diff = (day + 6) % 7; // days since Monday
  const monday = new Date(d);
  monday.setDate(d.getDate() - diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

export function AcademicPlanDashboardPage() {
  const { cls = '', section = '', subject = '' } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('today');

  const target = { class: cls, section, subject };
  const { data: plan, isLoading } = useMyAcademicPlan(target);
  const generate = useGenerateAcademicPlan();
  const setDayStatus = useSetPlanDayStatus(plan?._id ?? '');
  const [savingDate, setSavingDate] = useState<string | null>(null);

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

  const today = useMemo(() => new Date(), []);
  const todayKey = isoDay(today);
  const weekStart = useMemo(() => startOfWeek(today), [today]);
  const weekEnd = useMemo(() => { const d = new Date(weekStart); d.setDate(d.getDate() + 6); return d; }, [weekStart]);

  const days = plan?.days ?? [];
  const todayEntry = days.find((d) => isoDay(new Date(d.date)) === todayKey);
  const weekEntries = days.filter((d) => { const t = new Date(d.date); return t >= weekStart && t <= weekEnd; });
  const monthEntries = days.filter((d) => {
    const t = new Date(d.date);
    return t.getMonth() === today.getMonth() && t.getFullYear() === today.getFullYear();
  });

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

  const activeEntries = tab === 'today' ? (todayEntry ? [todayEntry] : []) : tab === 'week' ? weekEntries : monthEntries;

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

        <div className="flex items-center gap-1 bg-gray-100 dark:bg-white/5 rounded-xl p-1 mb-5 w-fit">
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
              {t === 'today' ? 'Today' : t === 'week' ? 'This week' : 'This month'}
            </button>
          ))}
        </div>

        {activeEntries.length === 0 ? (
          <div className="bg-white teacher-glass-card rounded-2xl border border-gray-100 dark:border-transparent p-8 text-center">
            <AlertTriangle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-gray-600 dark:text-white/60">
              {tab === 'today' ? 'No period scheduled today.' : 'Nothing scheduled in this range.'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {activeEntries.map((day) => (
              <PlanDayRow
                key={day.date}
                day={day}
                showDate={tab !== 'today'}
                onSetStatus={(status) => handleSetStatus(day, status)}
                isSaving={savingDate === day.date && setDayStatus.isPending}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
