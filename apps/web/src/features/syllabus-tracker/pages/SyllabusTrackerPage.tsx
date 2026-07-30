import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BarChart3, Loader2 } from 'lucide-react';
import { useSyllabusOverview, useSyllabusActivity } from '../hooks/useSyllabusTracker';
import type { SyllabusActivityDay } from '@schoolos/types';

function intensityClass(count: number): string {
  if (count === 0) return 'bg-gray-100 dark:bg-white/5';
  if (count === 1) return 'bg-emerald-200 dark:bg-emerald-900';
  if (count <= 3) return 'bg-emerald-400 dark:bg-emerald-700';
  if (count <= 6) return 'bg-emerald-500 dark:bg-emerald-500';
  return 'bg-emerald-700 dark:bg-emerald-300';
}

function ActivityHeatmap({ days }: { days: SyllabusActivityDay[] }) {
  const weeks = useMemo(() => {
    if (days.length === 0) return [];
    const firstWeekday = new Date(days[0].date).getDay(); // 0=Sun..6=Sat
    const padded: (SyllabusActivityDay | null)[] = [...Array(firstWeekday).fill(null), ...days];
    const cols: (SyllabusActivityDay | null)[][] = [];
    for (let i = 0; i < padded.length; i += 7) cols.push(padded.slice(i, i + 7));
    return cols;
  }, [days]);

  const totalActive = days.filter((d) => d.count > 0).length;

  return (
    <div className="bg-white dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/10 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">
        Teaching Activity — {totalActive} active day{totalActive !== 1 ? 's' : ''} in the last year
      </p>
      <div className="overflow-x-auto pb-2">
        <div className="flex gap-[3px]" style={{ width: 'max-content' }}>
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-[3px]">
              {week.map((day, di) => (
                <div
                  key={di}
                  title={day ? `${day.date}: ${day.count} task(s) completed` : ''}
                  className={`w-[10px] h-[10px] rounded-sm ${day ? intensityClass(day.count) : 'bg-transparent'}`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SyllabusTrackerPage() {
  const navigate = useNavigate();
  const { data: overview, isLoading: overviewLoading } = useSyllabusOverview();
  const { data: activity, isLoading: activityLoading } = useSyllabusActivity();

  return (
    <div className="min-h-screen bg-[#FAFBFF] dark:bg-transparent pb-24">
      <div className="px-5 pt-6 pb-4 max-w-2xl mx-auto">
        <button onClick={() => navigate('/teacher')} className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 mb-4 -ml-1 p-1" type="button">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <h1 className="text-[28px] sm:text-[36px] font-bold text-gray-900 dark:text-white tracking-tight leading-none">Syllabus Tracker</h1>
        <p className="text-base text-gray-500 dark:text-white/40 mt-2">Chapter coverage across your classes, and your teaching activity.</p>

        <div className="mt-6 space-y-3">
          {overviewLoading ? (
            <div className="h-16 rounded-2xl bg-white teacher-glass-card shadow-sm animate-pulse" />
          ) : !overview || overview.length === 0 ? (
            <div className="bg-white teacher-glass-card rounded-2xl border border-gray-100 dark:border-transparent p-10 text-center">
              <BarChart3 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm font-semibold text-gray-700 dark:text-white/80">No planners yet</p>
              <p className="text-xs text-gray-400 mt-1">Upload a Teacher Planner for a class/subject to see coverage here.</p>
            </div>
          ) : (
            overview.map((c) => (
              <button
                key={c.plannerId} type="button"
                onClick={() => navigate(`/teacher/planner/${c.class}/${encodeURIComponent(c.subject)}`)}
                className="w-full text-left bg-white dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{c.subject} <span className="text-xs font-normal text-gray-400">Class {c.class}</span></p>
                  <span className="text-sm font-bold text-gray-700 dark:text-white/70">{c.percentComplete}%</span>
                </div>
                <div className="h-2.5 rounded-full bg-gray-100 dark:bg-white/10 overflow-hidden">
                  <div className="h-full rounded-full bg-[#1C2B4A]" style={{ width: `${c.percentComplete}%` }} />
                </div>
                <p className="text-[11px] text-gray-400 mt-1.5">{c.chaptersCompleted}/{c.totalChapters} chapters complete</p>
              </button>
            ))
          )}
        </div>

        <div className="mt-6">
          {activityLoading || !activity ? (
            <div className="h-32 rounded-2xl bg-white teacher-glass-card shadow-sm animate-pulse flex items-center justify-center">
              <Loader2 className="w-5 h-5 text-gray-300 animate-spin" />
            </div>
          ) : (
            <ActivityHeatmap days={activity} />
          )}
        </div>
      </div>
    </div>
  );
}
