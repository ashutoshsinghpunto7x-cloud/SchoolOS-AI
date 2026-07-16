import { useEffect, useState } from 'react';
import { Clock, CalendarClock, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useSchoolSettings, useUpdateAttendanceRules, useUpdatePayrollConfig } from '../hooks/useSchoolSettings';

const inputCls = 'w-full h-10 px-3 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#A855F7]/30 focus:border-[#5B21B6]';
const labelCls = 'block text-xs font-semibold text-gray-600 mb-1';

export function AttendanceRulesPanel() {
  const { data: settings, isLoading } = useSchoolSettings();
  const { mutateAsync: saveRules, isPending: savingRules, error: rulesError, isSuccess: rulesSaved } = useUpdateAttendanceRules();
  const { mutateAsync: savePayrollConfig, isPending: savingConfig, error: configError, isSuccess: configSaved } = useUpdatePayrollConfig();

  const [startTime, setStartTime] = useState('09:00');
  const [lateAfter, setLateAfter] = useState('09:10');
  const [halfDayAfter, setHalfDayAfter] = useState('09:30');
  const [schoolEndTime, setSchoolEndTime] = useState('17:00');
  const [workingDaysPerMonth, setWorkingDaysPerMonth] = useState('26');

  useEffect(() => {
    if (!settings) return;
    setStartTime(settings.attendanceRules.startTime);
    setLateAfter(settings.attendanceRules.lateAfter);
    setHalfDayAfter(settings.attendanceRules.halfDayAfter);
    setSchoolEndTime(settings.attendanceRules.schoolEndTime);
    setWorkingDaysPerMonth(String(settings.payrollConfig.workingDaysPerMonth));
  }, [settings]);

  async function handleSaveRules(e: React.FormEvent) {
    e.preventDefault();
    await saveRules({ startTime, lateAfter, halfDayAfter, schoolEndTime });
  }

  async function handleSavePayrollConfig(e: React.FormEvent) {
    e.preventDefault();
    const days = Number(workingDaysPerMonth);
    if (!days || days < 1 || days > 31) return;
    await savePayrollConfig({ workingDaysPerMonth: days });
  }

  const rulesErr = rulesError instanceof Error ? rulesError.message : null;
  const configErr = configError instanceof Error ? configError.message : null;

  if (isLoading) {
    return <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 h-48 animate-pulse" />;
  }

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mt-5">
        <div className="flex items-center gap-2 mb-1">
          <Clock className="w-4 h-4 text-gray-400" />
          <h2 className="text-sm font-bold text-gray-900">Attendance Rules</h2>
        </div>
        <p className="text-xs text-gray-400 mb-4">
          Controls how staff QR check-ins are marked present/late/half-day, and feeds payroll deductions.
        </p>

        <form onSubmit={(e) => void handleSaveRules(e)} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label>
              <span className={labelCls}>School Start Time</span>
              <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className={inputCls} />
            </label>
            <label>
              <span className={labelCls}>Late After</span>
              <input type="time" value={lateAfter} onChange={(e) => setLateAfter(e.target.value)} className={inputCls} />
            </label>
            <label>
              <span className={labelCls}>Half-Day After</span>
              <input type="time" value={halfDayAfter} onChange={(e) => setHalfDayAfter(e.target.value)} className={inputCls} />
            </label>
            <label>
              <span className={labelCls}>School End Time</span>
              <input type="time" value={schoolEndTime} onChange={(e) => setSchoolEndTime(e.target.value)} className={inputCls} />
            </label>
          </div>

          {rulesErr && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">
              <AlertCircle className="w-4 h-4 shrink-0" /> {rulesErr}
            </div>
          )}
          {rulesSaved && !rulesErr && (
            <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 rounded-xl px-3 py-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" /> Attendance rules saved.
            </div>
          )}

          <button
            type="submit"
            disabled={savingRules}
            className="h-10 px-4 bg-[#5B21B6] hover:bg-[#4C1D95] disabled:opacity-60 text-white text-sm font-semibold rounded-xl flex items-center gap-2"
          >
            {savingRules ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Save Attendance Rules
          </button>
        </form>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mt-5">
        <div className="flex items-center gap-2 mb-1">
          <CalendarClock className="w-4 h-4 text-gray-400" />
          <h2 className="text-sm font-bold text-gray-900">Payroll Configuration</h2>
        </div>
        <p className="text-xs text-gray-400 mb-4">
          Used to compute each employee's daily rate (monthly salary ÷ working days) when generating payroll.
        </p>

        <form onSubmit={(e) => void handleSavePayrollConfig(e)} className="flex items-end gap-3 flex-wrap">
          <label>
            <span className={labelCls}>Working Days Per Month</span>
            <input
              type="number" min={1} max={31} value={workingDaysPerMonth}
              onChange={(e) => setWorkingDaysPerMonth(e.target.value)}
              className={`${inputCls} w-40`}
            />
          </label>
          <button
            type="submit"
            disabled={savingConfig}
            className="h-10 px-4 bg-[#5B21B6] hover:bg-[#4C1D95] disabled:opacity-60 text-white text-sm font-semibold rounded-xl flex items-center gap-2"
          >
            {savingConfig ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Save
          </button>
        </form>

        {configErr && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2 mt-3">
            <AlertCircle className="w-4 h-4 shrink-0" /> {configErr}
          </div>
        )}
        {configSaved && !configErr && (
          <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 rounded-xl px-3 py-2 mt-3">
            <CheckCircle2 className="w-4 h-4 shrink-0" /> Payroll settings saved.
          </div>
        )}
      </div>
    </>
  );
}
