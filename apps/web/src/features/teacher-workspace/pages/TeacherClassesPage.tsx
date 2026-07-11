import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, ChevronRight, AlertCircle, GraduationCap } from 'lucide-react';
import { useTeacherWorkspace } from '../hooks/useTeacherWorkspace';

interface ClassEntry {
  cls: string;
  section: string;
  /** Only the class teacher (assigned by admin/principal) can mark attendance
   *  for a class. Other classes a teacher merely teaches a subject in are
   *  view-only — this page no longer surfaces attendance actions at all;
   *  that now lives on the class detail page (ClassDetailPage). */
  isClassTeacher: boolean;
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-50 animate-pulse">
      <div className="w-9 h-9 bg-gray-100 rounded-xl shrink-0" />
      <div className="h-4 bg-gray-100 rounded w-32" />
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Class row — simple, single line: class name only, click for details      */
/* ────────────────────────────────────────────────────────────────────────── */

function ClassRow({ entry, onPress }: { entry: ClassEntry; onPress: () => void }) {
  return (
    <button
      type="button"
      onClick={onPress}
      className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-gray-50 transition-colors"
    >
      <div className="w-9 h-9 rounded-xl bg-[#A855F7]/10 flex items-center justify-center shrink-0">
        <GraduationCap className="w-4 h-4 text-[#5B21B6]" strokeWidth={2} />
      </div>
      <p className="flex-1 text-base font-bold text-gray-900">
        Class {entry.cls}{entry.section && ` – ${entry.section}`}
      </p>
      <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
    </button>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Page                                                                       */
/* ────────────────────────────────────────────────────────────────────────── */

export function TeacherClassesPage() {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useTeacherWorkspace();

  // Derive unique class-section pairs from weekSchedule plus class-teacher
  // assignments — this page only ever shows the class name; subjects/
  // timetable/attendance all live on ClassDetailPage now, one tap away.
  //
  // A class-teacher assignment must always surface its class here even when
  // the teacher has no *subject* periods timetabled for it (e.g. a class
  // teacher who doesn't personally teach that class) — otherwise "Mark
  // Attendance" has nothing to route to right after the principal assigns
  // them, until a timetable happens to be built too.
  const classes = useMemo<ClassEntry[]>(() => {
    if (!data) return [];

    const classTeacherKeys = new Set(
      (data.classTeacherOf ?? []).map((c) => `${c.class}||${c.section}`),
    );

    const seen = new Map<string, ClassEntry>();
    for (const dayGroup of data.weekSchedule) {
      for (const entry of dayGroup.entries) {
        const key = `${entry.class}||${entry.section}`;
        if (!seen.has(key)) {
          seen.set(key, { cls: entry.class, section: entry.section, isClassTeacher: classTeacherKeys.has(key) });
        }
      }
    }
    for (const { class: cls, section } of data.classTeacherOf ?? []) {
      const key = `${cls}||${section}`;
      if (!seen.has(key)) {
        seen.set(key, { cls, section, isClassTeacher: true });
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
        <button
          onClick={() => navigate('/teacher')}
          className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors mb-3 -ml-1 p-1"
          type="button"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">My Classes</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {classes.length} class{classes.length !== 1 ? 'es' : ''} assigned
        </p>
      </div>

      {/* Content */}
      <div className="px-4 py-4">
        {isLoading ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </div>
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
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-50">
            {classes.map((entry) => (
              <ClassRow
                key={`${entry.cls}||${entry.section}`}
                entry={entry}
                onPress={() => navigate(`/teacher/classes/${entry.cls}/${entry.section}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
