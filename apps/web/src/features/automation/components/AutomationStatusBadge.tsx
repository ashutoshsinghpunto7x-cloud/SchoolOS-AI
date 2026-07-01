import { cn } from '@/lib/utils';
import type { AutomationJobStatus } from '@schoolos/types';

const CONFIG: Record<AutomationJobStatus, { label: string; classes: string }> = {
  QUEUED:    { label: 'Queued',     classes: 'bg-gray-100 text-gray-500 border border-gray-200' },
  RUNNING:   { label: 'Running',    classes: 'bg-blue-50 text-blue-700 border border-blue-200' },
  COMPLETED: { label: 'Completed',  classes: 'bg-green-50 text-green-700 border border-green-200' },
  FAILED:    { label: 'Failed',     classes: 'bg-red-50 text-red-700 border border-red-200' },
  CANCELLED: { label: 'Cancelled',  classes: 'bg-gray-50 text-gray-500 border border-gray-200' },
  RETRYING:  { label: 'Retrying',   classes: 'bg-amber-50 text-amber-700 border border-amber-200' },
};

interface AutomationStatusBadgeProps {
  status: AutomationJobStatus;
  className?: string;
}

export const AutomationStatusBadge = ({ status, className }: AutomationStatusBadgeProps) => {
  const { label, classes } = CONFIG[status] ?? { label: status, classes: 'bg-gray-100 text-gray-500' };
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
