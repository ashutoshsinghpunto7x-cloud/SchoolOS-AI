import { useEffect, useState } from 'react';
import { Lock, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useSchoolSettings, useUpdateAttendanceEditPolicy } from '../hooks/useSchoolSettings';

const inputCls = 'w-full h-10 px-3 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#A855F7]/30 focus:border-[#5B21B6]';
const labelCls = 'block text-xs font-semibold text-gray-600 mb-1';

export function AttendanceEditCutoffPanel() {
  const { data: settings, isLoading: settingsLoading } = useSchoolSettings();
  const { mutateAsync: savePolicy, isPending: saving, error, isSuccess: saved } = useUpdateAttendanceEditPolicy();

  const [enabled, setEnabled] = useState(false);
  const [cutoffTime, setCutoffTime] = useState('18:00');

  useEffect(() => {
    if (!settings) return;
    const existing = settings.attendanceEditPolicy?.cutoffTime;
    setEnabled(!!existing);
    if (existing) setCutoffTime(existing);
  }, [settings]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    await savePolicy({ cutoffTime: enabled ? cutoffTime : undefined });
  }

  const errMsg = error instanceof Error ? error.message : null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mt-5">
      <div className="flex items-center gap-2 mb-1">
        <Lock className="w-4 h-4 text-gray-400" />
        <h2 className="text-sm font-bold text-gray-900">Attendance Edit Cutoff</h2>
      </div>
      <p className="text-xs text-gray-400 mb-4">
        Teachers can never edit past attendance — it's always view-only. Use this to also close off
        today's attendance for editing after a set time each day.
      </p>

      {settingsLoading ? (
        <div className="h-16 bg-gray-50 rounded-xl animate-pulse" />
      ) : (
        <form onSubmit={(e) => void handleSave(e)} className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-800">Enforce a daily cutoff time</span>
            <button
              type="button"
              onClick={() => setEnabled((v) => !v)}
              className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${enabled ? 'bg-[#A855F7]' : 'bg-gray-200'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>

          {enabled && (
            <label className="block max-w-[200px]">
              <span className={labelCls}>Editing Closes At</span>
              <input type="time" value={cutoffTime} onChange={(e) => setCutoffTime(e.target.value)} className={inputCls} />
            </label>
          )}

          {errMsg && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">
              <AlertCircle className="w-4 h-4 shrink-0" /> {errMsg}
            </div>
          )}
          {saved && !errMsg && (
            <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 rounded-xl px-3 py-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" /> Attendance edit cutoff saved.
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="h-10 px-4 bg-[#5B21B6] hover:bg-[#4C1D95] disabled:opacity-60 text-white text-sm font-semibold rounded-xl flex items-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Save
          </button>
        </form>
      )}
    </div>
  );
}
