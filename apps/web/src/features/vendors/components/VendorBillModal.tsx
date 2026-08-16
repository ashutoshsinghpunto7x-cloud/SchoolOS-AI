import { useState } from 'react';
import { X, Loader2, AlertCircle, Package, Wrench, Zap, Briefcase, MoreHorizontal } from 'lucide-react';
import { useRecordVendorBill } from '../hooks/useVendors';
import type { Vendor, VendorBill, VendorCategory } from '@schoolos/types';
import { cn } from '@/lib/utils';

const inputCls = 'w-full h-11 px-3.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#A855F7]/30 focus:border-[#5B21B6]';
const labelCls = 'block text-xs font-semibold text-gray-600 mb-1';

const CATEGORIES: { value: VendorCategory; label: string; icon: React.ElementType }[] = [
  { value: 'supplies',    label: 'Supplies',    icon: Package },
  { value: 'services',    label: 'Services',    icon: Briefcase },
  { value: 'maintenance', label: 'Maintenance', icon: Wrench },
  { value: 'utilities',   label: 'Utilities',   icon: Zap },
  { value: 'other',       label: 'Other',       icon: MoreHorizontal },
];

interface Props {
  vendor: Vendor;
  onClose: () => void;
  onSuccess?: (bill: VendorBill) => void;
}

export function VendorBillModal({ vendor, onClose, onSuccess }: Props) {
  const { mutateAsync: recordBill, isPending, error } = useRecordVendorBill(vendor._id);

  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<VendorCategory>(vendor.category);
  const [amount, setAmount] = useState('');
  const [billNumber, setBillNumber] = useState('');
  const [billDate, setBillDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState('');
  const [localErr, setLocalErr] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLocalErr('');
    const amt = parseFloat(amount);
    if (!description.trim()) return setLocalErr('Description is required.');
    if (isNaN(amt) || amt <= 0) return setLocalErr('Enter a valid amount.');

    const bill = await recordBill({
      description: description.trim(),
      category,
      amount: Math.round(amt * 100) / 100,
      billDate,
      dueDate: dueDate || undefined,
      billNumber: billNumber.trim() || undefined,
    });
    onSuccess?.(bill);
    onClose();
  }

  const displayErr = localErr || (error instanceof Error ? error.message : null);

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-5 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-gray-900">Record Purchase / Bill</h3>
            <p className="text-xs text-gray-500 mt-0.5">{vendor.name}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100"><X className="w-4 h-4 text-gray-500" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className={labelCls}>Description</label>
            <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} className={inputCls} placeholder="e.g. Stationery for August" autoFocus />
          </div>
          <div>
            <label className={labelCls}>Category</label>
            <div className="grid grid-cols-3 gap-2">
              {CATEGORIES.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setCategory(value)}
                  className={cn(
                    'flex flex-col items-center gap-1 py-2.5 rounded-xl border text-xs font-semibold transition-colors',
                    category === value ? 'border-[#5B21B6] bg-[#A855F7]/5 text-[#5B21B6]' : 'border-gray-200 text-gray-500 hover:bg-gray-50',
                  )}
                >
                  <Icon className="w-4 h-4" /> {label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Amount (₹)</label>
              <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} min={1} step={0.01} className={inputCls} placeholder="0.00" />
            </div>
            <div>
              <label className={labelCls}>Bill / Invoice No.</label>
              <input type="text" value={billNumber} onChange={(e) => setBillNumber(e.target.value)} className={inputCls} placeholder="Optional" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Bill Date</label>
              <input type="date" value={billDate} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setBillDate(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Due Date</label>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputCls} />
            </div>
          </div>
          {displayErr && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">
              <AlertCircle className="w-4 h-4 shrink-0" /> {displayErr}
            </div>
          )}
          <button type="submit" disabled={isPending} className="w-full h-11 bg-[#5B21B6] hover:bg-[#4C1D95] disabled:opacity-60 text-white font-semibold rounded-xl text-sm flex items-center justify-center gap-2">
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Record Bill
          </button>
        </form>
      </div>
    </div>
  );
}
