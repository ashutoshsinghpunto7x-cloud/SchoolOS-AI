import type { FeeStatus } from '@schoolos/types';

interface Props {
  status: FeeStatus;
  size?: 'sm' | 'md';
}

const CONFIG: Record<FeeStatus, { label: string; classes: string }> = {
  pending:        { label: 'Pending',         classes: 'bg-yellow-100 text-yellow-800' },
  partially_paid: { label: 'Partial',         classes: 'bg-orange-100 text-orange-800' },
  paid:           { label: 'Paid',            classes: 'bg-green-100 text-green-800' },
  overdue:        { label: 'Overdue',         classes: 'bg-red-100 text-red-800' },
  waived:         { label: 'Waived',          classes: 'bg-gray-100 text-gray-600' },
};

export function FeeStatusBadge({ status, size = 'md' }: Props) {
  const cfg  = CONFIG[status] ?? { label: status, classes: 'bg-gray-100 text-gray-700' };
  const text = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-2.5 py-1';
  return (
    <span className={`inline-flex items-center rounded-full font-medium ${text} ${cfg.classes}`}>
      {cfg.label}
    </span>
  );
}
