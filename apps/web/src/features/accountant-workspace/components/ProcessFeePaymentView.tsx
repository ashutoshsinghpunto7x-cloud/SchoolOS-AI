import { useMemo, useState } from 'react';
import {
  ArrowLeft, Loader2, AlertCircle, Banknote, CreditCard, Landmark, FileText,
  Printer, GraduationCap, User as UserIcon, Hash,
} from 'lucide-react';
import { useUpdateAnyFeeRecord, useRecordPayment } from '@/features/fees/hooks/useFees';
import { FeeReceiptSuccessScreen, type CollectContext, type ReceiptLineItem } from './FeeReceipt';
import type { AdmissionStatus, FeeRecord, PaymentMode, Student } from '@schoolos/types';
import { cn } from '@/lib/utils';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

const fmtDate = (d?: string) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const STATUS_LABELS: Record<AdmissionStatus, { label: string; classes: string }> = {
  active:             { label: 'Active',       classes: 'bg-emerald-100 text-emerald-800' },
  enrolled:           { label: 'Active',       classes: 'bg-emerald-100 text-emerald-800' },
  graduated:          { label: 'Graduated',    classes: 'bg-blue-100 text-blue-800' },
  transferred:        { label: 'Transferred',  classes: 'bg-amber-100 text-amber-800' },
  inactive:           { label: 'Inactive',     classes: 'bg-gray-100 text-gray-600' },
  withdrawn:          { label: 'Inactive',     classes: 'bg-gray-100 text-gray-600' },
  enquiry:            { label: 'Enquiry',      classes: 'bg-purple-100 text-purple-800' },
  inquiry:            { label: 'Enquiry',      classes: 'bg-purple-100 text-purple-800' },
  application:        { label: 'Application',  classes: 'bg-purple-100 text-purple-800' },
  admission_pending:  { label: 'Adm. Pending', classes: 'bg-amber-100 text-amber-800' },
};

// ── Due fee records ──────────────────────────────────────────────────────────
// Only actually-existing, unpaid fee records are shown here — no synthetic
// past/future month rows. An accountant can only collect what's genuinely due
// right now; new dues are created ahead of time via "Assign New Fee".

const FEE_HEAD_LABELS: Record<string, string> = {
  tuition: 'Tuition Fee',
  admission: 'Admission Fee',
  examination: 'Examination Fee',
  transport: 'Transport Fee',
  hostel: 'Hostel Fee',
  miscellaneous: 'Miscellaneous',
};

function feeLabel(record: FeeRecord): string {
  const head = FEE_HEAD_LABELS[record.feeHead] ?? record.feeHead;
  return record.month ? `${record.month} — ${head}` : head;
}

