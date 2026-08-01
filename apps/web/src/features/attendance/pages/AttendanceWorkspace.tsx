import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, ChevronLeft, Users, GraduationCap, CheckCircle2, XCircle, Layers } from 'lucide-react';
import { useClassAttendanceOverview, useTeacherAttendanceOverview } from '../hooks/useAttendance';

type Tab = 'classes' | 'teachers';

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

function StatCard({ icon: Icon, label, value, tone }: { icon: typeof Users; label: string; value: number; tone: 'neutral' | 'green' | 'red' }) {
  const toneClasses = {
    neutral: 'bg-[#EDE9FE] text-[#5B21B6]',
    green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-600',
  }[tone];
  const valueClasses = {
    neutral: 'text-gray-900',
    green: 'text-green-600',
    red: 'text-red-600',
  }[tone];
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col items-center text-center gap-2">
      <div className={`w-9 h-9 rounded-full flex items-center justify-center ${toneClasses}`}>
        <Icon className="w-4.5 h-4.5" />
      </div>
      <div className={`text-2xl font-bold ${valueClasses}`}>{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  );
}

export function AttendanceWorkspace() {
  const navigate = useNavigate();
  const today = todayStr();

  const [date, setDate] = useState(today);
  const [tab, setTab] = useState<Tab>('classes');
  const [selectedClass, setSelectedClass] = useState('all');

  const isToday = date === today;

  const { data: classOverview, isLoading: classesLoading } = useClassAttendanceOverview(date);
  const { data: teacherOverview, isLoading: teachersLoading } = useTeacherAttendanceOverview(date);

  const classNames = useMemo(
    () => Array.from(new Set((classOverview?.classes ?? []).map((c) => c.class))),
    [classOverview],
  );

  const visibleClasses = useMemo(() => {
    const rows = classOverview?.classes ?? [];
    return selectedClass === 'all' ? rows : rows.filter((r) => r.class === selectedClass);
  }, [classOverview, selectedClass]);

  function goTakeAttendance(cls: string, section: string) {
    // The swipe-to-mark flow only ever operates on today's date (marking a
    // past day isn't allowed — see attendanceService.assertAttendanceEditableForTeacher).
    // For a past date, fall back to the read-only class-attendance view instead.
    if (isToday) {
      navigate(`/attendance/take/${encodeURIComponent(cls)}/${encodeURIComponent(section)}`);
    } else {
      navigate(`/attendance/class/${encodeURIComponent(cls)}/${encodeURIComponent(section)}?date=${date}`);
    }
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7] p-4 sm:p-6">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Attendance</h1>
          <p className="text-sm text-gray-500 mt-0.5">{formatDisplayDate(date)}</p>
        </div>

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

      {/* Tabs */}
      <div className="flex items-center gap-6 border-b border-gray-200 mb-4">
        {(['classes', 'teachers'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`pb-3 text-sm font-semibold capitalize border-b-2 transition-colors ${
              tab === t
                ? 'border-[#5B21B6] text-[#5B21B6]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'classes' ? (
        <>
          {/* Class filter */}
          <div className="mb-4">
            <label className="block text-xs text-gray-500 font-medium mb-1">Select Class</label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#A855F7] min-w-[180px]"
            >
              <option value="all">All Classes</option>
              {classNames.map((c) => <option key={c} value={c}>{`Class ${c}`}</option>)}
            </select>
          </div>

          {/* Desktop table */}
          <div className="hidden md:block bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                  <th className="px-5 py-3 font-semibold">Class &amp; Section</th>
                  <th className="px-5 py-3 font-semibold">Class Teacher</th>
                  <th className="px-5 py-3 font-semibold text-green-600">Present</th>
                  <th className="px-5 py-3 font-semibold text-red-600">Absent</th>
                  <th className="px-5 py-3 font-semibold">Total Students</th>
                  <th className="px-5 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {classesLoading ? (
                  <tr><td colSpan={6} className="px-5 py-8 text-center text-gray-400">Loading…</td></tr>
                ) : visibleClasses.length === 0 ? (
                  <tr><td colSpan={6} className="px-5 py-8 text-center text-gray-400">No classes found.</td></tr>
                ) : (
                  visibleClasses.map((row) => (
                    <tr key={`${row.class}-${row.section}`} className="hover:bg-gray-50/60">
                      <td className="px-5 py-3 font-semibold text-gray-900">Class {row.class} - {row.section}</td>
                      <td className="px-5 py-3 text-gray-600">{row.classTeacherName ?? '—'}</td>
                      <td className="px-5 py-3 font-semibold text-green-600">{row.present}</td>
                      <td className="px-5 py-3 font-semibold text-red-600">{row.absent}</td>
                      <td className="px-5 py-3 text-gray-700">{row.totalStudents}</td>
                      <td className="px-5 py-3 text-right">
                        <button
                          onClick={() => goTakeAttendance(row.class, row.section)}
                          className="text-xs font-semibold text-[#5B21B6] hover:underline"
                        >
                          {isToday ? 'Take Attendance' : 'View'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile card list */}
          <div className="md:hidden space-y-2 mb-6">
            {classesLoading ? (
              <div className="bg-white rounded-xl border border-gray-200 p-5 text-center text-gray-400 text-sm">Loading…</div>
            ) : visibleClasses.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-5 text-center text-gray-400 text-sm">No classes found.</div>
            ) : (
              visibleClasses.map((row) => (
                <button
                  key={`${row.class}-${row.section}`}
                  onClick={() => goTakeAttendance(row.class, row.section)}
                  className="w-full flex items-center justify-between bg-white rounded-xl border border-gray-200 px-4 py-3 text-left"
                >
                  <div>
                    <div className="text-sm font-semibold text-gray-900">Class {row.class} - {row.section}</div>
                    <div className="text-xs text-gray-500">{row.classTeacherName ?? 'No class teacher'}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-green-600">{row.present}</span>
                    <span className="text-sm font-bold text-red-600">{row.absent}</span>
                    <span className="text-sm text-gray-500">{row.totalStudents}</span>
                    <ChevronRight className="w-4 h-4 text-gray-300" />
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Totals */}
          <div className="grid grid-cols-3 gap-3 max-w-xl">
            <StatCard icon={Layers} label="Total Classes" value={classOverview?.totals.totalClasses ?? 0} tone="neutral" />
            <StatCard icon={CheckCircle2} label="Total Present" value={classOverview?.totals.totalPresent ?? 0} tone="green" />
            <StatCard icon={XCircle} label="Total Absent" value={classOverview?.totals.totalAbsent ?? 0} tone="red" />
          </div>
        </>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                  <th className="px-5 py-3 font-semibold">Teacher</th>
                  <th className="px-5 py-3 font-semibold">Department</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {teachersLoading ? (
                  <tr><td colSpan={3} className="px-5 py-8 text-center text-gray-400">Loading…</td></tr>
                ) : !teacherOverview?.teachers.length ? (
                  <tr><td colSpan={3} className="px-5 py-8 text-center text-gray-400">No teachers found.</td></tr>
                ) : (
                  teacherOverview.teachers.map((t) => (
                    <tr key={t.teacherId} className="hover:bg-gray-50/60">
                      <td className="px-5 py-3 font-semibold text-gray-900">{t.fullName}</td>
                      <td className="px-5 py-3 text-gray-600">{t.department ?? '—'}</td>
                      <td className="px-5 py-3">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full capitalize ${
                          t.status === 'absent' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'
                        }`}>
                          {t.status.replace('_', ' ')}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile card list */}
          <div className="md:hidden space-y-2 mb-6">
            {teachersLoading ? (
              <div className="bg-white rounded-xl border border-gray-200 p-5 text-center text-gray-400 text-sm">Loading…</div>
            ) : !teacherOverview?.teachers.length ? (
              <div className="bg-white rounded-xl border border-gray-200 p-5 text-center text-gray-400 text-sm">No teachers found.</div>
            ) : (
              teacherOverview.teachers.map((t) => (
                <div key={t.teacherId} className="flex items-center justify-between bg-white rounded-xl border border-gray-200 px-4 py-3">
                  <div>
                    <div className="text-sm font-semibold text-gray-900">{t.fullName}</div>
                    <div className="text-xs text-gray-500">{t.department ?? '—'}</div>
                  </div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full capitalize ${
                    t.status === 'absent' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'
                  }`}>
                    {t.status.replace('_', ' ')}
                  </span>
                </div>
              ))
            )}
          </div>

          {/* Totals */}
          <div className="grid grid-cols-3 gap-3 max-w-xl">
            <StatCard icon={GraduationCap} label="Total Teachers" value={teacherOverview?.totals.totalTeachers ?? 0} tone="neutral" />
            <StatCard icon={CheckCircle2} label="Present" value={teacherOverview?.totals.present ?? 0} tone="green" />
            <StatCard icon={XCircle} label="Absent" value={teacherOverview?.totals.absent ?? 0} tone="red" />
          </div>
        </>
      )}
    </div>
  );
}
