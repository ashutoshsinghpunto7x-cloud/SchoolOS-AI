import { Users, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PrincipalAttendanceStats } from '@schoolos/types';

interface Props {
  data?: PrincipalAttendanceStats;
  isLoading?: boolean;
}

interface StatBarProps {
  label: string;
  count: number;
  total: number;
  color: string;
}

const StatBar = ({ label, count, total, color }: StatBarProps) => {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-gray-600">{label}</span>
        <span className="text-xs text-gray-500">{count} ({pct}%)</span>
      </div>
      <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
};

export const AttendanceWidget = ({ data, isLoading }: Props) => {
  if (isLoading || !data) {
    return (
      <div className="space-y-3 animate-pulse">
        <div className="h-14 bg-gray-100 rounded-xl" />
        {[1, 2, 3].map((i) => <div key={i} className="h-8 bg-gray-100 rounded" />)}
      </div>
    );
  }

  const { today, weeklyAvgRate } = data;
  const rateColor =
    today.attendanceRate >= 85 ? 'text-green-600' :
    today.attendanceRate >= 75 ? 'text-amber-600' :
    'text-red-600';

  return (
    <div className="space-y-4">
      {/* Rate highlight */}
      <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
        <div className="flex-shrink-0 w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center">
          <Users className="w-5 h-5 text-[#5B21B6]" strokeWidth={2} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-500 font-medium">Today's Attendance Rate</p>
          <p className={cn('text-2xl font-bold leading-tight', rateColor)}>
            {today.total > 0 ? `${today.attendanceRate}%` : 'No data'}
          </p>
          {today.total > 0 && (
            <p className="text-xs text-gray-400 mt-0.5">{today.total} records marked</p>
          )}
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-xs text-gray-500 font-medium">7-Day Avg</p>
          <div className="flex items-center gap-1 justify-end mt-0.5">
            <TrendingUp className="w-3.5 h-3.5 text-gray-400" strokeWidth={2} />
            <span className="text-sm font-semibold text-gray-700">{weeklyAvgRate}%</span>
          </div>
        </div>
      </div>

      {/* Breakdown bars */}
      {today.total > 0 ? (
        <div className="space-y-2.5">
          <StatBar label="Present"       count={today.present}        total={today.total} color="bg-green-500" />
          <StatBar label="Absent"        count={today.absent}         total={today.total} color="bg-red-500" />
          <StatBar label="Late"          count={today.late}           total={today.total} color="bg-amber-500" />
          <StatBar label="Half Day"      count={today.half_day}       total={today.total} color="bg-orange-400" />
          <StatBar label="Leave"         count={today.leave_approved} total={today.total} color="bg-blue-400" />
        </div>
      ) : (
        <p className="text-sm text-gray-400 text-center py-2">Attendance not marked yet for today.</p>
      )}
    </div>
  );
};
