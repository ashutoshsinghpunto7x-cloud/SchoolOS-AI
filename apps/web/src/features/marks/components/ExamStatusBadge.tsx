import { cn } from '@/lib/utils';
import type { ExamStatus } from '@schoolos/types';

const CONFIG: Record<ExamStatus, { label: string; className: string }> = {
  draft:      { label: 'Draft',      className: 'bg-gray-100 text-gray-600 border border-gray-200' },
  configured: { label: 'Configured', className: 'bg-green-50 text-green-700 border border-green-200' },
  locked:     { label: 'Locked',     className: 'bg-amber-50 text-amber-700 border border-amber-200' },
};

interface ExamStatusBadgeProps {
  status: ExamStatus;
  className?: string;
}

export const ExamStatusBadge = ({ status, className }: ExamStatusBadgeProps) => {
  const cfg = CONFIG[status] ?? CONFIG.draft;
  return (
    <span className={cn('inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold', cfg.className, className)}>
      {cfg.label}
    </span>
  );
};

export const EXAM_TYPE_LABEL: Record<string, string> = {
  unit_test: 'Unit Test',
  monthly_test: 'Monthly Test',
  half_yearly: 'Half Yearly',
  annual: 'Annual',
  practical: 'Practical',
  internal_assessment: 'Internal Assessment',
  other: 'Other',
};
