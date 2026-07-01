import { cn } from '@/lib/utils';
import type { TimetableStatus } from '@schoolos/types';

const CONFIG: Record<TimetableStatus, { label: string; className: string }> = {
  draft:     { label: 'Draft',     className: 'bg-gray-100 text-gray-600 border border-gray-200' },
  published: { label: 'Published', className: 'bg-green-50 text-green-700 border border-green-200' },
  archived:  { label: 'Archived',  className: 'bg-amber-50 text-amber-700 border border-amber-200' },
};

interface TimetableStatusBadgeProps {
  status: TimetableStatus;
  className?: string;
}

export const TimetableStatusBadge = ({ status, className }: TimetableStatusBadgeProps) => {
  const cfg = CONFIG[status] ?? CONFIG.draft;
  return (
    <span className={cn('inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold', cfg.className, className)}>
      {cfg.label}
    </span>
  );
};

export const STATUS_LABEL: Record<TimetableStatus, string> = {
  draft:     'Draft',
  published: 'Published',
  archived:  'Archived',
};
