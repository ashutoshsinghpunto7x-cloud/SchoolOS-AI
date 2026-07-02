import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  X,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Users,
  Pencil,
  CalendarDays,
} from 'lucide-react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
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

// ── Avatar styling ────────────────────────────────────────────────────────────

const AVATAR_STYLES = [
  { bg: 'bg-blue-100',   text: 'text-blue-600'   },
  { bg: 'bg-purple-100', text: 'text-purple-600' },
  { bg: 'bg-emerald-100',text: 'text-emerald-600'},
  { bg: 'bg-amber-100',  text: 'text-amber-600'  },
  { bg: 'bg-rose-100',   text: 'text-rose-600'   },
  { bg: 'bg-indigo-100', text: 'text-indigo-600' },
];

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase();
}

function getAvatarStyle(name: string) {
  const hash = [...name].reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return AVATAR_STYLES[hash % AVATAR_STYLES.length];
}

// ── Row types ─────────────────────────────────────────────────────────────────

type RowStatus = 'present' | 'absent' | 'unmarked';

interface Row {
  studentId: string;
  fullName:  string;
  status:    RowStatus;
}

// ── Active (swipeable) card ───────────────────────────────────────────────────

function ActiveCard({
  row,
  index,
  onMark,
}: {
  row:     Row;
  index:   number;
  onMark:  (id: string, status: RowStatus) => void;
}) {
  const x = useMotionValue(0);
  const borderColor = useTransform(
    x,
    [-120, -30, 0, 30, 120],
    ['#EF4444', '#EF4444', '#E5E7EB', '#22C55E', '#22C55E'],
  );
  const background = useTransform(
    x,
    [-120, 0, 120],
    ['rgba(239,68,68,0.06)', 'rgba(255,255,255,1)', 'rgba(34,197,94,0.06)'],
  );
  const { bg, text } = getAvatarStyle(row.fullName);

  function handleDragEnd(_e: unknown, info: { offset: { x: number } }) {
    if (info.offset.x > 90) onMark(row.studentId, 'present');
    else if (info.offset.x < -90) onMark(row.studentId, 'absent');
  }

  return (
    <motion.div
      className="flex items-center gap-3 bg-white rounded-2xl border-2 shadow-sm px-4 py-5 cursor-grab active:cursor-grabbing touch-pan-y"
      style={{ x, borderColor, backgroundColor: background }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.7}
      onDragEnd={handleDragEnd}
    >
      <button
        type="button"
        onClick={() => onMark(row.studentId, 'absent')}
        className="w-11 h-11 rounded-full bg-red-500 text-white flex items-center justify-center shrink-0 shadow-sm shadow-red-500/30 hover:bg-red-600 transition-colors"
        aria-label="Mark absent"
      >
        <X className="w-5 h-5" strokeWidth={3} />
      </button>

      <div className="flex-1 min-w-0 flex flex-col items-center text-center gap-1.5">
        <div className="flex items-center gap-2.5">
          <span className="text-sm text-gray-400 font-mono">{index + 1}</span>
          <div className={cn('w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0', bg, text)}>
            {getInitials(row.fullName)}
          </div>
          <span className="text-lg font-bold text-gray-900 truncate max-w-[160px]">{row.fullName}</span>
        </div>
        <p className="text-xs text-gray-400">Swipe to mark attendance</p>
      </div>

      <button
        type="button"
        onClick={() => onMark(row.studentId, 'present')}
        className="w-11 h-11 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm shadow-emerald-500/30 hover:bg-emerald-600 transition-colors"
        aria-label="Mark present"
      >
        <Check className="w-5 h-5" strokeWidth={3} />
      </button>
    </motion.div>
  );
}

// ── Compact row (marked or awaiting turn) ─────────────────────────────────────

