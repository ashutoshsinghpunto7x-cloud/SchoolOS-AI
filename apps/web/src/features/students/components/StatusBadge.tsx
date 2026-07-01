import { cn } from '@/lib/utils';
import type { AdmissionStatus } from '@schoolos/types';

const CONFIG: Record<AdmissionStatus, { label: string; classes: string }> = {
  // current lifecycle
  enquiry:           { label: 'Enquiry',           classes: 'bg-sky-50 text-sky-700 border border-sky-200' },
  application:       { label: 'Application',       classes: 'bg-purple-50 text-purple-700 border border-purple-200' },
  admission_pending: { label: 'Admission Pending', classes: 'bg-amber-50 text-amber-700 border border-amber-200' },
  active:            { label: 'Active',            classes: 'bg-green-50 text-green-700 border border-green-200' },
  transferred:       { label: 'Transferred',       classes: 'bg-blue-50 text-blue-700 border border-blue-200' },
  graduated:         { label: 'Graduated',         classes: 'bg-indigo-50 text-indigo-700 border border-indigo-200' },
  inactive:          { label: 'Inactive',          classes: 'bg-gray-100 text-gray-600 border border-gray-200' },
  // legacy
  inquiry:  { label: 'Inquiry',  classes: 'bg-amber-50 text-amber-700 border border-amber-200' },
  enrolled: { label: 'Enrolled', classes: 'bg-green-50 text-green-700 border border-green-200' },
  withdrawn:{ label: 'Withdrawn',classes: 'bg-red-50 text-red-700 border border-red-200' },
};

interface StatusBadgeProps {
  status: AdmissionStatus;
  size?: 'sm' | 'md';
  className?: string;
}

export const StatusBadge = ({ status, size = 'sm', className }: StatusBadgeProps) => {
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
