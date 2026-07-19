import { useState, useEffect } from 'react';
import { X, Loader2, Trash2, Search, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import type { PeriodSlot, TimetableEntry } from '@schoolos/types';
import { useUpsertEntry, useRemoveEntry } from '../hooks/useTimetable';
import { useTeachersPaginated } from '@/features/teachers/hooks/useTeachers';

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

const inputCls = `h-11 w-full rounded-xl border border-white/[0.08] px-3 text-sm bg-[#12141D] text-white placeholder:text-[#6D7485]
  focus:outline-none focus:border-[#7C5CFF] focus:ring-2 focus:ring-[#7C5CFF]/25`;

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

  // Teacher picker — search against real Teacher records instead of free
  // text, so teacherId is always a genuine system ID (required for both
  // conflict detection here and the class→teacher timetable auto-sync).
  const [teacherQuery, setTeacherQuery] = useState(entry?.teacherName ?? '');
  const [teacherDropdownOpen, setTeacherDropdownOpen] = useState(false);
  const { data: teacherResults, isLoading: teacherSearching } = useTeachersPaginated(
    teacherDropdownOpen && teacherQuery.trim().length >= 2 ? { search: teacherQuery.trim(), limit: 8 } : {},
  );

  useEffect(() => {
    setForm({
      subjectName: entry?.subjectName ?? '',
      teacherName: entry?.teacherName ?? '',
      teacherId:   entry?.teacherId   ?? '',
      roomNumber:  entry?.roomNumber  ?? '',
    });
    setTeacherQuery(entry?.teacherName ?? '');
  }, [entry]);

  const set = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement>) => setForm((p) => ({ ...p, [k]: e.target.value }));

  function selectTeacher(t: { _id: string; fullName: string }) {
    setForm((p) => ({ ...p, teacherName: t.fullName, teacherId: t._id }));
    setTeacherQuery(t.fullName);
    setTeacherDropdownOpen(false);
  }

  function clearTeacher() {
    setForm((p) => ({ ...p, teacherName: '', teacherId: '' }));
    setTeacherQuery('');
  }

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
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="flex-1 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ duration: 0.28, ease: [0.33, 1, 0.68, 1] }}
        className="w-full max-w-sm bg-[#181B26] border-l border-white/[0.08] h-full shadow-2xl flex flex-col overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.08]">
          <div>
            <h2 className="text-base font-bold text-white">
              {entry ? 'Edit Entry' : 'Add Entry'}
            </h2>
            <p className="text-xs text-[#A8AFBF] mt-0.5">
              {DAY_NAMES[dayOfWeek]} · {slot.name} ({slot.startTime}–{slot.endTime})
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

        {/* Form */}
        <form onSubmit={handleSave} className="flex-1 flex flex-col gap-4 px-5 py-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-[#A8AFBF]">
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

          <div className="flex flex-col gap-1.5 relative">
            <label className="text-sm font-semibold text-[#A8AFBF]">Teacher</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6D7485]" />
              <input
                value={teacherQuery}
                onChange={(e) => { setTeacherQuery(e.target.value); setTeacherDropdownOpen(true); if (!e.target.value.trim()) clearTeacher(); }}
                onFocus={() => setTeacherDropdownOpen(true)}
                onBlur={() => setTimeout(() => setTeacherDropdownOpen(false), 150)}
                className={`${inputCls} pl-9`}
                placeholder="Search a teacher by name…"
                autoComplete="off"
              />
              {form.teacherId && (
                <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#2ED47A]" />
              )}
            </div>
            <p className="text-xs text-[#6D7485]">Picked from existing teacher records — enables automatic conflict detection and syncs to their personal timetable.</p>

            {teacherDropdownOpen && teacherQuery.trim().length >= 2 && (
              <div className="absolute top-full left-0 right-0 mt-1 z-10 bg-[#12141D] border border-white/[0.08] rounded-xl shadow-lg max-h-48 overflow-y-auto">
                {teacherSearching ? (
                  <div className="p-3 text-center"><Loader2 className="w-4 h-4 animate-spin text-[#6D7485] mx-auto" /></div>
                ) : !teacherResults?.data.length ? (
                  <p className="p-3 text-xs text-[#6D7485] text-center">No teachers found</p>
                ) : (
                  teacherResults.data.map((t) => (
                    <button
                      key={t._id}
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); selectTeacher(t); }}
                      className="w-full text-left px-3 py-2 text-sm text-white hover:bg-white/[0.06] flex items-center justify-between"
                    >
                      <span>{t.fullName}</span>
                      {t.department && <span className="text-xs text-[#6D7485]">{t.department}</span>}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-[#A8AFBF]">Room / Lab</label>
            <input
              value={form.roomNumber}
              onChange={set('roomNumber')}
              className={inputCls}
              placeholder="e.g. Room 12, Lab A"
            />
          </div>

          {saveError && (
            <div className="p-3 bg-[#FF5B6A]/10 rounded-xl border border-[#FF5B6A]/25">
              <p className="text-sm text-[#FF5B6A]">{(saveError as Error).message}</p>
            </div>
          )}

          <div className="flex gap-3 mt-auto pt-4 border-t border-white/[0.08]">
            {entry && (
              <button
                type="button"
                onClick={handleRemove}
                disabled={removing}
                className="h-11 px-4 rounded-xl border border-[#FF5B6A]/25 bg-[#FF5B6A]/10 hover:bg-[#FF5B6A]/20
                           flex items-center gap-1.5 text-sm font-semibold text-[#FF5B6A]
                           transition-colors disabled:opacity-50"
              >
                {removing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
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
