import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useCreateTimetable } from '../hooks/useTimetable';
import type { CreateTimetablePayload } from '@schoolos/types';

const CLASSES = ['Nursery','LKG','UKG','1','2','3','4','5','6','7','8','9','10','11','12'];

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

export const NewTimetablePage = () => {
  const navigate = useNavigate();
  const { mutate: create, isPending, error } = useCreateTimetable();

  const [form, setForm] = useState<CreateTimetablePayload>({
    class:        '',
    section:      '',
    academicYear: new Date().getFullYear() + '-' + String(new Date().getFullYear() + 1).slice(2),
    term:         '',
    notes:        '',
  });

  const set = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((p) => ({ ...p, [k]: e.target.value }));

  function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    const payload: CreateTimetablePayload = {
      class:        form.class,
      section:      form.section.trim(),
      academicYear: form.academicYear.trim(),
      term:         form.term?.trim() || undefined,
      notes:        form.notes?.trim() || undefined,
    };
    create(payload, {
      onSuccess: (tt) => navigate(`/timetable/${tt._id}`),
    });
  }

  return (
    <div className="px-6 py-6 max-w-xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button
          type="button"
          onClick={() => navigate('/timetable')}
          className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Timetable</h1>
          <p className="text-sm text-gray-500 mt-0.5">Create a class schedule</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Class" required>
              <select value={form.class} onChange={set('class')} className={inputCls} required>
                <option value="">Select class</option>
                {CLASSES.map((c) => <option key={c} value={c}>Class {c}</option>)}
              </select>
            </Field>

            <Field label="Section" required>
              <input
                value={form.section}
                onChange={set('section')}
                className={inputCls}
                placeholder="A / B / C"
                required
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Academic Year" required>
              <input
                value={form.academicYear}
                onChange={set('academicYear')}
                className={inputCls}
                placeholder="e.g. 2024-25"
                required
              />
            </Field>

            <Field label="Term">
              <input
                value={form.term ?? ''}
                onChange={set('term')}
                className={inputCls}
                placeholder="Term 1 / Annual (optional)"
              />
            </Field>
          </div>

          <Field label="Notes">
            <textarea
              value={form.notes ?? ''}
              onChange={set('notes')}
              rows={3}
              className={`${inputCls} h-auto py-2.5 resize-none`}
              placeholder="Internal notes (optional)"
            />
          </Field>

          {error && (
            <p className="text-sm text-red-600">{(error as Error).message}</p>
          )}

          <button
            type="submit"
            disabled={isPending || !form.class || !form.section.trim() || !form.academicYear.trim()}
            className="h-11 rounded-xl bg-blue-600 hover:bg-blue-700 flex items-center justify-center gap-2
                       text-sm font-bold text-white transition-colors disabled:opacity-50"
          >
            {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Create Timetable
          </button>
        </form>
      </div>
    </div>
  );
};