function dueFeeRecords(feeRecords: FeeRecord[]): FeeRecord[] {
  return feeRecords
    .filter((r) => r.status !== 'paid' && r.status !== 'waived')
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

function MonthStatusPill({ record }: { record: FeeRecord }) {
  if (record.status === 'overdue') {
    return <span className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wide bg-red-50 text-red-600">OVERDUE</span>;
  }
  if (record.status === 'partially_paid') {
    return <span className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wide bg-amber-50 text-amber-600">PARTIAL</span>;
  }
  return <span className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wide bg-blue-50 text-blue-600">PENDING</span>;
}

// ── Payment method tiles ─────────────────────────────────────────────────────

type MethodKey = 'cash' | 'card' | 'bank_transfer' | 'cheque';

const METHODS: { key: MethodKey; label: string; icon: React.ElementType; mode: PaymentMode }[] = [
  { key: 'cash',          label: 'Cash',          icon: Banknote,   mode: 'cash' },
  { key: 'card',          label: 'Card',          icon: CreditCard, mode: 'online' },
  { key: 'bank_transfer', label: 'Bank Transfer', icon: Landmark,   mode: 'bank_transfer' },
  { key: 'cheque',        label: 'Cheque',        icon: FileText,   mode: 'cheque' },
];

// ── One selectable due-fee row ───────────────────────────────────────────────

function MonthRow({
  record, checked, amount, onToggle, onAmountChange,
}: { record: FeeRecord; checked: boolean; amount: number; onToggle: () => void; onAmountChange: (v: number) => void }) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 px-4 py-3.5 rounded-xl border transition-colors',
        checked ? 'bg-[#A855F7]/5 border-[#A855F7]/40' : 'bg-white border-gray-200 hover:border-gray-300',
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        className="w-4 h-4 rounded border-gray-300 text-[#5B21B6] focus:ring-[#A855F7]/40 shrink-0"
      />
      <label className="flex-1 min-w-0 cursor-pointer" onClick={(e) => { e.preventDefault(); onToggle(); }}>
        <p className="text-sm font-semibold text-gray-900">{feeLabel(record)}</p>
        <p className="text-xs text-gray-400 mt-0.5">Due {fmtDate(record.dueDate)}</p>
      </label>
      {checked ? (
        <input
          type="number" min={0} step={0.01} value={amount}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => onAmountChange(parseFloat(e.target.value) || 0)}
          className="w-28 h-9 px-2.5 rounded-lg border border-gray-200 text-sm text-right focus:outline-none focus:ring-2 focus:ring-[#A855F7]/30 focus:border-[#5B21B6] shrink-0"
        />
      ) : (
        <div className="text-right shrink-0">
          <p className="text-sm font-bold text-gray-900">{fmt(record.balance)}</p>
        </div>
      )}
      <div className="shrink-0"><MonthStatusPill record={record} /></div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

interface Props {
  student: Student;
  feeRecords: FeeRecord[];
  lastPaymentDate?: string;
  onBack: () => void;
  /** Called once the payment has actually been recorded, so the caller can refresh its ledger data. */
  onPaid: () => void;
}

