import type { AttendanceSummary } from '@schoolos/types';

interface Props {
  summary: AttendanceSummary;
  label?: string;
}

interface StatItem {
  label: string;
  value: number;
  color: string;
}

export function AttendanceSummaryCard({ summary, label }: Props) {
  const stats: StatItem[] = [
    { label: 'Present',   value: summary.present,        color: 'text-green-700' },
    { label: 'Absent',    value: summary.absent,         color: 'text-red-700' },
    { label: 'Late',      value: summary.late,           color: 'text-yellow-700' },
    { label: 'Half Day',  value: summary.half_day,       color: 'text-orange-700' },
    { label: 'Leave',     value: summary.leave_approved, color: 'text-blue-700' },
  ];

  const rate = summary.attendanceRate;
  const rateColor =
    rate >= 85 ? 'text-green-700' :
    rate >= 70 ? 'text-yellow-700' :
    'text-red-700';

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      {label && (
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-900">{label}</h3>
          <span className="text-xs text-gray-500">{summary.total} records</span>
        </div>
      )}

      {/* Attendance rate bar */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm text-gray-600">Attendance Rate</span>
          <span className={`text-lg font-bold ${rateColor}`}>{rate}%</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${rate >= 85 ? 'bg-green-500' : rate >= 70 ? 'bg-yellow-500' : 'bg-red-500'}`}
            style={{ width: `${rate}%` }}
          />
        </div>
      </div>

      {/* Stat grid */}
      <div className="grid grid-cols-5 gap-2">
        {stats.map((s) => (
          <div key={s.label} className="text-center">
            <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
