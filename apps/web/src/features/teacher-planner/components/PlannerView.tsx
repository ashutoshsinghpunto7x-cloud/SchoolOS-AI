import { useState } from 'react';
import { TrendingUp, TrendingDown, CheckCircle2, Circle, ChevronDown, ChevronUp, Lightbulb } from 'lucide-react';
import type { TeacherPlanner, PlannerProgress, PacePosition } from '@schoolos/types';

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

interface PlannerViewProps {
  planner: TeacherPlanner;
  progress: PlannerProgress;
  pace: PacePosition;
  /** Principal view: no tap-to-toggle on tasks. */
  readOnly?: boolean;
  onToggleTask?: (taskId: string, currentStatus: 'pending' | 'completed') => void;
}

/** Shared progress/pace/weeks body — used interactively by the teacher's own
 *  dashboard and read-only by the principal's per-teacher detail page, so
 *  both always show identical numbers. */
export function PlannerView({ planner, progress, pace, readOnly, onToggleTask }: PlannerViewProps) {
  const [expandedWeek, setExpandedWeek] = useState<number | null>(null);
  const behind = pace.teachingDaysBehind > 0;
  const ahead = pace.teachingDaysBehind < 0;

  function handleToggle(taskId: string, current: 'pending' | 'completed') {
    if (readOnly) return;
    onToggleTask?.(taskId, current);
  }

  return (
    <div className="space-y-5">
      <div className="bg-white dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/10 p-4 space-y-4">
        <ProgressBar label="Year Progress" percent={progress.yearPercent} />
        <ProgressBar label="Half-Year Progress" percent={progress.halfYearPercent} />
        <ProgressBar label="Month Progress" percent={progress.monthPercent} />
        <ProgressBar label="Week Progress" percent={progress.weekPercent} />
      </div>

      <div className={`rounded-2xl border p-4 flex items-start gap-3 ${behind ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
        {behind ? <TrendingDown className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" /> : <TrendingUp className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />}
        <div>
          <p className={`text-sm font-bold ${behind ? 'text-amber-800' : 'text-emerald-800'}`}>
            {behind
              ? `~${pace.teachingDaysBehind} teaching day(s) behind schedule`
              : ahead
              ? `~${Math.abs(pace.teachingDaysBehind)} teaching day(s) ahead of schedule`
              : 'On track with the plan'}
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

      {progress.todayTasks.length > 0 && (
        <div className="bg-white dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/10 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2.5">Today's Tasks</p>
          <div className="space-y-1.5">
            {progress.todayTasks.map(({ task }) => (
              <button
                key={task.taskId} type="button" disabled={readOnly}
                onClick={() => handleToggle(task.taskId, task.status)}
                className="w-full flex items-center gap-2.5 text-left px-2 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 disabled:hover:bg-transparent disabled:cursor-default"
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
                      key={task.taskId} type="button" disabled={readOnly}
                      onClick={() => handleToggle(task.taskId, task.status)}
                      className="w-full flex items-center gap-2.5 text-left px-2 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 disabled:hover:bg-transparent disabled:cursor-default"
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
  );
}