function CompactRow({
  row,
  index,
  editable,
  onUndo,
}: {
  row:      Row;
  index:    number;
  editable: boolean;
  onUndo:   (id: string) => void;
}) {
  const { bg, text } = getAvatarStyle(row.fullName);
  const marked = row.status !== 'unmarked';

  return (
    <button
      type="button"
      disabled={!marked || !editable}
      onClick={() => onUndo(row.studentId)}
      className={cn(
        'w-full flex items-center px-4 py-3 border-b border-gray-50 last:border-0 gap-3 text-left transition-colors',
        marked && editable && 'hover:bg-gray-50',
        !marked && 'cursor-default',
      )}
    >
      <span className="text-sm text-gray-400 w-6 text-right shrink-0 font-mono">{index + 1}</span>
      <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0', bg, text)}>
        {getInitials(row.fullName)}
      </div>
      <p className="flex-1 min-w-0 text-sm font-semibold text-gray-900 truncate">{row.fullName}</p>

      {marked && (
        <div
          className={cn(
            'w-7 h-7 rounded-full flex items-center justify-center shrink-0',
            row.status === 'present' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600',
          )}
        >
          {row.status === 'present' ? <Check className="w-4 h-4" strokeWidth={3} /> : <X className="w-4 h-4" strokeWidth={3} />}
        </div>
      )}
    </button>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className="flex items-center px-4 py-3 border-b border-gray-50 gap-3 animate-pulse">
      <div className="w-6 h-4 bg-gray-100 rounded shrink-0" />
      <div className="w-8 h-8 rounded-full bg-gray-100 shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="h-4 bg-gray-100 rounded w-32" />
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
  onEdit,
  onViewStudents,
  onDashboard,
}: {
  cls:          string;
  section:      string;
  date:         string;
  presentCount: number;
  absentCount:  number;
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
      students.map((s) => {
        const existing = existMap.get(s._id);
        const status: RowStatus = existing === 'present' ? 'present' : existing === 'absent' ? 'absent' : 'unmarked';
        return { studentId: s._id, fullName: s.fullName, status };
      }),
    );
  }, [students.length, existingAttendance, date]);

  const alreadySubmitted =
    !attendanceLoading && (existingAttendance ?? []).length > 0 && !editMode;

  const editable = !alreadySubmitted || editMode;

  const presentCount = rows.filter((r) => r.status === 'present').length;
  const absentCount  = rows.filter((r) => r.status === 'absent').length;
  const unmarkedCount = rows.filter((r) => r.status === 'unmarked').length;
  const activeIndex = rows.findIndex((r) => r.status === 'unmarked');

  function markStatus(studentId: string, status: RowStatus) {
    setRows((prev) => prev.map((r) => r.studentId === studentId ? { ...r, status } : r));
  }

  function undoStatus(studentId: string) {
    setRows((prev) => prev.map((r) => r.studentId === studentId ? { ...r, status: 'unmarked' } : r));
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
      records: rows
        .filter((r): r is Row & { status: AttendanceStatus } => r.status !== 'unmarked')
        .map((r) => ({ studentId: r.studentId, status: r.status })),
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
          <div className="mx-4 mt-4 h-16 bg-white rounded-2xl border border-gray-100 animate-pulse" />
          <div className="mx-4 mt-4 h-24 bg-white rounded-2xl border border-gray-100 animate-pulse" />
          <div className="mx-4 mt-4 bg-white rounded-2xl border border-gray-100 overflow-hidden">
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

          {/* Swipe hint legend */}
          {editable && rows.length > 0 && (
            <div className="mx-4 mt-4 bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 flex items-center justify-center gap-4">
              <div className="flex items-center gap-2">
                <ArrowRight className="w-5 h-5 text-emerald-500" />
                <div className="text-xs font-semibold text-emerald-600">Swipe Right<br /><span className="text-emerald-500">Present</span></div>
              </div>
              <div className="w-px h-8 bg-gray-100" />
              <div className="flex items-center gap-2">
                <ArrowLeft className="w-5 h-5 text-red-400" />
                <div className="text-xs font-semibold text-red-500">Swipe Left<br /><span className="text-red-400">Absent</span></div>
              </div>
            </div>
          )}

          {/* Mark All Present */}
          {editable && rows.length > 0 && (
            <div className="px-4 mt-4">
              <button
                type="button"
                onClick={markAllPresent}
                className="w-full h-11 bg-[#5B5CEB]/10 hover:bg-[#5B5CEB]/20 text-[#5B5CEB] font-semibold rounded-xl text-sm transition-colors"
              >
                Mark All Present
              </button>
            </div>
          )}

          {/* Active swipeable card */}
          {editable && activeIndex !== -1 && (
            <div className="px-4 mt-4">
              <ActiveCard
                key={rows[activeIndex].studentId}
                row={rows[activeIndex]}
                index={activeIndex}
                onMark={markStatus}
              />
            </div>
          )}

          {/* Student list */}
          <div className="mx-4 mt-4 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-2">
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
              rows
                .filter((_, i) => i !== activeIndex || !editable)
                .map((row) => (
                  <CompactRow
                    key={row.studentId}
                    row={row}
                    index={rows.findIndex((r) => r.studentId === row.studentId)}
                    editable={editable}
                    onUndo={undoStatus}
                  />
                ))
            )}
          </div>

          {/* Stat counters */}
          <div className="flex gap-3 px-4 pb-4 justify-center">
            <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center max-w-[110px]">
              <p className="text-2xl font-bold text-gray-900">{rows.length}</p>
              <p className="text-xs text-gray-500 font-semibold mt-1">Total Students</p>
            </div>
            <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center max-w-[110px]">
              <p className="text-2xl font-bold text-emerald-500">{presentCount}</p>
              <p className="text-xs text-gray-500 font-semibold mt-1">Present</p>
            </div>
            <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center max-w-[110px]">
              <p className="text-2xl font-bold text-red-500">{absentCount}</p>
              <p className="text-xs text-gray-500 font-semibold mt-1">Absent</p>
            </div>
          </div>

          {/* Save Attendance button */}
          {editable && rows.length > 0 && (
            <div className="sticky bottom-20 lg:bottom-0 px-4 py-4 bg-[#F8FAFC] border-t border-gray-200/60">
              <button
                type="button"
                onClick={handleSave}
                disabled={isPending || unmarkedCount > 0}
                className="w-full h-14 bg-[#5B5CEB] hover:bg-[#4a4bd9] disabled:opacity-60 text-white font-bold rounded-2xl text-base flex items-center justify-center gap-2 transition-colors shadow-lg shadow-[#5B5CEB]/25"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Saving…
                  </>
                ) : unmarkedCount > 0 ? (
                  `Mark ${unmarkedCount} more student${unmarkedCount !== 1 ? 's' : ''}`
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
