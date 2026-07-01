import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import type { Timetable, PeriodSlot, CreateSubstitutePayload } from '@schoolos/types';
import { useCreateSubstitute } from '../hooks/useTimetable';

interface SubstituteFormProps {
  timetable: Timetable;
  slots: PeriodSlot[];
  onSuccess?: () => void;
  onCancel?: () => void;
}

const inputCls = `h-11 w-full rounded-xl border border-gray-200 px-3 text-sm
  focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 bg-white`;

const Field = ({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-sm font-semibold text-gray-700">
      {label}{required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
    {children}
  </div>
);

// Parse YYYY-MM-DD as local date (avoids UTC midnight timezone shift).
// Returns 1=Mon … 6=Sat, 7=Sun.
function dateStrToDayOfWeek(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dow = new Date(y, m - 1, d).getDay();
  return dow === 0 ? 7 : dow;
}

export const SubstituteForm = ({ timetable, slots, onSuccess, onCancel }: SubstituteFormProps) => {
  const { mutate: create, isPending, error } = useCreateSubstitute();
  const schedulable = slots.filter((s) => !s.isBreak);

  const [form, setForm] = useState(() => {
    const today = new Date().toISOString().slice(0, 10);
    return {
      date:                  today,
      dayOfWeek:             String(dateStrToDayOfWeek(today)),
      slotId:                '',
      substituteTeacherName: '',
      reason:                '',
      notes:                 '',
    };
  });

  const set = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((p) => ({ ...p, [k]: e.target.value }));

  function handleDateChange(e: React.ChangeEvent<HTMLInputElement>) {
    const dow = dateStrToDayOfWeek(e.target.value);
    setForm((p) => ({ ...p, date: e.target.value, dayOfWeek: String(dow) }));
  }

  function getOriginalEntry() {
    if (!form.slotId || !form.dayOfWeek) return undefined;
    return timetable.entries.find(
      (e) => e.slotId === form.slotId && e.dayOfWeek === Number(form.dayOfWeek),
    );
  }

  function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    const orig = getOriginalEntry();
    const selectedSlot = schedulable.find((s) => s._id === form.slotId);

    const payload: CreateSubstitutePayload = {
      timetableId:           timetable._id,
      class:                 timetable.class,
      section:               timetable.section,
      date:                  form.date,
      dayOfWeek:             Number(form.dayOfWeek),
      slotId:                form.slotId,
      subjectName:           orig?.subjectName ?? selectedSlot?.name ?? 'Unknown',
      originalTeacherId:     orig?.teacherId,
      originalTeacherName:   orig?.teacherName,
      substituteTeacherName: form.substituteTeacherName.trim(),
      reason:                form.reason.trim() || undefined,
      notes:                 form.notes.trim()  || undefined,
    };

    create(payload, { onSuccess });
  }

  const orig = getOriginalEntry();

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Date" required>
          <input type="date" value={form.date} onChange={handleDateChange} className={inputCls} required />
        </Field>

        <Field label="Period" required>
          <select value={form.slotId} onChange={set('slotId')} className={inputCls} required>
            <option value="">Select period</option>
            {schedulable.map((s) => (
              <option key={s._id} value={s._id}>{s.name} ({s.startTime}–{s.endTime})</option>
            ))}
          </select>
        </Field>
      </div>

      {orig && (
        <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 text-sm">
          <span className="font-semibold text-blue-800">Original: </span>
          <span className="text-blue-700">{orig.subjectName}</span>
          {orig.teacherName && <span className="text-blue-600"> · {orig.teacherName}</span>}
        </div>
      )}

      <Field label="Substitute Teacher" required>
        <input
          value={form.substituteTeacherName}
          onChange={set('substituteTeacherName')}
          className={inputCls}
          placeholder="Name of substitute teacher"
          required
        />
      </Field>

      <Field label="Reason">
        <input value={form.reason} onChange={set('reason')} className={inputCls} placeholder="Leave / sick / emergency…" />
      </Field>

      <Field label="Notes">
        <textarea
          value={form.notes}
          onChange={set('notes')}
          rows={2}
          className={`${inputCls} h-auto py-2.5 resize-none`}
          placeholder="Additional context…"
        />
      </Field>

      {error && (
        <p className="text-sm text-red-600">{(error as Error).message}</p>
      )}

      <div className="flex gap-3 justify-end pt-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="h-11 px-5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={isPending || !form.substituteTeacherName.trim() || !form.slotId}
          className="h-11 px-7 rounded-xl bg-blue-600 hover:bg-blue-700 flex items-center gap-2
                     text-sm font-bold text-white transition-colors disabled:opacity-50"
        >
          {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
          Assign Substitute
        </button>
      </div>
    </form>
  );
};
