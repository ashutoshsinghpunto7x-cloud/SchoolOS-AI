import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, X, Loader2, AlertCircle, IndianRupee, CheckCircle2, Clock, ArrowUpCircle, Users, History } from 'lucide-react';
import {
  useSalaryList, useSalarySummary, useCreateSalaryRecord, useMarkSalaryPaid, useForcePendingSalary,
  useUpdateSalaryRecord,
} from '../hooks/useSalary';
import { BulkAddSalaryModal } from '../components/BulkAddSalaryModal';
import { AuditLogPanel } from '@/features/audit/components/AuditLogPanel';
import type { SalaryRecord, PaymentMode, SalaryStatus } from '@schoolos/types';
import { cn } from '@/lib/utils';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

const inputCls = 'w-full h-11 px-3.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#A855F7]/30 focus:border-[#5B21B6]';
const labelCls = 'block text-xs font-semibold text-gray-600 mb-1';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const PAYMENT_MODES: { value: PaymentMode; label: string }[] = [
  { value: 'cash', label: 'Cash' }, { value: 'cheque', label: 'Cheque' },
  { value: 'bank_transfer', label: 'Bank Transfer' }, { value: 'online', label: 'Online' },
  { value: 'demand_draft', label: 'Demand Draft' },
];

function defaultDueDate(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 7).toISOString().slice(0, 10);
}

/** Safely format a possibly-missing/invalid date into an `<input type="date">` value, without throwing. */
function safeDateInputValue(value: string | Date | undefined | null): string {
  if (!value) return '';
  const d = new Date(value);
  return isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
}

// ── Add Salary Modal ──────────────────────────────────────────────────────────

function AddSalaryModal({ onClose }: { onClose: () => void }) {
  const { mutateAsync, isPending, error } = useCreateSalaryRecord();
  const now = new Date();
  const [employeeName, setEmployeeName] = useState('');
  const [designation, setDesignation] = useState('');
  const [month, setMonth] = useState(MONTHS[now.getMonth()]);
  const [year, setYear] = useState(now.getFullYear());
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState(defaultDueDate());
  const [localErr, setLocalErr] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLocalErr('');
    const amt = parseFloat(amount);
    if (!employeeName.trim()) return setLocalErr('Employee name is required.');
    if (!designation.trim()) return setLocalErr('Role/designation is required.');
    if (isNaN(amt) || amt <= 0) return setLocalErr('Enter a valid amount.');
    if (!dueDate) return setLocalErr('Set a due date.');

    await mutateAsync({
      employeeName: employeeName.trim(), designation: designation.trim(), month, year,
      amount: Math.round(amt * 100) / 100, dueDate,
    });
    onClose();
  }

  const displayErr = localErr || (error instanceof Error ? error.message : null);

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-5 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-gray-900">Add Salary Record</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100"><X className="w-4 h-4 text-gray-500" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className={labelCls}>Employee Name</label>
            <input type="text" value={employeeName} onChange={(e) => setEmployeeName(e.target.value)} className={inputCls} placeholder="e.g. Priya Sharma" />
          </div>
          <div>
            <label className={labelCls}>Role / Designation</label>
            <input type="text" value={designation} onChange={(e) => setDesignation(e.target.value)} className={inputCls} placeholder="e.g. Math Teacher, Peon, Driver" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Month</label>
              <select value={month} onChange={(e) => setMonth(e.target.value)} className={inputCls}>
                {MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Year</label>
              <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} className={inputCls} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Amount (₹)</label>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} min={1} step={0.01} className={inputCls} placeholder="0.00" />
          </div>
          <div>
            <label className={labelCls}>Due Date</label>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputCls} />
            <p className="text-xs text-gray-400 mt-1">This salary stays scheduled until this date, then automatically becomes pending.</p>
          </div>
          {displayErr && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">
              <AlertCircle className="w-4 h-4 shrink-0" /> {displayErr}
            </div>
          )}
          <button type="submit" disabled={isPending} className="w-full h-11 bg-[#5B21B6] hover:bg-[#4C1D95] disabled:opacity-60 text-white font-semibold rounded-xl text-sm flex items-center justify-center gap-2">
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Add Record
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Mark Paid Modal ───────────────────────────────────────────────────────────

