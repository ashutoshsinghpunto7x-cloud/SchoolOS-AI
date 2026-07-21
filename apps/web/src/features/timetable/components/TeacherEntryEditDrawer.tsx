import { useState, useEffect } from 'react';
import { X, Loader2, Trash2, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import type { PeriodSlot, TeacherTimetableEntry } from '@schoolos/types';
import { useBulkUpdateTeacherTimetableEntries } from '../hooks/useTeacherTimetable';

const DAY_NAMES: Record<number, string> = {
  1: 'Monday', 2: 'Tuesday', 3: 'Wednesday',
  4: 'Thursday', 5: 'Friday', 6: 'Saturday',
};

interface TeacherEntryEditDrawerProps {
  timetableId: string;
  teacherId: string;
  allEntries: TeacherTimetableEntry[];
  dayOfWeek: number;
  slot: PeriodSlot;
  entry?: TeacherTimetableEntry;
  onClose: () => void;
}

const inputCls = `h-11 w-full rounded-xl border border-[var(--tt-border)] px-3 text-sm bg-[var(--tt-bg-secondary)] text-[var(--tt-text-primary)] placeholder:text-[var(--tt-text-muted)]
  focus:outline-none focus:border-[#7C5CFF] focus:ring-2 focus:ring-[#7C5CFF]/25`;

export const TeacherEntryEditDrawer = ({
  timetableId, teacherId, allEntries, dayOfWeek, slot, entry, onClose,
}: TeacherEntryEditDrawerProps) => {
  const { mutate: save, isPending: saving, error: saveError } = useBulkUpdateTeacherTimetableEntries(timetableId, teacherId);
  const [conflicts, setConflicts] = useState<string[]>([]);

  const [form, setForm] = useState({
    subjectName: entry?.subjectName ?? '',
    class:       entry?.class       ?? '',
    section:     entry?.section     ?? '',
    roomNumber:  entry?.roomNumber  ?? '',
  });

  useEffect(() => {
    setForm({
      subjectName: entry?.subjectName ?? '',
      class:       entry?.class       ?? '',
      section:     entry?.section     ?? '',
      roomNumber:  entry?.roomNumber  ?? '',
    });
  }, [entry]);

  const set = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement>) => setForm((p) => ({ ...p, [k]: e.target.value }));

  function buildEntries(next?: TeacherTimetableEntry): TeacherTimetableEntry[] {
    const others = allEntries.filter((e) => !(e.dayOfWeek === dayOfWeek && e.slotId === slot._id));
    return next ? [...others, next] : others;
  }

  function handleSave(ev: React.FormEvent) {
    ev.preventDefault();
    if (!form.subjectName.trim()) return;
    const nextEntry: TeacherTimetableEntry = {
      dayOfWeek,
      slotId:      slot._id,
      subjectName: form.subjectName.trim(),
      class:       form.class.trim()   || undefined,
      section:     form.section.trim() || undefined,
      roomNumber:  form.roomNumber.trim() || undefined,
    };
    save(
      { entries: buildEntries(nextEntry) },
      {
        onSuccess: (result) => {
          if (result.conflicts.length) { setConflicts(result.conflicts); return; }
          onClose();
        },
      },
    );
  }

  function handleRemove() {
    save({ entries: buildEntries(undefined) }, { onSuccess: onClose });
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="flex-1 bg-black/50 backdrop-blur-sm" onClick={onClose}
      />

      <motion.div
        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
        transition={{ duration: 0.28, ease: [0.33, 1, 0.68, 1] }}
        className="w-full max-w-sm bg-[var(--tt-card)] border-l border-[var(--tt-border)] h-full shadow-2xl flex flex-col overflow-y-auto"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--tt-border)]">
          <div>
            <h2 className="text-base font-bold text-[var(--tt-text-primary)]">
              {entry ? 'Edit Entry' : 'Add Entry'}
            </h2>
            <p className="text-xs text-[var(--tt-text-secondary)] mt-0.5">
              {DAY_NAMES[dayOfWeek]} · {slot.name} ({slot.startTime}–{slot.endTime})
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

        <form onSubmit={handleSave} className="flex-1 flex flex-col gap-4 px-5 py-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-[var(--tt-text-secondary)]">
              Subject <span className="text-[#FF5B6A]">*</span>
            </label>
            <input
              value={form.subjectName}
              onChange={set('subjectName')}
              className={inputCls}
              placeholder="e.g. Mathematics"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-[var(--tt-text-secondary)]">Class</label>
              <input value={form.class} onChange={set('class')} className={inputCls} placeholder="e.g. 5" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-[var(--tt-text-secondary)]">Section</label>
              <input value={form.section} onChange={set('section')} className={inputCls} placeholder="e.g. A" />
            </div>
          </div>
          <p className="text-xs text-[var(--tt-text-muted)] -mt-2">Setting Class + Section auto-updates that class's own timetable too.</p>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-[var(--tt-text-secondary)]">Room / Lab</label>
            <input
              value={form.roomNumber}
              onChange={set('roomNumber')}
              className={inputCls}
              placeholder="e.g. Room 12, Lab A"
            />
          </div>

          {conflicts.length > 0 && (
            <div className="p-3 bg-[#F5A524]/10 rounded-xl border border-[#F5A524]/25 flex flex-col gap-2">
              <div className="flex items-center gap-1.5 text-[#F5A524]">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <p className="text-sm font-bold">Double-booking warning</p>
              </div>
              {conflicts.map((c, i) => (
                <p key={i} className="text-xs text-[#F5A524]">{c}</p>
              ))}
              <button
                type="button"
                onClick={onClose}
                className="self-start text-xs font-semibold text-[#F5A524] hover:underline mt-1"
              >
                Saved anyway — close
              </button>
            </div>
          )}

          {saveError && (
            <div className="p-3 bg-[#FF5B6A]/10 rounded-xl border border-[#FF5B6A]/25">
              <p className="text-sm text-[#FF5B6A]">{(saveError as Error).message}</p>
            </div>
          )}

          <div className="flex gap-3 mt-auto pt-4 border-t border-[var(--tt-border)]">
            {entry && (
              <button
                type="button"
                onClick={handleRemove}
                disabled={saving}
                className="h-11 px-4 rounded-xl border border-[#FF5B6A]/25 bg-[#FF5B6A]/10 hover:bg-[#FF5B6A]/20
                           flex items-center gap-1.5 text-sm font-semibold text-[#FF5B6A]
                           transition-colors disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                Clear
              </button>
            )}
            <button
              type="submit"
              disabled={saving || !form.subjectName.trim()}
              className="flex-1 h-11 rounded-xl text-sm font-bold text-white transition-opacity disabled:opacity-50
                         flex items-center justify-center gap-2 hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #7C5CFF 0%, #E954B8 100%)' }}
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Save
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
