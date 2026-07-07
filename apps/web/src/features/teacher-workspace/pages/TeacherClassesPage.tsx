import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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
} from 'lucide-react';
import { useTeacherWorkspace } from '../hooks/useTeacherWorkspace';
import { cn } from '@/lib/utils';

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
/* Class card                                                                */
/* ────────────────────────────────────────────────────────────────────────── */

function ClassCard({
  entry,
  onAttendance,
  onViewStudents,
  onAddStudent,
}: {
  entry: ClassEntry;
  onAttendance: () => void;
  onViewStudents: () => void;
  onAddStudent: () => void;
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

          {!noClassToday && (
            <div
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold shrink-0',
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

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-6 pb-4">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">My Classes</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {classes.length} class{classes.length !== 1 ? 'es' : ''} assigned
        </p>
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
              Your principal hasn't assigned you to any classes yet.
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
            />
          ))
        )}
      </div>
    </div>
  );
}
