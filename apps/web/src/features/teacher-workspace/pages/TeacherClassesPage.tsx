import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  BookOpen,
  CheckCircle2,
  Clock,
  Users,
  ChevronRight,
  UserPlus,
  CalendarCheck,
  AlertCircle,
  GraduationCap,
  Plus,
  X,
  Loader2,
  Pencil,
  Trash2,
} from 'lucide-react';
import { useTeacherWorkspace, useUpsertOwnTimetableEntry, useRemoveOwnTimetableEntry } from '../hooks/useTeacherWorkspace';
import { usePeriodSlots, useCreatePeriodSlot } from '@/features/timetable/hooks/useTimetable';
import { cn } from '@/lib/utils';
import type { TeacherWeekEntry } from '@schoolos/types';

const DAYS = [
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
];

interface ClassEntry {
  cls: string;
  section: string;
  subjects: string[];
  todayStatus: 'marked' | 'pending' | 'none';
  totalStudents: number;
  attendanceCount: number;
  /** Only the class teacher (assigned by admin/principal) can mark attendance
   *  or add students for a class. Other classes a teacher merely teaches a
   *  subject in are record-only — view students, but no attendance-taking. */
  isClassTeacher: boolean;
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 animate-pulse">
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 bg-gray-100 rounded-xl shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-100 rounded w-24" />
          <div className="h-3 bg-gray-100 rounded w-32" />
          <div className="h-3 bg-gray-100 rounded w-20" />
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Add/Edit period entry form (shared by both modals)                        */
/* ────────────────────────────────────────────────────────────────────────── */

function AddEntryForm({
  initialClass,
  initialSection,
  lockClassSection,
  onDone,
}: {
  initialClass?: string;
  initialSection?: string;
  lockClassSection?: boolean;
  onDone: () => void;
}) {
  const { data: periodSlots, isLoading: loadingSlots } = usePeriodSlots();
  const upsertEntry = useUpsertOwnTimetableEntry();
  const createPeriodSlot = useCreatePeriodSlot();

  const [cls, setCls] = useState(initialClass ?? '');
  const [section, setSection] = useState(initialSection ?? '');
  const [dayOfWeek, setDayOfWeek] = useState<number>(1);
  const [slotId, setSlotId] = useState('');
  const [subjectName, setSubjectName] = useState('');
  const [roomNumber, setRoomNumber] = useState('');

  const [showAddPeriod, setShowAddPeriod] = useState(false);
  const [periodLabel, setPeriodLabel] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');

  const sortedSlots = useMemo(
    () => (periodSlots ? [...periodSlots].sort((a, b) => a.orderIndex - b.orderIndex) : []),
    [periodSlots],
  );

  async function handleAddPeriod() {
    if (!periodLabel.trim() || !periodStart || !periodEnd) {
      toast.error('Fill in the period label, start time, and end time');
      return;
    }
    try {
      const nextOrderIndex = sortedSlots.length > 0 ? sortedSlots[sortedSlots.length - 1].orderIndex + 1 : 0;
      const created = await createPeriodSlot.mutateAsync({
        name: periodLabel.trim(),
        orderIndex: nextOrderIndex,
        startTime: periodStart,
        endTime: periodEnd,
      });
      toast.success('Period added');
      setSlotId(created._id);
      setShowAddPeriod(false);
      setPeriodLabel('');
      setPeriodStart('');
      setPeriodEnd('');
    } catch (err) {
      toast.error('Failed to add period', {
        description: err instanceof Error ? err.message : 'Please try again.',
      });
    }
  }

  async function handleSubmit() {
    if (!cls.trim() || !section.trim() || !slotId || !subjectName.trim()) {
      toast.error('Please fill in class, section, period, and subject');
      return;
    }
    try {
      await upsertEntry.mutateAsync({
        class: cls.trim(),
        section: section.trim(),
        dayOfWeek,
        slotId,
        subjectName: subjectName.trim(),
        roomNumber: roomNumber.trim() || undefined,
      });
      toast.success('Class added to your timetable');
      onDone();
    } catch (err) {
      toast.error('Failed to save', {
        description: err instanceof Error ? err.message : 'Please try again.',
      });
    }
  }

  const isSaving = upsertEntry.isPending;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1 block">Class</label>
          <input
            type="text"
            value={cls}
            onChange={(e) => setCls(e.target.value)}
            disabled={lockClassSection}
            placeholder="e.g. 6"
            className="w-full h-10 px-3 rounded-xl border border-gray-200 text-sm disabled:bg-gray-50 disabled:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#0B3D2E]/20 focus:border-[#0B3D2E]"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1 block">Section</label>
          <input
            type="text"
            value={section}
            onChange={(e) => setSection(e.target.value)}
            disabled={lockClassSection}
            placeholder="e.g. A"
            className="w-full h-10 px-3 rounded-xl border border-gray-200 text-sm disabled:bg-gray-50 disabled:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#0B3D2E]/20 focus:border-[#0B3D2E]"
          />
        </div>
      </div>

      <div>
        <label className="text-xs font-semibold text-gray-500 mb-1 block">Day of week</label>
        <div className="flex gap-1.5 flex-wrap">
          {DAYS.map((d) => (
            <button
              key={d.value}
              type="button"
              onClick={() => setDayOfWeek(d.value)}
              className={cn(
                'px-3 h-9 rounded-xl text-sm font-semibold transition-colors',
                dayOfWeek === d.value
                  ? 'bg-[#0B3D2E] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
              )}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs font-semibold text-gray-500 mb-1 block">Period slot</label>
        {loadingSlots ? (
          <div className="h-10 flex items-center text-sm text-gray-400">Loading periods…</div>
        ) : (
          <select
            value={slotId}
            onChange={(e) => setSlotId(e.target.value)}
            className="w-full h-10 px-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B3D2E]/20 focus:border-[#0B3D2E]"
          >
            <option value="">Select a period…</option>
            {sortedSlots.map((slot) => (
              <option key={slot._id} value={slot._id}>
                {slot.name}: {slot.startTime}–{slot.endTime}
              </option>
            ))}
          </select>
        )}

        {!showAddPeriod ? (
          <button
            type="button"
            onClick={() => setShowAddPeriod(true)}
            className="mt-2 text-xs font-semibold text-[#0B3D2E] hover:underline flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            Add new period
          </button>
        ) : (
          <div className="mt-2 p-3 bg-[#10B981]/10 rounded-xl space-y-2">
            <input
              type="text"
              value={periodLabel}
              onChange={(e) => setPeriodLabel(e.target.value)}
              placeholder="Label, e.g. Period 4"
              className="w-full h-9 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B3D2E]/20 focus:border-[#0B3D2E]"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="time"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B3D2E]/20 focus:border-[#0B3D2E]"
              />
              <input
                type="time"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B3D2E]/20 focus:border-[#0B3D2E]"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleAddPeriod}
                disabled={createPeriodSlot.isPending}
                className="flex-1 h-9 bg-[#0B3D2E] hover:bg-[#08251B] text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-60"
              >
                {createPeriodSlot.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Save period'}
              </button>
              <button
                type="button"
                onClick={() => setShowAddPeriod(false)}
                className="h-9 px-3 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-xs font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      <div>
        <label className="text-xs font-semibold text-gray-500 mb-1 block">Subject name</label>
        <input
          type="text"
          value={subjectName}
          onChange={(e) => setSubjectName(e.target.value)}
          placeholder="e.g. Mathematics"
          className="w-full h-10 px-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B3D2E]/20 focus:border-[#0B3D2E]"
        />
      </div>

      <div>
        <label className="text-xs font-semibold text-gray-500 mb-1 block">Room number (optional)</label>
        <input
          type="text"
          value={roomNumber}
          onChange={(e) => setRoomNumber(e.target.value)}
          placeholder="e.g. 204"
          className="w-full h-10 px-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B3D2E]/20 focus:border-[#0B3D2E]"
        />
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={isSaving}
        className="w-full h-11 bg-[#0B3D2E] hover:bg-[#08251B] text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 disabled:opacity-60"
      >
        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save class'}
      </button>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Add Class modal                                                           */
/* ────────────────────────────────────────────────────────────────────────── */

function AddClassModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white flex items-center justify-between px-5 py-4 border-b border-gray-100 z-10">
          <h3 className="text-base font-bold text-gray-900">Add Class</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100" type="button">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <div className="p-5">
          <AddEntryForm onDone={onClose} />
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Edit Class modal                                                          */
/* ────────────────────────────────────────────────────────────────────────── */

function EditClassModal({
  cls,
  section,
  entries,
  onClose,
}: {
  cls: string;
  section: string;
  entries: TeacherWeekEntry[];
  onClose: () => void;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const removeEntry = useRemoveOwnTimetableEntry();
  const { data: periodSlots } = usePeriodSlots();

  const slotNameById = useMemo(() => {
    const map = new Map<string, string>();
    (periodSlots ?? []).forEach((s) => map.set(s._id, s.name));
    return map;
  }, [periodSlots]);

  const dayLabel = (d: number) => DAYS.find((x) => x.value === d)?.label ?? `Day ${d}`;

  async function handleRemove(entry: TeacherWeekEntry) {
    try {
      await removeEntry.mutateAsync({
        class: cls,
        section,
        dayOfWeek: entry.dayOfWeek,
        slotId: entry.slotId,
      });
      toast.success('Period removed');
    } catch (err) {
      toast.error('Failed to remove period', {
        description: err instanceof Error ? err.message : 'Please try again.',
      });
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white flex items-center justify-between px-5 py-4 border-b border-gray-100 z-10">
          <div>
            <h3 className="text-base font-bold text-gray-900">
              Edit Class {cls}
              {section && ` – ${section}`}
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">Manage the periods for this class</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100" type="button">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {!showAdd && (
            <>
              <div className="space-y-2">
                {entries.length === 0 && (
                  <p className="text-sm text-gray-400">No periods scheduled yet for this class.</p>
                )}
                {entries.map((entry) => (
                  <div
                    key={`${entry.dayOfWeek}-${entry.slotId}`}
                    className="flex items-center justify-between px-3 py-2.5 bg-gray-50 rounded-xl border border-gray-100"
                  >
                    <div>
                      <p className="text-sm font-semibold text-gray-800">
                        {dayLabel(entry.dayOfWeek)} · {entry.slotName || slotNameById.get(entry.slotId) || 'Period'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {entry.subjectName}
                        {entry.roomNumber ? ` · Room ${entry.roomNumber}` : ''}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemove(entry)}
                      disabled={removeEntry.isPending}
                      className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-50 hover:bg-red-100 text-red-500 disabled:opacity-60"
                      title="Remove period"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setShowAdd(true)}
                className="w-full h-10 bg-[#10B981]/10 hover:bg-[#10B981]/20 text-[#0B3D2E] rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Add another period
              </button>
            </>
          )}

          {showAdd && (
            <AddEntryForm
              initialClass={cls}
              initialSection={section}
              lockClassSection
              onDone={() => setShowAdd(false)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Class card                                                                */
/* ────────────────────────────────────────────────────────────────────────── */

function ClassCard({
  entry,
  onAttendance,
  onViewStudents,
  onAddStudent,
  onEdit,
}: {
  entry: ClassEntry;
  onAttendance: () => void;
  onViewStudents: () => void;
  onAddStudent: () => void;
  onEdit: () => void;
}) {
  const isPending = entry.todayStatus === 'pending';
  const isMarked = entry.todayStatus === 'marked';
  const noClassToday = entry.todayStatus === 'none';

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Card header */}
      <div
        className={cn(
          'px-4 py-3 border-b',
          isPending
            ? 'bg-amber-50 border-amber-100/60'
            : isMarked
            ? 'bg-emerald-50 border-emerald-100/60'
            : 'bg-gray-50 border-gray-100',
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                isPending ? 'bg-amber-100' : isMarked ? 'bg-emerald-100' : 'bg-gray-100',
              )}
            >
              <GraduationCap
                className={cn(
                  'w-5 h-5',
                  isPending ? 'text-amber-600' : isMarked ? 'text-emerald-600' : 'text-gray-500',
                )}
                strokeWidth={2}
              />
            </div>
            <div>
              <p className="text-base font-bold text-gray-900">
                Class {entry.cls}
                {entry.section && ` – ${entry.section}`}
              </p>
              <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                {entry.subjects.join(', ') || 'No subjects'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {!noClassToday && (
              <div
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold',
                  isPending ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700',
                )}
              >
                {isPending ? (
                  <>
                    <Clock className="w-3 h-3" />
                    Pending
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3 h-3" />
                    Done
                  </>
                )}
              </div>
            )}
            <button
              onClick={onEdit}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-white hover:bg-gray-100 text-gray-500 border border-gray-200"
              title="Edit class periods"
              type="button"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Card body */}
      <div className="px-4 py-3">
        {isMarked && entry.totalStudents > 0 && (
          <div className="flex items-center gap-2 mb-3 text-sm text-gray-500">
            <Users className="w-3.5 h-3.5 text-gray-400" />
            <span>
              <span className="font-semibold text-gray-700">{entry.attendanceCount}</span>{' '}
              of {entry.totalStudents} students marked today
            </span>
          </div>
        )}
        {isPending && entry.totalStudents > 0 && (
          <div className="flex items-center gap-2 mb-3 text-sm text-gray-500">
            <Users className="w-3.5 h-3.5 text-gray-400" />
            <span>{entry.totalStudents} students enrolled</span>
          </div>
        )}
        {noClassToday && (
          <p className="text-xs text-gray-400 mb-3">No class scheduled today</p>
        )}
        {!entry.isClassTeacher && (
          <p className="text-xs text-gray-400 mb-3 flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-gray-300" />
            Record only — you teach a subject here, but aren't the class teacher
          </p>
        )}

        {/* Action buttons — Mark Attendance / Add Student are class-teacher-only.
            A class teacher is assigned by admin/principal, never self-service;
            other classes a teacher merely teaches a subject in are view-only. */}
        {entry.isClassTeacher ? (
          <div className="flex gap-2">
            {isMarked ? (
              <button
                onClick={onAttendance}
                className="flex-1 h-10 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <CheckCircle2 className="w-4 h-4" />
                View Attendance
              </button>
            ) : (
              // Covers both "pending" (scheduled today, not yet marked) and "none"
              // (not resolved as scheduled today — e.g. incomplete timetable data,
              // or marking for a date other than today). Attendance can always be
              // marked directly; the sheet's own date nav handles any date.
              <button
                onClick={onAttendance}
                className="flex-1 h-10 bg-[#0B3D2E] hover:bg-[#08251B] text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <CalendarCheck className="w-4 h-4" />
                Mark Attendance
              </button>
            )}

            <button
              onClick={onViewStudents}
              className="h-10 px-3 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-sm font-semibold flex items-center gap-1.5 transition-colors"
              title="View students"
            >
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Students</span>
            </button>

            <button
              onClick={onAddStudent}
              className="h-10 px-3 bg-[#10B981]/10 hover:bg-[#10B981]/20 text-[#0B3D2E] rounded-xl text-sm font-semibold flex items-center gap-1.5 transition-colors"
              title="Add student"
            >
              <UserPlus className="w-4 h-4" />
              <span className="hidden sm:inline">Add</span>
            </button>

            <button
              onClick={onViewStudents}
              className="h-10 w-10 bg-gray-50 hover:bg-gray-100 text-gray-500 rounded-xl flex items-center justify-center transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={onViewStudents}
            className="w-full h-10 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors"
          >
            <Users className="w-4 h-4" />
            View Students
          </button>
        )}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Page                                                                       */
/* ────────────────────────────────────────────────────────────────────────── */

export function TeacherClassesPage() {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useTeacherWorkspace();
  const [showAddClass, setShowAddClass] = useState(false);
  const [editingClass, setEditingClass] = useState<{ cls: string; section: string } | null>(null);

  // Derive unique class-section pairs from weekSchedule
  const classes = useMemo<ClassEntry[]>(() => {
    if (!data) return [];

    const classTeacherKeys = new Set(
      (data.classTeacherOf ?? []).map((c) => `${c.class}||${c.section}`),
    );

    // weekSchedule is pre-grouped: { dayOfWeek, entries: TeacherWeekEntry[] }[]
    const seen = new Map<string, ClassEntry>();
    for (const dayGroup of data.weekSchedule) {
      for (const entry of dayGroup.entries) {
        const key = `${entry.class}||${entry.section}`;
        if (!seen.has(key)) {
          seen.set(key, {
            cls: entry.class,
            section: entry.section,
            subjects: [],
            todayStatus: 'none',
            totalStudents: 0,
            attendanceCount: 0,
            isClassTeacher: classTeacherKeys.has(key),
          });
        }
        const item = seen.get(key)!;
        if (entry.subjectName && !item.subjects.includes(entry.subjectName)) {
          item.subjects.push(entry.subjectName);
        }
      }
    }

    // Overlay today's attendance status
    for (const tc of data.todayClasses) {
      const key = `${tc.class}||${tc.section}`;
      if (seen.has(key)) {
        const item = seen.get(key)!;
        item.todayStatus = tc.attendanceMarked ? 'marked' : 'pending';
        item.totalStudents = tc.totalStudents;
        item.attendanceCount = tc.attendanceCount;
        if (tc.subjectName && !item.subjects.includes(tc.subjectName)) {
          item.subjects.unshift(tc.subjectName);
        }
      } else {
        seen.set(key, {
          cls: tc.class,
          section: tc.section,
          subjects: tc.subjectName ? [tc.subjectName] : [],
          todayStatus: tc.attendanceMarked ? 'marked' : 'pending',
          totalStudents: tc.totalStudents,
          attendanceCount: tc.attendanceCount,
          isClassTeacher: classTeacherKeys.has(key),
        });
      }
    }

    return Array.from(seen.values()).sort((a, b) =>
      `${a.cls}${a.section}`.localeCompare(`${b.cls}${b.section}`),
    );
  }, [data]);

  const editingEntries = useMemo<TeacherWeekEntry[]>(() => {
    if (!data || !editingClass) return [];
    const result: TeacherWeekEntry[] = [];
    for (const dayGroup of data.weekSchedule) {
      for (const entry of dayGroup.entries) {
        if (entry.class === editingClass.cls && entry.section === editingClass.section) {
          result.push(entry);
        }
      }
    }
    return result.sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime));
  }, [data, editingClass]);

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-6 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">My Classes</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {classes.length} class{classes.length !== 1 ? 'es' : ''} assigned
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowAddClass(true)}
            className="h-10 px-4 bg-[#0B3D2E] hover:bg-[#08251B] text-white rounded-xl text-sm font-semibold flex items-center gap-1.5 shrink-0 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Class
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-4 space-y-3">
        {isLoading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : isError ? (
          <div className="bg-red-50 border border-red-100 rounded-2xl p-5 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-700">Failed to load classes</p>
              <p className="text-xs text-red-500 mt-0.5">Please refresh the page and try again.</p>
            </div>
          </div>
        ) : classes.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
            <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-7 h-7 text-gray-400" />
            </div>
            <p className="text-base font-semibold text-gray-700">No classes assigned</p>
            <p className="text-sm text-gray-400 mt-1">
              Your timetable is empty. Use "Add Class" above to get started.
            </p>
          </div>
        ) : (
          classes.map((entry) => (
            <ClassCard
              key={`${entry.cls}||${entry.section}`}
              entry={entry}
              onAttendance={() =>
                navigate(`/teacher/attendance/${entry.cls}/${entry.section}`)
              }
              onViewStudents={() =>
                navigate(`/teacher/classes/${entry.cls}/${entry.section}/students`)
              }
              onAddStudent={() =>
                navigate(`/teacher/classes/${entry.cls}/${entry.section}/add-student`)
              }
              onEdit={() => setEditingClass({ cls: entry.cls, section: entry.section })}
            />
          ))
        )}
      </div>

      {showAddClass && <AddClassModal onClose={() => setShowAddClass(false)} />}

      {editingClass && (
        <EditClassModal
          cls={editingClass.cls}
          section={editingClass.section}
          entries={editingEntries}
          onClose={() => setEditingClass(null)}
        />
      )}
    </div>
  );
}
