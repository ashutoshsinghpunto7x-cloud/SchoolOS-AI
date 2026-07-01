import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Users,
  Pencil,
  CalendarDays,
} from 'lucide-react';
import { useStudentsPaginated } from '@/features/students/hooks/useStudents';
import { useClassAttendance, useBulkMarkAttendance } from '@/features/attendance/hooks/useAttendance';
import { useInvalidateTeacherWorkspace } from '../hooks/useTeacherWorkspace';
import { useState, useEffect } from 'react';
import type { AttendanceStatus, Student } from '@schoolos/types';
import { cn } from '@/lib/utils';

// ── Date helpers ──────────────────────────────────────────────────────────────

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDisplayDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function addDays(dateStr: string, n: number) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return toDateStr(d);
}

// ── Status config — only 3 shown in UI ───────────────────────────────────────

const STATUS_OPTS = [
  { status: 'present'        as AttendanceStatus, label: 'P', color: '#22C55E', bg: '#dcfce7', text: '#15803d' },
  { status: 'absent'         as AttendanceStatus, label: 'A', color: '#EF4444', bg: '#fee2e2', text: '#b91c1c' },
  { status: 'leave_approved' as AttendanceStatus, label: 'L', color: '#F59E0B', bg: '#fef3c7', text: '#b45309' },
];

// ── Row ───────────────────────────────────────────────────────────────────────

interface Row {
  studentId: string;
  fullName:  string;
  admNo:     string;
  status:    AttendanceStatus;
}

// ── Student row component ─────────────────────────────────────────────────────

