import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ClipboardList, Clock, CalendarDays } from 'lucide-react';
import { useTeacherWorkspace } from '../hooks/useTeacherWorkspace';
import { useEmployeeAttendanceHistory } from '@/features/employees/hooks/useStaffAttendance';

const STATUS_STYLE: Record<string, string> = {
  present:  'bg-emerald-50 text-emerald-700',
  late:     'bg-amber-50 text-amber-700',
  half_day: 'bg-orange-50 text-orange-700',
  absent:   'bg-red-50 text-red-700',
};

const STATUS_LABEL: Record<string, string> = {
  present: 'Present', late: 'Late', half_day: 'Half Day', absent: 'Absent',
};

function timeLabel(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

function dateLabel(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

export function TeacherMyAttendancePage() {
  const navigate = useNavigate();
  const { data: workspace, isLoading: loadingWorkspace } = useTeacherWorkspace();
  const employeeId = workspace?.teacher?.employeeId ?? '';

  const { data: records, isLoading } = useEmployeeAttendanceHistory(employeeId);

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-transparent">
      <div className="bg-white dark:teacher-glass-card border-b border-gray-100 dark:border-white/5 px-4 py-4 flex items-center gap-3">
        <button onClick={() => navigate('/teacher/profile')} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-white/60" />
        </button>
        <h1 className="text-base font-bold text-gray-900 dark:text-white">My Attendance</h1>
      </div>

      <div className="px-4 py-5 space-y-3">
        {loadingWorkspace || isLoading ? (
          <div className="space-y-2 animate-pulse">
            {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-16 bg-white dark:bg-white/5 rounded-2xl" />)}
          </div>
        ) : !employeeId ? (
          <div className="text-center py-16">
            <ClipboardList className="w-10 h-10 text-gray-300 dark:text-white/20 mx-auto mb-3" />
            <p className="text-sm font-semibold text-gray-700 dark:text-white">No linked employee record</p>
            <p className="text-xs text-gray-400 dark:text-white/30 mt-1 px-6">Ask an admin to check your HR record is linked to your login.</p>
          </div>
        ) : !records?.length ? (
          <div className="text-center py-16">
            <CalendarDays className="w-10 h-10 text-gray-300 dark:text-white/20 mx-auto mb-3" />
            <p className="text-sm font-semibold text-gray-700 dark:text-white">No attendance records yet</p>
            <p className="text-xs text-gray-400 dark:text-white/30 mt-1">Scan your QR at the office to check in.</p>
          </div>
        ) : (
          records.map((r) => (
            <div key={r._id} className="bg-white dark:teacher-glass-card rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-bold text-gray-900 dark:text-white">{dateLabel(r.date)}</p>
                <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${STATUS_STYLE[r.status] ?? STATUS_STYLE.present}`}>
                  {STATUS_LABEL[r.status] ?? r.status}
                </span>
              </div>
              <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-white/40">
                <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> In: {timeLabel(r.checkIn?.time)}</span>
                <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Out: {timeLabel(r.checkOut?.time)}</span>
                {typeof r.workingMinutes === 'number' && (
                  <span>{Math.floor(r.workingMinutes / 60)}h {r.workingMinutes % 60}m</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
