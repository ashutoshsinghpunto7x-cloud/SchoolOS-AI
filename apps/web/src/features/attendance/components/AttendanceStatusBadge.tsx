import type { AttendanceStatus } from '@schoolos/types';

interface Props {
  status: AttendanceStatus;
  size?: 'sm' | 'md';
}

const CONFIG: Record<AttendanceStatus, { label: string; classes: string }> = {
  present:       { label: 'Present',        classes: 'bg-green-100 text-green-800' },
  absent:        { label: 'Absent',         classes: 'bg-red-100 text-red-800' },
  late:          { label: 'Late',           classes: 'bg-yellow-100 text-yellow-800' },
  half_day:      { label: 'Half Day',       classes: 'bg-orange-100 text-orange-800' },
  leave_approved:{ label: 'Leave',          classes: 'bg-blue-100 text-blue-800' },
};

export function AttendanceStatusBadge({ status, size = 'md' }: Props) {
  const cfg  = CONFIG[status] ?? { label: status, classes: 'bg-gray-100 text-gray-700' };
  const text = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-2.5 py-1';
  return (
    <span className={`inline-flex items-center rounded-full font-medium ${text} ${cfg.classes}`}>
      {cfg.label}
    </span>
  );
}
