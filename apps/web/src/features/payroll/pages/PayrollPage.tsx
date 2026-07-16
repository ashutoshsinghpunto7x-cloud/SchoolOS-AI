import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Zap, CheckCircle2, Clock, FileWarning, Wallet, Eye, RefreshCw,
} from 'lucide-react';
import { usePayrollList, usePayrollSummary } from '../hooks/usePayroll';
import { GenerateAllPayrollModal } from '../components/GenerateAllPayrollModal';
import { MarkPayrollPaidModal } from '../components/MarkPayrollPaidModal';
import type { PayrollRecord, PayrollStatus } from '@schoolos/types';
import { cn } from '@/lib/utils';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const STATUS_LABEL: Record<PayrollStatus, string> = { draft: 'Draft', generated: 'Generated', paid: 'Paid' };

function StatusBadge({ status }: { status: PayrollStatus }) {
  const cls =
    status === 'paid' ? 'bg-emerald-50 text-emerald-700' :
    status === 'generated' ? 'bg-amber-50 text-amber-700' :
    'bg-gray-100 text-gray-500';
  const Icon = status === 'paid' ? CheckCircle2 : status === 'generated' ? Clock : FileWarning;
  return (
    <span className={cn('inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full', cls)}>
      <Icon className="w-3 h-3" /> {STATUS_LABEL[status]}
    </span>
  );
}

export function PayrollPage() {
  const navigate = useNavigate();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [status, setStatus] = useState<'all' | PayrollStatus>('all');
  const [generateAllOpen, setGenerateAllOpen] = useState(false);
  const [payingRecord, setPayingRecord] = useState<PayrollRecord | null>(null);

  const { data, isLoading } = usePayrollList({
    month, year, limit: 100,
    status: status === 'all' ? undefined : status,
  });
  const { data: summary } = usePayrollSummary(month, year);

  const records = data?.data ?? [];

  const years = useMemo(() => {
    const y = now.getFullYear();
    return [y - 2, y - 1, y, y + 1];
  }, [now]);

  return (
    <div className="min-h-screen bg-white">
      <div className="bg-white border-b border-gray-200 px-4 py-4 flex items-center gap-3">
        <button onClick={() => navigate('/admin/employees')} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="flex-1">
          <h1 className="text-base font-bold text-gray-900">Payroll</h1>
        </div>
        <button
          onClick={() => setGenerateAllOpen(true)}
          className="h-9 px-3 bg-[#5B21B6] hover:bg-[#4C1D95] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5"
        >
          <Zap className="w-3.5 h-3.5" /> Generate for All
        </button>
      </div>

      <div className="px-4 py-4 max-w-4xl mx-auto space-y-4">
        {/* Month/Year picker */}
        <div className="flex items-center gap-2">
          <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="h-10 px-3 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#A855F7]/30">
            {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
          <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="h-10 px-3 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#A855F7]/30">
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3">
            <p className="text-lg font-bold text-gray-900">{fmt(summary?.totalGross ?? 0)}</p>
            <p className="text-xs text-gray-500 font-medium">Total Gross</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3">
            <p className="text-lg font-bold text-gray-900">{fmt(summary?.totalDeductions ?? 0)}</p>
            <p className="text-xs text-gray-500 font-medium">Total Deductions</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3">
            <p className="text-lg font-bold text-gray-900">{fmt(summary?.totalNet ?? 0)}</p>
            <p className="text-xs text-gray-500 font-medium">Total Net</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3">
            <p className="text-lg font-bold text-gray-900">{summary?.paidCount ?? 0}</p>
            <p className="text-xs text-gray-500 font-medium">Paid Count</p>
          </div>
        </div>

        {/* Status filter */}
        <div className="flex flex-wrap items-center gap-2">
          {(['all', 'draft', 'generated', 'paid'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={cn(
                'px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors capitalize',
                status === s ? 'bg-[#5B21B6] text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50',
              )}
            >
              {s}
            </button>
          ))}
        </div>

        {/* List */}
        {isLoading ? (
          <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-20 bg-white rounded-2xl border border-gray-200 animate-pulse" />)}</div>
        ) : !records.length ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
            <Wallet className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-gray-700">No payroll records for {MONTHS[month - 1]} {year}</p>
            <p className="text-xs text-gray-400 mt-1">Use "Generate for All" to create payroll for every active employee.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {records.map((rec) => (
              <div key={rec._id} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-700 font-bold text-sm shrink-0">
                    {rec.employeeName.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">{rec.employeeName}</p>
                    <p className="text-xs text-gray-400 truncate">{rec.designation}{rec.department ? ` · ${rec.department}` : ''}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-gray-800">{fmt(rec.netSalary)}</p>
                    <StatusBadge status={rec.status} />
                  </div>
                </div>

                <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-100 text-[11px] text-gray-500">
                  <span>Present <b className="text-gray-700">{rec.presentDays}</b></span>
                  <span>Late <b className="text-gray-700">{rec.lateDays}</b></span>
                  <span>Half <b className="text-gray-700">{rec.halfDays}</b></span>
                  <span>Absent <b className="text-gray-700">{rec.absentDays}</b></span>
                  <span className="ml-auto">Daily Rate <b className="text-gray-700">{fmt(rec.dailyRate)}</b></span>
                  <span>Deductions <b className="text-red-600">{fmt(rec.deductions)}</b></span>
                </div>

                <div className="flex gap-1.5 mt-3 justify-end">
                  <button
                    onClick={() => navigate(`/admin/payroll/${rec._id}`)}
                    className="h-8 px-3 border border-gray-300 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-50 flex items-center gap-1"
                  >
                    <Eye className="w-3.5 h-3.5" /> View Slip
                  </button>
                  {rec.status !== 'paid' && (
                    <>
                      <button
                        onClick={() => navigate(`/admin/employees/${rec.employeeObjectId}`)}
                        title="Regenerate from that employee's profile"
                        className="h-8 px-3 border border-gray-300 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-50 flex items-center gap-1"
                      >
                        <RefreshCw className="w-3.5 h-3.5" /> Regenerate
                      </button>
                      <button
                        onClick={() => setPayingRecord(rec)}
                        className="h-8 px-3 bg-gray-900 hover:bg-black text-white rounded-lg text-xs font-semibold"
                      >
                        Mark Paid
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {generateAllOpen && <GenerateAllPayrollModal month={month} year={year} onClose={() => setGenerateAllOpen(false)} />}
      {payingRecord && <MarkPayrollPaidModal record={payingRecord} onClose={() => setPayingRecord(null)} />}
    </div>
  );
}
