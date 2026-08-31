import { useMemo, useState } from 'react';
import { TrendingUp, TrendingDown, CheckCircle2, Circle, ChevronDown, ChevronUp, Lightbulb } from 'lucide-react';
import type { TeacherPlanner, PlannerProgress, PacePosition, PlannerWeek } from '@schoolos/types';
import { formatWeekRange, formatDayShort, monthKey, monthLabel } from '../lib/dates';

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
  const [view, setView] = useState<'week' | 'month'>('week');
  const behind = pace.teachingDaysBehind > 0;
  const ahead = pace.teachingDaysBehind < 0;

  const monthGroups = useMemo(() => {
    const groups = new Map<string, PlannerWeek[]>();
    for (const w of planner.weeks) {
      const key = monthKey(w.startDate);
      const list = groups.get(key) ?? [];
      list.push(w);
      groups.set(key, list);
    }
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [planner.weeks]);

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
        <div className="flex items-center justify-between px-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Weeks</p>
          <div className="flex rounded-lg border border-gray-200 dark:border-white/10 overflow-hidden">
            {(['week', 'month'] as const).map((v) => (
              <button
                key={v} type="button" onClick={() => setView(v)}
                className={`px-2.5 py-1 text-[11px] font-semibold capitalize ${view === v ? 'bg-[#1C2B4A] text-white' : 'bg-white dark:bg-transparent text-gray-500 dark:text-white/50'}`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        {view === 'week' ? (
          planner.weeks.map((w) => (
            <WeekCard key={w.weekNumber} week={w} expanded={expandedWeek === w.weekNumber}
              onToggleExpand={() => setExpandedWeek(expandedWeek === w.weekNumber ? null : w.weekNumber)}
              readOnly={readOnly} onToggleTask={handleToggle} />
          ))
        ) : (
          monthGroups.map(([key, weeks]) => (
            <div key={key} className="space-y-2">
              <p className="text-[11px] font-bold text-gray-500 dark:text-white/50 px-1 pt-2">{monthLabel(key)}</p>
              {weeks.map((w) => (
                <WeekCard key={w.weekNumber} week={w} expanded={expandedWeek === w.weekNumber}
                  onToggleExpand={() => setExpandedWeek(expandedWeek === w.weekNumber ? null : w.weekNumber)}
                  readOnly={readOnly} onToggleTask={handleToggle} />
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function WeekCard({ week: w, expanded, onToggleExpand, readOnly, onToggleTask }: {
  week: PlannerWeek;
  expanded: boolean;
  onToggleExpand: () => void;
  readOnly?: boolean;
  onToggleTask: (taskId: string, current: 'pending' | 'completed') => void;
}) {
  const completedCount = w.tasks.filter((t) => t.status === 'completed').length;
  return (
    <div className="bg-white dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/10 overflow-hidden">
      <button type="button" onClick={onToggleExpand} className="w-full flex items-center gap-3 px-3.5 py-3 text-left">
        <div className="w-24 shrink-0">
          <span className="text-xs font-bold text-gray-400 block">Week {w.weekNumber}</span>
          <span className="text-[10px] text-gray-400">{formatWeekRange(w.startDate, w.endDate)}</span>
        </div>
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
              onClick={() => onToggleTask(task.taskId, task.status)}
              className="w-full flex items-center gap-2.5 text-left px-2 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 disabled:hover:bg-transparent disabled:cursor-default"
            >
              {task.status === 'completed'
                ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                : <Circle className="w-4 h-4 text-gray-300 shrink-0" />}
              <span className={`text-sm flex-1 ${task.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-700 dark:text-white/70'}`}>
                {task.title}
              </span>
              <span className="text-[10px] text-gray-400 shrink-0">{formatDayShort(task.dueDate)}</span>
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 dark:bg-white/10 dark:text-white/50 shrink-0">
                {labelize(task.type)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
