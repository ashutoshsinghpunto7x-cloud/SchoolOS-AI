import { cn } from '@/lib/utils';
import type { CommStatus } from '@schoolos/types';

const CONFIG: Record<CommStatus, { label: string; classes: string }> = {
  QUEUED:     { label: 'Queued',      classes: 'bg-gray-50 text-gray-500 border border-gray-200' },
  PENDING:    { label: 'Pending',     classes: 'bg-gray-100 text-gray-500' },
  RUNNING:    { label: 'In Progress', classes: 'bg-blue-50 text-blue-700 border border-blue-200' },
  PROCESSING: { label: 'Processing',  classes: 'bg-indigo-50 text-indigo-700 border border-indigo-200' },
  COMPLETED:  { label: 'Completed',   classes: 'bg-green-50 text-green-700 border border-green-200' },
  DELIVERED:  { label: 'Delivered',   classes: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
  READ:       { label: 'Read',        classes: 'bg-teal-50 text-teal-700 border border-teal-200' },
  FAILED:     { label: 'Failed',      classes: 'bg-red-50 text-red-700 border border-red-200' },
  CANCELLED:  { label: 'Cancelled',   classes: 'bg-gray-50 text-gray-500 border border-gray-200' },
};

interface CommStatusBadgeProps {
  status: CommStatus;
  className?: string;
}

export const CommStatusBadge = ({ status, className }: CommStatusBadgeProps) => {
  const { label, classes } = CONFIG[status] ?? {
    label: status,
    classes: 'bg-gray-100 text-gray-500',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full',
        classes,
        className
      )}
    >
      {label}
    </span>
  );
};
