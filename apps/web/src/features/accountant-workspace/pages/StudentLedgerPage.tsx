import { useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowLeft, Loader2, AlertCircle, Printer, MessageCircle, Mail, UserRound,
  IndianRupee, ChevronLeft, ChevronRight, ArrowUpDown, User, GraduationCap,
  Hash, Phone, MailIcon, MapPin, CalendarDays, Wallet, Receipt,
  BadgePercent, X, Camera, Pencil, Check, Clock, CheckCircle2,
  BookOpen, Coins,
} from 'lucide-react';
import { useStudentLedger, useSendLedgerWhatsAppReminder, useSendLedgerStatementEmail, useInvalidateStudentLedger } from '../hooks/useAccountantWorkspace';
import { CollectPaymentModal } from '../components/CollectPaymentModal';
import { ProcessFeePaymentView } from '../components/ProcessFeePaymentView';
import { FeeStatusBadge } from '@/features/fees/components/FeeStatusBadge';
import { useCreateDiscountRequest, useStudentDiscounts } from '@/features/fees/hooks/useFeeStructure';
import { useUploadStudentPhoto, useRemoveStudentPhoto } from '@/features/students/hooks/useStudents';
import { useCreateChangeRequest, usePendingChangeRequestsForStudent } from '@/features/student-change-requests/hooks/useStudentChangeRequests';
import { useAuth } from '@/features/auth/hooks/useAuth';
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

const ACADEMIC_MONTHS = ['April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December', 'January', 'February', 'March'];

const FEE_HEAD_LABELS: Record<string, string> = {
  tuition: 'Tuition Fee', admission: 'Admission Fee', examination: 'Examination Fee',
  transport: 'Transport Fee', hostel: 'Hostel Fee', miscellaneous: 'Annual Maintenance',
};

const MODE_LABELS: Record<string, string> = {
  cash: 'Cash', cheque: 'Cheque', bank_transfer: 'Bank Transfer', online: 'Online', demand_draft: 'Demand Draft',
};

// ── Editable Tuition Fee ──────────────────────────────────────────────────────

