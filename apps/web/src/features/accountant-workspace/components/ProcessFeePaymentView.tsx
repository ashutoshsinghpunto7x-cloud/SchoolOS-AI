import { useMemo, useState } from 'react';
import {
  ArrowLeft, Loader2, AlertCircle, Printer, Save,
  GraduationCap, User as UserIcon, Hash,
} from 'lucide-react';
import { useUpdateAnyFeeRecord, useCreateFeeRecord, useRecordPayment } from '@/features/fees/hooks/useFees';
import { FeeReceiptSuccessScreen, type CollectContext, type ReceiptLineItem } from './FeeReceipt';
import type { AdmissionStatus, FeeHead, FeeRecord, PaymentMode, Student } from '@schoolos/types';
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

const FEE_HEAD_LABELS: Record<string, string> = {
  tuition: 'Tuition Fee', admission: 'Admission Fee', examination: 'Examination Fee',
  transport: 'Transport Fee', hostel: 'Hostel Fee', miscellaneous: 'Annual Maintenance',
};

// ── Month candidates for tuition arrears / current / advance ─────────────────
// Tuition is the one fee head that still auto-generates month-to-month off
// student.monthlyTuitionFee (independent of the Fee Structure catalog), so a
// month can be "payable" here even before any FeeRecord exists for it yet.

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function academicYearFor(date: Date): string {
  const y = date.getFullYear();
  const startY = date.getMonth() >= 3 ? y : y - 1; // academic year starts April
  return `${startY}-${String(startY + 1).slice(-2)}`;
}

interface TuitionCandidate {
  key: string;
  month: string;
  academicYear: string;
  label: string;
  dueDate: string;
}

function buildTuitionCandidates(feeRecords: FeeRecord[]): TuitionCandidate[] {
  const now = new Date();
  const currentAcademicYear = academicYearFor(now);
  const hasRecord = new Set(
    feeRecords.filter((f) => f.feeHead === 'tuition').map((f) => `${f.month}||${f.academicYear}`),
  );
  const list: TuitionCandidate[] = [];
  for (let offset = -6; offset <= 5; offset++) {
    const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    const month = MONTH_NAMES[d.getMonth()];
    const academicYear = academicYearFor(d);
    // Academic year starts in April — never suggest a "new" tuition due from
    // before the current academic year started; only real, already-recorded
    // arrears (handled above via existingLines) should surface for those months.
    if (academicYear < currentAcademicYear) continue;
    const key = `${month}||${academicYear}`;
    if (hasRecord.has(key)) continue; // already a real FeeRecord — shown in the main list below instead
    list.push({
      key, month, academicYear,
      label: `${month} ${d.getFullYear()} — ${FEE_HEAD_LABELS.tuition}`,
      dueDate: new Date(d.getFullYear(), d.getMonth(), 10).toISOString().slice(0, 10),
    });
  }
  return list;
}

// ── Unified payable line — either a real FeeRecord (any head) or a synthetic
// not-yet-created tuition month ────────────────────────────────────────────

interface PayableLine {
  key: string;
  label: string;
  monthLabel: string; // group header — "April 2026" or "Whole Year"
  month?: string; // raw month name, e.g. "April" — used to match the ledger screen's selected month
  sortKey: string;
  dueDate: string;
  existing?: FeeRecord;
  tuitionCandidate?: TuitionCandidate;
}

function monthGroupLabel(month?: string, academicYear?: string, dueDate?: string): string {
  if (!month) return 'Whole Year / One-Time';
  if (dueDate) {
    const d = new Date(dueDate);
    return `${month} ${d.getFullYear()}`;
  }
  return `${month} (${academicYear})`;
}

function buildPayableLines(feeRecords: FeeRecord[]): PayableLine[] {
  const existingLines: PayableLine[] = feeRecords
    .filter((f) => f.status !== 'paid' && f.status !== 'waived')
    .map((f) => ({
      key: f._id,
      label: f.feeHead === 'miscellaneous' && f.customHead ? f.customHead : (FEE_HEAD_LABELS[f.feeHead] ?? f.feeHead),
      monthLabel: monthGroupLabel(f.month, f.academicYear, f.dueDate),
      month: f.month,
      sortKey: f.dueDate,
      dueDate: f.dueDate,
      existing: f,
    }));

  const tuitionLines: PayableLine[] = buildTuitionCandidates(feeRecords).map((c) => ({
    key: c.key,
    label: FEE_HEAD_LABELS.tuition,
    monthLabel: monthGroupLabel(c.month, c.academicYear, c.dueDate),
    month: c.month,
    sortKey: c.dueDate,
    dueDate: c.dueDate,
    tuitionCandidate: c,
  }));

  return [...existingLines, ...tuitionLines].sort((a, b) => a.sortKey.localeCompare(b.sortKey));
}

