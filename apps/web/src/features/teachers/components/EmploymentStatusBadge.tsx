import { cn } from '@/lib/utils';
import type { EmploymentStatus } from '@schoolos/types';

const CONFIG: Record<EmploymentStatus, { label: string; classes: string }> = {
  applicant: { label: 'Applicant', classes: 'bg-sky-50 text-sky-700 border border-sky-200' },
  active:    { label: 'Active',    classes: 'bg-green-50 text-green-700 border border-green-200' },
  on_leave:  { label: 'On Leave',  classes: 'bg-amber-50 text-amber-700 border border-amber-200' },
  suspended: { label: 'Suspended', classes: 'bg-orange-50 text-orange-700 border border-orange-200' },
  resigned:  { label: 'Resigned',  classes: 'bg-red-50 text-red-700 border border-red-200' },
  retired:   { label: 'Retired',   classes: 'bg-indigo-50 text-indigo-700 border border-indigo-200' },
  inactive:  { label: 'Inactive',  classes: 'bg-gray-100 text-gray-500 border border-gray-200' },
};

interface EmploymentStatusBadgeProps {
  status: EmploymentStatus;
  size?: 'sm' | 'md';
  className?: string;
}

export const EmploymentStatusBadge = ({ status, size = 'sm', className }: EmploymentStatusBadgeProps) => {
  const cfg = CONFIG[status] ?? { label: status, classes: 'bg-gray-100 text-gray-600 border border-gray-200' };
  return (
    <span
      className={cn(
        'inline-flex items-center font-semibold rounded-full whitespace-nowrap',
        size === 'sm' ? 'text-xs px-2.5 py-1' : 'text-sm px-3 py-1.5',
        cfg.classes,
        className,
      )}
    >
      {cfg.label}
    </span>
  );
};
