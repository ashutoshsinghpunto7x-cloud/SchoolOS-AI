import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { X, Plus, Copy, Trash2, Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import type { PeriodSlot, TeacherTimetable, TeacherTimetableEntry } from '@schoolos/types';
import { useBulkUpdateTeacherTimetableEntries } from '../hooks/useTeacherTimetable';
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
function newRowId() { return `t-row-${++rowIdSeq}`; }

interface DraftRow {
  id: string;
  dayOfWeek: number;
  slotId: string;
  subjectName: string;
  class: string;
  section: string;
  roomNumber: string;
}

function emptyRow(day: number, slotId: string): DraftRow {
  return { id: newRowId(), dayOfWeek: day, slotId, subjectName: '', class: '', section: '', roomNumber: '' };
}

interface TeacherBulkAddDrawerProps {
  timetable: TeacherTimetable;
  slots: PeriodSlot[];
  onClose: () => void;
}

export const TeacherBulkAddDrawer = ({ timetable, slots, onClose }: TeacherBulkAddDrawerProps) => {
  const teachingSlots = [...slots].filter((s) => !s.isBreak).sort((a, b) => a.orderIndex - b.orderIndex);
  const firstSlot = teachingSlots[0];

  const [rows, setRows] = useState<DraftRow[]>(() => [emptyRow(1, firstSlot?._id ?? '')]);
  const subjectRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const { mutate: bulkUpdate, isPending } = useBulkUpdateTeacherTimetableEntries(timetable._id, timetable.teacherId);

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
  // A teacher can only be in one place per (day, period) — both within this
  // batch and against periods already on their timetable.
  const existingKeys = new Set(timetable.entries.map((e) => `${e.dayOfWeek}-${e.slotId}`));
  const keyCounts = new Map<string, number>();
  for (const r of rows) {
    const key = `${r.dayOfWeek}-${r.slotId}`;
    keyCounts.set(key, (keyCounts.get(key) ?? 0) + 1);
  }
  function rowError(row: DraftRow): string | null {
    const key = `${row.dayOfWeek}-${row.slotId}`;
    if ((keyCounts.get(key) ?? 0) > 1) return 'Duplicate day + period in this batch';
    if (existingKeys.has(key)) return 'This teacher already has an entry at this period';
    return null;
  }

  const subjectOptions = Array.from(new Set(rows.map((r) => r.subjectName.trim()).filter(Boolean)));
  const classOptions = Array.from(new Set(rows.map((r) => r.class.trim()).filter(Boolean)));
  const sectionOptions = Array.from(new Set(rows.map((r) => r.section.trim()).filter(Boolean)));

  const rowsWithSubject = rows.filter((r) => r.subjectName.trim().length > 0);
  const hasBlockingError = rows.some((r) => r.subjectName.trim() && rowError(r));
  const canSave = rowsWithSubject.length > 0 && !hasBlockingError;

  function handleSaveAll() {
    if (!canSave) return;
    const newEntries: TeacherTimetableEntry[] = rowsWithSubject.map((r) => ({
      dayOfWeek: r.dayOfWeek,
      slotId: r.slotId,
      subjectName: r.subjectName.trim(),
      class: r.class.trim() || undefined,
      section: r.section.trim() || undefined,
      roomNumber: r.roomNumber.trim() || undefined,
    }));
    const combined: TeacherTimetableEntry[] = [...timetable.entries, ...newEntries];
    bulkUpdate({ entries: combined }, {
      onSuccess: (result) => {
        if (result.conflicts.length) {
          toast.warning(`Added ${newEntries.length}, with ${result.conflicts.length} warning${result.conflicts.length !== 1 ? 's' : ''}`, {
            description: result.conflicts[0],
          });
        } else {
          toast.success(`Added ${newEntries.length} period${newEntries.length !== 1 ? 's' : ''} — class timetables updated automatically`);
        }
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
        className="relative w-full max-w-4xl max-h-[85vh] bg-[#181B26] border border-white/[0.08] rounded-[22px] shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] shrink-0">
          <div>
            <h2 className="text-base font-bold text-white">Bulk Add Teacher Timetable</h2>
            <p className="text-xs text-[#A8AFBF] mt-0.5">
              {timetable.teacherName} · assigning a class/section auto-updates that class's timetable
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-[#6D7485] hover:text-white hover:bg-white/[0.06] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Rows */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="grid grid-cols-[1.2fr_1.3fr_1.4fr_0.8fr_0.8fr_auto] gap-2 px-1 mb-2">
            {['Day', 'Period', 'Subject', 'Class', 'Section', ''].map((h) => (
              <span key={h} className="text-[11px] font-bold text-[#6D7485] uppercase tracking-wider">{h}</span>
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
                    'grid grid-cols-[1.2fr_1.3fr_1.4fr_0.8fr_0.8fr_auto] gap-2 items-start p-2 rounded-xl border',
                    error ? 'border-[#FF5B6A]/40 bg-[#FF5B6A]/[0.06]' : 'border-white/[0.06] bg-[#12141D]',
                  )}
                >
                  <select
                    value={row.dayOfWeek}
                    onChange={(e) => updateRow(row.id, { dayOfWeek: Number(e.target.value) })}
                    className="h-9 rounded-lg border border-white/[0.08] bg-[#0B0C12] px-2 text-xs text-white focus:outline-none focus:border-[#7C5CFF]"
                  >
                    {DAY_OPTIONS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                  </select>

                  <select
                    value={row.slotId}
                    onChange={(e) => updateRow(row.id, { slotId: e.target.value })}
                    className="h-9 rounded-lg border border-white/[0.08] bg-[#0B0C12] px-2 text-xs text-white focus:outline-none focus:border-[#7C5CFF]"
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
                    list="tbad-subject-options"
                    className="h-9 rounded-lg border border-white/[0.08] bg-[#0B0C12] px-2.5 text-xs text-white placeholder:text-[#6D7485] focus:outline-none focus:border-[#7C5CFF] focus:ring-2 focus:ring-[#7C5CFF]/20"
                  />

                  <input
                    value={row.class}
                    onChange={(e) => updateRow(row.id, { class: e.target.value })}
                    placeholder="e.g. 5"
                    list="tbad-class-options"
                    className="h-9 rounded-lg border border-white/[0.08] bg-[#0B0C12] px-2.5 text-xs text-white placeholder:text-[#6D7485] focus:outline-none focus:border-[#7C5CFF] focus:ring-2 focus:ring-[#7C5CFF]/20"
                  />

                  <input
                    value={row.section}
                    onChange={(e) => updateRow(row.id, { section: e.target.value })}
                    placeholder="e.g. A"
                    list="tbad-section-options"
                    className="h-9 rounded-lg border border-white/[0.08] bg-[#0B0C12] px-2.5 text-xs text-white placeholder:text-[#6D7485] focus:outline-none focus:border-[#7C5CFF] focus:ring-2 focus:ring-[#7C5CFF]/20"
                  />

                  <div className="flex items-center gap-1 pt-0.5">
                    <button
                      type="button"
                      onClick={() => duplicateRow(row.id)}
                      title="Duplicate row"
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-[#6D7485] hover:text-white hover:bg-white/[0.08] transition-colors"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteRow(row.id)}
                      disabled={rows.length === 1}
                      title="Delete row"
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-[#6D7485] hover:text-[#FF5B6A] hover:bg-[#FF5B6A]/10 transition-colors disabled:opacity-30 disabled:hover:text-[#6D7485] disabled:hover:bg-transparent"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {error && (
                    <p className="col-span-6 flex items-center gap-1.5 text-[11px] font-medium text-[#FF5B6A] -mt-1">
                      <AlertTriangle className="w-3 h-3 shrink-0" />
                      {error}
                    </p>
                  )}
                </motion.div>
              );
            })}
          </div>

          <datalist id="tbad-subject-options">
            {subjectOptions.map((v) => <option key={v} value={v} />)}
          </datalist>
          <datalist id="tbad-class-options">
            {classOptions.map((v) => <option key={v} value={v} />)}
          </datalist>
          <datalist id="tbad-section-options">
            {sectionOptions.map((v) => <option key={v} value={v} />)}
          </datalist>

          {/* Toolbar */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => addRow()}
              className="h-9 px-3 flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] text-xs font-semibold text-white transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Add Row
            </button>
            <button
              type="button"
              onClick={copyPrevious}
              className="h-9 px-3 flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] text-xs font-semibold text-white transition-colors"
            >
              <Copy className="w-3.5 h-3.5" /> Copy Previous
            </button>
            <button
              type="button"
              onClick={clearAll}
              className="h-9 px-3 flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] text-xs font-semibold text-[#A8AFBF] transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" /> Clear All
            </button>
          </div>
        </div>

        {/* Sticky Save All */}
        <div className="px-6 py-4 border-t border-white/[0.08] shrink-0 flex items-center justify-between gap-4">
          <p className="text-xs text-[#6D7485]">
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
