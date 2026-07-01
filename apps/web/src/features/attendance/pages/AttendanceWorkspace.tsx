import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, Users, ChevronRight, RefreshCw } from 'lucide-react';
import { useAttendanceSummary, useClassAttendance } from '../hooks/useAttendance';
import { AttendanceSummaryCard } from '../components/AttendanceSummaryCard';
import { AttendanceStatusBadge } from '../components/AttendanceStatusBadge';

const CLASSES = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
const SECTIONS = ['A', 'B', 'C', 'D'];

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

export function AttendanceWorkspace() {
  const navigate = useNavigate();
  const today    = todayStr();

  const [selectedClass,   setSelectedClass]   = useState('');
  const [selectedSection, setSelectedSection] = useState('');

  const { data: summary, isLoading: summaryLoading } = useAttendanceSummary({ dateFrom: today, dateTo: today });

  const canLoadClass = !!selectedClass && !!selectedSection;
  const { data: classRecords, isLoading: classLoading, refetch: refetchClass } =
    useClassAttendance(selectedClass, selectedSection, today);

  const hasRecords = classRecords && classRecords.length > 0;

  return (
    <div className="min-h-screen bg-[#F5F5F7] p-6">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Attendance</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Today's summary */}
      <section className="mb-6">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Today's Overview</h2>
        {summaryLoading ? (
          <div className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse h-32" />
        ) : summary ? (
          <AttendanceSummaryCard summary={summary} label="School-wide Today" />
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 p-5 text-sm text-gray-500">
            No attendance recorded today yet.
          </div>
        )}
      </section>

      {/* Class selector + take attendance */}
      <section className="mb-6">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Take Attendance</h2>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex gap-3 flex-wrap">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500 font-medium">Class</label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 min-w-[100px]"
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
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 min-w-[100px]"
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
                      `/attendance/class/${encodeURIComponent(selectedClass)}/${encodeURIComponent(selectedSection)}`
                    )
                  }
                  className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Users className="w-4 h-4" />
                  Take Attendance
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
                    onClick={() => refetchClass()}
                    className="ml-auto p-1.5 rounded hover:bg-gray-100"
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