function StudentRow({
  row,
  index,
  editable,
  onChange,
}: {
  row:      Row;
  index:    number;
  editable: boolean;
  onChange: (id: string, s: AttendanceStatus) => void;
}) {
  return (
    <div className="flex items-center px-4 py-3 border-b border-gray-50 last:border-0 gap-3">
      {/* Index */}
      <span className="text-sm text-gray-400 w-6 text-right shrink-0 font-mono">{index + 1}</span>

      {/* Name */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate">{row.fullName}</p>
        <p className="text-xs text-gray-400">{row.admNo}</p>
      </div>

      {/* P / A / L buttons */}
      <div className="flex items-center gap-2 shrink-0">
        {STATUS_OPTS.map((opt) => {
          const isSelected = row.status === opt.status;
          return (
            <button
              key={opt.status}
              type="button"
              disabled={!editable}
              onClick={() => onChange(row.studentId, opt.status)}
              className={cn(
                'w-9 h-9 rounded-full text-xs font-bold transition-all duration-150 flex items-center justify-center',
                isSelected
                  ? 'text-white shadow-sm scale-110'
                  : 'bg-gray-100 text-gray-400 hover:bg-gray-200',
                !editable && 'cursor-default',
              )}
              style={isSelected ? { backgroundColor: opt.color } : {}}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className="flex items-center px-4 py-3 border-b border-gray-50 gap-3 animate-pulse">
      <div className="w-6 h-4 bg-gray-100 rounded shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="h-4 bg-gray-100 rounded w-32" />
        <div className="h-3 bg-gray-100 rounded w-20" />
      </div>
      <div className="flex gap-2 shrink-0">
        {[0, 1, 2].map((i) => <div key={i} className="w-9 h-9 rounded-full bg-gray-100" />)}
      </div>
    </div>
  );
}

// ── Success (Submitted) screen ────────────────────────────────────────────────

function SubmittedScreen({
  cls,
  section,
  date,
  presentCount,
  absentCount,
  leaveCount,
  onEdit,
  onViewStudents,
  onDashboard,
}: {
  cls:          string;
  section:      string;
  date:         string;
  presentCount: number;
  absentCount:  number;
  leaveCount:   number;
  onEdit:       () => void;
  onViewStudents: () => void;
  onDashboard:  () => void;
}) {
  const submitTime = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center px-6 py-10 text-center">
      {/* Animated check */}
      <div className="relative w-24 h-24 mb-6">
        <div className="absolute inset-0 rounded-full bg-emerald-100 animate-ping opacity-30" />
        <div className="relative w-24 h-24 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
          <CheckCircle2 className="w-12 h-12 text-white" strokeWidth={2.5} />
        </div>
      </div>

      <h2 className="text-2xl font-bold text-gray-900">Attendance submitted</h2>
      <p className="text-gray-500 mt-1">successfully!</p>

      {/* Class summary card */}
      <div className="w-full max-w-sm mt-8 bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-left">
        <p className="font-bold text-gray-900">
          Class {cls}{section ? ` – ${section}` : ''}
        </p>
        <p className="text-sm text-gray-500 mt-0.5">{formatDisplayDate(date)}</p>
        <p className="text-xs text-gray-400 mt-0.5">{submitTime}</p>

        <div className="flex gap-6 mt-5">
          <div>
            <p className="text-2xl font-bold text-[#5B5CEB]">{presentCount}</p>
            <p className="text-xs text-gray-400 font-medium mt-0.5">Present</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-red-500">{absentCount}</p>
            <p className="text-xs text-gray-400 font-medium mt-0.5">Absent</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-amber-500">{leaveCount}</p>
            <p className="text-xs text-gray-400 font-medium mt-0.5">Leave</p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-3 mt-8 w-full max-w-sm">
        <button
          onClick={onViewStudents}
          className="h-12 bg-[#5B5CEB] text-white font-semibold rounded-xl text-sm hover:bg-[#4a4bd9] transition-colors"
        >
          View Students
        </button>
        <button
          onClick={onEdit}
          className="h-12 bg-white border border-gray-200 text-gray-700 font-semibold rounded-xl text-sm flex items-center justify-center gap-1.5 hover:bg-gray-50 transition-colors"
        >
          <Pencil className="w-4 h-4" />
          Edit Attendance
        </button>
        <button
          onClick={onDashboard}
          className="text-sm text-[#5B5CEB] font-semibold py-1 hover:underline transition-colors"
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function TeacherAttendancePage() {
  const { cls, section } = useParams<{ cls: string; section: string }>();
  const navigate = useNavigate();
  const invalidateWorkspace = useInvalidateTeacherWorkspace();

  const today = toDateStr(new Date());
  const [date,      setDate]      = useState(today);
  const [rows,      setRows]      = useState<Row[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [editMode,  setEditMode]  = useState(false);

  const { data: studentsData, isLoading: studentsLoading } = useStudentsPaginated({
    class: cls, section, limit: 300, status: 'active',
  });

  const { data: existingAttendance, isLoading: attendanceLoading } =
    useClassAttendance(cls ?? '', section ?? '', date);

  const { mutateAsync: bulkMark, isPending } = useBulkMarkAttendance();

  const students: Student[] = studentsData?.data ?? [];

  // Populate rows when data loads
  useEffect(() => {
    if (!students.length) return;
    const existMap = new Map(
      (existingAttendance ?? []).map((a) => [a.studentId, a.status as AttendanceStatus]),
    );
    setRows(
      students.map((s) => ({
        studentId: s._id,
        fullName:  s.fullName,
        admNo:     s.admissionNumber,
        status:    existMap.get(s._id) ?? 'present',
      })),
    );
  }, [students.length, existingAttendance, date]);

  const alreadySubmitted =
    !attendanceLoading && (existingAttendance ?? []).length > 0 && !editMode;

  const editable = !alreadySubmitted || editMode;

  const presentCount = rows.filter((r) => r.status === 'present').length;
  const absentCount  = rows.filter((r) => r.status === 'absent').length;
  const leaveCount   = rows.filter((r) => r.status === 'leave_approved').length;

  function changeStatus(studentId: string, status: AttendanceStatus) {
    setRows((prev) => prev.map((r) => r.studentId === studentId ? { ...r, status } : r));
  }

  function markAllPresent() {
    setRows((prev) => prev.map((r) => ({ ...r, status: 'present' })));
  }

  async function handleSave() {
    if (!cls || !section) return;
    await bulkMark({
      class:   cls,
      section: section,
      date,
      records: rows.map((r) => ({ studentId: r.studentId, status: r.status })),
    });
    await invalidateWorkspace();
    setSubmitted(true);
    setEditMode(false);
  }

  const isLoading = studentsLoading || attendanceLoading;

  // ── Submitted screen ─────────────────────────────────────────────────────

  if (submitted && !editMode) {
    return (
      <SubmittedScreen
        cls={cls!}
        section={section!}
        date={date}
        presentCount={presentCount}
        absentCount={absentCount}
        leaveCount={leaveCount}
        onEdit={() => { setSubmitted(false); setEditMode(true); }}
        onViewStudents={() => navigate(`/teacher/classes/${cls}/${section}/students`)}
        onDashboard={() => navigate('/teacher')}
      />
    );
  }

  // ── Attendance screen ─────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">

      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/teacher/classes')}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="flex-1 text-base font-bold text-gray-900">
            Class {cls} Attendance
          </h1>
          {alreadySubmitted && (
            <button
              type="button"
              onClick={() => setEditMode(true)}
              className="h-8 px-3 bg-gray-100 hover:bg-gray-200 rounded-xl text-xs font-semibold text-gray-600 flex items-center gap-1.5 transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit
            </button>
          )}
        </div>

        {/* Date navigation */}
        <div className="flex items-center justify-center gap-4 mt-4">
          <button
            type="button"
            onClick={() => setDate((d) => addDays(d, -1))}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-500" />
          </button>
          <div className="flex items-center gap-1.5">
            <CalendarDays className="w-4 h-4 text-[#5B5CEB]" />
            <span className="text-sm font-semibold text-gray-800">
              {formatDisplayDate(date)}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setDate((d) => addDays(d, 1))}
            disabled={date >= today}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-gray-500" />
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex-1">
          <div className="flex gap-4 px-6 py-5 justify-center">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex-1 max-w-[90px] h-16 bg-white rounded-2xl border border-gray-100 animate-pulse" />
            ))}
          </div>
          <div className="mx-4 h-12 bg-white rounded-xl border border-gray-100 animate-pulse mb-4" />
          <div className="mx-4 bg-white rounded-2xl border border-gray-100 overflow-hidden">
            {Array.from({ length: 7 }).map((_, i) => <SkeletonRow key={i} />)}
          </div>
        </div>
      ) : (
        <>
          {/* Already submitted banner */}
          {alreadySubmitted && (
            <div className="mx-4 mt-4 bg-emerald-50 border border-emerald-100 rounded-2xl px-4 py-3 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <p className="text-sm font-semibold text-emerald-700">
                Attendance already submitted for this date
              </p>
            </div>
          )}

          {/* Stat counters */}
          <div className="flex gap-3 px-4 py-5 justify-center">
            <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center max-w-[100px]">
              <p className="text-3xl font-bold text-[#5B5CEB]">{presentCount}</p>
              <p className="text-xs text-gray-500 font-semibold mt-1">Present</p>
            </div>
            <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center max-w-[100px]">
              <p className="text-3xl font-bold text-red-500">{absentCount}</p>
              <p className="text-xs text-gray-500 font-semibold mt-1">Absent</p>
            </div>
            <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center max-w-[100px]">
              <p className="text-3xl font-bold text-amber-500">{leaveCount}</p>
              <p className="text-xs text-gray-500 font-semibold mt-1">Leave</p>
            </div>
          </div>

          {/* Mark All Present */}
          {editable && rows.length > 0 && (
            <div className="px-4 mb-4">
              <button
                type="button"
                onClick={markAllPresent}
                className="w-full h-11 bg-[#5B5CEB]/10 hover:bg-[#5B5CEB]/20 text-[#5B5CEB] font-semibold rounded-xl text-sm transition-colors"
              >
                Mark All Present
              </button>
            </div>
          )}

          {/* Student list */}
          <div className="flex-1 mx-4 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-2">
            {rows.length === 0 ? (
              <div className="py-12 text-center">
                <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-500">No students in this class</p>
                <button
                  onClick={() => navigate(`/teacher/classes/${cls}/${section}/add-student`)}
                  className="mt-4 h-10 px-5 bg-[#5B5CEB] text-white rounded-xl text-sm font-semibold hover:bg-[#4a4bd9] transition-colors"
                >
                  Add Students
                </button>
              </div>
            ) : (
              rows.map((row, i) => (
                <StudentRow
                  key={row.studentId}
                  row={row}
                  index={i}
                  editable={editable}
                  onChange={changeStatus}
                />
              ))
            )}
          </div>

          {/* Save Attendance button */}
          {editable && rows.length > 0 && (
            <div className="sticky bottom-20 lg:bottom-0 px-4 py-4 bg-[#F8FAFC] border-t border-gray-200/60">
              <button
                type="button"
                onClick={handleSave}
                disabled={isPending}
                className="w-full h-14 bg-[#5B5CEB] hover:bg-[#4a4bd9] disabled:opacity-60 text-white font-bold rounded-2xl text-base flex items-center justify-center gap-2 transition-colors shadow-lg shadow-[#5B5CEB]/25"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Saving…
                  </>
                ) : (
                  'Save Attendance'
                )}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
