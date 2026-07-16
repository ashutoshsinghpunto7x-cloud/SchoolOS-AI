import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Loader2, AlertCircle, Zap } from 'lucide-react';
import { useGeneratePayroll } from '../hooks/usePayroll';

const inputCls = 'w-full h-11 px-3.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#A855F7]/30 focus:border-[#5B21B6]';
const labelCls = 'block text-xs font-semibold text-gray-600 mb-1';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

/** Generate/regenerate a single employee's payroll for a chosen month/year —
 *  reached from EmployeeProfilePage. Navigates to the resulting slip on success. */
export function GenerateSinglePayrollModal({
  employeeObjectId, employeeName, onClose,
}: { employeeObjectId: string; employeeName: string; onClose: () => void }) {
  const navigate = useNavigate();
  const { mutateAsync, isPending, error } = useGeneratePayroll();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const record = await mutateAsync({ employeeObjectId, month, year });
    onClose();
    navigate(`/admin/payroll/${record._id}`);
  }

  const displayErr = error instanceof Error ? error.message : null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-gray-900">Generate Payroll</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100"><X className="w-4 h-4 text-gray-500" /></button>
        </div>
        <p className="text-sm text-gray-500 mb-4">{employeeName}</p>
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Month</label>
              <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className={inputCls}>
                {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Year</label>
              <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} className={inputCls} />
            </div>
          </div>
          <p className="text-xs text-gray-400">If a record already exists for this month, it will be regenerated from current attendance and salary data.</p>
          {displayErr && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">
              <AlertCircle className="w-4 h-4 shrink-0" /> {displayErr}
            </div>
          )}
          <button type="submit" disabled={isPending} className="w-full h-11 bg-[#5B21B6] hover:bg-[#4C1D95] disabled:opacity-60 text-white font-semibold rounded-xl text-sm flex items-center justify-center gap-2">
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />} Generate Payroll
          </button>
        </form>
      </div>
    </div>
  );
}
