import { useState, useEffect } from 'react';
import { X, IndianRupee, AlertCircle, Banknote, CreditCard } from 'lucide-react';
import type { Vendor, VendorBill, PaymentMode, RecordVendorPaymentPayload } from '@schoolos/types';
import { useRecordVendorPayment } from '../hooks/useVendors';
import { cn } from '@/lib/utils';

interface Props {
  vendor: Vendor;
  /** Open (unpaid/partially-paid) bills to choose from — defaults to the oldest one.
   *  If omitted or empty, the payment is recorded on-account (no bill link). */
  openBills?: VendorBill[];
  onClose: () => void;
  onSuccess?: (payment: { amount: number; paymentMode: PaymentMode; receiptNumber?: string }) => void;
}

const fmt = (amount: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

const todayStr = () => new Date().toISOString().split('T')[0];

const inputCls = 'w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#A855F7]/30 focus:border-[#5B21B6] bg-white';
const labelCls = 'text-xs font-semibold text-gray-500 mb-1 block';

type SimpleMode = 'cash' | 'upi';

const MODES: { value: SimpleMode; label: string; icon: React.ElementType }[] = [
  { value: 'cash', label: 'Cash',   icon: Banknote },
  { value: 'upi',  label: 'Online', icon: CreditCard },
];

export function VendorPaymentModal({ vendor, openBills = [], onClose, onSuccess }: Props) {
  const { mutateAsync: recordPayment, isPending, error } = useRecordVendorPayment(vendor._id);

  const [billId, setBillId] = useState<string>(openBills[0]?._id ?? '');
  const bill = openBills.find((b) => b._id === billId);

  const [amount, setAmount] = useState(bill ? String(bill.balance) : '');
  const [mode, setMode] = useState<SimpleMode>('cash');
  const [refNumber, setRefNumber] = useState('');
  const [localError, setLocalError] = useState('');

  useEffect(() => { setRefNumber(''); }, [mode]);
  useEffect(() => { setAmount(bill ? String(bill.balance) : ''); }, [billId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLocalError('');

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setLocalError('Please enter a valid payment amount.');
      return;
    }
    if (bill && numAmount > bill.balance + 0.01) {
      setLocalError(`Amount cannot exceed balance of ${fmt(bill.balance)}.`);
      return;
    }
    if (mode === 'upi' && !refNumber.trim()) {
      setLocalError('Enter the reference/UTR number for the online payment.');
      return;
    }

    const paymentMode: PaymentMode = mode === 'upi' ? 'online' : 'cash';
    const payload: RecordVendorPaymentPayload = {
      billId: bill?._id,
      amount: Math.round(numAmount * 100) / 100,
      paymentDate: todayStr(),
      paymentMode,
      referenceNumber: mode === 'cash' ? undefined : refNumber.trim(),
    };

    const result = await recordPayment(payload);
    onSuccess?.({ amount: payload.amount, paymentMode, receiptNumber: result.payment.receiptNumber });
    onClose();
  }

  const mutationError = error instanceof Error ? error.message : null;
  const displayError  = localError || mutationError;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Record Payment</h2>
            <p className="text-sm text-gray-500 mt-0.5 truncate max-w-xs">
              {bill ? bill.description : 'On-account payment'} — {vendor.name}
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {bill && (
          <div className="grid grid-cols-3 gap-3 px-6 py-4 bg-gray-50">
            <div className="text-center"><p className="text-xs text-gray-400">Total</p><p className="text-sm font-bold text-gray-800">{fmt(bill.amount)}</p></div>
            <div className="text-center"><p className="text-xs text-gray-400">Paid</p><p className="text-sm font-bold text-green-600">{fmt(bill.paidAmount)}</p></div>
            <div className="text-center"><p className="text-xs text-gray-400">Balance</p><p className="text-sm font-bold text-orange-600">{fmt(bill.balance)}</p></div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {openBills.length > 0 && (
            <div>
              <label className={labelCls}>Apply To</label>
              <select
                value={billId}
                onChange={(e) => setBillId(e.target.value)}
                className={inputCls}
              >
                {openBills.map((b) => (
                  <option key={b._id} value={b._id}>{b.description} — {fmt(b.balance)} outstanding</option>
                ))}
                <option value="">On-account (no specific bill)</option>
              </select>
            </div>
          )}
          <div>
            <label className={labelCls}>Amount (₹) *</label>
            <div className="relative">
              <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
                min={0.01} max={bill?.balance} step={0.01} required
                className={`${inputCls} pl-8`} placeholder={bill ? String(bill.balance) : '0.00'}
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>Payment Mode *</label>
            <div className="grid grid-cols-2 gap-2.5">
              {MODES.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setMode(value)}
                  className={cn(
                    'flex flex-col items-center justify-center gap-1.5 h-16 rounded-xl border-2 font-semibold text-xs transition-colors',
                    mode === value ? 'border-[#5B21B6] bg-[#A855F7]/5 text-[#5B21B6]' : 'border-gray-200 text-gray-500 hover:bg-gray-50',
                  )}
                >
                  <Icon className="w-4 h-4" /> {label}
                </button>
              ))}
            </div>
          </div>

          {mode === 'upi' && (
            <div>
              <label className={labelCls}>Reference / UTR Number *</label>
              <input
                type="text" value={refNumber} onChange={(e) => setRefNumber(e.target.value)}
                className={inputCls} placeholder="e.g. 123456789012" maxLength={30} autoFocus
              />
            </div>
          )}

          {displayError && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">
              <AlertCircle className="w-4 h-4 shrink-0" /> {displayError}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 h-11 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={isPending} className="flex-1 h-11 rounded-xl bg-[#5B21B6] hover:bg-[#4C1D95] disabled:opacity-50 text-white text-sm font-bold transition-colors">
              {isPending ? 'Saving…' : 'Confirm Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
