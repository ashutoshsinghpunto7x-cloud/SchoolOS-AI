import { useState, useEffect } from 'react';
import { X, Loader2, Trash2, AlertTriangle } from 'lucide-react';
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

const inputCls = `h-11 w-full rounded-xl border border-gray-200 px-3 text-sm
  focus:outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/20 bg-white`;

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
      <div className="flex-1 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      <div className="w-full max-w-sm bg-white h-full shadow-2xl flex flex-col overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-gray-900">
              {entry ? 'Edit Entry' : 'Add Entry'}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {DAY_NAMES[dayOfWeek]} · {slot.name} ({slot.startTime}–{slot.endTime})
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="flex-1 flex flex-col gap-4 px-5 py-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-gray-700">
              Subject <span className="text-red-500">*</span>
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
              <label className="text-sm font-semibold text-gray-700">Class</label>
              <input value={form.class} onChange={set('class')} className={inputCls} placeholder="e.g. 5" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-gray-700">Section</label>
              <input value={form.section} onChange={set('section')} className={inputCls} placeholder="e.g. A" />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-gray-700">Room / Lab</label>
            <input
              value={form.roomNumber}
              onChange={set('roomNumber')}
              className={inputCls}
              placeholder="e.g. Room 12, Lab A"
            />
          </div>

          {conflicts.length > 0 && (
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex flex-col gap-2">
              <div className="flex items-center gap-1.5 text-amber-700">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <p className="text-sm font-bold">Double-booking warning</p>
              </div>
              {conflicts.map((c, i) => (
                <p key={i} className="text-xs text-amber-700">{c}</p>
              ))}
              <button
                type="button"
                onClick={onClose}
                className="self-start text-xs font-semibold text-amber-800 hover:underline mt-1"
              >
                Saved anyway — close
              </button>
            </div>
          )}

          {saveError && (
            <div className="p-3 bg-red-50 rounded-xl border border-red-200">
              <p className="text-sm text-red-700">{(saveError as Error).message}</p>
            </div>
          )}

          <div className="flex gap-3 mt-auto pt-4 border-t border-gray-100">
            {entry && (
              <button
                type="button"
                onClick={handleRemove}
                disabled={saving}
                className="h-11 px-4 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100
                           flex items-center gap-1.5 text-sm font-semibold text-red-600
                           transition-colors disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                Clear
              </button>
            )}
            <button
              type="submit"
              disabled={saving || !form.subjectName.trim()}
              className="flex-1 h-11 rounded-xl bg-[#5B21B6] hover:bg-[#4C1D95]
                         flex items-center justify-center gap-2
                         text-sm font-bold text-white transition-colors disabled:opacity-50"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
