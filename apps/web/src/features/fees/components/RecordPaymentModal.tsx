import { useState, useEffect } from 'react';
import { X, IndianRupee, AlertCircle } from 'lucide-react';
import type { FeeRecord, PaymentMode, RecordPaymentPayload } from '@schoolos/types';
import { useRecordPayment } from '../hooks/useFees';

interface Props {
  fee: FeeRecord;
  onClose: () => void;
  onSuccess?: (payment: { amount: number }) => void;
}

const PAYMENT_MODES: { value: PaymentMode; label: string }[] = [
  { value: 'cash',          label: 'Cash' },
  { value: 'cheque',        label: 'Cheque' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'online',        label: 'Online' },
  { value: 'demand_draft',  label: 'Demand Draft' },
];

const fmt = (amount: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

const todayStr = () => new Date().toISOString().split('T')[0];

const inputCls = 'w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#A855F7] bg-white';
const labelCls = 'text-xs font-semibold text-gray-500 mb-1 block';

export function RecordPaymentModal({ fee, onClose, onSuccess }: Props) {
  const { mutateAsync: recordPayment, isPending, error } = useRecordPayment();

  const [amount,      setAmount]      = useState(String(fee.balance));
  const [mode,        setMode]        = useState<PaymentMode>('cash');
  const [date,        setDate]        = useState(todayStr());
  const [reference,   setReference]   = useState('');
  const [remarks,     setRemarks]     = useState('');
  const [localError,  setLocalError]  = useState('');

  // Keep amount in sync if balance changes (e.g., modal re-used)
  useEffect(() => { setAmount(String(fee.balance)); }, [fee._id, fee.balance]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLocalError('');

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setLocalError('Please enter a valid payment amount.');
      return;
    }
    if (numAmount > fee.balance + 0.01) {
      setLocalError(`Amount cannot exceed balance of ${fmt(fee.balance)}.`);
      return;
    }

    const payload: RecordPaymentPayload = {
      feeRecordId:     fee._id,
      amount:          Math.round(numAmount * 100) / 100,
      paymentDate:     date,
      paymentMode:     mode,
      referenceNumber: reference.trim() || undefined,
      remarks:         remarks.trim() || undefined,
    };

    await recordPayment(payload);
    onSuccess?.({ amount: payload.amount });
    onClose();
  }

  const mutationError = error instanceof Error ? error.message : null;
  const displayError  = localError || mutationError;

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Record Payment</h2>
            <p className="text-sm text-gray-500 mt-0.5 truncate max-w-xs">
              {fee.description || fee.feeHead} — {fee.studentName}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Balance summary */}
        <div className="grid grid-cols-3 gap-3 px-6 py-4 bg-gray-50">
          <div className="text-center">
            <p className="text-xs text-gray-400">Total</p>
            <p className="text-sm font-bold text-gray-800">{fmt(fee.totalAmount)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-400">Paid</p>
            <p className="text-sm font-bold text-green-600">{fmt(fee.paidAmount)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-400">Balance</p>
            <p className="text-sm font-bold text-orange-600">{fmt(fee.balance)}</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Amount */}
          <div>
            <label className={labelCls}>Amount (₹) *</label>
            <div className="relative">
              <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min={0.01}
                max={fee.balance}
                step={0.01}
                required
                className={`${inputCls} pl-8`}
                placeholder={String(fee.balance)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Mode */}
            <div>
              <label className={labelCls}>Payment Mode *</label>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as PaymentMode)}
                className={inputCls}
                required
              >
                {PAYMENT_MODES.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>

            {/* Date */}
            <div>
              <label className={labelCls}>Payment Date *</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                max={todayStr()}
                required
                className={inputCls}
              />
            </div>
          </div>

          {/* Reference */}
          <div>
            <label className={labelCls}>Reference Number</label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className={inputCls}
              placeholder="Cheque no., transaction ID, etc."
              maxLength={100}
            />
          </div>

          {/* Remarks */}
          <div>
            <label className={labelCls}>Remarks</label>
            <input
              type="text"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className={inputCls}
              placeholder="Optional note"
              maxLength={500}
            />
          </div>

          {/* Error */}
          {displayError && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {displayError}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-11 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 h-11 rounded-xl bg-[#5B21B6] hover:bg-[#4C1D95] disabled:opacity-50 text-white text-sm font-bold transition-colors"
            >
              {isPending ? 'Saving…' : 'Confirm Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
