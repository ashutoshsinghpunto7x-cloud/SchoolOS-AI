import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, X, Loader2, AlertCircle, IndianRupee, CheckCircle2, Clock, ArrowUpCircle, Users, History, Pencil, CheckSquare, ShieldCheck } from 'lucide-react';
import {
  useSalaryList, useSalarySummary, useCreateSalaryRecord, useMarkSalaryPaid, useForcePendingSalary,
  useUpdateSalaryRecord, useBulkMarkSalaryPaid, useRecordSecurityDeposit,
} from '../hooks/useSalary';
import { BulkAddSalaryModal } from '../components/BulkAddSalaryModal';
import { AuditLogPanel } from '@/features/audit/components/AuditLogPanel';
import type { SalaryRecord, PaymentMode, SalaryStatus, SecurityDepositMode } from '@schoolos/types';
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

function daysInMonth(month: string, year: number): number {
  const idx = MONTHS.indexOf(month);
  if (idx < 0) return 30;
  return new Date(year, idx + 1, 0).getDate();
}

/** Suggested LWP deduction — per-day rate (salary ÷ days in month) × leave days. Editable, not enforced. */
function suggestLwpAmount(amount: number, month: string, year: number, lwpDays: number): number {
  if (!amount || !lwpDays) return 0;
  const perDay = amount / daysInMonth(month, year);
  return Math.round(perDay * lwpDays * 100) / 100;
}

