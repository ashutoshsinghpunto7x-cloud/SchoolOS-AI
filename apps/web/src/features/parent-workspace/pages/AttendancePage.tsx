import { useState, type CSSProperties } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, CalendarCheck, CheckCircle2, Clock, XCircle } from 'lucide-react';
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
  absent: 'bg-rose-600',
  late: 'bg-amber-500',
  half_day: 'bg-amber-500',
  leave_approved: 'bg-sky-500',
};

const DAY_CELL_STYLE: Record<AttendanceStatus, string> = {
  present: 'bg-emerald-50 text-emerald-950 border border-emerald-200/90 font-semibold',
  absent: 'bg-rose-50 text-rose-900 border border-rose-200 font-semibold',
  late: 'bg-amber-50 text-amber-950 border border-amber-200 font-semibold',
  half_day: 'bg-amber-50 text-amber-950 border border-amber-200 font-semibold',
  leave_approved: 'bg-sky-50 text-sky-900 border border-sky-200 font-medium',
};

const STATUS_LABEL: Record<AttendanceStatus, string> = {
  present: 'Present',
  absent: 'Absent',
  late: 'Late',
  half_day: 'Half day',
  leave_approved: 'On leave',
};

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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
      <div className="min-h-screen bg-[#FBF8F3]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5" aria-hidden="true">
          <div className="h-28 bg-gray-100 rounded-2xl animate-pulse" />
          <div className="h-96 bg-gray-100 rounded-2xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (!activeChild || isError || !data) {
    return (
      <div className="min-h-screen bg-[#FBF8F3]">
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
  const monthRate = Math.round(data.monthSummary.attendanceRate || 0);
  const yearRate = Math.round(data.yearSummary.attendanceRate || 0);

  return (
    <div className="min-h-screen bg-[#FBF8F3]">
      <ParentScreenHeader
        title="Attendance Report"
        subtitle={`${data.child.name}'s monthly & annual attendance summary`}
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
        {/* Colourful Summary Banner + Stat Tiles */}
        <motion.section
          variants={fadeUp}
          transition={{ duration: 0.25 }}
          aria-label="Attendance summary"
          className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3.5"
        >
          <div className="rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white p-4 sm:p-5 flex items-center justify-between gap-3 shadow-sm">
            <div>
              <p className="text-xs uppercase tracking-wider text-emerald-100 font-semibold m-0">This Month</p>
              <p className="text-2xl font-bold tabular-nums m-0 mt-1">{monthRate}%</p>
              <p className="text-xs text-emerald-100 m-0 mt-0.5">{monthLabel(data.month)}</p>
            </div>
            <div className="pw-ring-wrap">
              <progress
                value={monthRate}
                max={100}
                aria-label="Monthly attendance rate"
                aria-valuetext={`${monthRate}%`}
                className="pw-ring"
                style={
                  {
                    '--size': '54px',
                    '--thickness': '6px',
                    '--pw-ring-val': monthRate,
                    '--fill-color': '#A7F3D0',
                    '--track-color': 'rgba(255,255,255,0.22)',
                  } as CSSProperties
                }
              />
              <span className="pw-ring-label text-xs font-bold text-white" aria-hidden="true">
                {monthRate}%
              </span>
            </div>
          </div>

          <div
            className={`rounded-2xl border p-4 sm:p-5 shadow-2xs ${
              yearRate < 85
                ? 'bg-amber-50/90 border-amber-200 text-amber-950'
                : 'bg-sky-50/90 border-sky-200 text-sky-950'
            }`}
          >
            <p className="text-xs uppercase tracking-wider font-semibold opacity-75 m-0">Academic Year</p>
            <p className="text-2xl font-bold tabular-nums m-0 mt-1">{yearRate}%</p>
            <p className="text-xs opacity-80 m-0 mt-0.5">
              {data.yearSummary.present} of {data.yearSummary.total} school days
            </p>
          </div>

          <div className="rounded-2xl bg-emerald-50/80 border border-emerald-200 p-4 sm:p-5 shadow-2xs">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-wider text-emerald-800 font-semibold m-0">Present Days</p>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" aria-hidden="true" />
            </div>
            <p className="text-2xl font-bold text-emerald-900 tabular-nums m-0 mt-1">{data.monthSummary.present}</p>
            <p className="text-xs text-emerald-700 m-0 mt-0.5">
              {data.monthSummary.late > 0 ? `Includes ${data.monthSummary.late} late check-in` : 'On-time attendance'}
            </p>
          </div>

          <div
            className={`rounded-2xl border p-4 sm:p-5 shadow-2xs ${
              data.monthSummary.absent > 0
                ? 'bg-rose-50/85 border-rose-200 text-rose-950'
                : 'bg-white border-[#E8E2D6] text-[#1B2A4E]'
            }`}
          >
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-wider font-semibold opacity-75 m-0">Absent Days</p>
              {data.monthSummary.absent > 0 ? (
                <XCircle className="w-4 h-4 text-rose-600" aria-hidden="true" />
              ) : (
                <Clock className="w-4 h-4 text-[#7B859D]" aria-hidden="true" />
              )}
            </div>
            <p className="text-2xl font-bold tabular-nums m-0 mt-1">{data.monthSummary.absent}</p>
            <p className="text-xs opacity-75 m-0 mt-0.5">
              {data.monthSummary.absent === 0 ? 'Zero absences this month' : 'Recorded this month'}
            </p>
          </div>
        </motion.section>

        {/* Colour-Tinted Monthly Calendar */}
        <motion.section
          variants={fadeUp}
          transition={{ duration: 0.25 }}
          aria-label="Attendance calendar"
          className="bg-white rounded-2xl border border-emerald-100 shadow-sm px-5 py-5 sm:px-6 sm:py-6"
        >
          <div className="flex items-center justify-between mb-5">
            <button
              type="button"
              onClick={() => setMonth((mo) => shiftMonth(mo, -1))}
              aria-label="Previous month"
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-[#FBF8F3] border border-[#E8E2D6] hover:bg-[#F3EEE3] transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5 text-[#1B2A4E]" strokeWidth={2} />
            </button>
            <p className="text-base sm:text-lg font-bold text-[#1B2A4E] m-0">{monthLabel(data.month)}</p>
            <button
              type="button"
              onClick={() => setMonth((mo) => shiftMonth(mo, 1))}
              disabled={isCurrentMonth}
              aria-label="Next month"
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-[#FBF8F3] border border-[#E8E2D6] hover:bg-[#F3EEE3] transition-colors disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
            >
              <ChevronRight className="w-5 h-5 text-[#1B2A4E]" strokeWidth={2} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
            {WEEKDAYS.map((d) => (
              <div key={d} className="text-center text-[11px] font-semibold text-[#7B859D] uppercase pb-1">
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
                  aria-label={rec ? `${dateStr}: ${STATUS_LABEL[rec.status]}` : undefined}
                  className={`aspect-square rounded-xl flex flex-col items-center justify-center gap-1 transition-colors ${
                    rec ? DAY_CELL_STYLE[rec.status] : 'bg-[#FBF8F3]/60 text-[#55607A] border border-transparent'
                  }`}
                >
                  <span className="text-sm tabular-nums">{day}</span>
                  {rec && <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[rec.status]}`} aria-hidden="true" />}
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-3 mt-6 pt-5 border-t border-[#EFEAE0]">
            {(['present', 'late', 'absent', 'leave_approved'] as AttendanceStatus[]).map((s) => (
              <span
                key={s}
                className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs ${DAY_CELL_STYLE[s]}`}
              >
                <span className={`w-2 h-2 rounded-full ${STATUS_DOT[s]}`} aria-hidden="true" />
                {STATUS_LABEL[s]}
              </span>
            ))}
          </div>
        </motion.section>

        {data.records.length === 0 && (
          <motion.div variants={fadeUp} transition={{ duration: 0.25 }}>
            <p className="text-center text-sm text-[#7B859D] py-4 m-0">No attendance recorded for this month yet.</p>
          </motion.div>
        )}
      </motion.main>
    </div>
  );
}

export default AttendancePage;
