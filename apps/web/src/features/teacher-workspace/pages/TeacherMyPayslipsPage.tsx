import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Wallet, Loader2, AlertTriangle, ChevronRight } from 'lucide-react';
import { useMyPayslips } from '@/features/payroll/hooks/usePayroll';
import { SalarySlipPreview } from '@/features/payroll/components/SalarySlipPreview';
import type { PayrollRecord } from '@schoolos/types';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n);

const STATUS_LABEL: Record<string, string> = { draft: 'Draft', generated: 'Generated', paid: 'Paid' };

export function TeacherMyPayslipsPage() {
  const navigate = useNavigate();
  const { data: payslips, isLoading, error } = useMyPayslips();
  const [selected, setSelected] = useState<PayrollRecord | null>(null);

  if (selected) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] dark:bg-transparent print:bg-white">
        <div className="bg-white teacher-glass-card border-b border-gray-100 dark:border-white/5 px-4 py-4 flex items-center gap-3 print:hidden">
          <button onClick={() => setSelected(null)} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-white/60" />
          </button>
          <h1 className="text-base font-bold text-gray-900 dark:text-white">Salary Slip</h1>
        </div>
        <div className="px-4 py-6 print:py-0 print:px-0">
          <SalarySlipPreview record={selected} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-transparent">
      <div className="bg-white teacher-glass-card border-b border-gray-100 dark:border-white/5 px-4 py-4 flex items-center gap-3">
        <button onClick={() => navigate('/teacher/profile')} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-white/60" />
        </button>
        <h1 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Wallet className="w-4 h-4 text-gray-400" /> My Payslips
        </h1>
      </div>

      <div className="px-4 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-gray-300 animate-spin" />
          </div>
        ) : error || !payslips ? (
          <div className="text-center py-16 px-6">
            <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto mb-3" />
            <p className="text-sm font-semibold text-gray-700 dark:text-white">Your payslips aren't available yet</p>
            <p className="text-xs text-gray-400 dark:text-white/30 mt-2 max-w-sm mx-auto">
              No staff HR record is linked to your account yet. Ask the school admin to
              set up your employee profile.
            </p>
          </div>
        ) : payslips.length === 0 ? (
          <div className="text-center py-16 px-6">
            <Wallet className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-gray-700 dark:text-white">No payslips yet</p>
            <p className="text-xs text-gray-400 dark:text-white/30 mt-2">Payslips appear here once the admin generates payroll for a month.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {payslips.map((p) => (
              <button
                key={p._id}
                onClick={() => setSelected(p)}
                className="w-full bg-white teacher-glass-card rounded-2xl border border-gray-200 dark:border-white/5 shadow-sm p-4 flex items-center gap-3 text-left hover:border-[#A855F7]/40 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{MONTHS[p.month - 1]} {p.year}</p>
                  <p className="text-xs text-gray-400 dark:text-white/30 mt-0.5">
                    Net pay {fmt(p.netSalary)} · {STATUS_LABEL[p.status] ?? p.status}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
