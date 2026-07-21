import { cn } from '@/lib/utils';
import type { TimetableStatus } from '@schoolos/types';

const CONFIG: Record<TimetableStatus, { label: string; className: string }> = {
  draft:     { label: 'Draft',     className: 'bg-[var(--tt-hover)] text-[var(--tt-text-secondary)] border border-[var(--tt-border)]' },
  published: { label: 'Published', className: 'bg-[#2ED47A]/10 text-[#2ED47A] border border-[#2ED47A]/25' },
  archived:  { label: 'Archived',  className: 'bg-[#F5A524]/10 text-[#F5A524] border border-[#F5A524]/25' },
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
