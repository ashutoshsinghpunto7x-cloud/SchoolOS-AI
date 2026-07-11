import { useState, useEffect } from 'react';
import { X, Loader2, Trash2 } from 'lucide-react';
import type { PeriodSlot, TimetableEntry } from '@schoolos/types';
import { useUpsertEntry, useRemoveEntry } from '../hooks/useTimetable';

const DAY_NAMES: Record<number, string> = {
  1: 'Monday', 2: 'Tuesday', 3: 'Wednesday',
  4: 'Thursday', 5: 'Friday', 6: 'Saturday',
};

interface EntryEditDrawerProps {
  timetableId: string;
  dayOfWeek: number;
  slot: PeriodSlot;
  entry?: TimetableEntry;
  onClose: () => void;
}

const inputCls = `h-11 w-full rounded-xl border border-gray-200 px-3 text-sm
  focus:outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/20 bg-white`;

export const EntryEditDrawer = ({
  timetableId, dayOfWeek, slot, entry, onClose,
}: EntryEditDrawerProps) => {
  const { mutate: upsert, isPending: saving, error: saveError } = useUpsertEntry(timetableId);
  const { mutate: remove, isPending: removing }                  = useRemoveEntry(timetableId);

  const [form, setForm] = useState({
    subjectName: entry?.subjectName ?? '',
    teacherName: entry?.teacherName ?? '',
    teacherId:   entry?.teacherId   ?? '',
    roomNumber:  entry?.roomNumber  ?? '',
  });

  useEffect(() => {
    setForm({
      subjectName: entry?.subjectName ?? '',
      teacherName: entry?.teacherName ?? '',
      teacherId:   entry?.teacherId   ?? '',
      roomNumber:  entry?.roomNumber  ?? '',
    });
  }, [entry]);

  const set = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement>) => setForm((p) => ({ ...p, [k]: e.target.value }));

  function handleSave(ev: React.FormEvent) {
    ev.preventDefault();
    if (!form.subjectName.trim()) return;
    upsert(
      {
        dayOfWeek,
        slotId:      slot._id,
        subjectName: form.subjectName.trim(),
        teacherName: form.teacherName.trim() || undefined,
        teacherId:   form.teacherId.trim()   || undefined,
        roomNumber:  form.roomNumber.trim()  || undefined,
      },
      { onSuccess: onClose },
    );
  }

  function handleRemove() {
    remove({ dayOfWeek, slotId: slot._id }, { onSuccess: onClose });
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="w-full max-w-sm bg-white h-full shadow-2xl flex flex-col overflow-y-auto">
        {/* Header */}
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

        {/* Form */}
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

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-gray-700">Teacher Name</label>
            <input
              value={form.teacherName}
              onChange={set('teacherName')}
              className={inputCls}
              placeholder="e.g. Mrs. Sharma"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-gray-700">Teacher ID</label>
            <input
              value={form.teacherId}
              onChange={set('teacherId')}
              className={inputCls}
              placeholder="System teacher ID (for conflict check)"
            />
            <p className="text-xs text-gray-400">Used for automatic conflict detection</p>
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
                disabled={removing}
                className="h-11 px-4 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100
                           flex items-center gap-1.5 text-sm font-semibold text-red-600
                           transition-colors disabled:opacity-50"
              >
                {removing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
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
