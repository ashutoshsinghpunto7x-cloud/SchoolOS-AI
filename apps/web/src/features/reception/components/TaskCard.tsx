import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Types ────────────────────────────────────────────────────────────────────

export interface Task {
  id: string;
  time: string;
  title: string;
  tag: string;
}

// ── Tag color map ─────────────────────────────────────────────────────────────

const TAG_COLORS: Record<string, string> = {
  'Follow-up': 'bg-amber-50 text-amber-700',
  'Admission': 'bg-blue-50 text-blue-700',
  'Finance': 'bg-green-50 text-green-700',
  'Meeting': 'bg-indigo-50 text-indigo-700',
  'Reminder': 'bg-rose-50 text-rose-700',
};

const getTagColor = (tag: string): string =>
  TAG_COLORS[tag] ?? 'bg-gray-100 text-gray-600';

// ── TaskRow ──────────────────────────────────────────────────────────────────

const TaskRow = ({ task }: { task: Task }) => (
  <div
    className={cn(
      'flex items-center gap-3 px-4 py-3.5 rounded-xl',
      'hover:bg-gray-50 transition-colors duration-150 cursor-pointer group'
    )}
  >
    {/* Time */}
    <div className="flex items-center gap-1.5 flex-shrink-0 w-[72px]">
      <Clock className="w-3.5 h-3.5 text-gray-400" />
      <span className="text-xs font-medium text-gray-500">{task.time}</span>
    </div>

    {/* Title */}
    <p className="flex-1 text-sm font-medium text-gray-800 truncate">
      {task.title}
    </p>

    {/* Tag */}
    <span
      className={cn(
        'flex-shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full',
        getTagColor(task.tag)
      )}
    >
      {task.tag}
    </span>
  </div>
);

// ── TaskCard ─────────────────────────────────────────────────────────────────

interface TaskCardProps {
  tasks: Task[];
}

export const TaskCard = ({ tasks }: TaskCardProps) => {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 pt-5 pb-2">
        <h3 className="text-base font-bold text-gray-900">Upcoming Tasks</h3>
        <p className="text-xs text-gray-400 mt-0.5">Today's schedule</p>
      </div>

      <div className="px-1 pb-3">
        {tasks.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">
            No tasks scheduled.
          </p>
        ) : (
          tasks.map((task) => <TaskRow key={task.id} task={task} />)
        )}
      </div>
    </div>
  );
};
