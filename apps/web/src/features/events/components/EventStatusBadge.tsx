import type { EventStatus } from '@schoolos/types';

const CONFIG: Record<EventStatus, { label: string; className: string }> = {
  draft:     { label: 'Draft',     className: 'bg-gray-100 text-gray-600' },
  scheduled: { label: 'Scheduled', className: 'bg-blue-100 text-blue-700' },
  published: { label: 'Published', className: 'bg-green-100 text-green-700' },
  completed: { label: 'Completed', className: 'bg-indigo-100 text-indigo-700' },
  cancelled: { label: 'Cancelled', className: 'bg-red-100 text-red-600' },
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
