import { useState } from 'react';
import { TrendingUp, TrendingDown, CheckCircle2, Circle, ChevronDown, ChevronUp, Lightbulb, Pencil } from 'lucide-react';
import type { TeacherPlanner, PlannerProgress, PacePosition, PlannerTask, UpdateTaskPayload } from '@schoolos/types';

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

function formatDueDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function toDateInputValue(iso: string): string {
  return iso.slice(0, 10);
}

interface TaskRowProps {
  task: PlannerTask;
  readOnly?: boolean;
  showDate?: boolean;
  onToggle: () => void;
  onEdit: (patch: UpdateTaskPayload) => void;
}

/** One task row — tap the circle/title to mark done, tap the pencil to
 *  correct the title or move it to a different day. Edit controls are always
 *  visible (not hover-only) so this stays usable on touch devices. */
function TaskRow({ task, readOnly, showDate, onToggle, onEdit }: TaskRowProps) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [dueDate, setDueDate] = useState(toDateInputValue(task.dueDate));

  function startEdit() {
    setTitle(task.title);
    setDueDate(toDateInputValue(task.dueDate));
    setEditing(true);
  }

  function save() {
    const patch: UpdateTaskPayload = {};
    const trimmed = title.trim();
    if (trimmed && trimmed !== task.title) patch.title = trimmed;
    if (dueDate && dueDate !== toDateInputValue(task.dueDate)) patch.dueDate = dueDate;
    if (Object.keys(patch).length > 0) onEdit(patch);
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="flex flex-wrap items-center gap-2 px-2 py-2 rounded-lg bg-gray-50 dark:bg-white/5">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="flex-1 min-w-[8rem] text-sm bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 rounded-md px-2 py-1.5 text-gray-800 dark:text-white/80"
          placeholder="Task title"
        />
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="text-xs bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 rounded-md px-1.5 py-1.5 text-gray-700 dark:text-white/70"
        />
        <button type="button" onClick={save} className="text-xs font-semibold text-[#6D4AFF] px-2 py-1.5 rounded-md hover:bg-[#6D4AFF]/10">
          Save
        </button>
        <button type="button" onClick={() => setEditing(false)} className="text-xs font-medium text-gray-400 px-2 py-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-white/5">
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 px-1 py-1 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5">
      <button
        type="button" disabled={readOnly} onClick={onToggle}
        className="flex items-center gap-2.5 flex-1 min-w-0 text-left px-1 py-1 rounded-lg disabled:cursor-default"
      >
        {task.status === 'completed'
          ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          : <Circle className="w-4 h-4 text-gray-300 shrink-0" />}
        <span className={`text-sm flex-1 min-w-0 truncate ${task.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-800 dark:text-white/80'}`}>
          {task.title}
        </span>
      </button>
      {showDate && (
        <span className="text-[10px] font-medium text-gray-400 shrink-0">{formatDueDate(task.dueDate)}</span>
      )}
      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 dark:bg-white/10 dark:text-white/50 shrink-0">
        {labelize(task.type)}
      </span>
      {!readOnly && (
        <button
          type="button" onClick={startEdit} aria-label="Edit task"
          className="shrink-0 p-1.5 rounded-md text-gray-300 hover:text-gray-600 hover:bg-gray-100 dark:text-white/30 dark:hover:text-white/70 dark:hover:bg-white/10"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

interface PlannerViewProps {
  planner: TeacherPlanner;
  progress: PlannerProgress;
  pace: PacePosition;
  /** Principal view: no tap-to-toggle or editing on tasks. */
  readOnly?: boolean;
  onToggleTask?: (taskId: string, currentStatus: 'pending' | 'completed') => void;
  /** Edit a task's title and/or reassign its due date in place. */
  onEditTask?: (taskId: string, patch: UpdateTaskPayload) => void;
}

/** Shared progress/pace/weeks body — used interactively by the teacher's own
 *  dashboard and read-only by the principal's per-teacher detail page, so
 *  both always show identical numbers. */
export function PlannerView({ planner, progress, pace, readOnly, onToggleTask, onEditTask }: PlannerViewProps) {
  const [expandedWeek, setExpandedWeek] = useState<number | null>(null);
  const behind = pace.teachingDaysBehind > 0;
  const ahead = pace.teachingDaysBehind < 0;

  function handleToggle(taskId: string, current: 'pending' | 'completed') {
    if (readOnly) return;
    onToggleTask?.(taskId, current);
  }

  function handleEdit(taskId: string, patch: UpdateTaskPayload) {
    if (readOnly) return;
    onEditTask?.(taskId, patch);
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
              <TaskRow
                key={task.taskId}
                task={task}
                readOnly={readOnly}
                onToggle={() => handleToggle(task.taskId, task.status)}
                onEdit={(patch) => handleEdit(task.taskId, patch)}
              />
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
                    <TaskRow
                      key={task.taskId}
                      task={task}
                      readOnly={readOnly}
                      showDate
                      onToggle={() => handleToggle(task.taskId, task.status)}
                      onEdit={(patch) => handleEdit(task.taskId, patch)}
                    />
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
