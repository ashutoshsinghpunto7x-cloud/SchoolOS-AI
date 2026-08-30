import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { useAddPrincipalTask } from '../hooks/useTeacherPlanner';
import type { TeacherPlanner, PlannerTaskType } from '@schoolos/types';

const TASK_TYPES: { value: PlannerTaskType; label: string }[] = [
  { value: 'explain', label: 'Explain' },
  { value: 'activity', label: 'Activity' },
  { value: 'worksheet', label: 'Worksheet' },
  { value: 'homework', label: 'Homework' },
  { value: 'doubt_session', label: 'Doubt Session' },
  { value: 'revision', label: 'Revision' },
  { value: 'unit_test', label: 'Unit Test' },
  { value: 'other', label: 'Other' },
];

function toDateInputValue(d: string | Date): string {
  return new Date(d).toISOString().slice(0, 10);
}

interface AddPlannerTaskModalProps {
  planner: TeacherPlanner;
  onClose: () => void;
  onAdded: () => void;
}

/** Principal/incharge form for dropping a new task into one of a teacher's
 *  existing planner weeks. Saving notifies the teacher. */
export function AddPlannerTaskModal({ planner, onClose, onAdded }: AddPlannerTaskModalProps) {
  const sortedWeeks = [...planner.weeks].sort((a, b) => a.weekNumber - b.weekNumber);
  const [weekNumber, setWeekNumber] = useState(sortedWeeks[0]?.weekNumber ?? 1);
  const [title, setTitle] = useState('');
  const [type, setType] = useState<PlannerTaskType>('explain');
  const week = sortedWeeks.find((w) => w.weekNumber === weekNumber) ?? sortedWeeks[0];
  const [dueDate, setDueDate] = useState(() => toDateInputValue(week?.startDate ?? new Date()));

  const addTask = useAddPrincipalTask();

  function handleWeekChange(next: number) {
    setWeekNumber(next);
    const w = sortedWeeks.find((wk) => wk.weekNumber === next);
    if (w) setDueDate(toDateInputValue(w.startDate));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    addTask.mutate(
      { plannerId: String(planner._id), payload: { weekNumber, title: title.trim(), type, dueDate: new Date(dueDate).toISOString() } },
      { onSuccess: onAdded },
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white dark:bg-[#111] rounded-t-3xl sm:rounded-2xl w-full sm:max-w-sm p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900 dark:text-white">Add Task</h2>
          <button type="button" onClick={onClose} className="p-1 text-gray-400 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="text-xs font-semibold text-gray-500 dark:text-white/40">Week</label>
            <select
              value={weekNumber}
              onChange={(e) => handleWeekChange(Number(e.target.value))}
              className="mt-1 w-full h-10 px-3 rounded-xl border border-gray-200 dark:border-white/10 dark:bg-white/5 dark:text-white text-sm"
            >
              {sortedWeeks.map((w) => (
                <option key={w.weekNumber} value={w.weekNumber}>
                  Week {w.weekNumber} — {w.chapterName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 dark:text-white/40">Task title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Revise Chapter 4 examples"
              className="mt-1 w-full h-10 px-3 rounded-xl border border-gray-200 dark:border-white/10 dark:bg-white/5 dark:text-white text-sm"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 dark:text-white/40">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as PlannerTaskType)}
                className="mt-1 w-full h-10 px-3 rounded-xl border border-gray-200 dark:border-white/10 dark:bg-white/5 dark:text-white text-sm"
              >
                {TASK_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 dark:text-white/40">Due date</label>
              <input
                type="date"
                value={dueDate}
                min={week ? toDateInputValue(week.startDate) : undefined}
                max={week ? toDateInputValue(week.endDate) : undefined}
                onChange={(e) => setDueDate(e.target.value)}
                className="mt-1 w-full h-10 px-3 rounded-xl border border-gray-200 dark:border-white/10 dark:bg-white/5 dark:text-white text-sm"
                required
              />
            </div>
          </div>

          {addTask.isError && (
            <p className="text-xs font-semibold text-red-600">Couldn't add task — try again.</p>
          )}

          <button
            type="submit"
            disabled={addTask.isPending || !title.trim()}
            className="w-full h-11 rounded-xl bg-[#6D4AFF] text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {addTask.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Add & Notify Teacher
          </button>
        </form>
      </div>
    </div>
  );
}
