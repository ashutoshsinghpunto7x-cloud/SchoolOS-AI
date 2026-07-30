import { useEffect, useState } from 'react';
import { CalendarRange, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useSchoolSettings, useUpdateAcademicYear } from '../hooks/useSchoolSettings';

const inputCls = 'w-full h-10 px-3 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#A855F7]/30 focus:border-[#5B21B6]';
const labelCls = 'block text-xs font-semibold text-gray-600 mb-1';

function toDateInput(iso?: string): string {
  return iso ? iso.slice(0, 10) : '';
}

export function AcademicYearPanel() {
  const { data: settings, isLoading: settingsLoading } = useSchoolSettings();
  const { mutateAsync: save, isPending: saving, error, isSuccess: saved } = useUpdateAcademicYear();

  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');

  useEffect(() => {
    if (!settings) return;
    setStart(toDateInput(settings.academicYearStart));
    setEnd(toDateInput(settings.academicYearEnd));
  }, [settings]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!start || !end) return;
    await save({ academicYearStart: start, academicYearEnd: end });
  }

  const errMsg = error instanceof Error ? error.message : null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mt-5">
      <div className="flex items-center gap-2 mb-1">
        <CalendarRange className="w-4 h-4 text-gray-400" />
        <h2 className="text-sm font-bold text-gray-900">Academic Year</h2>
      </div>
      <p className="text-xs text-gray-400 mb-4">
        Used by the Teacher Planner to break the syllabus into teaching weeks and track pace against schedule.
      </p>

      {settingsLoading ? (
        <div className="h-16 bg-gray-50 rounded-xl animate-pulse" />
      ) : (
        <form onSubmit={(e) => void handleSave(e)} className="space-y-3">
          <div className="grid grid-cols-2 gap-3 max-w-md">
            <label className="block">
              <span className={labelCls}>Starts</span>
              <input type="date" value={start} onChange={(e) => setStart(e.target.value)} className={inputCls} />
            </label>
            <label className="block">
              <span className={labelCls}>Ends</span>
              <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className={inputCls} />
            </label>
          </div>

          {errMsg && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">
              <AlertCircle className="w-4 h-4 shrink-0" /> {errMsg}
            </div>
          )}
          {saved && !errMsg && (
            <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 rounded-xl px-3 py-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" /> Academic year saved.
            </div>
          )}

          <button
            type="submit"
            disabled={saving || !start || !end}
            className="h-10 px-4 bg-[#5B21B6] hover:bg-[#4C1D95] disabled:opacity-60 text-white text-sm font-semibold rounded-xl flex items-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Save
          </button>
        </form>
      )}
    </div>
  );
}
