import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, CalendarCheck } from 'lucide-react';
import { parentWorkspaceApi } from '../api/parent-workspace.api';
import { useParentWorkspace } from '../hooks/useParentWorkspace';
import { ParentScreenHeader } from '../components/ParentScreenHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import type { AttendanceStatus } from '../types';

const fadeUp = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0 },
};

const STATUS_DOT: Record<AttendanceStatus, string> = {
  present: 'bg-emerald-600',
  absent: 'bg-red-600',
  late: 'bg-amber-500',
  half_day: 'bg-amber-500',
  leave_approved: 'bg-gray-400',
};

const STATUS_LABEL: Record<AttendanceStatus, string> = {
  present: 'Present',
  absent: 'Absent',
  late: 'Late',
  half_day: 'Half day',
  leave_approved: 'On leave',
};

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function thisMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function shiftMonth(key: string, delta: number): string {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function SummaryStat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-gray-400 font-medium">{label}</p>
      <p className={`text-xl font-bold mt-1 ${tone ?? 'text-gray-900'}`}>{value}</p>
    </div>
  );
}

export function AttendancePage() {
  const { data: workspace, activeChild, isLoading: workspaceLoading, setActiveChildId } = useParentWorkspace();
  const [month, setMonth] = useState(thisMonthKey());
  const isCurrentMonth = month === thisMonthKey();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['parent-attendance', activeChild?._id, month],
    queryFn: () => parentWorkspaceApi.getAttendance(activeChild!._id, month),
    enabled: !!activeChild,
  });

  if (workspaceLoading || (isLoading && !data)) {
    return (
      <div className="min-h-screen bg-[#F5F5F7]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5" aria-busy="true">
          <div className="h-24 bg-gray-100 rounded-2xl animate-pulse" />
          <div className="h-96 bg-gray-100 rounded-2xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (!activeChild || isError || !data) {
    return (
      <div className="min-h-screen bg-[#F5F5F7]">
        <EmptyState
          icon={CalendarCheck}
          title={!activeChild ? 'No children linked yet' : 'Could not load attendance'}
          description={!activeChild ? "Ask the school office to link your child's profile to this account." : 'Please try again shortly.'}
        />
      </div>
    );
  }

  const [y, m] = data.month.split('-').map(Number);
  const firstOfMonth = new Date(y, m - 1, 1);
  const leadingBlanks = firstOfMonth.getDay();
  const daysInMonth = new Date(y, m, 0).getDate();
  const recordByDate = new Map(data.records.map((r) => [r.date, r]));

  const yearStat: { label: string; value: string; tone?: string } = {
    label: 'This year',
    value: `${data.yearSummary.attendanceRate}%`,
    tone: data.yearSummary.attendanceRate < 85 ? 'text-red-600' : 'text-emerald-700',
  };

  return (
    <div className="min-h-screen bg-[#F5F5F7]">
      <ParentScreenHeader
        title="Attendance"
        subtitle={`${data.child.name}'s daily attendance record`}
        children={workspace?.children}
        activeChild={activeChild}
        onSelectChild={setActiveChildId}
      />

      <motion.main
        initial="hidden"
        animate="show"
        transition={{ staggerChildren: 0.05 }}
        className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5"
      >
        <motion.section
          variants={fadeUp}
          transition={{ duration: 0.25 }}
          aria-label="Attendance summary"
          className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-5 sm:px-6 sm:py-6 grid grid-cols-2 sm:grid-cols-4 gap-5"
        >
          <SummaryStat label="This month" value={`${data.monthSummary.attendanceRate}%`} />
          <SummaryStat {...yearStat} />
          <SummaryStat label="Present days" value={String(data.monthSummary.present)} />
          <SummaryStat label="Absent days" value={String(data.monthSummary.absent)} tone={data.monthSummary.absent > 0 ? 'text-red-600' : undefined} />
        </motion.section>

        <motion.section
          variants={fadeUp}
          transition={{ duration: 0.25 }}
          aria-label="Attendance calendar"
          className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-5 sm:px-6 sm:py-6"
        >
          <div className="flex items-center justify-between mb-5">
            <button
              type="button"
              onClick={() => setMonth((mo) => shiftMonth(mo, -1))}
              aria-label="Previous month"
              className="w-11 h-11 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-700" strokeWidth={2} />
            </button>
            <p className="text-lg font-bold text-gray-900">{monthLabel(data.month)}</p>
            <button
              type="button"
              onClick={() => setMonth((mo) => shiftMonth(mo, 1))}
              disabled={isCurrentMonth}
              aria-label="Next month"
              className="w-11 h-11 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors disabled:opacity-30 disabled:pointer-events-none"
            >
              <ChevronRight className="w-5 h-5 text-gray-700" strokeWidth={2} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
            {WEEKDAYS.map((d, i) => (
              <div key={`${d}-${i}`} className="text-center text-xs font-semibold text-gray-400 uppercase pb-1">
                {d}
              </div>
            ))}
            {Array.from({ length: leadingBlanks }).map((_, i) => (
              <div key={`blank-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = `${data.month}-${String(day).padStart(2, '0')}`;
              const rec = recordByDate.get(dateStr);
              return (
                <div
                  key={dateStr}
                  className="aspect-square rounded-xl flex flex-col items-center justify-center gap-1"
                  title={rec ? STATUS_LABEL[rec.status] : undefined}
                >
                  <span className="text-sm sm:text-base text-gray-800">{day}</span>
                  {rec && <span className={`w-2 h-2 rounded-full ${STATUS_DOT[rec.status]}`} aria-hidden="true" />}
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-6 pt-5 border-t border-gray-100">
            {(['present', 'late', 'absent', 'leave_approved'] as AttendanceStatus[]).map((s) => (
              <div key={s} className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${STATUS_DOT[s]}`} aria-hidden="true" />
                <span className="text-sm text-gray-600">{STATUS_LABEL[s]}</span>
              </div>
            ))}
          </div>
        </motion.section>

        {data.records.length === 0 && (
          <motion.div variants={fadeUp} transition={{ duration: 0.25 }}>
            <p className="text-center text-sm text-gray-400 py-4">No attendance recorded for this month yet.</p>
          </motion.div>
        )}
      </motion.main>
    </div>
  );
}

export default AttendancePage;