const SECURITY_MODES: { value: SecurityDepositMode; label: string }[] = [
  { value: 'one_time', label: 'One-time' },
  { value: 'installments', label: 'Installments' },
];

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
  const [lwpDays, setLwpDays] = useState('');
  const [lwpAmount, setLwpAmount] = useState('');
  const [lwpAmountTouched, setLwpAmountTouched] = useState(false);
  const [securityEnabled, setSecurityEnabled] = useState(false);
  const [securityTotal, setSecurityTotal] = useState('');
  const [securityMode, setSecurityMode] = useState<SecurityDepositMode>('one_time');
  const [securityInstallments, setSecurityInstallments] = useState('');
  const [localErr, setLocalErr] = useState('');

  // Auto-fill the suggested LWP deduction whenever days/salary/month change,
  // unless the accountant has already typed their own amount.
  useEffect(() => {
    if (lwpAmountTouched) return;
    const days = parseFloat(lwpDays);
    const amt = parseFloat(amount);
    if (!days || !amt) { setLwpAmount(''); return; }
    setLwpAmount(String(suggestLwpAmount(amt, month, year, days)));
  }, [lwpDays, amount, month, year, lwpAmountTouched]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLocalErr('');
    const amt = parseFloat(amount);
    if (!employeeName.trim()) return setLocalErr('Employee name is required.');
    if (!designation.trim()) return setLocalErr('Role/designation is required.');
    if (isNaN(amt) || amt <= 0) return setLocalErr('Enter a valid amount.');
    if (!dueDate) return setLocalErr('Set a due date.');
    let securityDeposit: { totalAmount: number; mode: SecurityDepositMode; installmentCount?: number } | undefined;
    if (securityEnabled) {
      const total = parseFloat(securityTotal);
      if (isNaN(total) || total <= 0) return setLocalErr('Enter a valid security deposit amount.');
      const installmentCount = securityMode === 'installments' ? parseInt(securityInstallments, 10) : undefined;
      if (securityMode === 'installments' && (!installmentCount || installmentCount < 1)) {
        return setLocalErr('Enter the number of installments for the security deposit.');
      }
      securityDeposit = { totalAmount: Math.round(total * 100) / 100, mode: securityMode, installmentCount };
    }

    await mutateAsync({
      employeeName: employeeName.trim(), designation: designation.trim(), month, year,
      amount: Math.round(amt * 100) / 100, dueDate,
      lwpDays: lwpDays ? parseFloat(lwpDays) : undefined,
      lwpAmount: lwpAmount ? Math.round(parseFloat(lwpAmount) * 100) / 100 : undefined,
      securityDeposit,
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

          <div className="grid grid-cols-2 gap-3 pt-1 border-t border-gray-100">
            <div>
              <label className={labelCls}>LWP (days)</label>
              <input type="number" min={0} step={0.5} value={lwpDays} onChange={(e) => setLwpDays(e.target.value)} className={inputCls} placeholder="0" />
            </div>
            <div>
              <label className={labelCls}>Sum of LWP (₹)</label>
              <input
                type="number" min={0} step={0.01} value={lwpAmount}
                onChange={(e) => { setLwpAmount(e.target.value); setLwpAmountTouched(true); }}
                className={inputCls} placeholder="0.00"
              />
            </div>
          </div>
          <p className="text-xs text-gray-400 -mt-2">Deduction auto-suggested from salary ÷ days in month — edit if it differs.</p>

          <div className="pt-1 border-t border-gray-100">
            <label className="flex items-center gap-2 text-xs font-semibold text-gray-600 mb-2">
              <input type="checkbox" checked={securityEnabled} onChange={(e) => setSecurityEnabled(e.target.checked)} className="rounded" />
              Security Money
            </label>
            {securityEnabled && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Amount (₹)</label>
                  <input type="number" min={0} step={0.01} value={securityTotal} onChange={(e) => setSecurityTotal(e.target.value)} className={inputCls} placeholder="0.00" />
                </div>
                <div>
                  <label className={labelCls}>Collection</label>
                  <select value={securityMode} onChange={(e) => setSecurityMode(e.target.value as SecurityDepositMode)} className={inputCls}>
                    {SECURITY_MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </div>
                {securityMode === 'installments' && (
                  <div className="col-span-2">
                    <label className={labelCls}>Number of Installments</label>
                    <input type="number" min={1} step={1} value={securityInstallments} onChange={(e) => setSecurityInstallments(e.target.value)} className={inputCls} placeholder="e.g. 3" />
                  </div>
                )}
              </div>
            )}
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

// ── Edit Salary Modal ──────────────────────────────────────────────────────────

function EditSalaryModal({ record, onClose }: { record: SalaryRecord; onClose: () => void }) {
  const { mutateAsync, isPending, error } = useUpdateSalaryRecord(record._id);
  const [employeeName, setEmployeeName] = useState(record.employeeName);
  const [designation, setDesignation] = useState(record.designation);
  const [month, setMonth] = useState(record.month);
  const [year, setYear] = useState(record.year);
  const [amount, setAmount] = useState(String(record.amount));
  const [dueDate, setDueDate] = useState(safeDateInputValue(record.dueDate));
  const [lwpDays, setLwpDays] = useState(record.lwpDays != null ? String(record.lwpDays) : '');
  const [lwpAmount, setLwpAmount] = useState(record.lwpAmount != null ? String(record.lwpAmount) : '');
  const [securityEnabled, setSecurityEnabled] = useState(!!record.securityDeposit);
  const [securityTotal, setSecurityTotal] = useState(record.securityDeposit ? String(record.securityDeposit.totalAmount) : '');
  const [securityMode, setSecurityMode] = useState<SecurityDepositMode>(record.securityDeposit?.mode ?? 'one_time');
  const [securityInstallments, setSecurityInstallments] = useState(record.securityDeposit?.installmentCount != null ? String(record.securityDeposit.installmentCount) : '');
  const [localErr, setLocalErr] = useState('');

  const hasCollected = (record.securityDeposit?.collectedAmount ?? 0) > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLocalErr('');
    const amt = parseFloat(amount);
    if (!employeeName.trim()) return setLocalErr('Employee name is required.');
    if (!designation.trim()) return setLocalErr('Role/designation is required.');
    if (isNaN(amt) || amt <= 0) return setLocalErr('Enter a valid amount.');
    if (!dueDate) return setLocalErr('Set a due date.');
    let securityDeposit: { totalAmount: number; mode: SecurityDepositMode; installmentCount?: number } | undefined;
    if (securityEnabled) {
      const total = parseFloat(securityTotal);
      if (isNaN(total) || total <= 0) return setLocalErr('Enter a valid security deposit amount.');
      const installmentCount = securityMode === 'installments' ? parseInt(securityInstallments, 10) : undefined;
      if (securityMode === 'installments' && (!installmentCount || installmentCount < 1)) {
        return setLocalErr('Enter the number of installments for the security deposit.');
      }
      securityDeposit = { totalAmount: Math.round(total * 100) / 100, mode: securityMode, installmentCount };
    }

    await mutateAsync({
      employeeName: employeeName.trim(), designation: designation.trim(), month, year,
      amount: Math.round(amt * 100) / 100, dueDate,
      lwpDays: lwpDays ? parseFloat(lwpDays) : undefined,
      lwpAmount: lwpAmount ? Math.round(parseFloat(lwpAmount) * 100) / 100 : undefined,
      securityDeposit,
    });
    onClose();
  }

  const displayErr = localErr || (error instanceof Error ? error.message : null);

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-5 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-gray-900">Edit Salary Record</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100"><X className="w-4 h-4 text-gray-500" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className={labelCls}>Employee Name</label>
            <input type="text" value={employeeName} onChange={(e) => setEmployeeName(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Role / Designation</label>
            <input type="text" value={designation} onChange={(e) => setDesignation(e.target.value)} className={inputCls} />
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
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} min={1} step={0.01} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Due Date</label>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputCls} />
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1 border-t border-gray-100">
            <div>
              <label className={labelCls}>LWP (days)</label>
              <input type="number" min={0} step={0.5} value={lwpDays} onChange={(e) => setLwpDays(e.target.value)} className={inputCls} placeholder="0" />
            </div>
            <div>
              <label className={labelCls}>Sum of LWP (₹)</label>
              <input type="number" min={0} step={0.01} value={lwpAmount} onChange={(e) => setLwpAmount(e.target.value)} className={inputCls} placeholder="0.00" />
            </div>
          </div>

          <div className="pt-1 border-t border-gray-100">
            <label className="flex items-center gap-2 text-xs font-semibold text-gray-600 mb-2">
              <input type="checkbox" checked={securityEnabled} onChange={(e) => setSecurityEnabled(e.target.checked)} className="rounded" />
              Security Money
            </label>
            {securityEnabled && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Amount (₹)</label>
                  <input type="number" min={0} step={0.01} value={securityTotal} onChange={(e) => setSecurityTotal(e.target.value)} className={inputCls} placeholder="0.00" />
                </div>
                <div>
                  <label className={labelCls}>Collection</label>
                  <select value={securityMode} onChange={(e) => setSecurityMode(e.target.value as SecurityDepositMode)} className={inputCls}>
                    {SECURITY_MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </div>
                {securityMode === 'installments' && (
                  <div className="col-span-2">
                    <label className={labelCls}>Number of Installments</label>
                    <input type="number" min={1} step={1} value={securityInstallments} onChange={(e) => setSecurityInstallments(e.target.value)} className={inputCls} placeholder="e.g. 3" />
                  </div>
                )}
                {hasCollected && (
                  <p className="col-span-2 text-xs text-gray-400">
                    ₹{record.securityDeposit?.collectedAmount.toLocaleString('en-IN')} already collected — that stays intact when you change these terms.
                  </p>
                )}
              </div>
            )}
          </div>

          {displayErr && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">
              <AlertCircle className="w-4 h-4 shrink-0" /> {displayErr}
            </div>
          )}
          <p className="text-xs text-gray-400">Changes are saved to this record's history and visible in "History".</p>
          <button type="submit" disabled={isPending} className="w-full h-11 bg-[#5B21B6] hover:bg-[#4C1D95] disabled:opacity-60 text-white font-semibold rounded-xl text-sm flex items-center justify-center gap-2">
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Save Changes
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

// ── Bulk Mark Paid Modal ─────────────────────────────────────────────────────

function BulkMarkPaidModal({ records, onClose }: { records: SalaryRecord[]; onClose: () => void }) {
  const { mutateAsync, isPending, error } = useBulkMarkSalaryPaid();
  const [paidDate, setPaidDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('bank_transfer');

  const total = records.reduce((s, r) => s + r.amount, 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await mutateAsync({ ids: records.map((r) => r._id), paidDate, paymentMode });
    onClose();
  }

  const displayErr = error instanceof Error ? error.message : null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-gray-900">Mark {records.length} as Paid</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100"><X className="w-4 h-4 text-gray-500" /></button>
        </div>
        <div className="max-h-32 overflow-y-auto space-y-1 mb-4 bg-gray-50 rounded-xl p-3">
          {records.map((r) => (
            <div key={r._id} className="flex items-center justify-between text-xs">
              <span className="text-gray-600 truncate">{r.employeeName}</span>
              <span className="font-semibold text-gray-800 shrink-0 ml-2">{fmt(r.amount)}</span>
            </div>
          ))}
        </div>
        <p className="text-sm text-gray-500 mb-4">Total <span className="font-bold text-gray-900">{fmt(total)}</span> across {records.length} employee{records.length === 1 ? '' : 's'} — same payment mode/date applied to all.</p>
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
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Confirm {records.length} Payments
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Inline-editable field — click to edit, Enter/blur to save ──────────────────

function EditableField({
  record, field, type = 'text', displayValue, emptyValue,
}: {
  record: SalaryRecord;
  field: 'employeeName' | 'designation' | 'amount' | 'dueDate' | 'lwpDays' | 'lwpAmount';
  type?: 'text' | 'number' | 'date';
  /** Override what's shown when not editing (e.g. "Due 7 Apr" instead of the raw ISO date). */
  displayValue?: string;
  /** Shown when the field is empty and not being edited (defaults to the raw "—" fallback). */
  emptyValue?: string;
}) {
  const { mutateAsync, isPending } = useUpdateSalaryRecord(record._id);
  const [editing, setEditing] = useState(false);
  const isNumericAllowEmpty = field === 'lwpDays' || field === 'lwpAmount';
  const rawValue = field === 'dueDate' ? safeDateInputValue(record.dueDate) : record[field];
  const [value, setValue] = useState(rawValue == null ? '' : String(rawValue));

  useEffect(() => { setValue(rawValue == null ? '' : String(rawValue)); }, [rawValue]);

  async function save() {
    setEditing(false);
    const prev = rawValue == null ? '' : String(rawValue);
    if (value === prev) return;
    if (field === 'amount') {
      const amt = parseFloat(value);
      if (isNaN(amt) || amt <= 0) return;
      await mutateAsync({ amount: Math.round(amt * 100) / 100 });
    } else if (field === 'dueDate') {
      if (!value) return;
      await mutateAsync({ dueDate: value });
    } else if (isNumericAllowEmpty) {
      // LWP days/amount may be cleared back to "not set" — an empty value is valid here.
      if (!value.trim()) { await mutateAsync({ [field]: undefined }); return; }
      const num = parseFloat(value);
      if (isNaN(num) || num < 0) return;
      await mutateAsync({ [field]: Math.round(num * 100) / 100 });
    } else {
      if (!value.trim()) return;
      await mutateAsync({ [field]: value.trim() });
    }
  }

  // Due date, LWP days and Sum of LWP stay editable even after payment — an
  // accountant may need to correct leave/deduction records after the fact.
  const locksOnPaid = field !== 'dueDate' && field !== 'lwpDays' && field !== 'lwpAmount';
  if (record.status === 'paid' && locksOnPaid) {
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

  if (rawValue == null && !editing) {
    return (
      <button type="button" onClick={() => setEditing(true)} className="text-left hover:bg-gray-50 rounded px-1 -mx-1 text-gray-300" title="Click to edit">
        {emptyValue ?? '—'}
      </button>
    );
  }

  return (
    <button type="button" onClick={() => setEditing(true)} className="text-left hover:bg-gray-50 rounded px-1 -mx-1" title="Click to edit">
      {displayValue ?? (field === 'amount' ? Number(rawValue).toLocaleString('en-IN') : String(rawValue))}
    </button>
  );
}

// ── Collect Security Deposit Modal ───────────────────────────────────────────

function CollectSecurityDepositModal({ record, onClose }: { record: SalaryRecord; onClose: () => void }) {
  const { mutateAsync, isPending, error } = useRecordSecurityDeposit();
  const deposit = record.securityDeposit!;
  const remaining = Math.max(0, Math.round((deposit.totalAmount - deposit.collectedAmount) * 100) / 100);
  const [amount, setAmount] = useState(
    deposit.mode === 'installments' && deposit.installmentCount
      ? String(Math.min(remaining, Math.round((deposit.totalAmount / deposit.installmentCount) * 100) / 100))
      : String(remaining),
  );
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState('');
  const [localErr, setLocalErr] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLocalErr('');
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) return setLocalErr('Enter a valid amount.');
    if (amt > remaining) return setLocalErr(`Amount can't exceed the remaining ₹${remaining.toLocaleString('en-IN')}.`);
    await mutateAsync({ id: record._id, payload: { amount: Math.round(amt * 100) / 100, date, note: note.trim() || undefined } });
    onClose();
  }

  const displayErr = localErr || (error instanceof Error ? error.message : null);

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl p-5">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-base font-bold text-gray-900 flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-gray-400" /> Collect Security Money</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100"><X className="w-4 h-4 text-gray-500" /></button>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          {record.employeeName} · ₹{deposit.collectedAmount.toLocaleString('en-IN')} of ₹{deposit.totalAmount.toLocaleString('en-IN')} collected
          {deposit.mode === 'installments' && deposit.installmentCount ? ` (${deposit.installmentCount} installments)` : ''}
        </p>
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className={labelCls}>Amount Collected Now (₹)</label>
            <input type="number" min={0.01} max={remaining} step={0.01} value={amount} onChange={(e) => setAmount(e.target.value)} className={inputCls} />
            <p className="text-xs text-gray-400 mt-1">₹{remaining.toLocaleString('en-IN')} remaining</p>
          </div>
          <div>
            <label className={labelCls}>Date</label>
            <input type="date" value={date} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setDate(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Note (optional)</label>
            <input type="text" value={note} onChange={(e) => setNote(e.target.value)} className={inputCls} placeholder="e.g. Installment 2 of 3" />
          </div>
          {displayErr && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">
              <AlertCircle className="w-4 h-4 shrink-0" /> {displayErr}
            </div>
          )}
          <button type="submit" disabled={isPending} className="w-full h-11 bg-gray-900 hover:bg-black disabled:opacity-60 text-white font-semibold rounded-xl text-sm flex items-center justify-center gap-2">
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Record Collection
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Security Money cell — compact status + amount, click to collect ────────────

function SecurityMoneyCell({ record, onCollect }: { record: SalaryRecord; onCollect: () => void }) {
  const deposit = record.securityDeposit;
  if (!deposit) return <span className="text-gray-300">—</span>;

  const modeLabel = deposit.mode === 'one_time' ? 'One-time' : `Installments${deposit.installmentCount ? ` (${deposit.installmentCount})` : ''}`;

  if (deposit.status === 'collected') {
    return (
      <div className="text-xs">
        <p className="font-semibold text-gray-900">₹{deposit.totalAmount.toLocaleString('en-IN')}</p>
        <p className="text-gray-400">{modeLabel} · Collected</p>
      </div>
    );
  }

  return (
    <div className="text-xs">
      <p className="font-semibold text-gray-900">₹{deposit.collectedAmount.toLocaleString('en-IN')} / ₹{deposit.totalAmount.toLocaleString('en-IN')}</p>
      <p className="text-gray-400 mb-1">{modeLabel} · {deposit.status === 'in_progress' ? 'Partially collected' : 'Pending'}</p>
      <button
        type="button"
        onClick={onCollect}
        className="h-6 px-2 rounded-md border border-gray-300 text-[11px] font-semibold text-gray-700 hover:bg-gray-50"
      >
        Collect
      </button>
    </div>
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
  const [editingRecord, setEditingRecord] = useState<SalaryRecord | null>(null);
  const [collectingRecord, setCollectingRecord] = useState<SalaryRecord | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkPayOpen, setBulkPayOpen] = useState(false);
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

  // Only unpaid records can be bulk-paid — payroll-run day is picking a batch
  // of pending/scheduled employees and clearing them in one confirmation.
  const payableRecords = useMemo(() => records.filter((r) => r.status !== 'paid'), [records]);
  const selectedRecords = useMemo(() => payableRecords.filter((r) => selectedIds.has(r._id)), [payableRecords, selectedIds]);
  const allSelected = payableRecords.length > 0 && selectedRecords.length === payableRecords.length;

  // Filter/status changes can drop records out of view — clear selection so
  // "N selected" never silently refers to rows the accountant can't see anymore.
  useEffect(() => { setSelectedIds(new Set()); }, [status, designation]);

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelectedIds(allSelected ? new Set() : new Set(payableRecords.map((r) => r._id)));
  }

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

      <div className="px-4 lg:px-8 py-4 w-full space-y-4">
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

        {/* Select-all row — only shown when there's something payable to select */}
        {!isLoading && payableRecords.length > 0 && (
          <button
            type="button"
            onClick={toggleSelectAll}
            className="flex items-center gap-2 text-xs font-semibold text-gray-500 hover:text-gray-700"
          >
            <span className={cn(
              'w-4 h-4 rounded border flex items-center justify-center transition-colors',
              allSelected ? 'bg-[#5B21B6] border-[#5B21B6]' : 'border-gray-300',
            )}>
              {allSelected && <CheckSquare className="w-3 h-3 text-white" strokeWidth={3} />}
            </span>
            Select all {payableRecords.length} unpaid
          </button>
        )}

        {/* List — table, columns: Name · Salary · LWP · Sum of LWP · Security Money · Status/Actions */}
        {isLoading ? (
          <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-16 bg-white rounded-2xl border border-gray-200 animate-pulse" />)}</div>
        ) : !records.length ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
            <IndianRupee className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-gray-700">No salary records{designation ? ` for ${designation}` : ''}</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-x-auto pb-16">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold text-gray-500 border-b border-gray-200">
                  <th className="py-2.5 pl-4 pr-2 w-8"></th>
                  <th className="py-2.5 pr-3">Name</th>
                  <th className="py-2.5 pr-3">Salary</th>
                  <th className="py-2.5 pr-3">LWP</th>
                  <th className="py-2.5 pr-3">Sum of LWP</th>
                  <th className="py-2.5 pr-3">Security Money</th>
                  <th className="py-2.5 pr-3">Status</th>
                  <th className="py-2.5 pr-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {records.map((rec) => (
                  <tr key={rec._id} className="border-b border-gray-100 align-top">
                    <td className="py-3 pl-4 pr-2">
                      {rec.status !== 'paid' && (
                        <button
                          type="button"
                          onClick={() => toggleSelected(rec._id)}
                          className={cn(
                            'w-4.5 h-4.5 rounded border flex items-center justify-center shrink-0 transition-colors',
                            selectedIds.has(rec._id) ? 'bg-[#5B21B6] border-[#5B21B6]' : 'border-gray-300',
                          )}
                          title="Select for bulk payment"
                        >
                          {selectedIds.has(rec._id) && <CheckSquare className="w-3 h-3 text-white" strokeWidth={3} />}
                        </button>
                      )}
                    </td>
                    <td className="py-3 pr-3 min-w-[180px]">
                      <p className="text-sm font-bold text-gray-900"><EditableField record={rec} field="employeeName" /></p>
                      <p className="text-xs text-gray-400 flex items-center gap-1 flex-wrap">
                        <EditableField record={rec} field="designation" /> · {rec.month} {rec.year} · Due{' '}
                        <EditableField
                          record={rec}
                          field="dueDate"
                          type="date"
                          displayValue={
                            safeDateInputValue(rec.dueDate)
                              ? new Date(rec.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                              : '—'
                          }
                        />
                      </p>
                    </td>
                    <td className="py-3 pr-3 font-bold text-gray-800 whitespace-nowrap">₹<EditableField record={rec} field="amount" type="number" /></td>
                    <td className="py-3 pr-3 text-gray-700 whitespace-nowrap">
                      <EditableField
                        record={rec} field="lwpDays" type="number"
                        displayValue={rec.lwpDays != null ? `${rec.lwpDays} day${rec.lwpDays === 1 ? '' : 's'}` : undefined}
                      />
                    </td>
                    <td className="py-3 pr-3 text-gray-700 whitespace-nowrap">
                      <EditableField
                        record={rec} field="lwpAmount" type="number"
                        displayValue={rec.lwpAmount != null ? `₹${rec.lwpAmount.toLocaleString('en-IN')}` : undefined}
                        emptyValue="—"
                      />
                    </td>
                    <td className="py-3 pr-3"><SecurityMoneyCell record={rec} onCollect={() => setCollectingRecord(rec)} /></td>
                    <td className="py-3 pr-3"><StatusLabel status={rec.status} /></td>
                    <td className="py-3 pr-4">
                      <div className="flex gap-1.5 justify-end">
                        {rec.status !== 'paid' && (
                          <button
                            onClick={() => setEditingRecord(rec)}
                            title="Edit details"
                            className="h-8 px-2.5 border border-gray-300 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-50 flex items-center gap-1"
                          >
                            <Pencil className="w-3.5 h-3.5" /> Edit
                          </button>
                        )}
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
                            className="h-8 px-3 bg-gray-900 hover:bg-black text-white rounded-lg text-xs font-semibold whitespace-nowrap"
                          >
                            Mark Paid
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Sticky bulk-action bar — appears once at least one unpaid record is selected */}
      {selectedRecords.length > 0 && (
        <div className="fixed bottom-0 inset-x-0 z-40 bg-gray-900 text-white px-4 py-3 flex items-center gap-3 shadow-[0_-4px_16px_rgba(0,0,0,0.15)]">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold">{selectedRecords.length} selected</p>
            <p className="text-xs text-gray-300">{fmt(selectedRecords.reduce((s, r) => s + r.amount, 0))} total</p>
          </div>
          <button
            type="button"
            onClick={() => setSelectedIds(new Set())}
            className="h-9 px-3 rounded-xl text-xs font-semibold text-gray-300 hover:text-white"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={() => setBulkPayOpen(true)}
            className="h-9 px-4 bg-white text-gray-900 rounded-xl text-xs font-bold hover:bg-gray-100"
          >
            Mark {selectedRecords.length} Paid
          </button>
        </div>
      )}

      {addOpen && <AddSalaryModal onClose={() => setAddOpen(false)} />}
      {bulkAddOpen && <BulkAddSalaryModal onClose={() => setBulkAddOpen(false)} />}
      {historyOpen && <AuditLogPanel resource="salary" title="Salary Change History" onClose={() => setHistoryOpen(false)} />}
      {payingRecord && <MarkPaidModal record={payingRecord} onClose={() => setPayingRecord(null)} />}
      {editingRecord && <EditSalaryModal record={editingRecord} onClose={() => setEditingRecord(null)} />}
      {collectingRecord && <CollectSecurityDepositModal record={collectingRecord} onClose={() => setCollectingRecord(null)} />}
      {bulkPayOpen && (
        <BulkMarkPaidModal
          records={selectedRecords}
          onClose={() => { setBulkPayOpen(false); setSelectedIds(new Set()); }}
        />
      )}
    </div>
  );
}
