import { useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowLeft, Loader2, AlertCircle, Printer, MessageCircle, Mail, UserRound,
  IndianRupee, ChevronLeft, ChevronRight, ArrowUpDown, User, GraduationCap,
  FolderKanban, Hash, Phone, MailIcon, MapPin, CalendarDays, Wallet, Receipt,
  BadgePercent, X, Camera,
} from 'lucide-react';
import { useStudentLedger, useSendLedgerWhatsAppReminder, useSendLedgerStatementEmail, useInvalidateStudentLedger } from '../hooks/useAccountantWorkspace';
import { CollectPaymentModal } from '../components/CollectPaymentModal';
import { ProcessFeePaymentView } from '../components/ProcessFeePaymentView';
import { FeeStatusBadge } from '@/features/fees/components/FeeStatusBadge';
import { useCreateDiscountRequest, useStudentDiscounts } from '@/features/fees/hooks/useFeeStructure';
import { useUploadStudentPhoto, useRemoveStudentPhoto } from '@/features/students/hooks/useStudents';
import type { AdmissionStatus, FeePayment, FeeRecord } from '@schoolos/types';
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

// ── Student Information Card ──────────────────────────────────────────────────

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="w-3.5 h-3.5 text-gray-300 mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-[11px] text-gray-400">{label}</p>
        <p className="text-sm font-semibold text-gray-800 truncate">{value}</p>
      </div>
    </div>
  );
}

