import { useMemo, useState } from 'react';
import { Search, Loader2, GraduationCap, X, Check, AlertTriangle, UserX } from 'lucide-react';
import { useClassSections, useAssignClassTeacher, useRemoveClassTeacher } from '../hooks/useClasses';
import { useTeachersPaginated } from '@/features/teachers/hooks/useTeachers';
import { BackLink } from '@/components/workspace/BackLink';
import { cn } from '@/lib/utils';
import type { ClassSectionSummary } from '@schoolos/types';

// ── Teacher picker for one class+section row ────────────────────────────────

function TeacherPicker({ row, onDone }: { row: ClassSectionSummary; onDone: () => void }) {
  const [search, setSearch] = useState('');
  const { data, isLoading } = useTeachersPaginated({ search, limit: 15 });
  const { mutateAsync: assignTeacher, isPending: assigning } = useAssignClassTeacher();
  const { mutateAsync: removeTeacher, isPending: removing } = useRemoveClassTeacher();

  const teachers = data?.data ?? [];
  const isPending = assigning || removing;

  async function assign(teacherId: string) {
    await assignTeacher({ class: row.class, section: row.section, teacherId });
    onDone();
  }

  async function unassign() {
    await removeTeacher({ class: row.class, section: row.section });
    onDone();
  }

  return (
    <div className="absolute z-10 mt-1 w-72 bg-white rounded-xl border border-gray-200 shadow-xl p-3 right-0">
      <div className="relative mb-2">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
        <input
          autoFocus
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search teacher…"
          className="w-full h-9 pl-8 pr-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
        />
      </div>

      {row.teacherId && (
        <button
          type="button"
          disabled={isPending}
          onClick={unassign}
          className="w-full flex items-center gap-2 px-2.5 py-2 mb-1 rounded-lg hover:bg-red-50 text-left text-sm text-red-600 font-medium disabled:opacity-50 border-b border-gray-100 pb-2.5"
        >
          {removing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserX className="w-3.5 h-3.5" />}
          Remove assignment — leave blank
        </button>
      )}

      {isLoading ? (
        <div className="py-4 flex justify-center"><Loader2 className="w-4 h-4 animate-spin text-gray-400" /></div>
      ) : !teachers.length ? (
        <p className="text-xs text-gray-400 text-center py-3">No teachers found.</p>
      ) : (
        <div className="max-h-56 overflow-y-auto space-y-1">
          {teachers.map((t) => (
            <button
              key={t._id}
              disabled={isPending}
              onClick={() => assign(t._id)}
              className="w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg hover:bg-blue-50 text-left text-sm text-gray-700 disabled:opacity-50"
            >
              <span className="truncate">{t.fullName}</span>
              {row.teacherId === t._id && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface ClassTeachersPageProps {
  /** When set, renders a "‹ back" link above the title — used when this page
   *  is reached standalone (e.g. the principal's sidebar) rather than nested
   *  inside the Administration tab shell, which already provides its own nav. */
  backTo?: string;
  backLabel?: string;
}

export function ClassTeachersPage({ backTo, backLabel }: ClassTeachersPageProps = {}) {
  const { data, isLoading } = useClassSections();
  const [openFor, setOpenFor] = useState<string | null>(null);

  // Unassigned classes surface first — no class should stay without a
  // teacher, so they shouldn't be easy to miss further down the list.
  const sorted = useMemo(() => {
    if (!data) return [];
    return [...data].sort((a, b) => {
      const aUnassigned = !a.teacherId;
      const bUnassigned = !b.teacherId;
      if (aUnassigned !== bUnassigned) return aUnassigned ? -1 : 1;
      return a.class.localeCompare(b.class, undefined, { numeric: true }) || a.section.localeCompare(b.section);
    });
  }, [data]);
  const unassignedCount = sorted.filter((row) => !row.teacherId).length;

  return (
    <div className="p-8 max-w-3xl">
      {backTo && <BackLink to={backTo} label={backLabel ?? 'Back'} />}
      <div className="mb-6">
        <h2 className="text-lg font-bold text-gray-900">Class Teachers</h2>
        <p className="text-sm text-gray-500 mt-1">
          Assign a class teacher to each class-section. Fee defaulter notifications default to this teacher automatically.
        </p>
      </div>

      {!isLoading && unassignedCount > 0 && (
        <div className="mb-4 flex items-center gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <p className="text-sm font-semibold text-amber-800">
            {unassignedCount} class{unassignedCount !== 1 ? 'es' : ''} still {unassignedCount !== 1 ? 'have' : 'has'} no class teacher assigned.
          </p>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-14 bg-gray-50 rounded-xl animate-pulse" />)}</div>
      ) : !sorted.length ? (
        <div className="bg-gray-50 rounded-xl p-10 text-center">
          <GraduationCap className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">No classes found yet — add students to a class first.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 divide-y divide-gray-100 overflow-visible">
          {sorted.map((row) => {
            const key = `${row.class}-${row.section}`;
            const unassigned = !row.teacherId;
            return (
              <div
                key={key}
                className={cn('flex items-center justify-between gap-3 px-4 py-3 relative', unassigned && 'bg-amber-50/50')}
              >
                <div className="min-w-0 flex items-center gap-2">
                  {unassigned && <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Class {row.class}-{row.section}</p>
                    <p className="text-xs text-gray-400">{row.studentCount} student{row.studentCount !== 1 ? 's' : ''}</p>
                  </div>
                </div>
                <div className="shrink-0 relative">
                  <button
                    onClick={() => setOpenFor(openFor === key ? null : key)}
                    className={cn(
                      'h-9 px-3 rounded-lg border text-sm flex items-center gap-2',
                      unassigned
                        ? 'border-amber-300 bg-white text-amber-700 font-semibold hover:bg-amber-50'
                        : 'border-gray-200 text-gray-700 hover:bg-gray-50',
                    )}
                  >
                    {row.teacherName ?? 'Not assigned'}
                    {openFor === key ? <X className="w-3.5 h-3.5 text-gray-400" /> : null}
                  </button>
                  {openFor === key && <TeacherPicker row={row} onDone={() => setOpenFor(null)} />}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