// ── Payment mode dropdown — mirrors the school's existing paper register (Cash,
// UPI, SSE UPI, Online, SSE Online, Challan, Cheque, DD, Card) so the accountant
// picks the same wording they already know. ────────────────────────────────────

const MODES: { value: PaymentMode; label: string }[] = [
  { value: 'cash',          label: 'Cash' },
  { value: 'upi',           label: 'UPI' },
  { value: 'sse_upi',       label: 'SSE UPI' },
  { value: 'online',        label: 'Online' },
  { value: 'sse_online',    label: 'SSE Online' },
  { value: 'challan',       label: 'Challan' },
  { value: 'cheque',        label: 'Cheque' },
  { value: 'demand_draft',  label: 'DD' },
  { value: 'card',          label: 'Card' },
];

const MODE_NEEDS_REF = new Set<PaymentMode>(['cheque', 'demand_draft', 'card', 'challan']);

// ── Per-line editable amounts — Discount/Fine/Paid are always visible, always
// editable, and additive on top of whatever the fee record already carries
// (mirrors a paper collection register: today's entry, not a running total).

interface LineValues {
  discount: number;
  fine: number;
  paid: number;
}
const EMPTY_VALUES: LineValues = { discount: 0, fine: 0, paid: 0 };

type InstallmentStatus = 'paid' | 'partial' | 'unpaid';

const STATUS_BADGES: Record<InstallmentStatus, { label: string; classes: string }> = {
  paid:    { label: 'Fully Paid',     classes: 'bg-emerald-100 text-emerald-700' },
  partial: { label: 'Partially Paid', classes: 'bg-amber-100 text-amber-700' },
  unpaid:  { label: 'Unpaid',         classes: 'bg-red-100 text-red-600' },
};

// Number inputs with the native spinner hidden and mouse-wheel scrolling
// disabled — pure click-and-type, no accidental value changes.
const cellInputCls =
  'w-20 h-8 px-2 rounded-md border border-gray-200 text-[13px] text-right ' +
  'focus:outline-none focus:ring-2 focus:ring-[#A855F7]/30 focus:border-[#5B21B6] ' +
  '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none';

function preventWheelChange(e: React.WheelEvent<HTMLInputElement>) {
  e.currentTarget.blur();
}

// ── One installment row of the fee grid — a compact spreadsheet-style row
// (Fee / Disc / Fine / Paid / Due), matching the register the accountants
// already collect fees on. Discount, Fine and Paid are always live inputs —
// nothing appears or disappears on click, and Due recalculates on every
// keystroke: Due = (Fee balance − Discount + Fine) − Paid. ───────────────────

