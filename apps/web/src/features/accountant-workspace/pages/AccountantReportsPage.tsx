import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Printer, Wallet, IndianRupee, Receipt as ReceiptIcon, FileBarChart, LayoutDashboard } from 'lucide-react';
import { useFeeList, useFeeSummary } from '@/features/fees/hooks/useFees';
import { useSalaryList, useSalarySummary } from '../hooks/useSalary';
import { useExpenseList, useExpenseSummary } from '../hooks/useExpense';
import { exportToCSV } from '@/features/reports/components/ExportMenu';
import { cn } from '@/lib/utils';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

const SCHOOL_NAME = 'Florence Nightingale Inter College';

type ReportTab = 'overview' | 'fees' | 'pending-fees' | 'salary' | 'expenses';

const TABS: { id: ReportTab; label: string; icon: React.ElementType }[] = [
  { id: 'overview',     label: 'Overview',       icon: LayoutDashboard },
  { id: 'fees',         label: 'Fee Collection', icon: IndianRupee },
  { id: 'pending-fees', label: 'Pending Fees',   icon: Wallet },
  { id: 'salary',       label: 'Salary',          icon: FileBarChart },
  { id: 'expenses',     label: 'Expenses',        icon: ReceiptIcon },
];

function inRange(dateStr: string, from: string, to: string): boolean {
  if (!from && !to) return true;
  const d = new Date(dateStr).getTime();
  if (from && d < new Date(from).getTime()) return false;
  if (to && d > new Date(to).getTime() + 86_400_000 - 1) return false;
  return true;
}

// ── Lightweight inline SVG bar chart — no charting dependency ───────────────

