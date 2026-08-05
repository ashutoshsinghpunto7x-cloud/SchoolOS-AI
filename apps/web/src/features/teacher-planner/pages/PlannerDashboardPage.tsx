import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Upload, Loader2, CalendarClock, TrendingUp, TrendingDown, CheckCircle2, Circle, ChevronDown, ChevronUp, Lightbulb } from 'lucide-react';
import { useMyPlanner, usePlannerProgress, usePlannerPace, useToggleTask } from '../hooks/useTeacherPlanner';

function ProgressBar({ label, percent }: { label: string; percent: number }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-semibold text-gray-500 dark:text-white/40">{label}</span>
        <span className="text-xs font-bold text-gray-700 dark:text-white/70">{percent}%</span>
      </div>
      <div className="h-2 rounded-full bg-gray-100 dark:bg-white/10 overflow-hidden">
        <div className="h-full rounded-full bg-[#6D4AFF]" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function labelize(s: string): string {
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function PlannerDashboardPage() {
  const { cls = '', subject = '' } = useParams();
  const navigate = useNavigate();
  const [expandedWeek, setExpandedWeek] = useState<number | null>(null);

  const { data: planner, isLoading: plannerLoading } = useMyPlanner(cls, subject);
  const plannerId = planner?._id ?? '';
  const { data: progress, isLoading: progressLoading } = usePlannerProgress(plannerId);
  const { data: pace } = usePlannerPace(plannerId);
  const toggleTask = useToggleTask(plannerId);

  async function handleToggle(taskId: string, current: 'pending' | 'completed') {
    try {
      await toggleTask.mutateAsync({ taskId, status: current === 'completed' ? 'pending' : 'completed' });
    } catch (err) {
      toast.error('Could not update task', { description: err instanceof Error ? err.message : undefined });
    }
  }

  if (plannerLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-[#FAFBFF]">
        <Loader2 className="w-6 h-6 text-[#6D4AFF] animate-spin" />
      </div>
    );
  }

  if (!planner) {
    return (
      <div className="min-h-screen bg-[#FAFBFF] dark:bg-transparent">
        <div className="px-5 pt-6 pb-4 max-w-2xl mx-auto">
          <button onClick={() => navigate(-1)} type="button" className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 mb-4 -ml-1 p-1">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <div className="bg-white teacher-glass-card rounded-2xl border border-gray-100 dark:border-transparent p-10 text-center">
            <CalendarClock className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-base font-semibold text-gray-700 dark:text-white/80">No planner yet for Class {cls} {subject}</p>
            <p className="text-sm text-gray-400 mt-1 mb-4">Upload your annual planner or syllabus to get started.</p>
            <button
              type="button"
              onClick={() => navigate(`/teacher/planner/${cls}/${encodeURIComponent(subject)}/upload`)}
              className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-[#1C2B4A] text-white text-sm font-semibold"
            >
              <Upload className="w-4 h-4" /> Upload Planner
            </button>
          </div>
        </div>
      </div>
    );
  }

  const behind = pace && pace.teachingDaysBehind > 0;
  const ahead = pace && pace.teachingDaysBehind < 0;

  return (
    <div className="min-h-screen bg-[#FAFBFF] dark:bg-transparent pb-24">
      <div className="sticky top-0 z-10 bg-white/90 dark:bg-black/40 backdrop-blur border-b border-gray-100 dark:border-white/10 px-5 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} type="button" className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 dark:text-white/50">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <h1 className="text-sm font-bold text-gray-900 dark:text-white flex-1">Class {cls} · {subject}</h1>
        <button
          type="button" onClick={() => navigate(`/teacher/planner/${cls}/${encodeURIComponent(subject)}/upload`)}
          className="h-9 px-3 rounded-lg bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 text-xs font-semibold text-gray-700 dark:text-white flex items-center gap-1.5"
        >
          <Upload className="w-3.5 h-3.5" /> Re-upload
        </button>
      </div>

      <div className="max-w-3xl mx-auto px-5 py-6 space-y-5">
        <div className="bg-white dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/10 p-4 space-y-4">
          {progressLoading || !progress ? (
            <div className="h-16 bg-gray-50 dark:bg-white/5 rounded-xl animate-pulse" />
          ) : (
            <>
              <ProgressBar label="Year Progress" percent={progress.yearPercent} />
              <ProgressBar label="Month Progress" percent={progress.monthPercent} />
              <ProgressBar label="Week Progress" percent={progress.weekPercent} />
            </>
          )}
        </div>

        {pace && (
          <div className={`rounded-2xl border p-4 flex items-start gap-3 ${behind ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
            {behind ? <TrendingDown className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" /> : <TrendingUp className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />}
            <div>
              <p className={`text-sm font-bold ${behind ? 'text-amber-800' : 'text-emerald-800'}`}>
                {behind
                  ? `~${pace.teachingDaysBehind} teaching day(s) behind schedule`
                  : ahead
                  ? `~${Math.abs(pace.teachingDaysBehind)} teaching day(s) ahead of schedule`
                  : 'On track with your plan'}
              </p>
              <ul className={`text-xs mt-1.5 space-y-0.5 ${behind ? 'text-amber-700' : 'text-emerald-700'}`}>
                {pace.suggestions.map((s, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <Lightbulb className="w-3.5 h-3.5 shrink-0 mt-0.5" /> {s}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {progress && progress.todayTasks.length > 0 && (
          <div className="bg-white dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/10 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2.5">Today's Tasks</p>
            <div className="space-y-1.5">
              {progress.todayTasks.map(({ task }) => (
                <button
                  key={task.taskId} type="button" onClick={() => handleToggle(task.taskId, task.status)}
                  className="w-full flex items-center gap-2.5 text-left px-2 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5"
                >
                  {task.status === 'completed'
                    ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    : <Circle className="w-4 h-4 text-gray-300 shrink-0" />}
                  <span className={`text-sm flex-1 ${task.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-800 dark:text-white/80'}`}>
                    {task.title}
                  </span>
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 dark:bg-white/10 dark:text-white/50">
                    {labelize(task.type)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 px-1">Weeks</p>
          {planner.weeks.map((w) => {
            const expanded = expandedWeek === w.weekNumber;
            const completedCount = w.tasks.filter((t) => t.status === 'completed').length;
            return (
              <div key={w.weekNumber} className="bg-white dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/10 overflow-hidden">
                <button
                  type="button" onClick={() => setExpandedWeek(expanded ? null : w.weekNumber)}
                  className="w-full flex items-center gap-3 px-3.5 py-3 text-left"
                >
                  <span className="text-xs font-bold text-gray-400 w-14 shrink-0">Week {w.weekNumber}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 dark:text-white/80 truncate">{w.chapterName}</p>
                    <p className="text-[11px] text-gray-400">{completedCount}/{w.tasks.length} tasks done</p>
                  </div>
                  {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </button>
                {expanded && (
                  <div className="px-3.5 pb-3 space-y-1.5">
                    {w.tasks.map((task) => (
                      <button
                        key={task.taskId} type="button" onClick={() => handleToggle(task.taskId, task.status)}
                        className="w-full flex items-center gap-2.5 text-left px-2 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5"
                      >
                        {task.status === 'completed'
                          ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                          : <Circle className="w-4 h-4 text-gray-300 shrink-0" />}
                        <span className={`text-sm flex-1 ${task.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-700 dark:text-white/70'}`}>
                          {task.title}
                        </span>
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 dark:bg-white/10 dark:text-white/50">
                          {labelize(task.type)}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
