import { CheckCircle2, Loader2, LogIn, LogOut } from 'lucide-react';
import { useMyAttendanceToday, useSelfPunch } from '@/features/employees/hooks/useStaffAttendance';

const STATUS_LABEL: Record<string, string> = {
  present: 'Present', late: 'Late', half_day: 'Half Day', absent: 'Absent',
};

function timeLabel(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

/** Teacher marks their own attendance; the principal sees it live. */
export function MyAttendanceCard({ className = '' }: { className?: string }) {
  const { data: record, isLoading, isError } = useMyAttendanceToday();
  const { mutate, isPending, error } = useSelfPunch();

  // No linked employee record (or any load failure) — hide rather than nag.
  if (isError) return null;

  const checkedIn = Boolean(record?.checkIn);
  const checkedOut = Boolean(record?.checkOut);

  return (
    <div className={className}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-gray-900 dark:text-white">My Attendance</p>
          {isLoading ? (
            <p className="text-xs text-gray-400 mt-0.5">Loading…</p>
          ) : !checkedIn ? (
            <p className="text-xs text-gray-500 dark:text-white/50 mt-0.5">You haven't checked in today.</p>
          ) : (
            <p className="text-xs text-gray-500 dark:text-white/50 mt-0.5">
              {STATUS_LABEL[record!.status] ?? record!.status} · In {timeLabel(record!.checkIn?.time)}
              {checkedOut && ` · Out ${timeLabel(record!.checkOut?.time)}`}
            </p>
          )}
        </div>

        {checkedOut ? (
          <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 shrink-0">
            <CheckCircle2 className="w-4 h-4" /> Done for today
          </span>
        ) : (
          <button
            type="button"
            disabled={isLoading || isPending}
            onClick={() => mutate()}
            className={`shrink-0 h-11 px-5 rounded-xl text-sm font-bold text-white flex items-center gap-2 disabled:opacity-60 transition-colors ${
              checkedIn ? 'bg-orange-500 hover:bg-orange-600' : 'bg-emerald-600 hover:bg-emerald-700'
            }`}
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : checkedIn ? <LogOut className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
            {checkedIn ? 'Check Out' : 'Check In'}
          </button>
        )}
      </div>
      {error && <p className="text-xs text-red-600 mt-2">{error.message}</p>}
    </div>
  );
}
