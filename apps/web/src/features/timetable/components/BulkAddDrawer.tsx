import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { X, Plus, Copy, Trash2, Loader2, AlertTriangle, Search, Check } from 'lucide-react';
import { toast } from 'sonner';
import type { PeriodSlot, Timetable, UpsertEntryPayload } from '@schoolos/types';
import { useBulkUpdateEntries, useTeacherSchedule } from '../hooks/useTimetable';
import { useTeachersPaginated } from '@/features/teachers/hooks/useTeachers';
import { cn } from '@/lib/utils';

const DAY_OPTIONS = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

let rowIdSeq = 0;
function newRowId() { return `row-${++rowIdSeq}`; }

interface DraftRow {
  id: string;
  dayOfWeek: number;
  slotId: string;
  subjectName: string;
  teacherId?: string;
  teacherName?: string;
}

function emptyRow(day: number, slotId: string): DraftRow {
  return { id: newRowId(), dayOfWeek: day, slotId, subjectName: '', teacherId: undefined, teacherName: undefined };
}

// ── Teacher picker cell — inline search dropdown, also surfaces a soft
// (non-blocking) warning if the selected teacher already teaches elsewhere
// at the exact same day+period, mirroring the existing advisory pattern
// used by the teacher-timetable conflict check. ─────────────────────────────

function TeacherCell({
  row, onChange, currentTimetableId,
}: {
  row: DraftRow;
  onChange: (patch: Partial<DraftRow>) => void;
  currentTimetableId: string;
}) {
  const [query, setQuery] = useState(row.teacherName ?? '');
  const [open, setOpen] = useState(false);
  const { data: results, isLoading } = useTeachersPaginated(
    open && query.trim().length >= 2 ? { search: query.trim(), limit: 6 } : {},
  );
  const { data: schedule } = useTeacherSchedule(row.teacherId ?? '');

  const clash = row.teacherId && schedule
    ? schedule.some((t) => t._id !== currentTimetableId && t.entries.some(
        (e) => e.dayOfWeek === row.dayOfWeek && e.slotId === row.slotId && e.teacherId === row.teacherId,
      ))
    : false;

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--tt-text-muted)]" />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            if (!e.target.value.trim()) onChange({ teacherId: undefined, teacherName: undefined });
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Optional"
          className="h-9 w-full rounded-lg border border-[var(--tt-border)] bg-[var(--tt-bg)] pl-8 pr-7 text-xs text-[var(--tt-text-primary)] placeholder:text-[var(--tt-text-muted)] focus:outline-none focus:border-[#7C5CFF] focus:ring-2 focus:ring-[#7C5CFF]/20"
        />
        {row.teacherId && <Check className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#2ED47A]" />}
      </div>
      {open && query.trim().length >= 2 && (
        <div className="absolute top-full left-0 right-0 mt-1 z-20 bg-[var(--tt-bg-secondary)] border border-[var(--tt-border)] rounded-lg shadow-xl max-h-40 overflow-y-auto min-w-[180px]">
          {isLoading ? (
            <div className="p-2 text-center"><Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--tt-text-muted)] mx-auto" /></div>
          ) : !results?.data.length ? (
            <p className="p-2 text-[11px] text-[var(--tt-text-muted)] text-center">No teachers found</p>
          ) : (
            results.data.map((t) => (
              <button
                key={t._id}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange({ teacherId: t._id, teacherName: t.fullName });
                  setQuery(t.fullName);
                  setOpen(false);
                }}
                className="w-full text-left px-2.5 py-1.5 text-xs text-[var(--tt-text-primary)] hover:bg-[var(--tt-hover)]"
              >
                {t.fullName}
              </button>
            ))
          )}
        </div>
      )}
      {clash && (
        <p className="absolute -bottom-4 left-0 text-[10px] font-medium text-[#F5A524] whitespace-nowrap">
          Teacher busy elsewhere this period
        </p>
      )}
    </div>
  );
}

interface BulkAddDrawerProps {
  timetable: Timetable;
  slots: PeriodSlot[];
  onClose: () => void;
}

