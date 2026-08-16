import type { VendorBillStatus } from '@schoolos/types';

interface Props {
  status: VendorBillStatus;
  size?: 'sm' | 'md';
}

const CONFIG: Record<VendorBillStatus, { label: string; classes: string }> = {
  unpaid:          { label: 'Unpaid',  classes: 'bg-red-100 text-red-800' },
  partially_paid:  { label: 'Partial', classes: 'bg-orange-100 text-orange-800' },
  paid:            { label: 'Paid',    classes: 'bg-green-100 text-green-800' },
};

export function VendorBillStatusBadge({ status, size = 'md' }: Props) {
  const cfg  = CONFIG[status] ?? { label: status, classes: 'bg-gray-100 text-gray-700' };
  const text = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-2.5 py-1';
  return (
    <span className={`inline-flex items-center rounded-full font-medium ${text} ${cfg.classes}`}>
      {cfg.label}
    </span>
  );
}