function MarkPaidModal({ record, onClose }: { record: SalaryRecord; onClose: () => void }) {
  const { mutateAsync, isPending, error } = useMarkSalaryPaid();
  const [paidDate, setPaidDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('bank_transfer');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await mutateAsync({ id: record._id, payload: { paidDate, paymentMode } });
    onClose();
  }

  const displayErr = error instanceof Error ? error.message : null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-gray-900">Mark as Paid</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100"><X className="w-4 h-4 text-gray-500" /></button>
        </div>
        <p className="text-sm text-gray-500 mb-4">{record.employeeName} · {fmt(record.amount)}</p>
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className={labelCls}>Payment Date</label>
            <input type="date" value={paidDate} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setPaidDate(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Payment Mode</label>
            <select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value as PaymentMode)} className={inputCls}>
              {PAYMENT_MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          {displayErr && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">
              <AlertCircle className="w-4 h-4 shrink-0" /> {displayErr}
            </div>
          )}
          <button type="submit" disabled={isPending} className="w-full h-11 bg-gray-900 hover:bg-black disabled:opacity-60 text-white font-semibold rounded-xl text-sm flex items-center justify-center gap-2">
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Confirm Payment
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Inline-editable field — click to edit, Enter/blur to save ──────────────────

function EditableField({
  record, field, type = 'text', displayValue,
}: {
  record: SalaryRecord;
  field: 'employeeName' | 'designation' | 'amount' | 'dueDate';
  type?: 'text' | 'number' | 'date';
  /** Override what's shown when not editing (e.g. "Due 7 Apr" instead of the raw ISO date). */
  displayValue?: string;
}) {
  const { mutateAsync, isPending } = useUpdateSalaryRecord(record._id);
  const [editing, setEditing] = useState(false);
  const rawValue = field === 'dueDate' ? safeDateInputValue(record.dueDate) : record[field];
  const [value, setValue] = useState(String(rawValue));

  useEffect(() => { setValue(String(rawValue)); }, [rawValue]);

  async function save() {
    setEditing(false);
    if (value === String(rawValue)) return;
    if (field === 'amount') {
      const amt = parseFloat(value);
      if (isNaN(amt) || amt <= 0) return;
      await mutateAsync({ amount: Math.round(amt * 100) / 100 });
    } else if (field === 'dueDate') {
      if (!value) return;
      await mutateAsync({ dueDate: value });
    } else {
      if (!value.trim()) return;
      await mutateAsync({ [field]: value.trim() });
    }
  }

  // Due date stays editable even after payment (an accountant may need to
  // correct it for record-keeping), unlike the other fields which lock once paid.
  if (record.status === 'paid' && field !== 'dueDate') {
    return <span>{field === 'amount' ? Number(rawValue).toLocaleString('en-IN') : String(rawValue)}</span>;
  }

  if (editing) {
    return (
      <input
        autoFocus
        type={type}
        value={value}
        disabled={isPending}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => void save()}
        onKeyDown={(e) => e.key === 'Enter' && void save()}
        className="w-full h-7 px-1.5 rounded-md border border-[#A855F7] text-xs focus:outline-none"
      />
    );
  }

  return (
    <button type="button" onClick={() => setEditing(true)} className="text-left hover:bg-gray-50 rounded px-1 -mx-1" title="Click to edit">
      {displayValue ?? (field === 'amount' ? Number(rawValue).toLocaleString('en-IN') : String(rawValue))}
    </button>
  );
}

// ── Status label (no color, text + icon only) ──────────────────────────────────

