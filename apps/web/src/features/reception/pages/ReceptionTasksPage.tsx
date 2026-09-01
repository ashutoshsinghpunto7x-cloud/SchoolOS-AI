import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Loader2, CheckCircle2, Clock3, AlarmClock, X } from 'lucide-react';
import type { ReceptionTaskPriority, ReceptionTask } from '@schoolos/types';
import { useAuth } from '@/features/auth/hooks/useAuth';
import {
  useReceptionTasks, useCreateReceptionTask, useCompleteReceptionTask, useSnoozeReceptionTask,
  useSetReceptionTaskStatus,
} from '../hooks/useReceptionTasks';

const PRIORITY_STYLES: Record<ReceptionTaskPriority, string> = {
  low:    'bg-gray-100 text-gray-500 border-gray-200',
  medium: 'bg-blue-50 text-blue-700 border-blue-200',
  high:   'bg-amber-50 text-amber-700 border-amber-200',
  urgent: 'bg-red-50 text-red-700 border-red-200',
};

const SOURCE_LABEL: Record<string, string> = {
  manual:                 'Manual',
  auto_visitor_wait:      'Auto · Visitor waiting',
  auto_form_overdue:      'Auto · Form overdue',
  auto_followup_overdue:  'Auto · Follow-up overdue',
  auto_onboarding:        'Auto · Onboarding',
};

function fmtDue(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const time = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  return isToday ? `Today, ${time}` : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) + `, ${time}`;
}

function isOverdue(task: ReceptionTask): boolean {
  return new Date(task.dueDate).getTime() < Date.now() && task.status !== 'completed' && task.status !== 'cancelled';
}

function toDatetimeLocal(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const emptyForm = { title: '', priority: 'medium' as ReceptionTaskPriority, dueDate: toDatetimeLocal(new Date()) };

export function ReceptionTasksPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState<'open' | 'in_progress' | 'completed' | 'snoozed' | 'cancelled' | ''>('');
  const [form, setForm] = useState(emptyForm);
  const [formOpen, setFormOpen] = useState(false);
  const [formError, setFormError] = useState('');

  // Reception/counselors only ever see their own tasks (enforced
  // server-side too — see reception-task.service.ts OVERSIGHT_ROLES).
  const { data, isLoading, isError } = useReceptionTasks({ status: statusFilter || undefined, limit: 100 });
  const createTask = useCreateReceptionTask();
  const completeTask = useCompleteReceptionTask();
  const snoozeTask = useSnoozeReceptionTask();
  const setStatus = useSetReceptionTaskStatus();

  const tasks = data?.data ?? [];

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError('');
    if (!form.title.trim() || !user?.userId) return;
    try {
      await createTask.mutateAsync({
        title: form.title.trim(),
        priority: form.priority,
        dueDate: new Date(form.dueDate).toISOString(),
        assignedToId: user.userId,
      });
      setForm({ ...emptyForm, dueDate: toDatetimeLocal(new Date()) });
      setFormOpen(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create task');
    }
  }

  function handleSnooze(task: ReceptionTask) {
    const input = window.prompt('Snooze until (YYYY-MM-DD HH:MM), leave blank for tomorrow 9am:');
    let next: Date;
    if (input?.trim()) {
      next = new Date(input.trim());
      if (isNaN(next.getTime())) return;
    } else {
      next = new Date();
      next.setDate(next.getDate() + 1);
      next.setHours(9, 0, 0, 0);
    }
    snoozeTask.mutate({ id: task._id, dueDate: next.toISOString() });
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7] p-4 sm:p-6">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/reception')}
          className="p-2 rounded-lg hover:bg-white border border-transparent hover:border-gray-200 transition-colors"
          aria-label="Back"
        >
          <ArrowLeft className="w-4 h-4 text-gray-600" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">My Tasks</h1>
          <p className="text-sm text-gray-500">Everything you need to follow up on today</p>
        </div>
        <button
          type="button"
          onClick={() => setFormOpen((v) => !v)}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold"
        >
          <Plus className="w-3.5 h-3.5" /> New Task
        </button>
      </div>

      {formOpen && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-5 mb-5 space-y-4 max-w-md">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Task</label>
            <input
              type="text" required value={form.title} placeholder="e.g. Call parent — follow up on TC"
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Priority</label>
              <select
                value={form.priority}
                onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as ReceptionTaskPriority }))}
                className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm bg-white"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Due</label>
              <input
                type="datetime-local" required value={form.dueDate}
                onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
                className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm"
              />
            </div>
          </div>
          {formError && <p className="text-xs font-medium text-red-600">{formError}</p>}
          <button
            type="submit" disabled={createTask.isPending}
            className="w-full h-10 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {createTask.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Add Task
          </button>
        </form>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {(['', 'open', 'in_progress', 'snoozed', 'completed', 'cancelled'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`h-8 px-3 rounded-lg text-xs font-semibold border transition-colors ${
                statusFilter === s ? 'bg-orange-600 border-orange-600 text-white' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {s === '' ? 'All' : s.replace('_', ' ')}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="space-y-2 animate-pulse">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-14 bg-gray-100 rounded-lg" />)}
          </div>
        ) : isError ? (
          <div className="text-center py-10 text-red-600 text-sm">Failed to load tasks.</div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-10 text-gray-400 text-sm">Nothing here — you're all caught up.</div>
        ) : (
          <ul className="space-y-2">
            {tasks.map((task) => {
              const overdue = isOverdue(task);
              return (
                <li
                  key={task._id}
                  className={`flex flex-wrap items-center gap-3 border rounded-lg p-3 ${overdue ? 'border-red-200 bg-red-50/40' : 'border-gray-100'}`}
                >
                  <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${PRIORITY_STYLES[task.priority]}`}>
                    {task.priority}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-semibold ${task.status === 'completed' ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                      {task.title}
                    </p>
                    <p className={`text-xs mt-0.5 flex items-center gap-1.5 ${overdue ? 'text-red-500 font-semibold' : 'text-gray-400'}`}>
                      <Clock3 className="w-3 h-3" /> {fmtDue(task.dueDate)}
                      {task.source !== 'manual' && (
                        <span className="text-gray-400"> · {SOURCE_LABEL[task.source] ?? task.source}</span>
                      )}
                    </p>
                  </div>
                  {task.status !== 'completed' && task.status !== 'cancelled' && (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => completeTask.mutate({ id: task._id })}
                        disabled={completeTask.isPending}
                        title="Mark complete"
                        className="inline-flex items-center gap-1 h-8 px-2.5 rounded-md bg-green-600 hover:bg-green-500 text-white text-xs font-semibold disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Done
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSnooze(task)}
                        disabled={snoozeTask.isPending}
                        title="Snooze"
                        className="inline-flex items-center gap-1 h-8 px-2.5 rounded-md border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                      >
                        <AlarmClock className="w-3.5 h-3.5" /> Snooze
                      </button>
                      <button
                        type="button"
                        onClick={() => setStatus.mutate({ id: task._id, status: 'cancelled' })}
                        disabled={setStatus.isPending}
                        title="Cancel"
                        className="h-8 px-2 rounded-md text-xs font-semibold text-red-500 hover:bg-red-50 disabled:opacity-50"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
