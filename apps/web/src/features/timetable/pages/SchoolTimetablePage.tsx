import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, LayoutGrid, Settings2, Plus, X, Trash2 } from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { BackLink } from '@/components/workspace/BackLink';
import { useMasterGrid } from '../hooks/useTimetable';
import {
  useSchoolClasses, useCreateSchoolClass, useAddSection, useRemoveSection, useDeleteSchoolClass,
} from '@/features/school-classes/hooks/useSchoolClasses';
import { MasterGridCellEditor } from '../components/MasterGridCellEditor';
import { subjectAccent } from '../theme';
import type { PeriodSlot, MasterGridCell, MasterGridRow } from '@schoolos/types';

const inputCls = `h-10 px-3 rounded-xl border border-[var(--tt-border)] bg-[var(--tt-card)] text-sm text-[var(--tt-text-primary)] placeholder:text-[var(--tt-text-muted)]
  focus:outline-none focus:border-[#7C5CFF] focus:ring-2 focus:ring-[#7C5CFF]/25`;

function defaultAcademicYear(): string {
  const y = new Date().getFullYear();
  return `${y}-${String(y + 1).slice(2)}`;
}

/** Natural sort so "2, 3, 10, 11" doesn't come out as "10, 11, 2, 3". */
const naturalCompare = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });

/**
 * Whole-school master timetable — every class×section as a row, every
 * period as a column, one page, matching the paper master timetable schools
 * keep on the staff room wall. Reads/writes the SAME Timetable documents as
 * the per-class "Class Timetable" grid, so the two views can never drift
 * apart — this is just a different way of looking at (and bulk-editing) the
 * same data. See timetableService.getMasterGrid / setMasterGridCell.
 */
