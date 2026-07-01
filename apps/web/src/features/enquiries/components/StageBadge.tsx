import { cn } from '@/lib/utils';
import type { EnquiryStage } from '@schoolos/types';

const CONFIG: Record<EnquiryStage, { label: string; className: string; dot: string }> = {
  new_enquiry:          { label: 'New Enquiry',       className: 'bg-sky-50 text-sky-700 border border-sky-200',         dot: 'bg-sky-500' },
  contacted:            { label: 'Contacted',          className: 'bg-blue-50 text-blue-700 border border-blue-200',       dot: 'bg-blue-500' },
  follow_up_scheduled:  { label: 'Follow-up Scheduled', className: 'bg-indigo-50 text-indigo-700 border border-indigo-200', dot: 'bg-indigo-500' },
  campus_visit:         { label: 'Campus Visit',       className: 'bg-purple-50 text-purple-700 border border-purple-200', dot: 'bg-purple-500' },
  application_submitted:{ label: 'Application Submitted', className: 'bg-amber-50 text-amber-700 border border-amber-200', dot: 'bg-amber-500' },
  documents_pending:    { label: 'Documents Pending',  className: 'bg-orange-50 text-orange-700 border border-orange-200', dot: 'bg-orange-500' },
  admission_approved:   { label: 'Admission Approved', className: 'bg-teal-50 text-teal-700 border border-teal-200',       dot: 'bg-teal-500' },
  converted:            { label: 'Converted',          className: 'bg-green-50 text-green-700 border border-green-200',    dot: 'bg-green-500' },
  lost:                 { label: 'Lost',               className: 'bg-red-50 text-red-600 border border-red-200',          dot: 'bg-red-400' },
};

interface StageBadgeProps {
  stage: EnquiryStage;
  size?: 'sm' | 'md';
  showDot?: boolean;
  className?: string;
}

export const StageBadge = ({ stage, size = 'sm', showDot = false, className }: StageBadgeProps) => {
  const cfg = CONFIG[stage] ?? CONFIG.new_enquiry;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-semibold rounded-full whitespace-nowrap',
        size === 'sm' ? 'text-xs px-2.5 py-1' : 'text-sm px-3 py-1.5',
        cfg.className,
        className,
      )}
    >
      {showDot && <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />}
      {cfg.label}
    </span>
  );
};

export const STAGE_LABEL: Record<EnquiryStage, string> = Object.fromEntries(
  Object.entries(CONFIG).map(([k, v]) => [k, v.label])
) as Record<EnquiryStage, string>;

export const STAGE_ORDER: EnquiryStage[] = [
  'new_enquiry',
  'contacted',
  'follow_up_scheduled',
  'campus_visit',
  'application_submitted',
  'documents_pending',
  'admission_approved',
  'converted',
  'lost',
];
