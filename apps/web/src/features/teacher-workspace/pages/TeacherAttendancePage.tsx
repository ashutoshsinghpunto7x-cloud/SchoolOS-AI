import { useParams, useNavigate, useBlocker } from 'react-router-dom';
import {
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Users,
  Pencil,
  CalendarDays,
  Phone,
  GripVertical,
} from 'lucide-react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { toast } from 'sonner';
import { useStudentsPaginated } from '@/features/students/hooks/useStudents';
import { useClassAttendance, useBulkMarkAttendance } from '@/features/attendance/hooks/useAttendance';
import { useInvalidateTeacherWorkspace } from '../hooks/useTeacherWorkspace';
// WhatsApp absent-notification sending is temporarily disabled — see AbsenteeOutreach
// below. Re-import when re-enabling: `import { useAbsenteeReminder } from '../hooks/useAbsenteeReminder';`
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
  { bg: 'bg-[#10B981]/10',  text: 'text-[#0B3D2E]' },
  { bg: 'bg-gray-100',      text: 'text-gray-600'  },
  { bg: 'bg-[#10B981]/15',  text: 'text-emerald-700' },
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
  studentId:  string;
  fullName:   string;
  rollNumber?: string;
  status:     RowStatus;
}

// ── Active (swipeable) card ───────────────────────────────────────────────────