function BarChart({ data, formatValue = fmt }: { data: { label: string; value: number }[]; formatValue?: (n: number) => string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  if (!data.length) return <p className="text-sm text-gray-400 text-center py-8">Not enough data yet</p>;
  return (
    <div className="space-y-2.5">
      {data.map((d) => (
        <div key={d.label} className="flex items-center gap-3">
          <span className="text-xs text-gray-500 w-20 shrink-0 truncate">{d.label}</span>
          <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gray-800 rounded-full transition-all"
              style={{ width: `${Math.max(2, (d.value / max) * 100)}%` }}
            />
          </div>
          <span className="text-xs font-semibold text-gray-700 w-24 shrink-0 text-right">{formatValue(d.value)}</span>
        </div>
      ))}
    </div>
  );
}

const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export function AccountantReportsPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<ReportTab>('overview');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const { data: feeList } = useFeeList({ status: 'paid', limit: 100, sortBy: 'createdAt', sortOrder: 'desc' });
  const { data: feeSummary } = useFeeSummary();
  const { data: outstanding } = useFeeList({ limit: 100, sortBy: 'dueDate' });
  const { data: salaryList } = useSalaryList({ limit: 100 });
  const { data: salarySummary } = useSalarySummary();
  const { data: expenseList } = useExpenseList({ limit: 100 });
  const { data: expenseSummary } = useExpenseSummary();

  const filteredPaidFees = useMemo(
    () => (feeList?.data ?? []).filter((f) => inRange(f.updatedAt, dateFrom, dateTo)),
    [feeList, dateFrom, dateTo],
  );
  const filteredOutstanding = useMemo(
    () => (outstanding?.data ?? []).filter((f) => f.status !== 'paid' && f.status !== 'waived' && inRange(f.dueDate, dateFrom, dateTo)),
    [outstanding, dateFrom, dateTo],
  );
  const filteredSalary = useMemo(
    () => (salaryList?.data ?? []).filter((s) => inRange(s.status === 'paid' && s.paidDate ? s.paidDate : s.dueDate, dateFrom, dateTo)),
    [salaryList, dateFrom, dateTo],
  );
  const filteredExpenses = useMemo(
    () => (expenseList?.data ?? []).filter((e) => inRange(e.date, dateFrom, dateTo)),
    [expenseList, dateFrom, dateTo],
  );

  const collectionByMonth = useMemo(() => {
    const buckets = new Map<string, number>();
    for (const f of filteredPaidFees) {
      const d = new Date(f.updatedAt);
      const key = `${MONTH_LABELS[d.getMonth()]} ${d.getFullYear()}`;
      buckets.set(key, (buckets.get(key) ?? 0) + f.paidAmount);
    }
    return Array.from(buckets.entries())
      .map(([label, value]) => ({ label, value, sortKey: new Date(label).getTime() }))
      .sort((a, b) => a.sortKey - b.sortKey)
      .slice(-6)
      .map(({ label, value }) => ({ label, value }));
  }, [filteredPaidFees]);

  const expenseByCategory = useMemo(() => {
    const buckets = new Map<string, number>();
    for (const e of filteredExpenses) {
      buckets.set(e.category, (buckets.get(e.category) ?? 0) + e.amount);
    }
    return Array.from(buckets.entries())
      .map(([label, value]) => ({ label: label.charAt(0).toUpperCase() + label.slice(1), value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredExpenses]);

  const netPosition = useMemo(() => {
    const collected = filteredPaidFees.reduce((s, f) => s + f.paidAmount, 0);
    const salaryPaid = filteredSalary.filter((s) => s.status === 'paid').reduce((s, r) => s + r.amount, 0);
    const expensesApproved = filteredExpenses.filter((e) => e.status === 'approved').reduce((s, e) => s + e.amount, 0);
    return { collected, salaryPaid, expensesApproved, net: collected - salaryPaid - expensesApproved };
  }, [filteredPaidFees, filteredSalary, filteredExpenses]);

  function handleExport() {
    if (tab === 'fees') {
      exportToCSV(filteredPaidFees.map((f) => ({
        Student: f.studentName, Class: `${f.class}-${f.section}`, Fee: f.description || f.feeHead,
        Total: f.totalAmount, Paid: f.paidAmount, Status: f.status, DueDate: f.dueDate,
      })), 'fee-collection-report');
    } else if (tab === 'pending-fees') {
      exportToCSV(filteredOutstanding.map((f) => ({
        Student: f.studentName, Class: `${f.class}-${f.section}`, Balance: f.balance, DueDate: f.dueDate, Status: f.status,
      })), 'pending-fee-report');
    } else if (tab === 'salary') {
      exportToCSV(filteredSalary.map((s) => ({
        Employee: s.employeeName, Designation: s.designation, Month: s.month, Year: s.year, Amount: s.amount, Status: s.status, DueDate: s.dueDate,
      })), 'salary-report');
    } else if (tab === 'expenses') {
      exportToCSV(filteredExpenses.map((e) => ({
        Title: e.title, Category: e.category, Amount: e.amount, Date: e.date, Status: e.status,
      })), 'expense-report');
    } else {
      exportToCSV([{
        Collected: netPosition.collected, SalaryPaid: netPosition.salaryPaid,
        ExpensesApproved: netPosition.expensesApproved, NetPosition: netPosition.net,
      }], 'overview-report');
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Print-only header — hidden on screen, shown when printing so a printed report reads professionally */}
      <style>{`
        @media print {
          .report-print-header { display: block !important; }
        }
      `}</style>
      <div className="report-print-header hidden px-4 pt-4 pb-2 text-center">
        <p className="text-lg font-bold text-gray-900">{SCHOOL_NAME}</p>
        <p className="text-xs text-gray-500">
          {TABS.find((t) => t.id === tab)?.label} Report
          {(dateFrom || dateTo) && ` · ${dateFrom || 'Start'} to ${dateTo || 'Today'}`}
          {' · Generated '}{new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
        </p>
      </div>

      <div className="bg-white border-b border-gray-100 px-4 py-4 flex items-center gap-3 print:hidden">
        <button onClick={() => navigate('/accountant')} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors lg:hidden">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <h1 className="text-base font-bold text-gray-900 flex-1">Reports</h1>
        <button onClick={() => window.print()} className="h-9 px-3 border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-50 flex items-center gap-1.5">
          <Printer className="w-3.5 h-3.5" /> Print
        </button>
        <button onClick={handleExport} className="h-9 px-3 bg-[#10B981] hover:bg-[#059669] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5">
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
                tab === id ? 'bg-[#10B981] text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50',
              )}
            >
              <Icon className="w-3.5 h-3.5" /> {label}
            </button>
          ))}
        </div>

        {/* Date range filter — applies across every tab */}
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <span className="text-xs font-semibold text-gray-500">Date range:</span>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-9 px-2.5 rounded-lg border border-gray-200 text-xs" />
          <span className="text-xs text-gray-400">to</span>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-9 px-2.5 rounded-lg border border-gray-200 text-xs" />
          {(dateFrom || dateTo) && (
            <button onClick={() => { setDateFrom(''); setDateTo(''); }} className="text-xs text-gray-400 hover:text-gray-600">Clear</button>
          )}
        </div>

        {/* Overview */}
        {tab === 'overview' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-white rounded-2xl border border-gray-200 p-4"><p className="text-xs text-gray-400">Collected</p><p className="text-lg font-bold text-gray-900">{fmt(netPosition.collected)}</p></div>
              <div className="bg-white rounded-2xl border border-gray-200 p-4"><p className="text-xs text-gray-400">Salary Paid</p><p className="text-lg font-bold text-gray-900">{fmt(netPosition.salaryPaid)}</p></div>
              <div className="bg-white rounded-2xl border border-gray-200 p-4"><p className="text-xs text-gray-400">Expenses Approved</p><p className="text-lg font-bold text-gray-900">{fmt(netPosition.expensesApproved)}</p></div>
              <div className="bg-gray-900 rounded-2xl p-4"><p className="text-xs text-gray-300">Net Position</p><p className="text-lg font-bold text-white">{fmt(netPosition.net)}</p></div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <h3 className="text-sm font-bold text-gray-800 mb-3">Fee Collection Trend (last 6 months)</h3>
              <BarChart data={collectionByMonth} />
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <h3 className="text-sm font-bold text-gray-800 mb-3">Expenses by Category</h3>
              <BarChart data={expenseByCategory} />
            </div>
          </div>
        )}

        {/* Fee Collection Report */}
        {tab === 'fees' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="grid grid-cols-3 gap-3 p-4 border-b border-gray-50">
              <div><p className="text-xs text-gray-400">Total Charged</p><p className="text-sm font-bold text-gray-800">{fmt(feeSummary?.totalCharged ?? 0)}</p></div>
              <div><p className="text-xs text-gray-400">Total Collected</p><p className="text-sm font-bold text-gray-800">{fmt(feeSummary?.totalCollected ?? 0)}</p></div>
              <div><p className="text-xs text-gray-400">Outstanding</p><p className="text-sm font-bold text-gray-800">{fmt(feeSummary?.totalOutstanding ?? 0)}</p></div>
            </div>
            <div className="divide-y divide-gray-50 max-h-[60vh] overflow-y-auto">
              {filteredPaidFees.map((f) => (
                <div key={f._id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <div className="min-w-0"><p className="font-medium text-gray-800 truncate">{f.studentName}</p><p className="text-xs text-gray-400">Class {f.class}-{f.section}</p></div>
                  <p className="font-semibold text-gray-900 shrink-0">{fmt(f.paidAmount)}</p>
                </div>
              ))}
              {!filteredPaidFees.length && <p className="p-8 text-center text-sm text-gray-400">No paid fee records in this range</p>}
            </div>
          </div>
        )}

        {/* Pending Fee Report */}
        {tab === 'pending-fees' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="divide-y divide-gray-50 max-h-[65vh] overflow-y-auto">
              {filteredOutstanding.map((f) => (
                <div key={f._id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <div className="min-w-0"><p className="font-medium text-gray-800 truncate">{f.studentName}</p><p className="text-xs text-gray-400">Due {new Date(f.dueDate).toLocaleDateString('en-IN')}</p></div>
                  <p className="font-semibold text-gray-900 shrink-0">{fmt(f.balance)}</p>
                </div>
              ))}
              {!filteredOutstanding.length && <p className="p-8 text-center text-sm text-gray-400">No pending fees in this range</p>}
            </div>
          </div>
        )}

        {/* Salary Report */}
        {tab === 'salary' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="grid grid-cols-3 gap-3 p-4 border-b border-gray-50">
              <div><p className="text-xs text-gray-400">Scheduled</p><p className="text-sm font-bold text-gray-800">{fmt(salarySummary?.totalScheduled ?? 0)}</p></div>
              <div><p className="text-xs text-gray-400">Pending</p><p className="text-sm font-bold text-gray-800">{fmt(salarySummary?.totalPending ?? 0)}</p></div>
              <div><p className="text-xs text-gray-400">Paid</p><p className="text-sm font-bold text-gray-800">{fmt(salarySummary?.totalPaid ?? 0)}</p></div>
            </div>
            <div className="divide-y divide-gray-50 max-h-[60vh] overflow-y-auto">
              {filteredSalary.map((s) => (
                <div key={s._id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <div className="min-w-0"><p className="font-medium text-gray-800 truncate">{s.employeeName}</p><p className="text-xs text-gray-400">{s.designation} · {s.month} {s.year}</p></div>
                  <p className="font-semibold text-gray-900 shrink-0">{fmt(s.amount)}</p>
                </div>
              ))}
              {!filteredSalary.length && <p className="p-8 text-center text-sm text-gray-400">No salary records in this range</p>}
            </div>
          </div>
        )}

        {/* Expense Report */}
        {tab === 'expenses' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="grid grid-cols-2 gap-3 p-4 border-b border-gray-50">
              <div><p className="text-xs text-gray-400">Total Pending</p><p className="text-sm font-bold text-gray-800">{fmt(expenseSummary?.totalPending ?? 0)}</p></div>
              <div><p className="text-xs text-gray-400">Total Approved</p><p className="text-sm font-bold text-gray-800">{fmt(expenseSummary?.totalApproved ?? 0)}</p></div>
            </div>
            <div className="divide-y divide-gray-50 max-h-[60vh] overflow-y-auto">
              {filteredExpenses.map((e) => (
                <div key={e._id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <div className="min-w-0"><p className="font-medium text-gray-800 truncate">{e.title}</p><p className="text-xs text-gray-400 capitalize">{e.category} · {new Date(e.date).toLocaleDateString('en-IN')}</p></div>
                  <p className="font-semibold text-gray-900 shrink-0">{fmt(e.amount)}</p>
                </div>
              ))}
              {!filteredExpenses.length && <p className="p-8 text-center text-sm text-gray-400">No expenses recorded in this range</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
