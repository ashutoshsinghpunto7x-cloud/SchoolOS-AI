import type { EventStatus } from '@schoolos/types';

const CONFIG: Record<EventStatus, { label: string; className: string }> = {
  draft:     { label: 'Draft',     className: 'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-white/60' },
  scheduled: { label: 'Scheduled', className: 'bg-blue-100 dark:bg-blue-400/15 text-blue-700 dark:text-blue-300' },
  published: { label: 'Published', className: 'bg-green-100 dark:bg-green-400/15 text-green-700 dark:text-green-300' },
  completed: { label: 'Completed', className: 'bg-indigo-100 dark:bg-indigo-400/15 text-indigo-700 dark:text-indigo-300' },
  cancelled: { label: 'Cancelled', className: 'bg-red-100 dark:bg-red-400/15 text-red-600 dark:text-red-300' },
};

interface EventStatusBadgeProps {
  status: EventStatus;
}

export const EventStatusBadge = ({ status }: EventStatusBadgeProps) => {
  const { label, className } = CONFIG[status] ?? CONFIG.draft;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${className}`}>
      {label}
    </span>
  );
};
