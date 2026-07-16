import { useState } from 'react';
import { X, Loader2, AlertCircle, CheckCircle2, XCircle, Zap } from 'lucide-react';
import { useGenerateAllPayroll } from '../hooks/usePayroll';
import type { GenerateAllPayrollResult } from '@schoolos/types';

const inputCls = 'w-full h-11 px-3.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#A855F7]/30 focus:border-[#5B21B6]';
const labelCls = 'block text-xs font-semibold text-gray-600 mb-1';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export function GenerateAllPayrollModal({
  month, year, onClose,
}: { month: number; year: number; onClose: () => void }) {
  const { mutateAsync, isPending, error } = useGenerateAllPayroll();
  const [selMonth, setSelMonth] = useState(month);
  const [selYear, setSelYear] = useState(year);
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState<GenerateAllPayrollResult | null>(null);

  async function handleConfirm() {
    const res = await mutateAsync({ month: selMonth, year: selYear });
    setResult(res);
  }

  const displayErr = error instanceof Error ? error.message : null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl p-5 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-gray-900">Generate Payroll for All</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100"><X className="w-4 h-4 text-gray-500" /></button>
        </div>

        {result ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 rounded-xl px-3 py-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0" /> Generated for {result.succeeded.length} employee(s).
            </div>
            {result.failed.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-gray-600 flex items-center gap-1.5"><XCircle className="w-3.5 h-3.5 text-red-500" /> Failed ({result.failed.length})</p>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {result.failed.map((f, i) => (
                    <div key={i} className="text-xs bg-red-50 text-red-700 rounded-lg px-2.5 py-1.5">
                      <span className="font-semibold">{f.employeeId}</span>: {f.error}
                    </div>
                  ))}
                </div>
              </div>
            )}
            <button onClick={onClose} className="w-full h-11 bg-gray-900 hover:bg-black text-white font-semibold rounded-xl text-sm">
              Done
            </button>
          </div>
        ) : confirming ? (
          <div className="space-y-3.5">
            <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 rounded-xl px-3 py-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              This will generate (or regenerate) payroll for every active employee for {MONTHS[selMonth - 1]} {selYear}. Continue?
            </div>
            {displayErr && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">
                <AlertCircle className="w-4 h-4 shrink-0" /> {displayErr}
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={() => setConfirming(false)} disabled={isPending} className="flex-1 h-11 bg-white border border-gray-200 text-gray-700 font-semibold rounded-xl text-sm">
                Back
              </button>
              <button
                onClick={() => void handleConfirm()}
                disabled={isPending}
                className="flex-1 h-11 bg-[#5B21B6] hover:bg-[#4C1D95] disabled:opacity-60 text-white font-semibold rounded-xl text-sm flex items-center justify-center gap-2"
              >
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />} Confirm & Generate
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3.5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Month</label>
                <select value={selMonth} onChange={(e) => setSelMonth(Number(e.target.value))} className={inputCls}>
                  {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Year</label>
                <input type="number" value={selYear} onChange={(e) => setSelYear(Number(e.target.value))} className={inputCls} />
              </div>
            </div>
            <button
              onClick={() => setConfirming(true)}
              className="w-full h-11 bg-[#5B21B6] hover:bg-[#4C1D95] text-white font-semibold rounded-xl text-sm flex items-center justify-center gap-2"
            >
              Continue
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
