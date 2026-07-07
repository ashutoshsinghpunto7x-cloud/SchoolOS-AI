import { useState } from 'react';
import { X, Loader2, AlertCircle, ChevronDown } from 'lucide-react';
import { useCreateFeeRecord } from '@/features/fees/hooks/useFees';
import type { FeeHead, FeeRecord, CreateFeeRecordPayload } from '@schoolos/types';

interface Props {
  studentId: string;
  onClose?: () => void;
  onCreated: (fee: FeeRecord) => void;
  /** Prefills the amount from the student's recurring monthly tuition fee, when set. */
  defaultAmount?: number;
}

const FEE_HEADS: { value: FeeHead; label: string }[] = [
  { value: 'tuition',       label: 'Tuition Fee' },
  { value: 'admission',     label: 'Admission Fee' },
  { value: 'examination',   label: 'Examination Fee' },
  { value: 'transport',     label: 'Transport Fee' },
  { value: 'hostel',        label: 'Hostel Fee' },
  { value: 'miscellaneous', label: 'Miscellaneous' },
];

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const currentAcademicYear = () => {
  const y = new Date().getFullYear();
  const m = new Date().getMonth();
  return m >= 3 ? `${y}-${String(y + 1).slice(-2)}` : `${y - 1}-${String(y).slice(-2)}`;
};

const todayStr = () => new Date().toISOString().split('T')[0];

const inputCls = 'w-full h-11 px-3.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#10B981]/30 focus:border-[#10B981]';
const labelCls = 'block text-xs font-semibold text-gray-600 mb-1';

export function AddFeeModal({ studentId, onClose, onCreated, defaultAmount }: Props) {
  const { mutateAsync, isPending, error } = useCreateFeeRecord();

  const [feeHead, setFeeHead] = useState<FeeHead>('tuition');
  const [month, setMonth] = useState(MONTHS[new Date().getMonth()]);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState(defaultAmount ? String(defaultAmount) : '');
  const [dueDate, setDueDate] = useState(todayStr());
  const [localErr, setLocalErr] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLocalErr('');
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) return setLocalErr('Enter a valid amount.');
    if (!dueDate) return setLocalErr('Due date is required.');

    const payload: CreateFeeRecordPayload = {
      studentId,
      feeHead,
      month,
      description: description.trim() || `${month} ${FEE_HEADS.find((h) => h.value === feeHead)?.label ?? 'Fee'}`,
      academicYear: currentAcademicYear(),
      dueDate,
      totalAmount: Math.round(amt * 100) / 100,
    };

    const record = await mutateAsync(payload);
    setAmount(defaultAmount ? String(defaultAmount) : '');
    setDescription('');
    onCreated(record);
  }

  const displayErr = localErr || (error instanceof Error ? error.message : null);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold text-gray-900">Assign New Fee</h3>
        {onClose && (
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        )}
      </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className={labelCls}>Fee Type</label>
            <div className="relative">
              <select value={feeHead} onChange={(e) => setFeeHead(e.target.value as FeeHead)} className={`${inputCls} appearance-none pr-9`}>
                {FEE_HEADS.map((h) => <option key={h.value} value={h.value}>{h.label}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Month</label>
              <select value={month} onChange={(e) => setMonth(e.target.value)} className={inputCls}>
                {MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Due Date</label>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputCls} />
            </div>
          </div>

          <div>
            <label className={labelCls}>Amount (₹)</label>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} min={1} step={0.01} className={inputCls} placeholder="0.00" />
          </div>

          <div>
            <label className={labelCls}>Description (Optional)</label>
            <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} className={inputCls} placeholder={`${month} ${FEE_HEADS.find((h) => h.value === feeHead)?.label}`} />
          </div>

          {displayErr && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">
              <AlertCircle className="w-4 h-4 shrink-0" /> {displayErr}
            </div>
          )}

        <button type="submit" disabled={isPending} className="w-full h-11 bg-[#10B981] hover:bg-[#059669] disabled:opacity-60 text-white font-semibold rounded-xl text-sm flex items-center justify-center gap-2">
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Assign Fee & Collect
        </button>
      </form>
    </div>
  );
}
