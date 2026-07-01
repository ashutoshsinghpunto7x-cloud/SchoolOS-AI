import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Printer, Wallet, IndianRupee, Receipt as ReceiptIcon, FileBarChart } from 'lucide-react';
import { useFeeList, useFeeSummary } from '@/features/fees/hooks/useFees';
import { useSalaryList, useSalarySummary } from '../hooks/useSalary';
import { useExpenseList, useExpenseSummary } from '../hooks/useExpense';
import { exportToCSV } from '@/features/reports/components/ExportMenu';
import { cn } from '@/lib/utils';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

type ReportTab = 'fees' | 'pending-fees' | 'salary' | 'expenses';

const TABS: { id: ReportTab; label: string; icon: React.ElementType }[] = [
  { id: 'fees',         label: 'Fee Collection', icon: IndianRupee },
  { id: 'pending-fees', label: 'Pending Fees',   icon: Wallet },
  { id: 'salary',       label: 'Salary',          icon: FileBarChart },
  { id: 'expenses',     label: 'Expenses',        icon: ReceiptIcon },
];

export function AccountantReportsPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<ReportTab>('fees');

  const { data: feeList } = useFeeList({ status: 'paid', limit: 200, sortBy: 'createdAt', sortOrder: 'desc' });
  const { data: feeSummary } = useFeeSummary();
  const { data: outstanding } = useFeeList({ limit: 200, sortBy: 'dueDate' });
  const { data: salaryList } = useSalaryList({ limit: 200 });
  const { data: salarySummary } = useSalarySummary();
  const { data: expenseList } = useExpenseList({ limit: 200 });
  const { data: expenseSummary } = useExpenseSummary();

  function handleExport() {
    if (tab === 'fees') {
      exportToCSV((feeList?.data ?? []).map((f) => ({
        Student: f.studentName, Class: `${f.class}-${f.section}`, Fee: f.description || f.feeHead,
        Total: f.totalAmount, Paid: f.paidAmount, Status: f.status, DueDate: f.dueDate,
      })), 'fee-collection-report');
    } else if (tab === 'pending-fees') {
      exportToCSV((outstanding?.data ?? []).filter((f) => f.status !== 'paid' && f.status !== 'waived').map((f) => ({
        Student: f.studentName, Class: `${f.class}-${f.section}`, Balance: f.balance, DueDate: f.dueDate, Status: f.status,
      })), 'pending-fee-report');
    } else if (tab === 'salary') {
      exportToCSV((salaryList?.data ?? []).map((s) => ({
        Employee: s.employeeName, Designation: s.designation, Month: s.month, Year: s.year, Amount: s.amount, Status: s.status,
      })), 'salary-report');
    } else {
      exportToCSV((expenseList?.data ?? []).map((e) => ({
        Title: e.title, Category: e.category, Amount: e.amount, Date: e.date, Status: e.status,
      })), 'expense-report');
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="bg-white border-b border-gray-100 px-4 py-4 flex items-center gap-3 print:hidden">
        <button onClick={() => navigate('/accountant')} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors lg:hidden">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <h1 className="text-base font-bold text-gray-900 flex-1">Reports</h1>
        <button onClick={() => window.print()} className="h-9 px-3 border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-50 flex items-center gap-1.5">
          <Printer className="w-3.5 h-3.5" /> Print
        </button>
        <button onClick={handleExport} className="h-9 px-3 bg-[#5B5CEB] hover:bg-[#4a4bd9] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5">
          <Download className="w-3.5 h-3.5" /> Export CSV
        </button>
      </div>

      <div className="px-4 py-4 max-w-4xl mx-auto space-y-4">
        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 print:hidden">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn(
                'px-3.5 py-2 rounded-xl text-xs font-semibold shrink-0 flex items-center gap-1.5 transition-colors',
                tab === id ? 'bg-[#5B5CEB] text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50',
              )}
            >
              <Icon className="w-3.5 h-3.5" /> {label}
            </button>
          ))}
        </div>

        {/* Fee Collection Report */}
        {tab === 'fees' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="grid grid-cols-3 gap-3 p-4 border-b border-gray-50">
              <div><p className="text-xs text-gray-400">Total Charged</p><p className="text-sm font-bold text-gray-800">{fmt(feeSummary?.totalCharged ?? 0)}</p></div>
              <div><p className="text-xs text-gray-400">Total Collected</p><p className="text-sm font-bold text-emerald-600">{fmt(feeSummary?.totalCollected ?? 0)}</p></div>
              <div><p className="text-xs text-gray-400">Outstanding</p><p className="text-sm font-bold text-amber-600">{fmt(feeSummary?.totalOutstanding ?? 0)}</p></div>
            </div>
            <div className="divide-y divide-gray-50 max-h-[60vh] overflow-y-auto">
              {(feeList?.data ?? []).map((f) => (
                <div key={f._id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <div className="min-w-0"><p className="font-medium text-gray-800 truncate">{f.studentName}</p><p className="text-xs text-gray-400">Class {f.class}-{f.section}</p></div>
                  <p className="font-semibold text-emerald-600 shrink-0">{fmt(f.paidAmount)}</p>
                </div>
              ))}
              {!feeList?.data.length && <p className="p-8 text-center text-sm text-gray-400">No paid fee records yet</p>}
            </div>
          </div>
        )}

        {/* Pending Fee Report */}
        {tab === 'pending-fees' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="divide-y divide-gray-50 max-h-[65vh] overflow-y-auto">
              {(outstanding?.data ?? []).filter((f) => f.status !== 'paid' && f.status !== 'waived').map((f) => (
                <div key={f._id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <div className="min-w-0"><p className="font-medium text-gray-800 truncate">{f.studentName}</p><p className="text-xs text-gray-400">Due {new Date(f.dueDate).toLocaleDateString('en-IN')}</p></div>
                  <p className="font-semibold text-amber-600 shrink-0">{fmt(f.balance)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Salary Report */}
        {tab === 'salary' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="grid grid-cols-2 gap-3 p-4 border-b border-gray-50">
              <div><p className="text-xs text-gray-400">Total Pending</p><p className="text-sm font-bold text-amber-600">{fmt(salarySummary?.totalPending ?? 0)}</p></div>
              <div><p className="text-xs text-gray-400">Total Paid</p><p className="text-sm font-bold text-emerald-600">{fmt(salarySummary?.totalPaid ?? 0)}</p></div>
            </div>
            <div className="divide-y divide-gray-50 max-h-[60vh] overflow-y-auto">
              {(salaryList?.data ?? []).map((s) => (
                <div key={s._id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <div className="min-w-0"><p className="font-medium text-gray-800 truncate">{s.employeeName}</p><p className="text-xs text-gray-400">{s.designation} · {s.month} {s.year}</p></div>
                  <p className={cn('font-semibold shrink-0', s.status === 'paid' ? 'text-emerald-600' : 'text-amber-600')}>{fmt(s.amount)}</p>
                </div>
              ))}
              {!salaryList?.data.length && <p className="p-8 text-center text-sm text-gray-400">No salary records yet</p>}
            </div>
          </div>
        )}

        {/* Expense Report */}
        {tab === 'expenses' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="grid grid-cols-2 gap-3 p-4 border-b border-gray-50">
              <div><p className="text-xs text-gray-400">Total Pending</p><p className="text-sm font-bold text-amber-600">{fmt(expenseSummary?.totalPending ?? 0)}</p></div>
              <div><p className="text-xs text-gray-400">Total Approved</p><p className="text-sm font-bold text-emerald-600">{fmt(expenseSummary?.totalApproved ?? 0)}</p></div>
            </div>
            <div className="divide-y divide-gray-50 max-h-[60vh] overflow-y-auto">
              {(expenseList?.data ?? []).map((e) => (
                <div key={e._id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <div className="min-w-0"><p className="font-medium text-gray-800 truncate">{e.title}</p><p className="text-xs text-gray-400 capitalize">{e.category} · {new Date(e.date).toLocaleDateString('en-IN')}</p></div>
                  <p className={cn('font-semibold shrink-0', e.status === 'approved' ? 'text-emerald-600' : 'text-amber-600')}>{fmt(e.amount)}</p>
                </div>
              ))}
              {!expenseList?.data.length && <p className="p-8 text-center text-sm text-gray-400">No expenses recorded yet</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