export const SchoolTimetablePage = () => {
  const { user } = useAuth();
  const isPrincipal = user?.role === 'principal';
  const isAdmin = user?.role === 'admin' || user?.role === 'principal';

  const [academicYear, setAcademicYear] = useState(defaultAcademicYear());
  const [term, setTerm] = useState('');
  const [manageOpen, setManageOpen] = useState(false);
  const [activeCell, setActiveCell] = useState<{ klass: string; section: string; slot: PeriodSlot; cell: MasterGridCell | null } | null>(null);

  const { data: grid, isLoading } = useMasterGrid({ academicYear, term: term.trim() || undefined });

  const periods = grid?.periods ?? [];
  const rows = useMemo(
    () => [...(grid?.rows ?? [])].sort((a, b) => naturalCompare(a.class, b.class) || naturalCompare(a.section, b.section)),
    [grid],
  );

  return (
    <div className="min-h-screen w-full bg-[var(--tt-bg)] flex flex-col gap-6 px-6 py-6">
      {isPrincipal && <BackLink to="/principal" label="Principal Dashboard" />}

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #7C5CFF 0%, #E954B8 100%)' }}>
            <LayoutGrid className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--tt-text-primary)]">School Timetable</h1>
            <p className="text-sm text-[var(--tt-text-secondary)] mt-0.5">Every class, every period, one page — same schedule that feeds Class Timetable and Teacher Timetable</p>
          </div>
        </div>
        {isAdmin && (
          <button
            type="button"
            onClick={() => setManageOpen(true)}
            className="flex items-center gap-1.5 h-10 px-4 rounded-xl border border-[var(--tt-border)] bg-[var(--tt-hover)]
                       text-sm font-semibold text-[var(--tt-text-secondary)] hover:opacity-90 transition-colors"
          >
            <Settings2 className="w-4 h-4" />
            Manage Classes &amp; Sections
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <input
          value={academicYear}
          onChange={(e) => setAcademicYear(e.target.value)}
          placeholder="Academic Year (e.g. 2026-27)"
          className={`${inputCls} w-56`}
        />
        <input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Term (optional)"
          className={`${inputCls} w-44`}
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-7 h-7 text-[#7C5CFF] animate-spin" />
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <LayoutGrid className="w-12 h-12 text-[var(--tt-text-muted)]" />
          <p className="text-base font-semibold text-[var(--tt-text-secondary)]">No classes set up yet</p>
          {isAdmin && (
            <button type="button" onClick={() => setManageOpen(true)} className="text-sm text-[#7C5CFF] hover:underline font-semibold">
              Add your first class →
            </button>
          )}
        </div>
      ) : periods.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <LayoutGrid className="w-12 h-12 text-[var(--tt-text-muted)]" />
          <p className="text-base font-semibold text-[var(--tt-text-secondary)]">No periods set up yet</p>
          <p className="text-sm text-[var(--tt-text-muted)]">Set up the school's period timings first, from Class Timetable → Period Setup.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-[20px] border border-[var(--tt-border)] bg-[var(--tt-card)]">
          <table className="border-collapse text-sm min-w-max">
            <thead className="sticky top-0 z-10">
              <tr>
                <th className="sticky left-0 z-20 w-32 px-3 py-3 text-left text-xs font-bold text-[var(--tt-text-muted)] uppercase tracking-wider bg-[var(--tt-bg-secondary)] border-b border-r border-[var(--tt-border)]">
                  Class
                </th>
                {periods.map((slot) => (
                  <th key={slot._id} className="min-w-[130px] px-2 py-3 text-center text-xs font-bold text-[var(--tt-text-secondary)] uppercase tracking-wider bg-[var(--tt-bg-secondary)] border-b border-r border-[var(--tt-border)] last:border-r-0">
                    <p>{slot.name}</p>
                    <p className="text-[10px] font-medium text-[var(--tt-text-muted)] normal-case tracking-normal mt-0.5">{slot.startTime}–{slot.endTime}</p>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--tt-border)]">
              {rows.map((row: MasterGridRow) => (
                <tr key={`${row.class}-${row.section}`} className="hover:bg-[var(--tt-hover)] transition-colors">
                  <td className="sticky left-0 z-10 px-3 py-2 border-r border-[var(--tt-border)] bg-[var(--tt-card)]">
                    <p className="text-sm font-bold text-[var(--tt-text-primary)]">{row.class}-{row.section}</p>
                  </td>
                  {periods.map((slot) => {
                    if (slot.isBreak) {
                      return (
                        <td key={slot._id} className="px-2 py-2 border-r border-[var(--tt-border)] last:border-r-0 bg-[#F5A524]/[0.06]">
                          <div className="flex items-center justify-center h-12 text-xs text-[#F5A524] font-medium">Break</div>
                        </td>
                      );
                    }
                    const cell = row.cells[slot._id] ?? null;
                    const empty = !cell;
                    const accent = cell ? subjectAccent(cell.subjectName) : null;

                    return (
                      <td
                        key={slot._id}
                        onClick={isAdmin ? () => setActiveCell({ klass: row.class, section: row.section, slot, cell }) : undefined}
                        className={`px-2 py-2 border-r border-[var(--tt-border)] last:border-r-0 align-top ${isAdmin ? 'cursor-pointer' : ''}`}
                      >
                        {empty ? (
                          <div className={`flex items-center justify-center h-14 rounded-xl border-2 border-dashed transition-colors ${
                            isAdmin ? 'border-[var(--tt-border)] hover:border-[#7C5CFF]/50 hover:bg-[#7C5CFF]/5' : 'border-[var(--tt-border)]'
                          }`}>
                            <span className="text-[11px] text-[var(--tt-text-muted)] font-medium">{isAdmin ? '+ Add' : 'Free'}</span>
                          </div>
                        ) : (
                          <motion.div
                            whileHover={isAdmin ? { y: -2 } : undefined}
                            transition={{ duration: 0.15, ease: 'easeOut' }}
                            className="p-2 rounded-xl h-14 flex flex-col justify-between border"
                            style={{ background: accent!.bg, borderColor: accent!.border }}
                          >
                            <p className="text-xs font-bold leading-tight truncate" style={{ color: accent!.text }}>{cell!.subjectName}</p>
                            {cell!.teacherName && (
                              <p className="text-[11px] leading-tight truncate text-[var(--tt-text-secondary)]">{cell!.teacherName}</p>
                            )}
                          </motion.div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeCell && (
        <MasterGridCellEditor
          klass={activeCell.klass}
          section={activeCell.section}
          academicYear={academicYear}
          term={term.trim() || undefined}
          slot={activeCell.slot}
          cell={activeCell.cell}
          onClose={() => setActiveCell(null)}
        />
      )}

      {manageOpen && <ManageClassesDrawer onClose={() => setManageOpen(false)} />}
    </div>
  );
};

/** Inline add/remove of classes and their sections — the paper sheet's rows.
 *  Reuses the same School Classes catalog and hooks the rest of the app
 *  (fees, students, attendance…) already relies on, rather than a separate
 *  class list scoped to just this grid. */
const ManageClassesDrawer = ({ onClose }: { onClose: () => void }) => {
  const { data: classes = [], isLoading } = useSchoolClasses();
  const { mutate: createClass, isPending: creating, error: createError } = useCreateSchoolClass();
  const { mutate: addSection } = useAddSection();
  const { mutate: removeSection } = useRemoveSection();
  const { mutate: deleteClass } = useDeleteSchoolClass();

  const [newClassName, setNewClassName] = useState('');
  const [sectionDrafts, setSectionDrafts] = useState<Record<string, string>>({});

  const sorted = [...classes].sort((a, b) => naturalCompare(a.name, b.name));

  return (
    <div className="fixed inset-0 z-50 flex">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
        transition={{ duration: 0.28, ease: [0.33, 1, 0.68, 1] }}
        className="w-full max-w-md bg-[var(--tt-card)] border-l border-[var(--tt-border)] h-full shadow-2xl flex flex-col overflow-y-auto"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--tt-border)]">
          <h2 className="text-base font-bold text-[var(--tt-text-primary)]">Classes &amp; Sections</h2>
          <button type="button" onClick={onClose} className="p-2 rounded-xl text-[var(--tt-text-muted)] hover:text-[var(--tt-text-primary)] hover:bg-[var(--tt-hover)] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 flex flex-col gap-4 px-5 py-5">
          <form
            onSubmit={(e) => { e.preventDefault(); if (!newClassName.trim()) return; createClass(newClassName.trim(), { onSuccess: () => setNewClassName('') }); }}
            className="flex gap-2"
          >
            <input
              value={newClassName}
              onChange={(e) => setNewClassName(e.target.value)}
              placeholder="New class name (e.g. VII)"
              className={`${inputCls} flex-1`}
            />
            <button
              type="submit" disabled={creating || !newClassName.trim()}
              className="h-10 px-4 rounded-xl text-sm font-bold text-white flex items-center gap-1.5 disabled:opacity-50 hover:opacity-90 transition-opacity"
              style={{ background: 'linear-gradient(135deg, #7C5CFF 0%, #E954B8 100%)' }}
            >
              <Plus className="w-4 h-4" /> Add
            </button>
          </form>
          {createError && <p className="text-sm text-[#FF5B6A]">{(createError as Error).message}</p>}

          {isLoading ? (
            <div className="flex items-center justify-center py-10"><Loader2 className="w-6 h-6 text-[#7C5CFF] animate-spin" /></div>
          ) : (
            <div className="flex flex-col gap-3">
              {sorted.map((cls) => (
                <div key={cls._id} className="rounded-xl border border-[var(--tt-border)] p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-[var(--tt-text-primary)]">{cls.name}</p>
                    <button
                      type="button"
                      onClick={() => { if (confirm(`Remove class "${cls.name}"? This does not delete existing timetables or students.`)) deleteClass(cls._id); }}
                      className="p-1.5 rounded-lg text-[var(--tt-text-muted)] hover:text-[#FF5B6A] hover:bg-[#FF5B6A]/10 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {cls.sections.map((s) => (
                      <span key={s} className="flex items-center gap-1 h-7 pl-2.5 pr-1.5 rounded-lg bg-[var(--tt-bg-secondary)] text-xs font-semibold text-[var(--tt-text-secondary)]">
                        {s}
                        <button type="button" onClick={() => removeSection({ id: cls._id, section: s })} className="p-0.5 rounded hover:text-[#FF5B6A] transition-colors">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const val = (sectionDrafts[cls._id] ?? '').trim();
                      if (!val) return;
                      addSection({ id: cls._id, section: val });
                      setSectionDrafts((p) => ({ ...p, [cls._id]: '' }));
                    }}
                    className="flex gap-1.5 mt-2"
                  >
                    <input
                      value={sectionDrafts[cls._id] ?? ''}
                      onChange={(e) => setSectionDrafts((p) => ({ ...p, [cls._id]: e.target.value }))}
                      placeholder="Add section (e.g. A)"
                      className="h-8 flex-1 px-2.5 rounded-lg border border-[var(--tt-border)] bg-[var(--tt-bg-secondary)] text-xs text-[var(--tt-text-primary)] placeholder:text-[var(--tt-text-muted)] focus:outline-none focus:border-[#7C5CFF]"
                    />
                    <button type="submit" className="h-8 px-2.5 rounded-lg border border-[var(--tt-border)] text-xs font-semibold text-[var(--tt-text-secondary)] hover:bg-[var(--tt-hover)] transition-colors">
                      Add
                    </button>
                  </form>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
