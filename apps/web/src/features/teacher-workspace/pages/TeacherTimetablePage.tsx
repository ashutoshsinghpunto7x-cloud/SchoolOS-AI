import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, BookOpen, CalendarCheck, Pencil, Plus, Trash2, X, Loader2, AlertCircle, ChevronDown, Check,
} from 'lucide-react';
import { useTeacherWorkspace, useUpsertOwnTimetableEntry, useRemoveOwnTimetableEntry } from '../hooks/useTeacherWorkspace';
import { usePeriodSlots } from '@/features/timetable/hooks/useTimetable';
import type { TeacherWeekEntry } from '@schoolos/types';
import { cn } from '@/lib/utils';

const DAY_LABELS = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_FULL   = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const inputCls =
  'w-full h-11 px-3.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 ' +
  'placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#10B981]/30 focus:border-[#0B3D2E] transition-colors';
const labelCls = 'block text-xs font-semibold text-gray-600 mb-1';

function currentDayOfWeek(): number {
  const d = new Date().getDay(); // 0=Sun
  return d === 0 ? 7 : d;        // 1=Mon…7=Sun
}

function EntryCard({
  entry,
  editMode,
  onEdit,
  onDelete,
  isDeleting,
}: {
  entry: TeacherWeekEntry;
  editMode: boolean;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3">
      <div className="w-12 shrink-0 text-center">
        <p className="text-xs font-bold text-[#0B3D2E]">{entry.startTime}</p>
        <p className="text-xs text-gray-400">{entry.endTime}</p>
      </div>
      <div className="w-px h-10 bg-gray-100 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-gray-900 truncate">{entry.subjectName}</p>
        <p className="text-xs text-gray-500">
          Class {entry.class} – {entry.section}
          {entry.roomNumber && ` · Room ${entry.roomNumber}`}
        </p>
      </div>

      {!editMode ? (
        <div className="shrink-0 text-right">
          <p className="text-xs font-medium text-gray-400">{entry.slotName}</p>
        </div>
      ) : confirming ? (
        <div className="shrink-0 flex items-center gap-1.5">
          <button
            type="button"
            disabled={isDeleting}
            onClick={onDelete}
            className="h-8 px-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-semibold flex items-center gap-1 disabled:opacity-60"
          >
            {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Remove'}
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="h-8 w-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-500 rounded-lg"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="shrink-0 flex items-center gap-1.5">
          <button
            type="button"
            onClick={onEdit}
            className="h-8 w-8 flex items-center justify-center bg-[#10B981]/10 hover:bg-[#10B981]/20 text-[#0B3D2E] rounded-lg"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="h-8 w-8 flex items-center justify-center bg-red-50 hover:bg-red-100 text-red-500 rounded-lg"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

export function TeacherTimetablePage() {
  const navigate     = useNavigate();
  const { data, isLoading } = useTeacherWorkspace();
  const { data: periodSlots } = usePeriodSlots();
  const { mutateAsync: upsertEntry, isPending: isSaving } = useUpsertOwnTimetableEntry();
  const { mutateAsync: removeEntry, isPending: isDeleting } = useRemoveOwnTimetableEntry();

  const todayDow     = currentDayOfWeek();
  const [activeDay, setActiveDay] = useState(Math.min(todayDow, 6)); // clamp to Mon-Sat
  const [editMode, setEditMode]   = useState(false);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [formErr,  setFormErr]  = useState('');
  const [editingEntry, setEditingEntry] = useState<TeacherWeekEntry | null>(null);
  const [fSlotId,  setFSlotId]  = useState('');
  const [fCls,     setFCls]     = useState('');
  const [fSec,     setFSec]     = useState('');
  const [fSubject, setFSubject] = useState('');
  const [fRoom,    setFRoom]    = useState('');

  const activeDayEntries: TeacherWeekEntry[] =
    data?.weekSchedule.find((d) => d.dayOfWeek === activeDay)?.entries ?? [];

  const usedSlotIds = useMemo(
    () => new Set(activeDayEntries.map((e) => e.slotId)),
    [activeDayEntries],
  );

  const availableSlots = useMemo(
    () => (periodSlots ?? [])
      .filter((s) => !s.isBreak && s.daysApplicable.includes(activeDay))
      .sort((a, b) => a.orderIndex - b.orderIndex),
    [periodSlots, activeDay],
  );

  function openAddForm() {
    setEditingEntry(null);
    setFSlotId(availableSlots.find((s) => !usedSlotIds.has(s._id))?._id ?? '');
    setFCls(''); setFSec(''); setFSubject(''); setFRoom('');
    setFormErr('');
    setFormOpen(true);
  }

  function openEditForm(entry: TeacherWeekEntry) {
    setEditingEntry(entry);
    setFSlotId(entry.slotId);
    setFCls(entry.class); setFSec(entry.section);
    setFSubject(entry.subjectName); setFRoom(entry.roomNumber ?? '');
    setFormErr('');
    setFormOpen(true);
  }

  async function handleSaveEntry() {
    setFormErr('');
    if (!fSlotId)          return setFormErr('Select a period.');
    if (!fCls.trim())      return setFormErr('Class is required.');
    if (!fSec.trim())      return setFormErr('Section is required.');
    if (!fSubject.trim())  return setFormErr('Subject is required.');

    try {
      await upsertEntry({
        class:       fCls.trim(),
        section:     fSec.trim(),
        dayOfWeek:   activeDay,
        slotId:      fSlotId,
        subjectName: fSubject.trim(),
        roomNumber:  fRoom.trim() || undefined,
      });
      setFormOpen(false);
    } catch (err) {
      setFormErr(err instanceof Error ? err.message : 'Could not save this period.');
    }
  }

  async function handleDeleteEntry(entry: TeacherWeekEntry) {
    const key = `${entry.dayOfWeek}-${entry.slotId}`;
    setDeletingKey(key);
    try {
      await removeEntry({
        class: entry.class,
        section: entry.section,
        dayOfWeek: entry.dayOfWeek,
        slotId: entry.slotId,
      });
    } finally {
      setDeletingKey(null);
    }
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7]">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-4 flex items-center gap-3">
        <button
          onClick={() => navigate('/teacher')}
          className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold text-gray-900">My Timetable</h1>
          <p className="text-xs text-gray-500">{DAY_FULL[activeDay]}</p>
        </div>
        <button
          type="button"
          onClick={() => setEditMode((v) => !v)}
          className={cn(
            'h-9 px-3 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors',
            editMode ? 'bg-[#0B3D2E] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
          )}
        >
          {editMode ? <Check className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
          {editMode ? 'Done' : 'Edit'}
        </button>
      </div>

      {/* Day tabs */}
      <div className="bg-white border-b border-gray-100 px-4 py-3">
        <div className="flex gap-2 overflow-x-auto pb-0.5">
          {[1, 2, 3, 4, 5, 6].map((day) => {
            const isToday   = day === todayDow;
            const isActive  = day === activeDay;
            const hasClass  = (data?.weekSchedule.find((d) => d.dayOfWeek === day)?.entries.length ?? 0) > 0;
            return (
              <button
                key={day}
                onClick={() => setActiveDay(day)}
                className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-colors relative ${
                  isActive
                    ? 'bg-[#0B3D2E] text-white'
                    : isToday
                    ? 'bg-[#10B981]/10 text-[#0B3D2E]'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {DAY_LABELS[day]}
                {hasClass && !isActive && (
                  <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-[#10B981] rounded-full" />
                )}
                {isToday && !isActive && (
                  <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-[#0B3D2E] rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-4 py-4">
        {editMode && (
          <button
            type="button"
            onClick={openAddForm}
            className="w-full h-11 mb-3 border-2 border-dashed border-[#10B981]/30 text-[#0B3D2E] rounded-2xl text-sm font-semibold flex items-center justify-center gap-1.5 hover:bg-[#10B981]/5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Period on {DAY_FULL[activeDay]}
          </button>
        )}

        {isLoading ? (
          <div className="space-y-3 animate-pulse">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 bg-white rounded-2xl" />
            ))}
          </div>
        ) : activeDayEntries.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center mt-4">
            <BookOpen className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No classes on {DAY_FULL[activeDay]}</p>
            {!editMode && (
              <p className="text-xs text-gray-400 mt-1">Tap "Edit" above to add one yourself.</p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {activeDay === todayDow && (
              <div className="flex items-center gap-2 bg-[#10B981]/10 border border-[#10B981]/20 rounded-2xl px-4 py-2.5">
                <CalendarCheck className="w-4 h-4 text-[#0B3D2E] shrink-0" />
                <p className="text-sm text-[#0B3D2E] font-medium">Today's schedule</p>
              </div>
            )}
            {activeDayEntries.map((entry) => (
              <EntryCard
                key={`${entry.slotId}-${entry.class}-${entry.section}`}
                entry={entry}
                editMode={editMode}
                onEdit={() => openEditForm(entry)}
                onDelete={() => handleDeleteEntry(entry)}
                isDeleting={isDeleting && deletingKey === `${entry.dayOfWeek}-${entry.slotId}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Add/Edit period modal ── */}
      {formOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-5 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-gray-900">
                {editingEntry ? 'Edit Period' : 'Add Period'} — {DAY_FULL[activeDay]}
              </h3>
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className={labelCls}>Period / Slot</label>
                <div className="relative">
                  <select
                    value={fSlotId}
                    onChange={(e) => setFSlotId(e.target.value)}
                    className={cn(inputCls, 'appearance-none pr-9')}
                  >
                    <option value="">Select a period…</option>
                    {availableSlots.map((s) => (
                      <option key={s._id} value={s._id} disabled={usedSlotIds.has(s._id) && s._id !== editingEntry?.slotId}>
                        {s.name} ({s.startTime}–{s.endTime}){usedSlotIds.has(s._id) && s._id !== editingEntry?.slotId ? ' — taken' : ''}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Class</label>
                  <input
                    type="text"
                    placeholder="e.g. 6"
                    value={fCls}
                    onChange={(e) => setFCls(e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Section</label>
                  <input
                    type="text"
                    placeholder="e.g. A"
                    value={fSec}
                    maxLength={2}
                    onChange={(e) => setFSec(e.target.value.toUpperCase())}
                    className={inputCls}
                  />
                </div>
              </div>

              <div>
                <label className={labelCls}>Subject</label>
                <input
                  type="text"
                  placeholder="e.g. Mathematics"
                  value={fSubject}
                  onChange={(e) => setFSubject(e.target.value)}
                  className={inputCls}
                />
              </div>

              <div>
                <label className={labelCls}>Room (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. 204"
                  value={fRoom}
                  onChange={(e) => setFRoom(e.target.value)}
                  className={inputCls}
                />
              </div>
            </div>

            {formErr && (
              <div className="bg-red-50 border border-red-100 rounded-xl px-3.5 py-2.5 flex items-start gap-2 mt-4">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <p className="text-xs text-red-600">{formErr}</p>
              </div>
            )}

            <button
              type="button"
              disabled={isSaving}
              onClick={handleSaveEntry}
              className="w-full h-12 mt-4 bg-[#0B3D2E] hover:bg-[#08251B] disabled:opacity-60 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 transition-colors"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {editingEntry ? 'Save Changes' : 'Add Period'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