function EditableTuitionFeeRow({ studentId, currentFee }: { studentId: string; currentFee?: number }) {
  const { user } = useAuth();
  const canEdit = user?.role === 'accountant';
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(currentFee != null ? String(currentFee) : '');
  const { data: pending } = usePendingChangeRequestsForStudent(studentId, canEdit);
  const { mutateAsync, isPending } = useCreateChangeRequest();

  const pendingFeeRequest = pending?.find((r) => 'monthlyTuitionFee' in r.changes);

  async function submit() {
    const amount = Number(value);
    if (!Number.isFinite(amount) || amount < 0) { toast.error('Enter a valid amount'); return; }
    if (amount === currentFee) { setEditing(false); return; }
    try {
      await mutateAsync({ studentId, changes: { monthlyTuitionFee: amount } });
      toast.success('Fee change sent to the Principal for approval');
      setEditing(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit change');
    }
  }

  if (pendingFeeRequest) {
    return (
      <div className="flex items-start gap-2.5">
        <Wallet className="w-3.5 h-3.5 text-gray-300 mt-0.5 shrink-0" />
        <div className="min-w-0">
          <p className="text-[11px] text-gray-400">Monthly Tuition Fee</p>
          <p className="text-sm font-semibold text-gray-800">{currentFee ? fmt(currentFee) : '—'}</p>
          <p className="text-[11px] text-amber-600 font-medium flex items-center gap-1 mt-0.5">
            <Clock className="w-3 h-3" /> {fmt(Number(pendingFeeRequest.changes.monthlyTuitionFee))} pending Principal approval
          </p>
        </div>
      </div>
    );
  }

  if (!canEdit) {
    return (
      <div className="flex items-start gap-2.5">
        <Wallet className="w-3.5 h-3.5 text-gray-300 mt-0.5 shrink-0" />
        <div><p className="text-[11px] text-gray-400">Monthly Tuition Fee</p><p className="text-sm font-semibold text-gray-800">{currentFee ? fmt(currentFee) : '—'}</p></div>
      </div>
    );
  }

  if (editing) {
    return (
      <div className="flex items-start gap-2.5">
        <Wallet className="w-3.5 h-3.5 text-gray-300 mt-0.5 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] text-gray-400 mb-1">Monthly Tuition Fee</p>
          <div className="flex items-center gap-1.5">
            <input type="number" min={0} autoFocus value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void submit()}
              className="w-28 h-7 px-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
            <button onClick={() => void submit()} disabled={isPending} className="w-6 h-6 flex items-center justify-center rounded-md bg-emerald-500 text-white shrink-0 disabled:opacity-50">
              {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
            </button>
            <button onClick={() => { setEditing(false); setValue(currentFee != null ? String(currentFee) : ''); }} className="w-6 h-6 flex items-center justify-center rounded-md bg-gray-100 text-gray-500 shrink-0">
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2.5 group">
      <Wallet className="w-3.5 h-3.5 text-gray-300 mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-[11px] text-gray-400">Monthly Tuition Fee</p>
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-semibold text-gray-800 truncate">{currentFee ? fmt(currentFee) : '—'}</p>
          <button
            onClick={() => { setValue(currentFee != null ? String(currentFee) : ''); setEditing(true); }}
            className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-blue-600 transition-opacity"
            title="Propose a new fee (requires Principal approval)"
          >
            <Pencil className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Compact Student Profile Card ──────────────────────────────────────────────

function StudentProfileCard({ ledger }: { ledger: ReturnType<typeof useStudentLedger>['data'] }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { mutateAsync: uploadPhoto, isPending: uploading } = useUploadStudentPhoto(ledger?.student._id ?? '');
  const { mutateAsync: removePhoto, isPending: removing } = useRemoveStudentPhoto(ledger?.student._id ?? '');

  if (!ledger) return null;
  const { student } = ledger;
  const status = STATUS_LABELS[student.admissionStatus] ?? { label: student.admissionStatus, classes: 'bg-gray-100 text-gray-600' };
  const initials = student.fullName.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) await uploadPhoto(file);
    e.target.value = '';
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Gradient header strip */}
      <div className="h-2 bg-gradient-to-r from-[#5B21B6] via-[#7C3AED] to-[#DB2777]" />
      <div className="px-5 py-4">
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div className="relative w-16 h-16 shrink-0 group">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#5B21B6] to-[#DB2777] flex items-center justify-center overflow-hidden shadow-md">
              {student.photoUrl ? (
                <img src={student.photoUrl} alt={student.fullName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-xl font-bold text-white">{initials}</span>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={(e) => void handlePhotoChange(e)} className="hidden" />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center text-gray-500 hover:text-[#5B21B6] transition-colors"
            >
              {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Camera className="w-3 h-3" />}
            </button>
            {student.photoUrl && (
              <button
                type="button"
                onClick={() => void removePhoto()}
                disabled={removing}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            )}
          </div>

          {/* Name + details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div>
                <h2 className="text-lg font-bold text-gray-900 leading-tight">{student.fullName}</h2>
                <p className="text-xs text-gray-400 mt-0.5 font-medium tracking-wide">{student.admissionNumber}</p>
              </div>
              <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold shrink-0', status.classes)}>
                {status.label}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2">
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <GraduationCap className="w-3.5 h-3.5 text-gray-300" />
                Class {student.class} – {student.section}
              </span>
              {student.rollNumber && (
                <span className="flex items-center gap-1 text-xs text-gray-500">
                  <Hash className="w-3.5 h-3.5 text-gray-300" />
                  Roll {student.rollNumber}
                </span>
              )}
              {student.parentPhone && (
                <span className="flex items-center gap-1 text-xs text-gray-500">
                  <Phone className="w-3.5 h-3.5 text-gray-300" />
                  {student.parentPhone}
                </span>
              )}
              {student.fatherName && (
                <span className="flex items-center gap-1 text-xs text-gray-500">
                  <User className="w-3.5 h-3.5 text-gray-300" />
                  {student.fatherName}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Month Tabs ────────────────────────────────────────────────────────────────

function MonthTabs({ feeRecords, selected, onSelect }: {
  feeRecords: FeeRecord[];
  selected: string | null;
  onSelect: (month: string | null) => void;
}) {
  const monthsWithRecords = useMemo(() => {
    const set = new Set(feeRecords.map((r) => r.month).filter(Boolean) as string[]);
    return set;
  }, [feeRecords]);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Select Fee Period</p>
      <div className="flex gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => onSelect(null)}
          className={cn(
            'h-8 px-3.5 rounded-xl text-xs font-semibold transition-colors',
            selected === null
              ? 'bg-[#5B21B6] text-white shadow-sm'
              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
          )}
        >
          All
        </button>
        {ACADEMIC_MONTHS.map((month) => {
          const hasRecords = monthsWithRecords.has(month);
          const isSelected = selected === month;
          return (
            <button
              key={month}
              type="button"
              onClick={() => onSelect(month)}
              className={cn(
                'h-8 px-3.5 rounded-xl text-xs font-semibold transition-colors relative',
                isSelected
                  ? 'bg-[#5B21B6] text-white shadow-sm'
                  : hasRecords
                  ? 'bg-violet-50 text-violet-700 hover:bg-violet-100 border border-violet-100'
                  : 'bg-gray-50 text-gray-400 hover:bg-gray-100 border border-gray-200'
              )}
            >
              {month.slice(0, 3)}
              {hasRecords && !isSelected && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-violet-500 border border-white" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Fee Structure Detail Card ─────────────────────────────────────────────────

function FeeStructureDetailCard({ feeRecords, payments, month, onCollect }: {
  feeRecords: FeeRecord[];
  payments: FeePayment[];
  month: string | null;
  onCollect: (fee: FeeRecord) => void;
}) {
  const filtered = useMemo(() => {
    if (month === null) return feeRecords;
    return feeRecords.filter((r) => r.month === month);
  }, [feeRecords, month]);

  const sorted = useMemo(
    () => [...filtered].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()),
    [filtered],
  );

  const totalDue = sorted.reduce((sum, r) => sum + r.balance, 0);
  const totalPaid = sorted.reduce((sum, r) => sum + r.paidAmount, 0);
  const totalAssessed = sorted.reduce((sum, r) => sum + r.totalAmount, 0);
  const earliestDue = sorted.find((r) => r.balance > 0)?.dueDate;

  function latestPaymentFor(id: string) {
    return payments.find((p) => p.feeRecordId === id);
  }

  const feeIconColor = (feeHead: string) => {
    const map: Record<string, string> = {
      tuition: 'bg-violet-100 text-violet-600',
      admission: 'bg-blue-100 text-blue-600',
      examination: 'bg-amber-100 text-amber-600',
      transport: 'bg-emerald-100 text-emerald-600',
      hostel: 'bg-pink-100 text-pink-600',
      miscellaneous: 'bg-gray-100 text-gray-500',
    };
    return map[feeHead] ?? 'bg-gray-100 text-gray-500';
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Card header */}
      <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-gray-900">
            {month ? `${month} — Fee Structure` : 'All Fee Records'}
          </h3>
          {earliestDue && (
            <p className="text-xs text-gray-400 mt-0.5">Due Date: {fmtDate(earliestDue)}</p>
          )}
        </div>
        {sorted.length > 0 && (
          <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-400">
            <span>{sorted.length} item{sorted.length !== 1 ? 's' : ''}</span>
          </div>
        )}
      </div>

      {sorted.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-12">
          <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center">
            <BookOpen className="w-6 h-6 text-gray-300" />
          </div>
          <p className="text-sm font-semibold text-gray-500">No fees for {month || 'this period'}</p>
          <p className="text-xs text-gray-400">Fee records will appear here when assigned.</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-50">
          {sorted.map((fee) => {
            const headLabel = fee.feeHead === 'miscellaneous' && fee.customHead ? fee.customHead : FEE_HEAD_LABELS[fee.feeHead] ?? fee.feeHead;
            const iconCls = feeIconColor(fee.feeHead);
            const latestPay = latestPaymentFor(fee._id);
            const isPaid = fee.status === 'paid' || fee.status === 'waived';
            const canCollect = !isPaid;

            return (
              <div key={fee._id} className="px-5 py-4 hover:bg-gray-50/60 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', iconCls)}>
                    <IndianRupee className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-gray-800">{headLabel}</p>
                      {fee.month && !month && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-violet-50 text-violet-600">{fee.month}</span>
                      )}
                      <FeeStatusBadge status={fee.status} size="sm" />
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      <span className="text-xs text-gray-400">Due {fmtDate(fee.dueDate)}</span>
                      {fee.discountAmount ? <span className="text-xs text-emerald-600">Discount {fmt(fee.discountAmount)}</span> : null}
                      {fee.fineAmount ? <span className="text-xs text-red-500">Fine {fmt(fee.fineAmount)}</span> : null}
                      {latestPay && <span className="text-xs text-gray-400">Receipt #{latestPay.receiptNumber}</span>}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    {isPaid ? (
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        <p className="text-sm font-bold text-emerald-600">{fmt(fee.totalAmount)}</p>
                      </div>
                    ) : (
                      <p className="text-sm font-bold text-amber-600">{fmt(fee.balance)}</p>
                    )}
                    <p className="text-[10px] text-gray-400 mt-0.5">{isPaid ? 'Paid' : 'Due'}</p>
                  </div>
                  {canCollect && (
                    <button
                      type="button"
                      onClick={() => onCollect(fee)}
                      className="ml-2 h-8 px-3 bg-[#5B21B6] hover:bg-[#4C1D95] text-white rounded-xl text-xs font-semibold shrink-0 transition-colors print:hidden"
                    >
                      Pay
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {sorted.length > 0 && (
        <div className="px-5 py-3 bg-gray-50/50 border-t border-gray-200 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-4">
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wide">Total Assessed</p>
              <p className="text-sm font-bold text-gray-800">{fmt(totalAssessed)}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wide">Paid</p>
              <p className="text-sm font-bold text-emerald-600">{fmt(totalPaid)}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-gray-400 uppercase tracking-wide font-bold">Balance Due</p>
            <p className={cn('text-lg font-black', totalDue > 0 ? 'text-amber-600' : 'text-emerald-600')}>
              {fmt(totalDue)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Total Amount Due Panel (sticky right sidebar) ─────────────────────────────

function TotalAmountPanel({ ledger, month, onCollect, onRequestDiscount }: {
  ledger: NonNullable<ReturnType<typeof useStudentLedger>['data']>;
  month: string | null;
  onCollect: () => void;
  onRequestDiscount: () => void;
}) {
  const navigate = useNavigate();
  const { student, feeRecords, summary } = ledger;
  const { mutateAsync: sendWhatsApp, isPending: sendingWhatsApp } = useSendLedgerWhatsAppReminder();
  const { mutateAsync: sendEmail, isPending: sendingEmail } = useSendLedgerStatementEmail();

  const monthRecords = useMemo(() => {
    if (month === null) return feeRecords;
    return feeRecords.filter((r) => r.month === month);
  }, [feeRecords, month]);

  const monthBalance = monthRecords.reduce((s, r) => s + r.balance, 0);
  const displayBalance = month !== null ? monthBalance : summary.remainingBalance;
  const hasDues = displayBalance > 0;

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

  return (
    <div className="space-y-4">
      {/* Total due card */}
      <div className="bg-gradient-to-br from-[#4C1D95] to-[#5B21B6] rounded-2xl p-5 text-white shadow-lg">
        <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest mb-1">
          {month ? `${month} Balance` : 'Total Amount Due'}
        </p>
        <p className="text-4xl font-black tracking-tight leading-none">{fmt(displayBalance)}</p>
        {month && (
          <p className="text-xs text-white/50 mt-1.5">
            Overall balance: {fmt(summary.remainingBalance)}
          </p>
        )}
        <button
          onClick={onCollect}
          className="w-full mt-4 h-11 rounded-xl bg-white text-[#5B21B6] text-sm font-bold flex items-center justify-center gap-2 hover:bg-white/90 transition-colors"
        >
          <Coins className="w-4 h-4" /> Collect Payment
        </button>
      </div>

      {/* Summary strip */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 space-y-2.5">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Summary</p>
        {[
          { label: 'Total Fees', value: fmt(summary.totalFees) },
          { label: 'Total Paid', value: fmt(summary.totalPaid), color: 'text-emerald-600' },
          { label: 'Discount', value: fmt(summary.totalDiscount) },
          { label: 'Fine', value: fmt(summary.totalFine) },
          { label: 'Waived', value: fmt(summary.totalWaived) },
        ].map(({ label, value, color }) => (
          <div key={label} className="flex items-center justify-between">
            <span className="text-xs text-gray-500">{label}</span>
            <span className={cn('text-xs font-semibold text-gray-800', color)}>{value}</span>
          </div>
        ))}
        <div className="pt-2 border-t border-gray-200 flex items-center justify-between">
          <span className="text-xs font-bold text-gray-700">Remaining</span>
          <span className={cn('text-sm font-black', summary.remainingBalance > 0 ? 'text-amber-600' : 'text-emerald-600')}>
            {fmt(summary.remainingBalance)}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 space-y-2 print:hidden">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Actions</p>
        <button
          onClick={() => window.print()}
          className="w-full h-10 flex items-center gap-2.5 px-3.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-semibold transition-colors"
        >
          <Printer className="w-3.5 h-3.5" /> Print / Save PDF
        </button>
        <button
          onClick={handleWhatsApp}
          disabled={!student.parentPhone || !hasDues || sendingWhatsApp}
          className="w-full h-10 flex items-center gap-2.5 px-3.5 rounded-xl border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed text-gray-700 text-xs font-semibold transition-colors"
        >
          {sendingWhatsApp ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MessageCircle className="w-3.5 h-3.5" />}
          WhatsApp Reminder
        </button>
        <button
          onClick={handleEmail}
          disabled={!student.email || sendingEmail}
          className="w-full h-10 flex items-center gap-2.5 px-3.5 rounded-xl border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed text-gray-700 text-xs font-semibold transition-colors"
        >
          {sendingEmail ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
          Email Statement
        </button>
        <button
          onClick={onRequestDiscount}
          className="w-full h-10 flex items-center gap-2.5 px-3.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-semibold transition-colors"
        >
          <BadgePercent className="w-3.5 h-3.5" /> Request Discount
        </button>
        <button
          onClick={() => navigate(`/fees/student/${student._id}`)}
          className="w-full h-10 flex items-center gap-2.5 px-3.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-semibold transition-colors"
        >
          <UserRound className="w-3.5 h-3.5" /> View Student Profile
        </button>
      </div>

      {/* Editable tuition fee */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Fee Settings</p>
        <EditableTuitionFeeRow studentId={student._id} currentFee={student.monthlyTuitionFee} />
        <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
          <div className="flex items-start gap-2.5">
            <CalendarDays className="w-3.5 h-3.5 text-gray-300 mt-0.5 shrink-0" />
            <div><p className="text-[11px] text-gray-400">Last Payment</p><p className="text-sm font-semibold text-gray-800">{fmtDate(summary.lastPaymentDate)}</p></div>
          </div>
          <div className="flex items-start gap-2.5">
            <MailIcon className="w-3.5 h-3.5 text-gray-300 mt-0.5 shrink-0" />
            <div><p className="text-[11px] text-gray-400">Email</p><p className="text-sm font-semibold text-gray-800 truncate">{student.email || '—'}</p></div>
          </div>
          <div className="flex items-start gap-2.5">
            <MapPin className="w-3.5 h-3.5 text-gray-300 mt-0.5 shrink-0" />
            <div><p className="text-[11px] text-gray-400">Address</p><p className="text-sm font-semibold text-gray-800">{student.address || '—'}</p></div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Payment History (collapsible) ─────────────────────────────────────────────

type SortKey = 'paymentDate' | 'amount';
const HISTORY_PAGE_SIZE = 10;

function PaymentHistorySection({ payments }: { payments: FeePayment[] }) {
  const [open, setOpen] = useState(false);
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
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full px-5 py-4 flex items-center justify-between gap-3 hover:bg-gray-50/60 transition-colors"
      >
        <div className="text-left">
          <p className="text-sm font-bold text-gray-900">Payment History</p>
          <p className="text-xs text-gray-400 mt-0.5">{payments.length} payment{payments.length !== 1 ? 's' : ''} recorded</p>
        </div>
        <ChevronRight className={cn('w-4 h-4 text-gray-400 transition-transform', open && 'rotate-90')} />
      </button>

      {open && (
        <>
          {!payments.length ? (
            <div className="p-8 text-center border-t border-gray-200">
              <Receipt className="w-8 h-8 text-gray-200 mx-auto mb-2" />
              <p className="text-sm font-semibold text-gray-500">No payments recorded yet.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto border-t border-gray-200">
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
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
                  <button disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}
                    className="h-8 px-3 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-gray-600 disabled:opacity-40 flex items-center gap-1">
                    <ChevronLeft className="w-3.5 h-3.5" /> Prev
                  </button>
                  <p className="text-xs text-gray-400">Page {currentPage} of {totalPages}</p>
                  <button disabled={currentPage >= totalPages} onClick={() => setPage(currentPage + 1)}
                    className="h-8 px-3 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-gray-600 disabled:opacity-40 flex items-center gap-1">
                    Next <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

// ── Request Discount Modal ────────────────────────────────────────────────────

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
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-200">
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
              This goes to the principal for approval before it applies. Nothing changes for this student until then.
            </p>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Discount Amount (₹)</label>
              <input type="number" min={0.01} step={0.01} value={amount} onChange={(e) => setAmount(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-100 focus:border-violet-400" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Reason</label>
              <textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-100 focus:border-violet-400" />
            </div>
            {error && <p className="text-xs text-red-500">{error}</p>}
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={onClose} className="flex-1 h-11 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
              <button type="submit" disabled={isPending} className="flex-1 h-11 rounded-xl bg-[#5B21B6] hover:bg-[#4C1D95] disabled:opacity-50 text-white text-sm font-bold">
                {isPending ? 'Sending…' : 'Send for Approval'}
              </button>
            </div>
          </form>
        )}
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
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 text-[#5B21B6] animate-spin" />
      </div>
    );
  }

  if (isError || !ledger) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center py-24 gap-4 text-center">
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
        initialMonth={selectedMonth}
        onBack={() => { setShowProcessPayment(false); invalidateLedger(); }}
        onPaid={invalidateLedger}
      />
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Top nav bar */}
      <div className="bg-white border-b border-gray-200 px-4 py-3.5 flex items-center justify-between gap-3 print:hidden sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/accountant/student-ledger')}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-sm font-bold text-gray-900">Student Fee Ledger</h1>
            <p className="text-[11px] text-gray-400">{ledger.student.fullName} · {ledger.student.admissionNumber}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="h-8 px-3 flex items-center gap-1.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <Printer className="w-3.5 h-3.5" /> Print
          </button>
          <button
            onClick={() => setShowProcessPayment(true)}
            className="h-8 px-3 flex items-center gap-1.5 rounded-xl bg-[#5B21B6] text-white text-xs font-bold hover:bg-[#4C1D95] transition-colors"
          >
            <IndianRupee className="w-3.5 h-3.5" /> Collect Fee
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-5 grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-5 items-start">
        {/* Left column: main content */}
        <div className="space-y-4 min-w-0">
          <StudentProfileCard ledger={ledger} />
          <MonthTabs feeRecords={ledger.feeRecords} selected={selectedMonth} onSelect={setSelectedMonth} />
          <FeeStructureDetailCard
            feeRecords={ledger.feeRecords}
            payments={ledger.payments}
            month={selectedMonth}
            onCollect={setPayFee}
          />
          <PaymentHistorySection payments={ledger.payments} />
        </div>

        {/* Right column: total + actions */}
        <div className="xl:sticky xl:top-20">
          <TotalAmountPanel
            ledger={ledger}
            month={selectedMonth}
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
