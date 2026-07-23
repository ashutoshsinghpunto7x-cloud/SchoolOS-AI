import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, Users, ChevronRight, ChevronLeft, RefreshCw, Download } from 'lucide-react';
import { useAttendanceSummary, useClassAttendance } from '../hooks/useAttendance';
import { AttendanceSummaryCard } from '../components/AttendanceSummaryCard';
import { AttendanceStatusBadge } from '../components/AttendanceStatusBadge';
import { studentsApi } from '@/features/students/api/students.api';
import { downloadCsv } from '@/lib/csv';

const STATUS_LABEL: Record<string, string> = {
  present: 'Present',
  absent: 'Absent',
  late: 'Late',
  half_day: 'Half Day',
  leave_approved: 'Leave Approved',
};

const CLASSES = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
const SECTIONS = ['A', 'B', 'C', 'D'];

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function addDays(dateStr: string, n: number) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

function formatDisplayDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

export function AttendanceWorkspace() {
  const navigate = useNavigate();
  const today    = todayStr();

  const [date, setDate] = useState(today);
  const [selectedClass,   setSelectedClass]   = useState('');
  const [selectedSection, setSelectedSection] = useState('');

  const { data: summary, isLoading: summaryLoading } = useAttendanceSummary({ dateFrom: date, dateTo: date });

  const canLoadClass = !!selectedClass && !!selectedSection;
  const { data: classRecords, isLoading: classLoading, refetch: refetchClass } =
    useClassAttendance(selectedClass, selectedSection, date);
  const [downloading, setDownloading] = useState(false);

  const hasRecords = classRecords && classRecords.length > 0;
  const isToday = date === today;

  async function handleDownloadAttendance() {
    if (!classRecords || downloading) return;
    setDownloading(true);
    try {
      const roster = await studentsApi.listPaginated({
        class: selectedClass,
        section: selectedSection,
        limit: 200,
        status: 'active',
      });
      const statusByStudent = new Map(classRecords.map((r) => [r.studentId, r.status]));
      downloadCsv(
        `Attendance_Class${selectedClass}-${selectedSection}_${date}.csv`,
        ['Roll No', 'Name', 'Status'],
        roster.data.map((s) => [
          s.rollNumber ?? '',
          s.fullName,
          STATUS_LABEL[statusByStudent.get(s._id) ?? ''] ?? 'Unmarked',
        ]),
      );
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7] p-6">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Attendance</h1>
          <p className="text-sm text-gray-500 mt-0.5">{formatDisplayDate(date)}</p>
        </div>

        {/* Date navigation — lets a principal/admin look back at previous days' attendance */}
        <div className="flex items-center gap-2 bg-white rounded-xl border border-gray-200 px-2 py-1.5">
          <button
            type="button"
            onClick={() => setDate((d) => addDays(d, -1))}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Previous day"
          >
            <ChevronLeft className="w-4 h-4 text-gray-500" />
          </button>
          <input
            type="date"
            value={date}
            max={today}
            onChange={(e) => e.target.value && setDate(e.target.value)}
            className="text-sm font-medium text-gray-700 border-none focus:outline-none bg-transparent"
          />
          <button
            type="button"
            onClick={() => setDate((d) => addDays(d, 1))}
            disabled={isToday}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="Next day"
          >
            <ChevronRight className="w-4 h-4 text-gray-500" />
          </button>
          {!isToday && (
            <button
              type="button"
              onClick={() => setDate(today)}
              className="text-xs font-semibold text-[#5B21B6] hover:underline px-2"
            >
              Today
            </button>
          )}
        </div>
      </div>

      {/* Summary for the selected date */}
      <section className="mb-6">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
          {isToday ? "Today's Overview" : 'Overview'}
        </h2>
        {summaryLoading ? (
          <div className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse h-32" />
        ) : summary ? (
          <AttendanceSummaryCard summary={summary} label={isToday ? 'School-wide Today' : `School-wide — ${date}`} />
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 p-5 text-sm text-gray-500">
            No attendance recorded for this date yet.
          </div>
        )}
      </section>

      {/* Class selector + view/take attendance */}
      <section className="mb-6">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
          {isToday ? 'Take Attendance' : 'View Attendance Record'}
        </h2>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex gap-3 flex-wrap">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500 font-medium">Class</label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#A855F7] min-w-[100px]"
              >
                <option value="">Select</option>
                {CLASSES.map((c) => <option key={c} value={c}>Class {c}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500 font-medium">Section</label>
              <select
                value={selectedSection}
                onChange={(e) => setSelectedSection(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#A855F7] min-w-[100px]"
              >
                <option value="">Select</option>
                {SECTIONS.map((s) => <option key={s} value={s}>Section {s}</option>)}
              </select>
            </div>

            {canLoadClass && (
              <div className="flex items-end gap-2">
                <button
                  onClick={() =>
                    navigate(
                      `/attendance/class/${encodeURIComponent(selectedClass)}/${encodeURIComponent(selectedSection)}?date=${date}`
                    )
                  }
                  className="flex items-center gap-2 px-5 py-2 bg-[#5B21B6] text-white text-sm font-semibold rounded-lg hover:bg-[#4C1D95] transition-colors"
                >
                  <Users className="w-4 h-4" />
                  {isToday ? 'Take Attendance' : 'View Attendance'}
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Quick status if already marked */}
          {canLoadClass && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              {classLoading ? (
                <p className="text-sm text-gray-400">Loading…</p>
              ) : hasRecords ? (
                <div className="flex items-center gap-3">
                  <CalendarDays className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-gray-700">
                    Attendance already submitted for Class {selectedClass}-{selectedSection} today
                    ({classRecords.length} records)
                  </span>
                  <div className="flex gap-1.5 ml-2">
                    {(['present', 'absent', 'late', 'half_day', 'leave_approved'] as const).map((s) => {
                      const count = classRecords.filter((r) => r.status === s).length;
                      return count > 0 ? (
                        <span key={s} className="flex items-center gap-1 text-xs">
                          <AttendanceStatusBadge status={s} size="sm" />
                          <span className="font-semibold text-gray-700">{count}</span>
                        </span>
                      ) : null;
                    })}
                  </div>
                  <button
                    onClick={handleDownloadAttendance}
                    disabled={downloading}
                    className="ml-auto p-1.5 rounded hover:bg-gray-100 disabled:opacity-50"
                    title="Download attendance (CSV)"
                  >
                    <Download className="w-3.5 h-3.5 text-gray-400" />
                  </button>
                  <button
                    onClick={() => refetchClass()}
                    className="p-1.5 rounded hover:bg-gray-100"
                    title="Refresh"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-gray-400" />
                  </button>
                </div>
              ) : (
                <p className="text-sm text-gray-500">
                  No attendance recorded for Class {selectedClass}-{selectedSection} today yet.
                </p>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
