import { useState, useMemo } from 'react';
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

type Tab = 'all' | 'pending' | 'done';

interface ClassEntry {
  cls: string;
  section: string;
  subjects: string[];
  todayStatus: 'marked' | 'pending' | 'none';
  totalStudents: number;
  attendanceCount: number;
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

        {/* Action buttons */}
        <div className="flex gap-2">
          {isPending ? (
            <button
              onClick={onAttendance}
              className="flex-1 h-10 bg-[#5B5CEB] hover:bg-[#4a4bd9] text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <CalendarCheck className="w-4 h-4" />
              Mark Attendance
            </button>
          ) : isMarked ? (
            <button
              onClick={onAttendance}
              className="flex-1 h-10 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" />
              View Attendance
            </button>
          ) : (
            <button
              onClick={onViewStudents}
              className="flex-1 h-10 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <Users className="w-4 h-4" />
              View Students
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
            className="h-10 px-3 bg-[#5B5CEB]/10 hover:bg-[#5B5CEB]/20 text-[#5B5CEB] rounded-xl text-sm font-semibold flex items-center gap-1.5 transition-colors"
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
      </div>
    </div>
  );
}

const TABS: { id: Tab; label: string }[] = [
  { id: 'all',     label: 'All Classes' },
  { id: 'pending', label: 'Pending'     },
  { id: 'done',    label: 'Completed'   },
];

export function TeacherClassesPage() {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useTeacherWorkspace();
  const [tab, setTab] = useState<Tab>('all');

  // Derive unique class-section pairs from weekSchedule
  const classes = useMemo<ClassEntry[]>(() => {
    if (!data) return [];

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
        });
      }
    }

    return Array.from(seen.values()).sort((a, b) =>
      `${a.cls}${a.section}`.localeCompare(`${b.cls}${b.section}`),
    );
  }, [data]);

  const filtered = useMemo(() => {
    if (tab === 'all')     return classes;
    if (tab === 'pending') return classes.filter((c) => c.todayStatus === 'pending');
    return classes.filter((c) => c.todayStatus === 'marked');
  }, [classes, tab]);

  const pendingCount  = classes.filter((c) => c.todayStatus === 'pending').length;
  const completedCount = classes.filter((c) => c.todayStatus === 'marked').length;

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-6 pb-4">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">My Classes</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {classes.length} class{classes.length !== 1 ? 'es' : ''} assigned
        </p>

        {/* Stats row */}
        <div className="flex gap-3 mt-4">
          <div className="flex-1 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 text-center">
            <p className="text-xl font-bold text-amber-600">{pendingCount}</p>
            <p className="text-xs text-amber-500 font-medium">Pending</p>
          </div>
          <div className="flex-1 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2 text-center">
            <p className="text-xl font-bold text-emerald-600">{completedCount}</p>
            <p className="text-xs text-emerald-500 font-medium">Completed</p>
          </div>
          <div className="flex-1 bg-[#5B5CEB]/5 border border-[#5B5CEB]/20 rounded-xl px-3 py-2 text-center">
            <p className="text-xl font-bold text-[#5B5CEB]">{classes.length}</p>
            <p className="text-xs text-[#5B5CEB]/80 font-medium">Total</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-4 pt-4 pb-1 border-b border-gray-100 bg-white">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              'px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200',
              tab === t.id
                ? 'bg-[#5B5CEB] text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100',
            )}
          >
            {t.label}
            {t.id === 'pending' && pendingCount > 0 && (
              <span className={cn(
                'ml-1.5 text-xs px-1.5 py-0.5 rounded-full',
                tab === 'pending' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-600',
              )}>
                {pendingCount}
              </span>
            )}
          </button>
        ))}
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
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
            <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-7 h-7 text-gray-400" />
            </div>
            <p className="text-base font-semibold text-gray-700">
              {tab === 'pending' ? 'No pending classes' : tab === 'done' ? 'No completed classes yet' : 'No classes assigned'}
            </p>
            <p className="text-sm text-gray-400 mt-1">
              {tab === 'all'
                ? 'Your timetable is empty. Contact the admin.'
                : 'Switch to another tab to see more.'}
            </p>
          </div>
        ) : (
          filtered.map((entry) => (
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