export function ProcessFeePaymentView({ student, feeRecords, lastPaymentDate, onBack, onPaid }: Props) {
  const dueRecords = useMemo(() => dueFeeRecords(feeRecords), [feeRecords]);

  const [selected, setSelected] = useState<Record<string, number>>({});
  const [discount, setDiscount] = useState('');
  const [remarks, setRemarks] = useState('');
  const [method, setMethod] = useState<MethodKey>('cash');
  const [refNumber, setRefNumber] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<{ lineItems: ReceiptLineItem[]; total: number; paymentMode: string; receiptNumber?: string } | null>(null);

  const { mutateAsync: updateFeeRecord, isPending: updating } = useUpdateAnyFeeRecord();
  const { mutateAsync: recordPayment, isPending: paying } = useRecordPayment();

  const isPending = updating || paying;

  function toggle(r: FeeRecord) {
    setSelected((prev) => {
      const next = { ...prev };
      if (r._id in next) { delete next[r._id]; return next; }
      next[r._id] = r.balance;
      return next;
    });
  }

  const selectedRecords = dueRecords.filter((r) => r._id in selected);
  const subtotal = Object.values(selected).reduce((a, b) => a + b, 0);
  const discountNum = Math.min(Math.max(parseFloat(discount) || 0, 0), subtotal);
  const total = Math.round((subtotal - discountNum) * 100) / 100;

  const status = STATUS_LABELS[student.admissionStatus] ?? { label: student.admissionStatus, classes: 'bg-gray-100 text-gray-600' };
  const guardian = student.fatherName || student.motherName || '—';
  const initials = student.fullName.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();

  async function handleSubmit() {
    setError('');
    if (!selectedRecords.length) return setError('Select at least one fee to collect.');
    if (method !== 'cash' && !refNumber.trim()) return setError('Enter a reference / transaction number for this payment method.');

    const paymentMode = METHODS.find((m) => m.key === method)!.mode;
    const today = new Date().toISOString().slice(0, 10);

    // Split the entered discount proportionally across the selected fees so
    // each fee record's own balance/discountAmount stays accurate for the
    // ledger — the last item absorbs the rounding remainder so allocations
    // sum exactly.
    let remainingDiscount = discountNum;
    const lineItems: ReceiptLineItem[] = [];
    const receiptNumbers: string[] = [];

    try {
      for (let i = 0; i < selectedRecords.length; i++) {
        let record = selectedRecords[i];
        const isLast = i === selectedRecords.length - 1;
        const requestedAmount = selected[record._id];
        const share = subtotal > 0 ? requestedAmount / subtotal : 0;
        const allocated = isLast ? remainingDiscount : Math.round(discountNum * share * 100) / 100;
        remainingDiscount = Math.round((remainingDiscount - allocated) * 100) / 100;

        if (allocated > 0) {
          record = await updateFeeRecord({ id: record._id, payload: { discountAmount: (record.discountAmount || 0) + allocated } });
        }

        const amountToPay = Math.min(requestedAmount - allocated, record.balance);
        if (amountToPay <= 0) continue;

        const result = await recordPayment({
          feeRecordId: record._id,
          amount: Math.round(amountToPay * 100) / 100,
          paymentDate: today,
          paymentMode,
          referenceNumber: method === 'cash' ? undefined : refNumber.trim(),
          remarks: remarks.trim() || undefined,
        });

        lineItems.push({ label: feeLabel(record), amount: Math.round((amountToPay + allocated) * 100) / 100 });
        if (result.payment.receiptNumber) receiptNumbers.push(result.payment.receiptNumber);
      }

      if (discountNum > 0) lineItems.push({ label: 'Discount', amount: -discountNum });

      setSuccess({ lineItems, total, paymentMode: method === 'card' ? 'card' : paymentMode, receiptNumber: receiptNumbers.join(' / ') || undefined });
      onPaid();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record payment.');
    }
  }

  if (success) {
    const context: CollectContext = {
      studentId: student._id, studentName: student.fullName, class: student.class, section: student.section,
      fatherName: student.fatherName, parentPhone: student.parentPhone, email: student.email,
    };
    return (
      <FeeReceiptSuccessScreen
        context={context}
        lineItems={success.lineItems}
        total={success.total}
        paymentMode={success.paymentMode}
        receiptNumber={success.receiptNumber}
        onDone={onBack}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="bg-white border-b border-gray-100 px-4 py-4">
        <button onClick={onBack} className="text-xs font-semibold text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-2">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Ledger
        </button>
        <h1 className="text-lg font-bold text-gray-900">Process Fee Payment</h1>
      </div>

      <div className="px-4 py-5 max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-5 gap-5 items-start">
        {/* Left column: student card + month selection */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
              <div className="w-14 h-14 rounded-2xl bg-[#5B21B6] flex items-center justify-center overflow-hidden shrink-0">
                {student.photoUrl ? (
                  <img src={student.photoUrl} alt={student.fullName} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-lg font-bold text-white">{initials}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-gray-900 truncate">{student.fullName}</h2>
                  <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold shrink-0', status.classes)}>
                    {status.label}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-3 pt-4 text-sm">
              <div>
                <p className="flex items-center gap-1 text-[11px] text-gray-400"><Hash className="w-3 h-3" /> Student ID</p>
                <p className="font-semibold text-gray-800 mt-0.5">{student.admissionNumber}</p>
              </div>
              <div>
                <p className="flex items-center gap-1 text-[11px] text-gray-400"><GraduationCap className="w-3 h-3" /> Class &amp; Section</p>
                <p className="font-semibold text-gray-800 mt-0.5">{student.class} - {student.section}</p>
              </div>
              <div>
                <p className="flex items-center gap-1 text-[11px] text-gray-400"><UserIcon className="w-3 h-3" /> Guardian</p>
                <p className="font-semibold text-gray-800 mt-0.5 truncate">{guardian}</p>
              </div>
              <div>
                <p className="text-[11px] text-gray-400">Last Payment</p>
                <p className="font-semibold text-gray-800 mt-0.5">{fmtDate(lastPaymentDate)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <h3 className="text-sm font-bold text-gray-900 mb-1">Select Fee(s) to Collect</h3>
            <p className="text-xs text-gray-400 mb-3">Every outstanding fee — pending, overdue, or partially paid — across every category.</p>
            {!dueRecords.length ? (
              <p className="text-sm text-gray-400 text-center py-6">No pending fees for this student.</p>
            ) : (
              <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                {dueRecords.map((r) => (
                  <MonthRow
                    key={r._id}
                    record={r}
                    checked={r._id in selected}
                    amount={selected[r._id] ?? 0}
                    onToggle={() => toggle(r)}
                    onAmountChange={(v) => setSelected((prev) => ({ ...prev, [r._id]: v }))}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right column: payment summary */}
        <div className="lg:col-span-2 lg:sticky lg:top-5">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <h3 className="text-sm font-bold text-gray-900 mb-4">Payment Summary</h3>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Subtotal ({selectedRecords.length} item{selectedRecords.length === 1 ? '' : 's'})</span>
                <span className="text-sm font-semibold text-gray-800">{fmt(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-gray-500 shrink-0">Discount (₹)</span>
                <input
                  type="number" min={0} max={subtotal} step={0.01} value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  placeholder="0"
                  className="w-28 h-9 px-2.5 rounded-lg border border-gray-200 text-sm text-right focus:outline-none focus:ring-2 focus:ring-[#A855F7]/30 focus:border-[#5B21B6]"
                />
              </div>
            </div>

            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
              <span className="text-sm font-bold text-gray-900">Total Amount</span>
              <span className="text-2xl font-bold text-gray-900">{fmt(total)}</span>
            </div>

            <div className="mt-5">
              <p className="text-xs font-semibold text-gray-600 mb-2">Select Payment Method</p>
              <div className="grid grid-cols-2 gap-2.5">
                {METHODS.map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setMethod(key)}
                    className={cn(
                      'flex flex-col items-center justify-center gap-1.5 h-16 rounded-xl border-2 font-semibold text-xs transition-colors',
                      method === key ? 'border-[#5B21B6] bg-[#A855F7]/5 text-[#5B21B6]' : 'border-gray-200 text-gray-500 hover:bg-gray-50',
                    )}
                  >
                    <Icon className="w-4 h-4" /> {label}
                  </button>
                ))}
              </div>
            </div>

            {method !== 'cash' && (
              <div className="mt-3">
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  {method === 'card' ? 'Transaction / UTR Number' : method === 'cheque' ? 'Cheque Number' : 'Transaction Reference'}
                </label>
                <input
                  type="text" value={refNumber} onChange={(e) => setRefNumber(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#A855F7]/30 focus:border-[#5B21B6]"
                  placeholder="e.g. 123456789012" maxLength={30}
                />
              </div>
            )}

            <div className="mt-4">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Remarks / Notes</label>
              <textarea
                rows={3} value={remarks} onChange={(e) => setRemarks(e.target.value)}
                placeholder="Enter transaction details or notes…"
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#A855F7]/30 focus:border-[#5B21B6]"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2 mt-4">
                <AlertCircle className="w-4 h-4 shrink-0" /> {error}
              </div>
            )}

            <button
              type="button"
              onClick={handleSubmit}
              disabled={isPending || !selectedRecords.length}
              className="w-full h-12 mt-4 bg-[#5B21B6] hover:bg-[#4C1D95] disabled:opacity-50 text-white font-semibold rounded-xl text-sm flex items-center justify-center gap-2 transition-colors"
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
              {isPending ? 'Collecting…' : 'Collect & Print Receipt'}
            </button>
            <p className="text-[11px] text-gray-400 text-center mt-2">
              This action will generate an official invoice and update the student ledger instantly.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