function ActiveCard({
  row,
  onMark,
}: {
  row:     Row;
  onMark:  (id: string, status: RowStatus) => void;
}) {
  const x = useMotionValue(0);
  // Neutral border/background feedback as the card is dragged — reacts to the
  // swipe without color-coding the direction (present vs. absent).
  const borderColor = useTransform(
    x,
    [-90, -20, 0, 20, 90],
    ['#D1D5DB', '#D1D5DB', 'rgba(0,0,0,0)', '#D1D5DB', '#D1D5DB'],
    { clamp: true },
  );
  const background = useTransform(
    x,
    [-90, 0, 90],
    ['rgba(0,0,0,0.02)', 'rgba(255,255,255,1)', 'rgba(0,0,0,0.02)'],
    { clamp: true },
  );
  const { bg, text } = getAvatarStyle(row.fullName);

  function handleDragEnd(_e: unknown, info: { offset: { x: number } }) {
    if (info.offset.x > 90) onMark(row.studentId, 'present');
    else if (info.offset.x < -90) onMark(row.studentId, 'absent');
  }

  return (
    <div className="rounded-2xl border border-gray-200 p-[2.5px] shadow-sm">
      <motion.div
        className="flex items-center gap-3 bg-white rounded-[13px] border-2 px-4 py-4 cursor-grab active:cursor-grabbing touch-pan-y"
        style={{ x, borderColor, backgroundColor: background }}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.7}
        onDragEnd={handleDragEnd}
      >
        <div className={cn('w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0', bg, text)}>
          {getInitials(row.fullName)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-base font-bold text-gray-900 truncate">{row.fullName}</p>
          {row.rollNumber && (
            <p className="text-xs text-gray-400 mt-0.5">Roll No: {row.rollNumber}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-0.5 shrink-0">
          <GripVertical className="w-4 h-4 text-gray-300" />
          <span className="text-[9px] font-bold text-gray-400 tracking-wide">SWIPE TO MARK</span>
        </div>
      </motion.div>
    </div>
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
        'w-full flex items-center px-4 py-3 gap-3 text-left transition-colors',
        marked && 'bg-gray-50/60',
        marked && editable && 'hover:brightness-[0.97]',
        !marked && 'cursor-default',
      )}
    >
      <span className="text-sm text-gray-400 w-6 text-right shrink-0 font-mono">{index + 1}</span>
      <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0', bg, text)}>
        {getInitials(row.fullName)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate">{row.fullName}</p>
        {row.rollNumber && <p className="text-[11px] text-gray-400">Roll No: {row.rollNumber}</p>}
      </div>

      {marked ? (
        <span className={cn('text-xs font-bold shrink-0', row.status === 'present' ? 'text-emerald-600' : 'text-red-500')}>
          {row.status === 'present' ? 'Present' : 'Absent'}
        </span>
      ) : (
        <span className="w-2 h-2 rounded-full bg-gray-200 shrink-0" aria-hidden="true" />
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

// ── Absentee outreach (call now; WhatsApp reminder disabled for now) ──────────
//
// The WhatsApp "send reminder" feature is intentionally disabled below — just
// the absent students' names + a call-parent shortcut are shown. To re-enable
// WhatsApp sending later: restore the commented-out state/handler/JSX further
// down, and re-add `import { useAbsenteeReminder } from '../hooks/useAbsenteeReminder';`
// at the top of this file.

interface Absentee {
  studentId: string;
  fullName: string;
  parentPhone?: string;
}

// const defaultReminderTemplate = (date: string) =>
//   `Hi, this is to inform you that {name} was marked absent today, ${formatDisplayDate(date)}. Please contact the school if this is unexpected.`;

const telHref = (phone?: string) => {
  if (!phone) return undefined;
  const digits = phone.replace(/\D/g, '');
  return digits.length === 10 ? `tel:+91${digits}` : `tel:${digits}`;
};

function AbsenteeOutreach({ absentees, date }: { absentees: Absentee[]; date: string }) {
  // const [selected, setSelected] = useState<Set<string>>(new Set(absentees.map((a) => a.studentId)));
  // const [template, setTemplate] = useState(defaultReminderTemplate(date));
  // const { sendReminders, isSending, sentCount, failedCount } = useAbsenteeReminder();
  // const [done, setDone] = useState(false);
  //
  // function toggle(studentId: string) {
  //   setSelected((prev) => {
  //     const next = new Set(prev);
  //     if (next.has(studentId)) next.delete(studentId);
  //     else next.add(studentId);
  //     return next;
  //   });
  // }
  //
  // async function handleSend() {
  //   const targets = absentees.filter((a) => selected.has(a.studentId));
  //   if (!targets.length) return;
  //   setDone(false);
  //   await sendReminders(
  //     targets.map((t) => ({ studentId: t.studentId, studentName: t.fullName })),
  //     (name) => template.replace('{name}', name),
  //   );
  //   setDone(true);
  // }

  return (
    <div className="w-full max-w-sm mt-6 bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-left">
      <p className="font-bold text-gray-900">Absent Today ({absentees.length})</p>
      <p className="text-xs text-gray-400 mb-3">{formatDisplayDate(date)}</p>

      <div className="space-y-2">
        {absentees.map((a) => {
          const href = telHref(a.parentPhone);
          return (
            <div key={a.studentId} className="flex items-center gap-3 py-1.5">
              <p className="flex-1 min-w-0 text-sm font-semibold text-gray-800 truncate">{a.fullName}</p>
              {href ? (
                <a
                  href={href}
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors shrink-0"
                  title="Call parent"
                >
                  <Phone className="w-4 h-4" />
                </a>
              ) : (
                <span className="text-xs text-gray-300 shrink-0">No phone</span>
              )}
            </div>
          );
        })}
      </div>

      {/* ── WhatsApp reminder — disabled for now, restore when ready ──────────
      <label className="block text-xs font-semibold text-gray-600 mb-1.5 mt-4">WhatsApp reminder message</label>
      <textarea
        value={template}
        onChange={(e) => setTemplate(e.target.value)}
        rows={3}
        className="w-full px-3 py-2 mb-3 rounded-xl border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#10B981]/30"
      />
      <p className="text-[11px] text-gray-400 mb-3">Use <span className="font-mono">{'{name}'}</span> to insert each student's name.</p>

      {done && (
        <div className="text-xs font-medium mb-3 px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700">
          Sent to {sentCount} parent{sentCount !== 1 ? 's' : ''}{failedCount > 0 ? ` · ${failedCount} failed` : ''}
        </div>
      )}

      <button
        type="button"
        onClick={handleSend}
        disabled={isSending || selected.size === 0}
        className="w-full h-11 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-semibold rounded-xl text-sm flex items-center justify-center gap-2 transition-colors"
      >
        {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageCircle className="w-4 h-4" />}
        {isSending ? `Sending… (${sentCount}/${selected.size})` : `Send WhatsApp Reminder (${selected.size})`}
      </button>
      ── */}
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
  absentees,
  onEdit,
  onViewStudents,
  onDashboard,
}: {
  cls:          string;
  section:      string;
  date:         string;
  presentCount: number;
  absentCount:  number;
  absentees:    Absentee[];
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
            <p className="text-2xl font-bold text-emerald-600">{presentCount}</p>
            <p className="text-xs text-gray-400 font-medium mt-0.5">Present</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-red-500">{absentCount}</p>
            <p className="text-xs text-gray-400 font-medium mt-0.5">Absent</p>
          </div>
        </div>
      </div>

      {absentees.length > 0 && <AbsenteeOutreach absentees={absentees} date={date} />}

      {/* Actions */}
      <div className="flex flex-col gap-3 mt-8 w-full max-w-sm">
        <button
          onClick={onViewStudents}
          className="h-12 bg-[#0B3D2E] text-white font-semibold rounded-xl text-sm hover:bg-[#08251B] transition-colors"
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
          className="text-sm text-[#0B3D2E] font-semibold py-1 hover:underline transition-colors"
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
  // Tracks swipes made since the page loaded / since the last successful save —
  // a teacher swiping through a class on their phone is exactly who's likely to
  // hit an accidental back-gesture and lose everything with no warning.
  const [dirty,     setDirty]     = useState(false);

  // Warn before closing/refreshing the tab with unsaved swipes.
  useEffect(() => {
    if (!dirty) return;
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue = '';
    }
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [dirty]);

  // Warn before in-app navigation away (sidebar links, bottom nav, browser
  // back) with unsaved swipes — the leading cause of silently lost attendance.
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirty && currentLocation.pathname !== nextLocation.pathname,
  );

  useEffect(() => {
    if (blocker.state !== 'blocked') return;
    const leave = window.confirm(
      'You have unsaved attendance changes. Leave without saving?',
    );
    if (leave) blocker.proceed();
    else blocker.reset();
  }, [blocker]);

  const { data: studentsData, isLoading: studentsLoading, isError: studentsError } = useStudentsPaginated({
    class: cls, section, limit: 300, status: 'active',
  });

  const { data: existingAttendance, isLoading: attendanceLoading, isError: attendanceError } =
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
        return { studentId: s._id, fullName: s.fullName, rollNumber: s.rollNumber, status };
      }),
    );
    setDirty(false); // fresh sync from the server, not an unsaved user edit
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
    setDirty(true);
  }

  function undoStatus(studentId: string) {
    setRows((prev) => prev.map((r) => r.studentId === studentId ? { ...r, status: 'unmarked' } : r));
    setDirty(true);
  }

  function markAllPresent() {
    setRows((prev) => prev.map((r) => ({ ...r, status: 'present' })));
    setDirty(true);
  }

  async function handleSave() {
    if (!cls || !section) return;
    try {
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
      setDirty(false);
    } catch (err) {
      // Without this, a dropped connection or a 403/500 would fail silently —
      // the teacher would see the button reset and could walk away believing
      // attendance was saved when it wasn't. Nothing here is marked as saved,
      // so it's always safe to just tap Save again.
      toast.error('Could not save attendance', {
        description: err instanceof Error ? err.message : 'Check your connection and try again.',
      });
    }
  }

  const isLoading = studentsLoading || attendanceLoading;
  // Surfaced separately from "no students in this class" — without this, a
  // failed fetch (dropped connection, 500) would silently render as an empty
  // class instead of a clear, retryable error.
  const isDataError = studentsError || attendanceError;

  const studentsById = new Map(students.map((s) => [s._id, s]));
  const absentees: Absentee[] = rows
    .filter((r) => r.status === 'absent')
    .map((r) => ({
      studentId: r.studentId,
      fullName: r.fullName,
      parentPhone: studentsById.get(r.studentId)?.parentPhone,
    }));

  // ── Submitted screen ─────────────────────────────────────────────────────

  if (submitted && !editMode) {
    return (
      <SubmittedScreen
        cls={cls!}
        section={section!}
        date={date}
        presentCount={presentCount}
        absentCount={absentCount}
        absentees={absentees}
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
            <CalendarDays className="w-4 h-4 text-[#0B3D2E]" />
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
      ) : isDataError ? (
        <div className="mx-4 mt-4 bg-red-50 border border-red-100 rounded-2xl p-5 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-700">Couldn't load this class</p>
            <p className="text-xs text-red-500 mt-0.5">Check your connection and try again.</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-3 h-9 px-4 bg-white border border-red-200 text-red-600 rounded-xl text-xs font-semibold hover:bg-red-50 transition-colors"
            >
              Reload
            </button>
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

          {/* Stat counters — Present / Absent / Remaining, right under the header */}
          <div className="flex gap-3 px-4 mt-4">
            <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm p-3 text-center">
              <p className="text-xl font-bold text-emerald-600">{presentCount}</p>
              <p className="text-[11px] text-gray-500 font-semibold mt-0.5">Present</p>
            </div>
            <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm p-3 text-center">
              <p className="text-xl font-bold text-red-500">{absentCount}</p>
              <p className="text-[11px] text-gray-500 font-semibold mt-0.5">Absent</p>
            </div>
            <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm p-3 text-center">
              <p className="text-xl font-bold text-gray-900">{unmarkedCount}</p>
              <p className="text-[11px] text-gray-500 font-semibold mt-0.5">Remaining</p>
            </div>
          </div>

          {/* Mark All Present */}
          {editable && rows.length > 0 && (
            <div className="px-4 mt-4">
              <button
                type="button"
                onClick={markAllPresent}
                className="w-full h-11 bg-[#10B981]/10 hover:bg-[#10B981]/20 text-[#0B3D2E] font-semibold rounded-xl text-sm transition-colors"
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
                onMark={markStatus}
              />
            </div>
          )}

          {/* Student list */}
          <div className="mx-4 mt-4 bg-white rounded-2xl shadow-sm overflow-hidden divide-y divide-gray-50">
            {rows.length === 0 ? (
              <div className="py-12 text-center">
                <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-500">No students in this class</p>
                <button
                  onClick={() => navigate(`/teacher/classes/${cls}/${section}/add-student`)}
                  className="mt-4 h-10 px-5 bg-[#0B3D2E] text-white rounded-xl text-sm font-semibold hover:bg-[#08251B] transition-colors"
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

          {/* Absent Students Summary — live preview while marking, mirrors the reference design */}
          {rows.length > 0 && (
            <div className="mx-4 mt-4 mb-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                Absent Students Summary
              </p>
              {absentCount === 0 ? (
                <p className="text-sm text-gray-400">No students marked absent yet.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {rows.filter((r) => r.status === 'absent').map((r) => (
                    <span
                      key={r.studentId}
                      className="text-xs font-semibold text-red-600 bg-red-50 border border-red-100 rounded-full px-2.5 py-1"
                    >
                      {r.fullName}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Save Attendance button — allows partial saves. A teacher marking a
              big class may get interrupted; blocking Save until every single
              student is swiped would force them to redo everything later
              instead of saving progress and finishing when they get back. */}
          {editable && rows.length > 0 && (
            <div className="sticky bottom-20 lg:bottom-0 px-4 py-4 bg-[#F8FAFC] border-t border-gray-200/60 space-y-2">
              {/* Completion progress bar */}
              <div className="flex items-center justify-between text-xs font-semibold text-gray-500">
                <span>Completion</span>
                <span>{Math.round(((presentCount + absentCount) / rows.length) * 100)}%</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#0B3D2E] rounded-full transition-all duration-300"
                  style={{ width: `${Math.round(((presentCount + absentCount) / rows.length) * 100)}%` }}
                />
              </div>

              {unmarkedCount > 0 && (
                <p className="text-xs text-center text-amber-600 font-medium">
                  {unmarkedCount} student{unmarkedCount !== 1 ? 's' : ''} not yet marked — you can save now and finish later.
                </p>
              )}
              <button
                type="button"
                onClick={handleSave}
                disabled={isPending}
                className="w-full h-14 bg-[#0B3D2E] hover:bg-[#08251B] disabled:opacity-60 text-white font-bold rounded-2xl text-base flex items-center justify-center gap-2 transition-colors shadow-lg shadow-[#0B3D2E]/25"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Saving…
                  </>
                ) : unmarkedCount > 0 ? (
                  `Save (${unmarkedCount} unmarked)`
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