function StudentInfoCard({ ledger }: { ledger: ReturnType<typeof useStudentLedger>['data'] }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { mutateAsync: uploadPhoto, isPending: uploading } = useUploadStudentPhoto(ledger?.student._id ?? '');
  const { mutateAsync: removePhoto, isPending: removing } = useRemoveStudentPhoto(ledger?.student._id ?? '');

  if (!ledger) return null;
  const { student, summary } = ledger;
  const status = STATUS_LABELS[student.admissionStatus] ?? { label: student.admissionStatus, classes: 'bg-gray-100 text-gray-600' };
  const guardian = student.fatherName || student.motherName || '—';
  const initials = student.fullName.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) await uploadPhoto(file);
    e.target.value = '';
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
      <div className="flex items-center justify-between gap-3 pb-4 border-b border-gray-100">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative w-14 h-14 shrink-0 group">
            <div className="w-14 h-14 rounded-2xl bg-gray-900 flex items-center justify-center overflow-hidden">
              {student.photoUrl ? (
                <img src={student.photoUrl} alt={student.fullName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-lg font-bold text-white">{initials}</span>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={(e) => void handlePhotoChange(e)} className="hidden" />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              title={student.photoUrl ? 'Replace photo' : 'Add photo'}
              className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center text-gray-500 hover:text-gray-900 hover:border-gray-300 transition-colors"
            >
              {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Camera className="w-3 h-3" />}
            </button>
            {student.photoUrl && (
              <button
                type="button"
                onClick={() => void removePhoto()}
                disabled={removing}
                title="Remove photo"
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center text-gray-400 hover:text-red-500 hover:border-red-200 transition-colors opacity-0 group-hover:opacity-100"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            )}
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-gray-900 truncate">{student.fullName}</h2>
            <p className="text-xs text-gray-400 mt-0.5">{student.admissionNumber}</p>
          </div>
        </div>
        <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold shrink-0', status.classes)}>
          {status.label}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-4 pt-4">
        <InfoRow icon={GraduationCap} label="Class" value={student.class} />
        <InfoRow icon={FolderKanban} label="Section" value={student.section} />
        <InfoRow icon={Hash}         label="Roll Number" value={student.rollNumber || '—'} />
        <InfoRow icon={CalendarDays} label="Academic Session" value={ledger.feeRecords[0]?.academicYear || String(student.admissionYear)} />
        <InfoRow icon={User}         label="Guardian Name" value={guardian} />
        <InfoRow icon={Phone}        label="Parent Phone" value={student.parentPhone || '—'} />
        <InfoRow icon={MailIcon}     label="Email" value={student.email || '—'} />
        <InfoRow icon={MapPin}       label="Address" value={student.address || '—'} />
        <InfoRow icon={CalendarDays} label="Admission Year" value={student.admissionYear} />
        <InfoRow icon={Wallet}       label="Monthly Tuition Fee" value={student.monthlyTuitionFee ? fmt(student.monthlyTuitionFee) : '—'} />
        <InfoRow icon={Receipt}      label="Last Payment" value={fmtDate(summary.lastPaymentDate)} />
      </div>
    </div>
  );
}

// ── Fee Ledger Table ───────────────────────────────────────────────────────────

const FEE_HEAD_LABELS: Record<string, string> = {
  tuition: 'Tuition', admission: 'Admission', examination: 'Examination',
  transport: 'Transport', hostel: 'Hostel', miscellaneous: 'Miscellaneous',
};

function FeeLedgerTable({ feeRecords, payments, onCollect }: { feeRecords: FeeRecord[]; payments: FeePayment[]; onCollect: (fee: FeeRecord) => void }) {
  const sorted = useMemo(
    () => [...feeRecords].sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime()),
    [feeRecords],
  );

  function latestPaymentFor(feeRecordId: string): FeePayment | undefined {
    return payments.filter((p) => p.feeRecordId === feeRecordId)[0]; // payments already sorted desc by date
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <h3 className="text-sm font-bold text-gray-900">Fee Ledger</h3>
        <p className="text-xs text-gray-400 mt-0.5">Every fee head assigned to this student</p>
      </div>

      {!sorted.length ? (
        <div className="p-10 text-center">
          <p className="text-sm font-semibold text-gray-700">No fee records for this student yet.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-[11px] text-gray-400 uppercase tracking-wide">
                <th className="text-left font-semibold px-4 py-2.5">Fee Head</th>
                <th className="text-left font-semibold px-4 py-2.5">Installment</th>
                <th className="text-left font-semibold px-4 py-2.5">Due Date</th>
                <th className="text-right font-semibold px-4 py-2.5">Original</th>
                <th className="text-right font-semibold px-4 py-2.5">Discount</th>
                <th className="text-right font-semibold px-4 py-2.5">Fine</th>
                <th className="text-right font-semibold px-4 py-2.5">Paid</th>
                <th className="text-right font-semibold px-4 py-2.5">Remaining</th>
                <th className="text-left font-semibold px-4 py-2.5">Status</th>
                <th className="text-left font-semibold px-4 py-2.5">Receipt No.</th>
                <th className="text-left font-semibold px-4 py-2.5">Payment Date</th>
                <th className="text-left font-semibold px-4 py-2.5">Remarks</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sorted.map((fee) => {
                const lastPayment = latestPaymentFor(fee._id);
                const canCollect = fee.status !== 'paid' && fee.status !== 'waived';
                return (
                  <tr key={fee._id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-4 py-3 font-semibold text-gray-800 whitespace-nowrap">
                      {fee.feeHead === 'miscellaneous' && fee.customHead ? fee.customHead : FEE_HEAD_LABELS[fee.feeHead]}
                    </td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{fee.month || '—'}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{fmtDate(fee.dueDate)}</td>
                    <td className="px-4 py-3 text-right text-gray-800 whitespace-nowrap">{fmt(fee.totalAmount)}</td>
                    <td className="px-4 py-3 text-right text-gray-500 whitespace-nowrap">{fee.discountAmount ? fmt(fee.discountAmount) : '—'}</td>
                    <td className="px-4 py-3 text-right text-red-500 whitespace-nowrap">{fee.fineAmount ? fmt(fee.fineAmount) : '—'}</td>
                    <td className="px-4 py-3 text-right text-emerald-600 font-semibold whitespace-nowrap">{fmt(fee.paidAmount)}</td>
                    <td className={cn('px-4 py-3 text-right font-semibold whitespace-nowrap', fee.balance > 0 ? 'text-amber-600' : 'text-gray-400')}>
                      {fmt(fee.balance)}
                    </td>
                    <td className="px-4 py-3"><FeeStatusBadge status={fee.status} size="sm" /></td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{lastPayment?.receiptNumber || '—'}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{lastPayment ? fmtDate(lastPayment.paymentDate) : '—'}</td>
                    <td className="px-4 py-3 text-gray-400 max-w-[160px] truncate">{fee.notes || '—'}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap print:hidden">
                      {canCollect && (
                        <button
                          onClick={() => onCollect(fee)}
                          className="h-8 px-3 bg-gray-900 hover:bg-black text-white rounded-lg text-xs font-semibold"
                        >
                          Collect
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Payment History ────────────────────────────────────────────────────────────

const MODE_LABELS: Record<string, string> = {
  cash: 'Cash', cheque: 'Cheque', bank_transfer: 'Bank Transfer', online: 'Online', demand_draft: 'Demand Draft',
};

type SortKey = 'paymentDate' | 'amount';
const HISTORY_PAGE_SIZE = 10;

function PaymentHistoryCard({ payments }: { payments: FeePayment[] }) {
  const [sortKey, setSortKey] = useState<SortKey>('paymentDate');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);

  const sorted = useMemo(() => {
    const arr = [...payments];
    arr.sort((a, b) => {
      const av = sortKey === 'amount' ? a.amount : new Date(a.paymentDate).getTime();
      const bv = sortKey === 'amount' ? b.amount : new Date(b.paymentDate).getTime();
      return sortDir === 'asc' ? av - bv : bv - av;
    });
    return arr;
  }, [payments, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / HISTORY_PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = sorted.slice((currentPage - 1) * HISTORY_PAGE_SIZE, currentPage * HISTORY_PAGE_SIZE);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('desc'); }
    setPage(1);
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <h3 className="text-sm font-bold text-gray-900">Payment History</h3>
        <p className="text-xs text-gray-400 mt-0.5">{payments.length} payment{payments.length === 1 ? '' : 's'} recorded</p>
      </div>

      {!payments.length ? (
        <div className="p-10 text-center">
          <p className="text-sm font-semibold text-gray-700">No payments recorded yet.</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-[11px] text-gray-400 uppercase tracking-wide">
                  <th className="text-left font-semibold px-4 py-2.5">Receipt No.</th>
                  <th className="text-left font-semibold px-4 py-2.5">
                    <button onClick={() => toggleSort('paymentDate')} className="inline-flex items-center gap-1 hover:text-gray-600">
                      Date <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="text-right font-semibold px-4 py-2.5">
                    <button onClick={() => toggleSort('amount')} className="inline-flex items-center gap-1 hover:text-gray-600 ml-auto">
                      Amount <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="text-left font-semibold px-4 py-2.5">Method</th>
                  <th className="text-left font-semibold px-4 py-2.5">Collected By</th>
                  <th className="text-left font-semibold px-4 py-2.5">Transaction ID</th>
                  <th className="text-left font-semibold px-4 py-2.5">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {pageRows.map((p) => (
                  <tr key={p._id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-4 py-3 font-semibold text-gray-800 whitespace-nowrap">{p.receiptNumber || '—'}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{fmtDate(p.paymentDate)}</td>
                    <td className="px-4 py-3 text-right text-emerald-600 font-semibold whitespace-nowrap">{fmt(p.amount)}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{MODE_LABELS[p.paymentMode] || p.paymentMode}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{p.recordedByName}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{p.referenceNumber || '—'}</td>
                    <td className="px-4 py-3 text-gray-400 max-w-[160px] truncate">{p.remarks || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 print:hidden">
              <button
                disabled={currentPage <= 1}
                onClick={() => setPage(currentPage - 1)}
                className="h-8 px-3 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-gray-600 disabled:opacity-40 flex items-center gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Prev
              </button>
              <p className="text-xs text-gray-400">Page {currentPage} of {totalPages}</p>
              <button
                disabled={currentPage >= totalPages}
                onClick={() => setPage(currentPage + 1)}
                className="h-8 px-3 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-gray-600 disabled:opacity-40 flex items-center gap-1"
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Payment Summary (sticky sidebar) ────────────────────────────────────────────

function SummaryRow({ label, value, emphasis }: { label: string; value: string; emphasis?: 'positive' | 'negative' | 'strong' }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-gray-500">{label}</span>
      <span className={cn(
        'text-sm font-semibold',
        emphasis === 'positive' && 'text-emerald-600',
        emphasis === 'negative' && 'text-amber-600',
        emphasis === 'strong' && 'text-gray-900 text-base font-bold',
        !emphasis && 'text-gray-800',
      )}>
        {value}
      </span>
    </div>
  );
}

function PaymentSummaryCard({ ledger }: { ledger: NonNullable<ReturnType<typeof useStudentLedger>['data']> }) {
  const { summary } = ledger;
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
      <h3 className="text-sm font-bold text-gray-900 mb-1">Payment Summary</h3>
      <p className="text-xs text-gray-400 mb-2">Computed live from all fee records</p>
      <div className="divide-y divide-gray-50">
        <SummaryRow label="Total Fees" value={fmt(summary.totalFees)} />
        <SummaryRow label="Total Paid" value={fmt(summary.totalPaid)} emphasis="positive" />
        <SummaryRow label="Late Fine" value={fmt(summary.totalFine)} />
        <SummaryRow label="Discount" value={fmt(summary.totalDiscount)} />
        <SummaryRow label="Waived" value={fmt(summary.totalWaived)} />
        <SummaryRow label="Net Amount" value={fmt(summary.netAmount)} />
      </div>
      <div className="mt-2 pt-3 border-t border-gray-100">
        <SummaryRow label="Remaining Balance" value={fmt(summary.remainingBalance)} emphasis={summary.remainingBalance > 0 ? 'negative' : 'strong'} />
      </div>
    </div>
  );
}

// ── Quick Actions ───────────────────────────────────────────────────────────────

// ── Request Discount ─────────────────────────────────────────────────────────
// Submitting here never touches the student's balance directly — it only
// creates a request the principal must approve before it takes effect.

function RequestDiscountModal({ studentId, onClose }: { studentId: string; onClose: () => void }) {
  const { mutateAsync, isPending } = useCreateDiscountRequest();
  const { data: history } = useStudentDiscounts(studentId);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const pending = history?.find((h) => h.status === 'pending');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const requestedAmount = parseFloat(amount);
    if (isNaN(requestedAmount) || requestedAmount <= 0) return setError('Enter a valid discount amount.');
    if (!reason.trim()) return setError('Enter a reason for the discount.');

    try {
      await mutateAsync({ studentId, requestedAmount: Math.round(requestedAmount * 100) / 100, reason: reason.trim() });
      toast.success('Discount request sent to the principal for approval.');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit request');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Request Discount</h2>
          <button type="button" onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-700"><X className="w-5 h-5" /></button>
        </div>

        {pending ? (
          <div className="px-6 py-8 text-center">
            <BadgePercent className="w-8 h-8 text-amber-400 mx-auto mb-2" />
            <p className="text-sm font-semibold text-gray-700">A discount request is already pending</p>
            <p className="text-xs text-gray-400 mt-1">₹{pending.requestedAmount} — awaiting principal review.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
            <p className="text-xs text-gray-400 -mt-1">
              This goes to the principal for approval before it applies. The decided amount will automatically show at collection time — nothing changes for this student until then.
            </p>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Discount Amount (₹)</label>
              <input type="number" min={0.01} step={0.01} value={amount} onChange={(e) => setAmount(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Reason</label>
              <textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400" />
            </div>
            {error && <p className="text-xs text-red-500">{error}</p>}
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={onClose} className="flex-1 h-11 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
              <button type="submit" disabled={isPending} className="flex-1 h-11 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-bold">
                {isPending ? 'Sending…' : 'Send for Approval'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function QuickActionsCard({ ledger, onCollect, onRequestDiscount }: { ledger: NonNullable<ReturnType<typeof useStudentLedger>['data']>; onCollect: () => void; onRequestDiscount: () => void }) {
  const navigate = useNavigate();
  const { student, summary } = ledger;
  const { mutateAsync: sendWhatsApp, isPending: sendingWhatsApp } = useSendLedgerWhatsAppReminder();
  const { mutateAsync: sendEmail, isPending: sendingEmail } = useSendLedgerStatementEmail();

  async function handleWhatsApp() {
    try {
      await sendWhatsApp(student._id);
      toast.success('WhatsApp reminder sent to guardian.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send reminder.');
    }
  }

  async function handleEmail() {
    try {
      await sendEmail(student._id);
      toast.success('Fee statement emailed.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send statement.');
    }
  }

  const hasPendingDues = summary.remainingBalance > 0;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 print:hidden">
      <h3 className="text-sm font-bold text-gray-900 mb-3">Quick Actions</h3>
      <div className="space-y-2">
        <button
          onClick={onCollect}
          className="w-full h-11 flex items-center gap-2.5 px-3.5 rounded-xl bg-gray-900 hover:bg-black text-white text-sm font-semibold transition-colors"
        >
          <IndianRupee className="w-4 h-4" /> Collect Fee
        </button>
        <button
          onClick={() => window.print()}
          className="w-full h-11 flex items-center gap-2.5 px-3.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-semibold transition-colors"
        >
          <Printer className="w-4 h-4" /> Print / Save Ledger PDF
        </button>
        <button
          onClick={handleWhatsApp}
          disabled={!student.parentPhone || !hasPendingDues || sendingWhatsApp}
          className="w-full h-11 flex items-center gap-2.5 px-3.5 rounded-xl border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed text-gray-700 text-sm font-semibold transition-colors"
        >
          {sendingWhatsApp ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageCircle className="w-4 h-4" />}
          Send WhatsApp Reminder
        </button>
        <button
          onClick={handleEmail}
          disabled={!student.email || sendingEmail}
          className="w-full h-11 flex items-center gap-2.5 px-3.5 rounded-xl border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed text-gray-700 text-sm font-semibold transition-colors"
        >
          {sendingEmail ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
          Email Statement
        </button>
        <button
          onClick={onRequestDiscount}
          className="w-full h-11 flex items-center gap-2.5 px-3.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-semibold transition-colors"
        >
          <BadgePercent className="w-4 h-4" /> Request Discount
        </button>
        <button
          onClick={() => navigate(`/fees/student/${student._id}`)}
          className="w-full h-11 flex items-center gap-2.5 px-3.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-semibold transition-colors"
        >
          <UserRound className="w-4 h-4" /> View Student Profile
        </button>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function StudentLedgerPage() {
  const { studentId } = useParams<{ studentId: string }>();
  const navigate = useNavigate();
  const { data: ledger, isLoading, isError } = useStudentLedger(studentId!);
  const invalidateLedger = useInvalidateStudentLedger(studentId!);
  const [payFee, setPayFee] = useState<FeeRecord | null>(null);
  const [showDiscountRequest, setShowDiscountRequest] = useState(false);
  const [showProcessPayment, setShowProcessPayment] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 text-gray-900 animate-spin" />
      </div>
    );
  }

  if (isError || !ledger) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center py-24 gap-4 text-center">
        <AlertCircle className="w-10 h-10 text-red-400" />
        <p className="text-gray-600">Could not load this student's fee ledger.</p>
        <button
          onClick={() => navigate('/accountant/student-ledger')}
          className="h-10 px-5 rounded-xl bg-gray-100 text-sm font-semibold text-gray-700 hover:bg-gray-200"
        >
          Back to Search
        </button>
      </div>
    );
  }

  if (showProcessPayment) {
    return (
      <ProcessFeePaymentView
        student={ledger.student}
        feeRecords={ledger.feeRecords}
        lastPaymentDate={ledger.summary.lastPaymentDate}
        onBack={() => { setShowProcessPayment(false); invalidateLedger(); }}
        onPaid={invalidateLedger}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="bg-white border-b border-gray-100 px-4 py-4 flex items-center gap-3 print:hidden">
        <button
          onClick={() => navigate('/accountant/student-ledger')}
          className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-base font-bold text-gray-900">Student Fee Ledger</h1>
          <p className="text-xs text-gray-500">{ledger.student.fullName} · {ledger.student.admissionNumber}</p>
        </div>
      </div>

      <div className="px-4 py-5 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        <div className="lg:col-span-2 space-y-5">
          <StudentInfoCard ledger={ledger} />
          <FeeLedgerTable feeRecords={ledger.feeRecords} payments={ledger.payments} onCollect={setPayFee} />
          <PaymentHistoryCard payments={ledger.payments} />
        </div>

        <div className="space-y-5 lg:sticky lg:top-5">
          <PaymentSummaryCard ledger={ledger} />
          <QuickActionsCard
            ledger={ledger}
            onCollect={() => setShowProcessPayment(true)}
            onRequestDiscount={() => setShowDiscountRequest(true)}
          />
        </div>
      </div>

      {payFee && (
        <CollectPaymentModal
          fee={payFee}
          onClose={() => setPayFee(null)}
          onSuccess={() => { setPayFee(null); invalidateLedger(); }}
        />
      )}

      {showDiscountRequest && (
        <RequestDiscountModal studentId={studentId!} onClose={() => setShowDiscountRequest(false)} />
      )}
    </div>
  );
}