function InstallmentRow({
  line, feeAmount, values, due, onDiscChange, onFineChange, onPaidChange, onToggle,
}: {
  line: PayableLine;
  feeAmount: number;
  values: LineValues;
  due: number;
  onDiscChange: (v: number) => void;
  onFineChange: (v: number) => void;
  onPaidChange: (v: number) => void;
  onToggle: (checked: boolean) => void;
}) {
  const rec = line.existing;
  const alreadyPaid = rec?.paidAmount ?? 0;
  const touchedPaid = values.paid > 0;
  const selected = values.paid > 0 || values.discount > 0 || values.fine > 0;

  const status: InstallmentStatus =
    due <= 0.004 && (touchedPaid || alreadyPaid > 0) ? 'paid'
    : (touchedPaid || alreadyPaid > 0) ? 'partial'
    : 'unpaid';
  const badge = STATUS_BADGES[status];

  return (
    <tr className={cn('border-b border-gray-100 hover:bg-gray-50/60 transition-colors', selected && 'bg-violet-50/40')}>
      <td className="py-2 pl-3 pr-1 align-top">
        <input
          type="checkbox"
          checked={selected}
          onChange={(e) => onToggle(e.target.checked)}
          className="mt-1 w-4 h-4 rounded border-gray-300 text-[#5B21B6] focus:ring-2 focus:ring-[#A855F7]/30 cursor-pointer"
        />
      </td>
      <td className="py-2 pr-2">
        <p className="text-[13px] font-semibold text-gray-900 leading-tight">{line.label}</p>
        <p className="text-[10px] text-gray-400 leading-tight">{line.monthLabel} · Due {fmtDate(line.dueDate)}</p>
        <span className={cn('inline-block mt-1 text-[9px] font-bold px-1.5 py-0.5 rounded', badge.classes)}>{badge.label}</span>
      </td>
      <td className="py-2 px-2 text-right text-[13px] text-gray-700 whitespace-nowrap">{fmt(feeAmount)}</td>
      <td className="py-2 px-2 text-right whitespace-nowrap">
        <input
          type="number" min={0} step={0.01} value={values.discount || ''}
          onWheel={preventWheelChange}
          onChange={(e) => onDiscChange(parseFloat(e.target.value) || 0)}
          placeholder="0"
          className={cellInputCls}
        />
      </td>
      <td className="py-2 px-2 text-right whitespace-nowrap">
        <input
          type="number" min={0} step={0.01} value={values.fine || ''}
          onWheel={preventWheelChange}
          onChange={(e) => onFineChange(parseFloat(e.target.value) || 0)}
          placeholder="0"
          className={cellInputCls}
        />
      </td>
      <td className="py-2 px-2 text-right whitespace-nowrap">
        <input
          type="number" min={0} step={0.01} value={values.paid || ''}
          onWheel={preventWheelChange}
          onChange={(e) => onPaidChange(parseFloat(e.target.value) || 0)}
          placeholder="0"
          className={cn(cellInputCls, 'font-semibold')}
        />
      </td>
      <td className="py-2 pl-2 pr-3 text-right whitespace-nowrap">
        <span className={cn('text-[13px] font-bold', due > 0.004 ? 'text-red-600' : 'text-emerald-600')}>
          {fmt(Math.max(0, due))}
        </span>
      </td>
    </tr>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

interface Props {
  student: Student;
  feeRecords: FeeRecord[];
  lastPaymentDate?: string;
  /** Month already chosen on the ledger screen (e.g. "July") — when set, its fee line(s) are pre-filled with the full outstanding amount here so the accountant isn't asked to type it again. */
  initialMonth?: string | null;
  onBack: () => void;
  /** Called once the payment has actually been recorded, so the caller can refresh its ledger data. */
  onPaid: () => void;
}

export function ProcessFeePaymentView({ student, feeRecords, lastPaymentDate, initialMonth, onBack, onPaid }: Props) {
  const lines = useMemo(() => buildPayableLines(feeRecords), [feeRecords]);

  const [values, setValues] = useState<Record<string, LineValues>>(() => {
    if (!initialMonth) return {};
    const init: Record<string, LineValues> = {};
    for (const line of lines) {
      if (line.month === initialMonth) {
        const due = line.existing ? line.existing.balance : (student.monthlyTuitionFee ?? 0);
        init[line.key] = { discount: 0, fine: 0, paid: due };
      }
    }
    return init;
  });
  const [remarks, setRemarks] = useState('');
  const [mode, setMode] = useState<PaymentMode>('cash');
  const [refNumber, setRefNumber] = useState('');
  const [bankBranch, setBankBranch] = useState('');
  const [receiptDate, setReceiptDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<{ lineItems: ReceiptLineItem[]; total: number; paymentMode: string; receiptNumber?: string; paymentIds: string[] } | null>(null);

  const { mutateAsync: updateFeeRecord, isPending: updating } = useUpdateAnyFeeRecord();
  const { mutateAsync: createFeeRecord, isPending: creating } = useCreateFeeRecord();
  const { mutateAsync: recordPayment, isPending: paying } = useRecordPayment();

  const isPending = updating || creating || paying;

  function updateValue(key: string, field: keyof LineValues, v: number) {
    setValues((prev) => ({ ...prev, [key]: { ...(prev[key] ?? EMPTY_VALUES), [field]: v } }));
  }

  // Checking a row selects it for this transaction and fills Paid with its
  // full outstanding due; unchecking clears Discount/Fine/Paid for that row.
  function toggleLine(key: string, checked: boolean, fullDue: number) {
    setValues((prev) => ({
      ...prev,
      [key]: checked ? { discount: 0, fine: 0, paid: Math.max(0, fullDue) } : EMPTY_VALUES,
    }));
  }

  // Live, per-line numbers — recomputed on every keystroke, no blur/Enter/button
  // needed. Due = (current outstanding balance − Discount + Fine) − Paid, so an
  // installment that already carries a due from a previous partial payment
  // keeps showing that carried-over balance until it's fully cleared.
  const computed = useMemo(() => {
    const map = new Map<string, { feeAmount: number; due: number }>();
    for (const line of lines) {
      const v = values[line.key] ?? EMPTY_VALUES;
      const rec = line.existing;
      const feeAmount = rec ? rec.totalAmount : (student.monthlyTuitionFee ?? 0);
      const balance = rec ? rec.balance : feeAmount;
      const due = Math.round((balance + v.fine - v.discount - v.paid) * 100) / 100;
      map.set(line.key, { feeAmount, due });
    }
    return map;
  }, [lines, values, student.monthlyTuitionFee]);

  // A line is "in" this transaction the moment the accountant types anything
  // into Discount, Fine, or Paid for it — no separate select step.
  const activeLines = useMemo(
    () => lines.filter((l) => { const v = values[l.key]; return v && (v.paid > 0 || v.discount > 0 || v.fine > 0); }),
    [lines, values],
  );

  const totalDiscount = activeLines.reduce((s, l) => s + (values[l.key]?.discount ?? 0), 0);
  const totalFine = activeLines.reduce((s, l) => s + (values[l.key]?.fine ?? 0), 0);
  const totalPaid = Math.round(activeLines.reduce((s, l) => s + (values[l.key]?.paid ?? 0), 0) * 100) / 100;
  const totalRemainingDue = Math.round(
    activeLines.reduce((s, l) => s + Math.max(0, computed.get(l.key)?.due ?? 0), 0) * 100,
  ) / 100;

  const status = STATUS_LABELS[student.admissionStatus] ?? { label: student.admissionStatus, classes: 'bg-gray-100 text-gray-600' };
  const guardian = student.fatherName || student.motherName || '—';
  const initials = student.fullName.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();

  async function handleSubmit() {
    setError('');
    if (!activeLines.some((l) => (values[l.key]?.paid ?? 0) > 0)) {
      return setError('Enter a paid amount for at least one installment.');
    }
    if (MODE_NEEDS_REF.has(mode) && !refNumber.trim()) return setError('Enter a cheque / DD / card / transaction number for this payment mode.');

    const paymentMode = mode;
    const paymentDate = receiptDate;
    const combinedRemarks = bankBranch.trim()
      ? [remarks.trim(), `Bank/Branch: ${bankBranch.trim()}`].filter(Boolean).join(' — ')
      : remarks.trim();

    const lineItems: ReceiptLineItem[] = [];
    const receiptNumbers: string[] = [];
    const paymentIds: string[] = [];

    try {
      for (const line of activeLines) {
        const input = values[line.key]!;
        const discountDelta = input.discount || 0;
        const fineDelta = input.fine || 0;
        const paidAmount = input.paid || 0;

        let record = line.existing;
        if (!record) {
          // Synthetic tuition candidate — no FeeRecord yet, create it now.
          const candidate = line.tuitionCandidate!;
          const amount = student.monthlyTuitionFee;
          if (!amount) throw new Error(`No monthly tuition fee set for this student — cannot create a due for ${candidate.label}.`);
          record = await createFeeRecord({
            studentId: student._id,
            feeHead: 'tuition' as FeeHead,
            description: `${candidate.month} Tuition Fee`,
            academicYear: candidate.academicYear,
            month: candidate.month,
            dueDate: candidate.dueDate,
            totalAmount: amount,
            discountAmount: discountDelta || undefined,
            fineAmount: fineDelta || undefined,
          });
        } else if (discountDelta > 0 || fineDelta > 0) {
          record = await updateFeeRecord({
            id: record._id,
            payload: {
              discountAmount: (record.discountAmount || 0) + discountDelta,
              fineAmount: (record.fineAmount || 0) + fineDelta,
            },
          });
        }

        if (discountDelta > 0) lineItems.push({ label: `${line.label} — Discount`, amount: -discountDelta });
        if (fineDelta > 0) lineItems.push({ label: `${line.label} — Fine`, amount: fineDelta });

        if (paidAmount > 0) {
          const amountToPay = Math.min(paidAmount, record.balance);
          if (amountToPay > 0) {
            const result = await recordPayment({
              feeRecordId: record._id,
              amount: Math.round(amountToPay * 100) / 100,
              paymentDate,
              paymentMode,
              referenceNumber: refNumber.trim() || undefined,
              remarks: combinedRemarks || undefined,
            });

            lineItems.push({ label: line.label, amount: Math.round(amountToPay * 100) / 100 });
            if (result.payment.receiptNumber) receiptNumbers.push(result.payment.receiptNumber);
            paymentIds.push(result.payment._id);
          }
        }
      }

      setSuccess({
        lineItems, total: totalPaid,
        paymentMode: MODES.find((m) => m.value === paymentMode)?.label ?? paymentMode,
        receiptNumber: receiptNumbers.join(' / ') || undefined, paymentIds,
      });
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
        paymentIds={success.paymentIds}
        onDone={onBack}
      />
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <button onClick={onBack} className="text-xs font-semibold text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-1.5">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Search
        </button>
        <h1 className="text-base font-bold text-gray-900">Fee Collection</h1>
      </div>

      <div className="p-3 lg:p-6 w-full grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-3 items-start">
        {/* Left: compact student strip + installment grid */}
        <div className="space-y-3">
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm px-4 py-3 flex flex-wrap items-center gap-x-6 gap-y-2">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-[#5B21B6] flex items-center justify-center overflow-hidden shrink-0">
                {student.photoUrl ? (
                  <img src={student.photoUrl} alt={student.fullName} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-sm font-bold text-white">{initials}</span>
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-gray-900">{student.fullName}</h2>
                  <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold shrink-0', status.classes)}>
                    {status.label}
                  </span>
                </div>
                <p className="text-[11px] text-gray-400 flex items-center gap-1"><Hash className="w-2.5 h-2.5" />{student.admissionNumber}</p>
              </div>
            </div>
            <div className="text-xs">
              <p className="text-[10px] text-gray-400 flex items-center gap-1"><GraduationCap className="w-3 h-3" /> Class &amp; Section</p>
              <p className="font-semibold text-gray-800">{student.class} - {student.section}</p>
            </div>
            <div className="text-xs">
              <p className="text-[10px] text-gray-400 flex items-center gap-1"><UserIcon className="w-3 h-3" /> Guardian</p>
              <p className="font-semibold text-gray-800">{guardian}</p>
            </div>
            <div className="text-xs">
              <p className="text-[10px] text-gray-400">Last Payment</p>
              <p className="font-semibold text-gray-800">{fmtDate(lastPaymentDate)}</p>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            {lines.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No outstanding fees for this student.</p>
            ) : (
              <div className="overflow-x-auto max-h-[560px] overflow-y-auto">
                <table className="w-full border-collapse">
                  <thead className="sticky top-0 bg-[#F4F0FB] z-10">
                    <tr className="text-left">
                      <th className="py-2 pl-3 pr-1 w-8"></th>
                      <th className="py-2 pr-2 text-[11px] font-bold text-gray-500 uppercase tracking-wide">Installment</th>
                      <th className="py-2 px-2 text-[11px] font-bold text-gray-500 uppercase tracking-wide text-right">Fee</th>
                      <th className="py-2 px-2 text-[11px] font-bold text-gray-500 uppercase tracking-wide text-right">Discount</th>
                      <th className="py-2 px-2 text-[11px] font-bold text-gray-500 uppercase tracking-wide text-right">Fine</th>
                      <th className="py-2 px-2 text-[11px] font-bold text-gray-500 uppercase tracking-wide text-right">Paid</th>
                      <th className="py-2 pl-2 pr-3 text-[11px] font-bold text-gray-500 uppercase tracking-wide text-right">Due</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line) => {
                      const c = computed.get(line.key)!;
                      return (
                        <InstallmentRow
                          key={line.key}
                          line={line}
                          feeAmount={c.feeAmount}
                          values={values[line.key] ?? EMPTY_VALUES}
                          due={c.due}
                          onDiscChange={(v) => updateValue(line.key, 'discount', v)}
                          onFineChange={(v) => updateValue(line.key, 'fine', v)}
                          onPaidChange={(v) => updateValue(line.key, 'paid', v)}
                          onToggle={(checked) => toggleLine(line.key, checked, c.due)}
                        />
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right: receipt panel */}
        <div className="xl:sticky xl:top-3">
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
            <h3 className="text-sm font-bold text-gray-900 mb-3">Receipt Details</h3>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 mb-1">Receipt No.</label>
                <input
                  type="text" value="Auto-generated on save" disabled readOnly
                  className="w-full h-9 px-2.5 rounded-md border border-gray-200 bg-gray-50 text-xs text-gray-400"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 mb-1">Receipt Date</label>
                <input
                  type="date" value={receiptDate} onChange={(e) => setReceiptDate(e.target.value)}
                  className="w-full h-9 px-2.5 rounded-md border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#A855F7]/30 focus:border-[#5B21B6]"
                />
              </div>
            </div>

            <div className="mt-2.5">
              <label className="block text-[11px] font-semibold text-gray-500 mb-1">Payment Mode</label>
              <select
                value={mode} onChange={(e) => setMode(e.target.value as PaymentMode)}
                className="w-full h-9 px-2.5 rounded-md border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#A855F7]/30 focus:border-[#5B21B6]"
              >
                {MODES.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2.5 mt-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 mb-1">
                  Cheque/DD/Card/Txn No.{MODE_NEEDS_REF.has(mode) && <span className="text-red-500"> *</span>}
                </label>
                <input
                  type="text" value={refNumber} onChange={(e) => setRefNumber(e.target.value)}
                  placeholder="e.g. 123456789012" maxLength={30}
                  className="w-full h-9 px-2.5 rounded-md border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#A855F7]/30 focus:border-[#5B21B6]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 mb-1">Bank/Branch Name</label>
                <input
                  type="text" value={bankBranch} onChange={(e) => setBankBranch(e.target.value)}
                  placeholder="Optional"
                  className="w-full h-9 px-2.5 rounded-md border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#A855F7]/30 focus:border-[#5B21B6]"
                />
              </div>
            </div>

            <div className="mt-2.5">
              <label className="block text-[11px] font-semibold text-gray-500 mb-1">Remarks / Notes</label>
              <textarea
                rows={2} value={remarks} onChange={(e) => setRemarks(e.target.value)}
                placeholder="Enter transaction details or notes…"
                className="w-full px-2.5 py-2 rounded-md border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#A855F7]/30 focus:border-[#5B21B6]"
              />
            </div>

            {/* Installment Details / total strip — mirrors the paper register's summary line */}
            <div className="mt-3 pt-3 border-t border-gray-200">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">Installment Details</p>
              {activeLines.length === 0 ? (
                <p className="text-xs text-gray-400">No amounts entered yet.</p>
              ) : (
                <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
                  {activeLines.map((line) => (
                    <div key={line.key} className="flex items-center justify-between bg-red-50 text-red-700 rounded px-2 py-1 text-xs font-medium">
                      <span className="truncate">{line.monthLabel} — {line.label}</span>
                      <span className="shrink-0 font-semibold">{fmt(values[line.key]?.paid ?? 0)}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-center justify-between mt-2">
                <span className="text-sm text-gray-500">Total Discount</span>
                <span className="text-sm font-semibold text-gray-800">{fmt(totalDiscount)}</span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-sm text-gray-500">Total Fine</span>
                <span className="text-sm font-semibold text-gray-800">{fmt(totalFine)}</span>
              </div>
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-200">
                <span className="text-sm font-bold text-gray-900">Total Payment</span>
                <span className="text-lg font-bold text-gray-900">{fmt(totalPaid)}</span>
              </div>
              {totalRemainingDue > 0.004 && (
                <div className="flex items-center justify-between mt-1.5 bg-red-50 border border-red-100 rounded-lg px-2.5 py-1.5">
                  <span className="text-xs font-semibold text-red-600">Will still be due after this payment</span>
                  <span className="text-sm font-bold text-red-600">{fmt(totalRemainingDue)}</span>
                </div>
              )}
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mt-3">
                <AlertCircle className="w-4 h-4 shrink-0" /> {error}
              </div>
            )}

            <div className="flex gap-2 mt-3">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isPending || !activeLines.length}
                title="Save & print receipt"
                className="h-11 px-4 rounded-lg border-2 border-orange-400 text-orange-600 font-semibold text-sm flex items-center justify-center gap-1.5 hover:bg-orange-50 disabled:opacity-50 transition-colors"
              >
                <Printer className="w-4 h-4" /> Print
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isPending || !activeLines.length}
                className="flex-1 h-11 bg-[#5B21B6] hover:bg-[#4C1D95] disabled:opacity-50 text-white font-semibold rounded-lg text-sm flex items-center justify-center gap-2 transition-colors"
              >
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {isPending ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
