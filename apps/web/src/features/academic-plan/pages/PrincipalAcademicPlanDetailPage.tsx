import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, AlertCircle, ChevronLeft, ChevronRight as ChevronRightIcon, AlertTriangle } from 'lucide-react';
import { usePrincipalPlanDetail } from '../hooks/useAcademicPlan';
import { PlanDayRow } from '../components/PlanDayRow';

const MONTH_LABEL = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' });

/** Level 3 — read-only, day-by-day, browsed one month at a time (a whole
 *  year flattened would be 200+ rows). No status controls: this is the
 *  Principal's oversight view, same "read-only, no ownership assertion"
 *  posture as Teacher Planner v2's principal detail route. */
export function PrincipalAcademicPlanDetailPage() {
  const { teacherId = '', cls = '', section = '', subject = '' } = useParams();
  const navigate = useNavigate();
  const { data: plan, isLoading, isError } = usePrincipalPlanDetail(teacherId, { class: cls, section: section || undefined, subject });
  const [monthOffset, setMonthOffset] = useState(0);

  const viewMonth = useMemo(() => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() + monthOffset);
    return d;
  }, [monthOffset]);

  const monthDays = useMemo(() => {
    if (!plan) return [];
    return plan.days
      .filter((d) => {
        const t = new Date(d.date);
        return t.getMonth() === viewMonth.getMonth() && t.getFullYear() === viewMonth.getFullYear();
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [plan, viewMonth]);

  const teachDays = plan?.days.filter((d) => d.blockType === 'teach') ?? [];
  const completedCount = teachDays.filter((d) => d.status === 'completed').length;
  const percentComplete = teachDays.length > 0 ? Math.round((completedCount / teachDays.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#FAFBFF] dark:bg-transparent pb-24">
      <div className="sticky top-0 z-10 bg-white/90 dark:bg-black/40 backdrop-blur border-b border-gray-100 dark:border-white/10 px-5 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} type="button" className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 dark:text-white/50">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <h1 className="text-sm font-bold text-gray-900 dark:text-white flex-1 truncate">Class {cls}{section ? `-${section}` : ''} · {subject}</h1>
      </div>

      <div className="max-w-3xl mx-auto px-5 py-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="w-6 h-6 text-[#6D4AFF] animate-spin" />
          </div>
        ) : isError || !plan ? (
          <div className="bg-red-50 border border-red-100 rounded-2xl p-5 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm font-semibold text-red-700">Could not load this teacher's plan</p>
          </div>
        ) : (
          <>
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

            <div className="flex items-center justify-between mb-4">
              <button type="button" onClick={() => setMonthOffset((m) => m - 1)} className="w-8 h-8 rounded-lg border border-gray-200 dark:border-white/10 flex items-center justify-center text-gray-500 hover:bg-gray-50 dark:hover:bg-white/5">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <p className="text-sm font-bold text-gray-900 dark:text-white">{MONTH_LABEL.format(viewMonth)}</p>
              <button type="button" onClick={() => setMonthOffset((m) => m + 1)} className="w-8 h-8 rounded-lg border border-gray-200 dark:border-white/10 flex items-center justify-center text-gray-500 hover:bg-gray-50 dark:hover:bg-white/5">
                <ChevronRightIcon className="w-4 h-4" />
              </button>
            </div>

            {monthDays.length === 0 ? (
              <div className="bg-white teacher-glass-card rounded-2xl border border-gray-100 dark:border-transparent p-8 text-center">
                <AlertTriangle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-gray-600 dark:text-white/60">Nothing scheduled this month.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {monthDays.map((day) => (
                  <PlanDayRow key={day.date} day={day} showDate />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
