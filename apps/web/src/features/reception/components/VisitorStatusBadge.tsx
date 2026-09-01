import type { VisitorStatus } from '@schoolos/types';

const STATUS_STYLES: Record<VisitorStatus, string> = {
  waiting:    'bg-amber-50 text-amber-700 border-amber-200',
  approved:   'bg-blue-50 text-blue-700 border-blue-200',
  in_meeting: 'bg-purple-50 text-purple-700 border-purple-200',
  completed:  'bg-green-50 text-green-700 border-green-200',
  cancelled:  'bg-gray-100 text-gray-500 border-gray-200',
};

const STATUS_LABELS: Record<VisitorStatus, string> = {
  waiting:    'Waiting',
  approved:   'Approved',
  in_meeting: 'In Meeting',
  completed:  'Completed',
  cancelled:  'Cancelled',
};

export function VisitorStatusBadge({ status }: { status: VisitorStatus }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${STATUS_STYLES[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}
