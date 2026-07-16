import { useState } from 'react';
import { X, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useMarkPayrollPaid } from '../hooks/usePayroll';
import type { PayrollRecord, PaymentMode } from '@schoolos/types';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

const inputCls = 'w-full h-11 px-3.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#A855F7]/30 focus:border-[#5B21B6]';
const labelCls = 'block text-xs font-semibold text-gray-600 mb-1';

const PAYMENT_MODES: { value: PaymentMode; label: string }[] = [
  { value: 'cash', label: 'Cash' }, { value: 'cheque', label: 'Cheque' },
  { value: 'bank_transfer', label: 'Bank Transfer' }, { value: 'online', label: 'Online' },
  { value: 'demand_draft', label: 'Demand Draft' },
];

export function MarkPayrollPaidModal({ record, onClose }: { record: PayrollRecord; onClose: () => void }) {
  const { mutateAsync, isPending, error } = useMarkPayrollPaid();
  const [paidDate, setPaidDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('bank_transfer');
  const [notes, setNotes] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await mutateAsync({ id: record._id, payload: { paidDate, paymentMode, notes: notes.trim() || undefined } });
    onClose();
  }

  const displayErr = error instanceof Error ? error.message : null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-gray-900">Mark Salary as Paid</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100"><X className="w-4 h-4 text-gray-500" /></button>
        </div>
        <p className="text-sm text-gray-500 mb-4">{record.employeeName} · {fmt(record.netSalary)}</p>
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
          <div>
            <label className={labelCls}>Notes (optional)</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={`${inputCls} h-auto py-2 resize-none`} />
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