function StatusLabel({ status }: { status: SalaryStatus }) {
  if (status === 'paid') {
    return <span className="inline-flex items-center gap-1 text-xs font-semibold text-gray-900"><CheckCircle2 className="w-3 h-3" /> Paid</span>;
  }
  if (status === 'scheduled') {
    return <span className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500"><Clock className="w-3 h-3" /> Scheduled</span>;
  }
  return <span className="inline-flex items-center gap-1 text-xs font-semibold text-gray-700"><AlertCircle className="w-3 h-3" /> Pending</span>;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function SalaryPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'all' | SalaryStatus>('all');
  const [designation, setDesignation] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [bulkAddOpen, setBulkAddOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [payingRecord, setPayingRecord] = useState<SalaryRecord | null>(null);
  const { mutate: forcePending, isPending: forcingId } = useForcePendingSalary();

  const { data, isLoading } = useSalaryList({ status: status === 'all' ? undefined : status, limit: 100 });
  const { data: summary } = useSalarySummary();

  const designations = useMemo(() => {
    const set = new Set((data?.data ?? []).map((r) => r.designation));
    return [...set].sort();
  }, [data]);

  const records = useMemo(
    () => (designation ? (data?.data ?? []).filter((r) => r.designation === designation) : data?.data ?? []),
    [data, designation],
  );

  return (
    <div className="min-h-screen bg-white">
      <div className="bg-white border-b border-gray-200 px-4 py-4 flex items-center gap-3">
        <button onClick={() => navigate('/accountant')} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors lg:hidden">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="flex-1">
          <h1 className="text-base font-bold text-gray-900">Salary Management</h1>
        </div>
        <button
          onClick={() => setHistoryOpen(true)}
          className="h-9 px-3 border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-50 flex items-center gap-1.5"
        >
          <History className="w-3.5 h-3.5" /> History
        </button>
        <button
          onClick={() => setBulkAddOpen(true)}
          className="h-9 px-3 border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-50 flex items-center gap-1.5"
        >
          <Users className="w-3.5 h-3.5" /> Bulk Add
        </button>
        <button
          onClick={() => setAddOpen(true)}
          className="h-9 px-3 bg-[#5B21B6] hover:bg-[#4C1D95] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" /> Add
        </button>
      </div>

      <div className="px-4 py-4 max-w-4xl mx-auto space-y-4">
        {/* Summary — neutral, no color coding */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3">
            <p className="text-lg font-bold text-gray-900">{fmt(summary?.totalScheduled ?? 0)}</p>
            <p className="text-xs text-gray-500 font-medium">Scheduled ({summary?.scheduledCount ?? 0})</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3">
            <p className="text-lg font-bold text-gray-900">{fmt(summary?.totalPending ?? 0)}</p>
            <p className="text-xs text-gray-500 font-medium">Pending ({summary?.pendingCount ?? 0})</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3">
            <p className="text-lg font-bold text-gray-900">{fmt(summary?.totalPaid ?? 0)}</p>
            <p className="text-xs text-gray-500 font-medium">Paid ({summary?.paidCount ?? 0})</p>
          </div>
        </div>

        {/* Status filter */}
        <div className="flex flex-wrap items-center gap-2">
          {(['all', 'scheduled', 'pending', 'paid'] as const).map((s) => (
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
          <select
            value={designation}
            onChange={(e) => setDesignation(e.target.value)}
            className="ml-auto h-8 px-2.5 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-200"
          >
            <option value="">All roles</option>
            {designations.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>

        {/* List */}
        {isLoading ? (
          <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-16 bg-white rounded-2xl border border-gray-200 animate-pulse" />)}</div>
        ) : !records.length ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
            <IndianRupee className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-gray-700">No salary records{designation ? ` for ${designation}` : ''}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {records.map((rec) => (
              <div key={rec._id} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-700 font-bold text-sm shrink-0">
                  {rec.employeeName.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 truncate"><EditableField record={rec} field="employeeName" /></p>
                  <p className="text-xs text-gray-400 flex items-center gap-1 flex-wrap">
                    <EditableField record={rec} field="designation" /> · {rec.month} {rec.year} · Due{' '}
                    <EditableField
                      record={rec}
                      field="dueDate"
                      type="date"
                      displayValue={new Date(rec.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    />
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-gray-800">₹<EditableField record={rec} field="amount" type="number" /></p>
                  <div className="mt-1 flex items-center justify-end gap-2">
                    <StatusLabel status={rec.status} />
                  </div>
                  <div className="flex gap-1.5 mt-1.5 justify-end">
                    {rec.status === 'scheduled' && (
                      <button
                        onClick={() => forcePending(rec._id)}
                        disabled={forcingId}
                        title="Move to pending before the due date"
                        className="h-8 px-2.5 border border-gray-300 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-50 flex items-center gap-1"
                      >
                        <ArrowUpCircle className="w-3.5 h-3.5" /> Make Pending Now
                      </button>
                    )}
                    {rec.status !== 'paid' && (
                      <button
                        onClick={() => setPayingRecord(rec)}
                        className="h-8 px-3 bg-gray-900 hover:bg-black text-white rounded-lg text-xs font-semibold"
                      >
                        Mark Paid
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {addOpen && <AddSalaryModal onClose={() => setAddOpen(false)} />}
      {bulkAddOpen && <BulkAddSalaryModal onClose={() => setBulkAddOpen(false)} />}
      {historyOpen && <AuditLogPanel resource="salary" title="Salary Change History" onClose={() => setHistoryOpen(false)} />}
      {payingRecord && <MarkPaidModal record={payingRecord} onClose={() => setPayingRecord(null)} />}
    </div>
  );
}