export const BulkAddDrawer = ({ timetable, slots, onClose }: BulkAddDrawerProps) => {
  const teachingSlots = [...slots].filter((s) => !s.isBreak).sort((a, b) => a.orderIndex - b.orderIndex);
  const firstSlot = teachingSlots[0];

  const [rows, setRows] = useState<DraftRow[]>(() => [emptyRow(1, firstSlot?._id ?? '')]);
  const subjectRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const { mutate: bulkUpdate, isPending } = useBulkUpdateEntries(timetable._id);

  function updateRow(id: string, patch: Partial<DraftRow>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function nextSlotPosition(day: number, slotId: string): { day: number; slotId: string } {
    const idx = teachingSlots.findIndex((s) => s._id === slotId);
    if (idx === -1 || idx === teachingSlots.length - 1) {
      const dayIdx = DAY_OPTIONS.findIndex((d) => d.value === day);
      const nextDayIdx = (dayIdx + 1) % DAY_OPTIONS.length;
      return { day: DAY_OPTIONS[nextDayIdx].value, slotId: firstSlot?._id ?? '' };
    }
    return { day, slotId: teachingSlots[idx + 1]._id };
  }

  function addRow(afterId?: string) {
    const last = rows[rows.length - 1];
    const { day, slotId } = last
      ? nextSlotPosition(last.dayOfWeek, last.slotId)
      : { day: 1, slotId: firstSlot?._id ?? '' };
    const next = emptyRow(day, slotId);
    setRows((prev) => {
      if (!afterId) return [...prev, next];
      const idx = prev.findIndex((r) => r.id === afterId);
      return [...prev.slice(0, idx + 1), next, ...prev.slice(idx + 1)];
    });
    requestAnimationFrame(() => subjectRefs.current[next.id]?.focus());
  }

  function duplicateRow(id: string) {
    const idx = rows.findIndex((r) => r.id === id);
    if (idx === -1) return;
    const copy: DraftRow = { ...rows[idx], id: newRowId() };
    setRows((prev) => [...prev.slice(0, idx + 1), copy, ...prev.slice(idx + 1)]);
  }

  function deleteRow(id: string) {
    setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.id !== id) : prev));
  }

  function copyPrevious() {
    if (rows.length === 0) return;
    duplicateRow(rows[rows.length - 1].id);
  }

  function clearAll() {
    setRows([emptyRow(1, firstSlot?._id ?? '')]);
  }

  // ── Real-time validation ──────────────────────────────────────────────
  // A row's (day, period) must be unique both within this batch and against
  // entries this class already has — a class can't have two subjects in the
  // same period, so both cases block Save.
  const existingKeys = new Set(timetable.entries.map((e) => `${e.dayOfWeek}-${e.slotId}`));
  const keyCounts = new Map<string, number>();
  for (const r of rows) {
    const key = `${r.dayOfWeek}-${r.slotId}`;
    keyCounts.set(key, (keyCounts.get(key) ?? 0) + 1);
  }
  function rowError(row: DraftRow): string | null {
    const key = `${row.dayOfWeek}-${row.slotId}`;
    if ((keyCounts.get(key) ?? 0) > 1) return 'Duplicate day + period in this batch';
    if (existingKeys.has(key)) return 'This class already has an entry at this period';
    return null;
  }

  const subjectOptions = Array.from(new Set(rows.map((r) => r.subjectName.trim()).filter(Boolean)));

  const rowsWithSubject = rows.filter((r) => r.subjectName.trim().length > 0);
  const hasBlockingError = rows.some((r) => r.subjectName.trim() && rowError(r));
  const canSave = rowsWithSubject.length > 0 && !hasBlockingError;

  function handleSaveAll() {
    if (!canSave) return;
    const newEntries: UpsertEntryPayload[] = rowsWithSubject.map((r) => ({
      dayOfWeek: r.dayOfWeek,
      slotId: r.slotId,
      subjectName: r.subjectName.trim(),
      teacherId: r.teacherId,
      teacherName: r.teacherName,
    }));
    const combined: UpsertEntryPayload[] = [
      ...timetable.entries.map((e) => ({
        dayOfWeek: e.dayOfWeek, slotId: e.slotId, subjectName: e.subjectName,
        teacherId: e.teacherId, teacherName: e.teacherName, roomNumber: e.roomNumber,
      })),
      ...newEntries,
    ];
    bulkUpdate({ entries: combined }, {
      onSuccess: () => {
        toast.success(`Added ${newEntries.length} period${newEntries.length !== 1 ? 's' : ''}`);
        onClose();
      },
      onError: (err) => toast.error('Could not save', { description: (err as Error).message }),
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.98 }}
        transition={{ duration: 0.22, ease: [0.33, 1, 0.68, 1] }}
        className="relative w-full max-w-4xl max-h-[85vh] bg-[var(--tt-card)] border border-[var(--tt-border)] rounded-[22px] shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--tt-border)] shrink-0">
          <div>
            <h2 className="text-base font-bold text-[var(--tt-text-primary)]">Bulk Add Timetable</h2>
            <p className="text-xs text-[var(--tt-text-secondary)] mt-0.5">
              Class {timetable.class}-{timetable.section} · add multiple periods at once
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-[var(--tt-text-muted)] hover:text-[var(--tt-text-primary)] hover:bg-[var(--tt-hover)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Rows */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="grid grid-cols-[1.3fr_1.3fr_1.6fr_1.6fr_auto] gap-2 px-1 mb-2">
            {['Day', 'Period', 'Subject', 'Teacher', ''].map((h) => (
              <span key={h} className="text-[11px] font-bold text-[var(--tt-text-muted)] uppercase tracking-wider">{h}</span>
            ))}
          </div>

          <div className="flex flex-col gap-2 pb-4">
            {rows.map((row) => {
              const error = row.subjectName.trim() ? rowError(row) : null;
              return (
                <motion.div
                  key={row.id}
                  layout
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className={cn(
                    'grid grid-cols-[1.3fr_1.3fr_1.6fr_1.6fr_auto] gap-2 items-start p-2 rounded-xl border',
                    error ? 'border-[#FF5B6A]/40 bg-[#FF5B6A]/[0.06]' : 'border-[var(--tt-border)] bg-[var(--tt-bg-secondary)]',
                  )}
                >
                  <select
                    value={row.dayOfWeek}
                    onChange={(e) => updateRow(row.id, { dayOfWeek: Number(e.target.value) })}
                    className="h-9 rounded-lg border border-[var(--tt-border)] bg-[var(--tt-bg)] px-2 text-xs text-[var(--tt-text-primary)] focus:outline-none focus:border-[#7C5CFF]"
                  >
                    {DAY_OPTIONS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                  </select>

                  <select
                    value={row.slotId}
                    onChange={(e) => updateRow(row.id, { slotId: e.target.value })}
                    className="h-9 rounded-lg border border-[var(--tt-border)] bg-[var(--tt-bg)] px-2 text-xs text-[var(--tt-text-primary)] focus:outline-none focus:border-[#7C5CFF]"
                  >
                    {teachingSlots.map((s) => (
                      <option key={s._id} value={s._id}>{s.name} ({s.startTime}-{s.endTime})</option>
                    ))}
                  </select>

                  <input
                    ref={(el) => { subjectRefs.current[row.id] = el; }}
                    value={row.subjectName}
                    onChange={(e) => updateRow(row.id, { subjectName: e.target.value })}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addRow(row.id); } }}
                    placeholder="Subject"
                    list="bad-subject-options"
                    className="h-9 rounded-lg border border-[var(--tt-border)] bg-[var(--tt-bg)] px-2.5 text-xs text-[var(--tt-text-primary)] placeholder:text-[var(--tt-text-muted)] focus:outline-none focus:border-[#7C5CFF] focus:ring-2 focus:ring-[#7C5CFF]/20"
                  />

                  <TeacherCell row={row} currentTimetableId={timetable._id} onChange={(patch) => updateRow(row.id, patch)} />

                  <div className="flex items-center gap-1 pt-0.5">
                    <button
                      type="button"
                      onClick={() => duplicateRow(row.id)}
                      title="Duplicate row"
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-[var(--tt-text-muted)] hover:text-[var(--tt-text-primary)] hover:bg-[var(--tt-border)] transition-colors"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteRow(row.id)}
                      disabled={rows.length === 1}
                      title="Delete row"
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-[var(--tt-text-muted)] hover:text-[#FF5B6A] hover:bg-[#FF5B6A]/10 transition-colors disabled:opacity-30 disabled:hover:text-[var(--tt-text-muted)] disabled:hover:bg-transparent"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {error && (
                    <p className="col-span-5 flex items-center gap-1.5 text-[11px] font-medium text-[#FF5B6A] -mt-1">
                      <AlertTriangle className="w-3 h-3 shrink-0" />
                      {error}
                    </p>
                  )}
                </motion.div>
              );
            })}
          </div>

          <datalist id="bad-subject-options">
            {subjectOptions.map((v) => <option key={v} value={v} />)}
          </datalist>

          {/* Toolbar */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => addRow()}
              className="h-9 px-3 flex items-center gap-1.5 rounded-lg border border-[var(--tt-border)] bg-[var(--tt-hover)] hover:bg-[var(--tt-hover)] text-xs font-semibold text-[var(--tt-text-primary)] transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Add Row
            </button>
            <button
              type="button"
              onClick={copyPrevious}
              className="h-9 px-3 flex items-center gap-1.5 rounded-lg border border-[var(--tt-border)] bg-[var(--tt-hover)] hover:bg-[var(--tt-hover)] text-xs font-semibold text-[var(--tt-text-primary)] transition-colors"
            >
              <Copy className="w-3.5 h-3.5" /> Copy Previous
            </button>
            <button
              type="button"
              onClick={clearAll}
              className="h-9 px-3 flex items-center gap-1.5 rounded-lg border border-[var(--tt-border)] bg-[var(--tt-hover)] hover:bg-[var(--tt-hover)] text-xs font-semibold text-[var(--tt-text-secondary)] transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" /> Clear All
            </button>
          </div>
        </div>

        {/* Sticky Save All */}
        <div className="px-6 py-4 border-t border-[var(--tt-border)] shrink-0 flex items-center justify-between gap-4">
          <p className="text-xs text-[var(--tt-text-muted)]">
            {rowsWithSubject.length} period{rowsWithSubject.length !== 1 ? 's' : ''} ready to add
          </p>
          <button
            type="button"
            onClick={handleSaveAll}
            disabled={!canSave || isPending}
            className="h-11 px-6 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-opacity disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg, #7C5CFF 0%, #E954B8 100%)' }}
          >
            {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Save All ({rowsWithSubject.length})
          </button>
        </div>
      </motion.div>
    </div>
  );
};
