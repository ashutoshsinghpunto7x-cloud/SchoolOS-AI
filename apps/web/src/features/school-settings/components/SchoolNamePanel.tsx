import { useEffect, useState } from 'react';
import { School, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useSchoolSettings, useUpdateSchoolName } from '../hooks/useSchoolSettings';

const inputCls = 'w-full h-10 px-3 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#A855F7]/30 focus:border-[#5B21B6]';
const labelCls = 'block text-xs font-semibold text-gray-600 mb-1';

export function SchoolNamePanel() {
  const { data: settings, isLoading } = useSchoolSettings();
  const { mutateAsync: save, isPending: saving, error, isSuccess: saved } = useUpdateSchoolName();
  const [name, setName] = useState('');

  useEffect(() => {
    if (settings) setName(settings.schoolName ?? '');
  }, [settings]);

  const trimmed = name.trim();
  const unchanged = trimmed === (settings?.schoolName ?? '');

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (trimmed.length < 2 || unchanged) return;
    await save(trimmed);
  }

  const errMsg = error instanceof Error ? error.message : null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mt-5">
      <div className="flex items-center gap-2 mb-1">
        <School className="w-4 h-4 text-gray-400" />
        <h2 className="text-sm font-bold text-gray-900">School Name</h2>
      </div>
      <p className="text-xs text-gray-400 mb-4">
        Shown across your school&apos;s dashboards. Only people in your school ever see it.
      </p>

      {isLoading ? (
        <div className="h-10 bg-gray-50 rounded-xl animate-pulse" />
      ) : (
        <form onSubmit={(e) => void handleSave(e)} className="space-y-3">
          <label className="block max-w-md">
            <span className={labelCls}>Name of your school</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={120}
              className={inputCls}
              placeholder="e.g. Sunrise Public School"
            />
          </label>

          {errMsg && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">
              <AlertCircle className="w-4 h-4 shrink-0" /> {errMsg}
            </div>
          )}
          {saved && !errMsg && unchanged && (
            <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 rounded-xl px-3 py-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" /> School name saved.
            </div>
          )}

          <button
            type="submit"
            disabled={saving || trimmed.length < 2 || unchanged}
            className="h-10 px-4 bg-[#5B21B6] hover:bg-[#4C1D95] disabled:opacity-60 text-white text-sm font-semibold rounded-xl flex items-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Save
          </button>
        </form>
      )}
    </div>
  );
}
