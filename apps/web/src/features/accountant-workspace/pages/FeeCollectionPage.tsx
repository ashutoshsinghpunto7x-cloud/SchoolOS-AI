import { useState, useEffect, useMemo, useRef, useId } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, Search, CheckCircle2, Printer, Download, IndianRupee, Mail, Loader2,
  ChevronDown, X, CalendarRange, History, Pencil, Check, Banknote, AlertCircle,
  ShieldCheck, User, GraduationCap, FolderKanban, CreditCard, MapPin, FileText, Calendar,
  type LucideIcon,
} from 'lucide-react';
import { useStudentsPaginated, useUpdateStudent, useUpdateFeeProfile } from '@/features/students/hooks/useStudents';
import { useStudentFees, useRecordBulkPayment, useCreateFeeRecord, useRecordPayment } from '@/features/fees/hooks/useFees';
import { CollectPaymentModal } from '../components/CollectPaymentModal';
import { useSendReceiptEmail } from '../hooks/useAccountantWorkspace';
import { FeeStatusBadge } from '@/features/fees/components/FeeStatusBadge';
import type { FeeRecord, Student, PaymentMode, FeeHead } from '@schoolos/types';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

const SCHOOL_NAME = 'Florence Nightingale Inter College';
const SCHOOL_ADDRESS = 'Triveni Nagar, Kanpur – 208001, Uttar Pradesh, India'; // Edit with the full postal address as needed.

interface CollectContext {
  studentId?: string;
  studentName: string;
  class: string;
  section: string;
  fatherName?: string;
  parentPhone?: string;
  email?: string;
}

interface ReceiptLineItem { label: string; amount: number; }

interface SuccessState {
  context: CollectContext;
  lineItems: ReceiptLineItem[];
  total: number;
  paymentMode: string;
  receiptNumber?: string;
}

function studentToContext(s: Student): CollectContext {
  return {
    studentId: s._id, studentName: s.fullName, class: s.class, section: s.section,
    fatherName: s.fatherName, parentPhone: s.parentPhone, email: s.email,
  };
}

// ── Step-by-step search: Name → Class → Section → Roll No. (or Admission No.) ──

const textInputCls =
  'w-full h-12 px-3.5 rounded-xl border border-gray-300 bg-white text-sm ' +
  'focus:outline-none focus:ring-2 focus:ring-[#10B981]/30 focus:border-[#10B981]';

function StudentSearchPanel({ onSelectStudent }: { onSelectStudent: (s: Student) => void }) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [name, setName] = useState('');
  const [studentClass, setStudentClass] = useState('');
  const [section, setSection] = useState('');
  const [rollOrAdm, setRollOrAdm] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const nameRef = useRef<HTMLInputElement>(null);
  const classRef = useRef<HTMLInputElement>(null);
  const sectionRef = useRef<HTMLInputElement>(null);
  const rollRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (step === 1) nameRef.current?.focus();
    if (step === 2) classRef.current?.focus();
    if (step === 3) sectionRef.current?.focus();
    if (step === 4) rollRef.current?.focus();
  }, [step]);

  return (
    <div className="px-4 py-5 max-w-lg mx-auto space-y-3.5">
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          ref={nameRef}
          type="text" autoFocus value={name}
          onChange={(e) => { setName(e.target.value); setSubmitted(false); }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && name.trim()) { e.preventDefault(); setStep((s) => (s < 2 ? 2 : s)); }
          }}
          placeholder="Student name"
          className="w-full h-12 pl-10 pr-4 rounded-xl border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#10B981]/30 focus:border-[#10B981]"
        />
      </div>

      {step >= 2 && (
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Class</label>
          <input
            ref={classRef} type="text" value={studentClass}
            onChange={(e) => { setStudentClass(e.target.value); setSubmitted(false); }}
            onKeyDown={(e) => { if (e.key === 'Enter' && studentClass.trim()) { e.preventDefault(); setStep((s) => (s < 3 ? 3 : s)); } }}
            placeholder="e.g. 10 or Nursery"
            className={textInputCls}
          />
        </div>
      )}

      {step >= 3 && (
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Section</label>
          <input
            ref={sectionRef} type="text" value={section}
            onChange={(e) => { setSection(e.target.value.toUpperCase()); setSubmitted(false); }}
            onKeyDown={(e) => { if (e.key === 'Enter' && section.trim()) { e.preventDefault(); setStep((s) => (s < 4 ? 4 : s)); } }}
            placeholder="e.g. A"
            maxLength={5}
            className={textInputCls}
          />
        </div>
      )}

      {step >= 4 && (
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Roll No.</label>
          <input
            ref={rollRef}
            type="text" value={rollOrAdm}
            onChange={(e) => { setRollOrAdm(e.target.value); setSubmitted(false); }}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); setSubmitted(true); } }}
            placeholder="e.g. 7"
            className={textInputCls}
          />
          <p className="text-xs text-gray-400 mt-1">
            Press Enter to pull up the exact student. You can also type the full admission number here if the roll number isn't set yet.
          </p>
        </div>
      )}

      {submitted && (
        <StudentLookupResult
          name={name} studentClass={studentClass} section={section} rollOrAdm={rollOrAdm}
          onSelectStudent={onSelectStudent} onRetry={() => setSubmitted(false)}
        />
      )}
    </div>
  );
}

function StudentLookupResult({
  name, studentClass, section, rollOrAdm, onSelectStudent, onRetry,
}: {
  name: string; studentClass: string; section: string; rollOrAdm: string;
  onSelectStudent: (s: Student) => void; onRetry: () => void;
}) {
  const { data: results, isLoading } = useStudentsPaginated({
    search: name || undefined, class: studentClass || undefined, section: section || undefined,
    status: 'active', limit: 25,
  });

  const matches = results?.data ?? [];
  const filtered = useMemo(() => {
    const q = rollOrAdm.trim().toLowerCase();
    if (!q) return matches;
    // Exact roll number match wins outright — this is the fast path teachers/accountants rely on.
    const exactRoll = matches.filter((s) => (s.rollNumber ?? '').toLowerCase() === q);
    if (exactRoll.length) return exactRoll;
    return matches.filter((s) =>
      s.admissionNumber.toLowerCase().includes(q) || (s.rollNumber ?? '').toLowerCase().includes(q));
  }, [matches, rollOrAdm]);

  useEffect(() => {
    if (!isLoading && filtered.length === 1) onSelectStudent(filtered[0]);
  }, [isLoading, filtered, onSelectStudent]);

  if (isLoading) {
    return <div className="space-y-2">{Array.from({ length: 2 }).map((_, i) => <div key={i} className="h-16 bg-white rounded-xl border border-gray-100 animate-pulse" />)}</div>;
  }

  if (filtered.length === 1) return null; // auto-navigating via effect above

  if (!filtered.length) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
        <p className="text-sm font-semibold text-gray-700">No student matches these details</p>
        <button onClick={onRetry} className="text-xs font-semibold text-[#10B981] hover:underline mt-2">Try again</button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-amber-700">{filtered.length} students match — pick one:</p>
      {filtered.map((s) => (
        <StudentRow key={s._id} student={s} onClick={() => onSelectStudent(s)} showFatherName />
      ))}
    </div>
  );
}

function StudentRow({ student, onClick, showFatherName }: { student: Student; onClick: () => void; showFatherName?: boolean }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 bg-white rounded-xl border border-gray-200 shadow-sm px-4 py-3 hover:border-[#10B981]/40 hover:shadow-md transition-all text-left"
    >
      <div className="w-10 h-10 rounded-full bg-[#10B981]/10 flex items-center justify-center text-[#10B981] font-bold text-sm shrink-0">
        {student.fullName.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate">{student.fullName}</p>
        <p className="text-xs text-gray-400">
          Class {student.class}-{student.section} · {student.admissionNumber}
          {showFatherName && student.fatherName && ` · ${student.fatherName}`}
        </p>
      </div>
    </button>
  );
}

// ── Student summary card ─────────────────────────────────────────────────────
// Roll No./Class/Section/Monthly Tuition Fee are editable here — the accountant
// workspace's own fee-profile fields — via the dedicated fee-profile endpoint
// (separate from the broader student-details update, which stays gated behind
// the teacher change-request approval flow).

function StudentSummaryCard({ student, current }: { student: Student; current?: FeeRecord }) {
  const { mutateAsync, isPending, error } = useUpdateFeeProfile(student._id);
  const [editing, setEditing] = useState(false);
  const [rollNumber, setRollNumber] = useState(student.rollNumber ?? '');
  const [cls, setCls] = useState(student.class);
  const [section, setSection] = useState(student.section);
  const [fee, setFee] = useState(student.monthlyTuitionFee != null ? String(student.monthlyTuitionFee) : '');

  function startEdit() {
    setRollNumber(student.rollNumber ?? '');
    setCls(student.class);
    setSection(student.section);
    setFee(student.monthlyTuitionFee != null ? String(student.monthlyTuitionFee) : '');
    setEditing(true);
  }

  async function save() {
    await mutateAsync({
      rollNumber: rollNumber.trim() || undefined,
      class: cls.trim() || undefined,
      section: section.trim() || undefined,
      monthlyTuitionFee: fee.trim() ? Number(fee) : undefined,
    });
    setEditing(false);
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
      <div className="flex items-center gap-3">
        <div className="w-14 h-14 rounded-full bg-[#10B981]/10 flex items-center justify-center text-[#10B981] font-bold text-lg shrink-0">
          {student.fullName.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-base font-bold text-gray-900 truncate">{student.fullName}</p>
          <p className="text-sm text-gray-600">{student.admissionNumber}</p>
        </div>
        {!editing ? (
          <button
            type="button"
            onClick={startEdit}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-[#10B981] transition-colors shrink-0"
            title="Edit roll no. / class / section / fee"
          >
            <Pencil className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={save}
            disabled={isPending}
            className="h-8 px-3 flex items-center gap-1.5 rounded-lg bg-[#10B981] text-white text-xs font-semibold hover:bg-[#059669] disabled:opacity-50 transition-colors shrink-0"
          >
            {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            Save
          </button>
        )}
      </div>

      {editing ? (
        <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-gray-100 text-sm">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Roll No.</label>
            <input value={rollNumber} onChange={(e) => setRollNumber(e.target.value)}
              className="w-full h-9 px-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#10B981]/30" />
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs text-gray-500 block mb-1">Class</label>
              <input value={cls} onChange={(e) => setCls(e.target.value)}
                className="w-full h-9 px-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#10B981]/30" />
            </div>
            <div className="flex-1">
              <label className="text-xs text-gray-500 block mb-1">Section</label>
              <input value={section} onChange={(e) => setSection(e.target.value.toUpperCase())}
                className="w-full h-9 px-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#10B981]/30" />
            </div>
          </div>
          <div className="col-span-2">
            <label className="text-xs text-gray-500 block mb-1">Monthly Tuition Fee (₹)</label>
            <input type="number" min={0} value={fee} onChange={(e) => setFee(e.target.value)}
              className="w-full h-9 px-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#10B981]/30" />
          </div>
          {error && <p className="col-span-2 text-xs text-red-500">{error instanceof Error ? error.message : 'Failed to save'}</p>}
          <button type="button" onClick={() => setEditing(false)} className="col-span-2 text-xs font-semibold text-gray-500 hover:text-gray-700 text-left">
            Cancel
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2.5 mt-4 pt-4 border-t border-gray-100 text-sm">
          <div><p className="text-xs text-gray-500">Father's Name</p><p className="font-semibold text-gray-800">{student.fatherName || '—'}</p></div>
          <div><p className="text-xs text-gray-500">Roll No.</p><p className="font-semibold text-gray-800">{student.rollNumber || '—'}</p></div>
          <div><p className="text-xs text-gray-500">Class</p><p className="font-semibold text-gray-800">{student.class}-{student.section}</p></div>
          <div>
            <p className="text-xs text-gray-500">Month of Fee Submission</p>
            <p className="font-semibold text-gray-800">
              {current ? (current.month || new Date(current.dueDate).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })) : '—'}
            </p>
          </div>
          <div><p className="text-xs text-gray-500">Monthly Tuition Fee</p><p className="font-semibold text-gray-800">{student.monthlyTuitionFee ? fmt(student.monthlyTuitionFee) : '—'}</p></div>
          <div>
            <p className="text-xs text-gray-500">This Month's Fees Amount</p>
            <p className="font-bold text-gray-900">{current ? fmt(current.totalAmount) : '—'}</p>
          </div>
        </div>
      )}
      {!editing && !student.rollNumber && (
        <p className="text-xs text-gray-400 mt-3 pt-3 border-t border-gray-100">
          No roll number on file yet — click the pencil above to add one.
        </p>
      )}
    </div>
  );
}

// ── Pay multiple months (arrears / current / advance) ──────────────────────────

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function academicYearFor(date: Date): string {
  const y = date.getFullYear();
  const startY = date.getMonth() >= 3 ? y : y - 1; // academic year starts April
  return `${startY}-${String(startY + 1).slice(-2)}`;
}

function monthCandidates(fees: FeeRecord[]) {
  const now = new Date();
  const byKey = new Map(fees.filter((f) => f.feeHead === 'tuition').map((f) => [`${f.month}||${f.academicYear}`, f]));
  const list: { key: string; month: string; academicYear: string; label: string; dueDate: string; existing?: FeeRecord }[] = [];
  for (let offset = -6; offset <= 5; offset++) {
    const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    const month = MONTH_NAMES[d.getMonth()];
    const academicYear = academicYearFor(d);
    const key = `${month}||${academicYear}`;
    list.push({
      key, month, academicYear,
      label: `${month} ${d.getFullYear()}`,
      dueDate: new Date(d.getFullYear(), d.getMonth(), 10).toISOString().slice(0, 10),
      existing: byKey.get(key),
    });
  }
  return list;
}

function PayMultipleMonthsPanel({
  student, fees, onSuccess, onClose,
}: {
  student: Student; fees: FeeRecord[];
  onSuccess: (batchId: string, lineItems: ReceiptLineItem[], total: number, paymentMode: string) => void;
  onClose: () => void;
}) {
  const { mutateAsync: recordBulkPayment, isPending, error } = useRecordBulkPayment();
  const candidates = useMemo(() => monthCandidates(fees), [fees]);
  const [selected, setSelected] = useState<Record<string, number>>({});
  const [mode, setMode] = useState<'cash' | 'upi'>('cash');
  const [refNumber, setRefNumber] = useState('');
  const [localErr, setLocalErr] = useState('');

  function toggle(c: ReturnType<typeof monthCandidates>[number]) {
    setSelected((prev) => {
      const next = { ...prev };
      if (c.key in next) { delete next[c.key]; return next; }
      const amount = c.existing ? c.existing.balance : (student.monthlyTuitionFee ?? 0);
      next[c.key] = amount;
      return next;
    });
  }

  const total = Object.values(selected).reduce((a, b) => a + b, 0);
  const selectedCount = Object.keys(selected).length;

  async function submit() {
    setLocalErr('');
    if (!selectedCount) return setLocalErr('Select at least one month.');
    if (mode === 'upi' && !refNumber.trim()) return setLocalErr('Enter the UTR number for the online payment.');

    const months = candidates
      .filter((c) => c.key in selected)
      .map((c) => ({
        month: c.month, academicYear: c.academicYear,
        dueDate: c.existing ? undefined : c.dueDate,
        amount: Math.round(selected[c.key] * 100) / 100,
      }));

    const result = await recordBulkPayment({
      studentId: student._id,
      months,
      paymentDate: new Date().toISOString().slice(0, 10),
      paymentMode: (mode === 'upi' ? 'online' : 'cash') as PaymentMode,
      referenceNumber: mode === 'upi' ? refNumber.trim() : undefined,
    });

    const lineItems: ReceiptLineItem[] = result.results.map((r) => ({
      label: `${r.record.month} ${r.record.feeHead === 'tuition' ? 'Tuition Fee' : r.record.feeHead}`,
      amount: r.payment.amount,
    }));
    onSuccess(result.batchId, lineItems, lineItems.reduce((a, l) => a + l.amount, 0), mode === 'upi' ? 'online' : 'cash');
  }

  const displayErr = localErr || (error instanceof Error ? error.message : null);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-bold text-gray-900 flex items-center gap-2"><CalendarRange className="w-4 h-4 text-[#10B981]" /> Pay Multiple Months</h3>
        <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100"><X className="w-4 h-4 text-gray-500" /></button>
      </div>
      <p className="text-xs text-gray-400 mb-3">Select any combination of past-due, current, or advance months — useful when a parent clears arrears or pays several months ahead.</p>

      <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
        {candidates.map((c) => {
          const isPaid = c.existing?.status === 'paid';
          const isSelected = c.key in selected;
          return (
            <button
              key={c.key}
              type="button"
              disabled={isPaid}
              onClick={() => toggle(c)}
              className={`text-left rounded-xl border px-3 py-2 text-xs transition-colors ${
                isPaid ? 'bg-gray-50 border-gray-100 text-gray-300 cursor-not-allowed'
                : isSelected ? 'bg-[#10B981]/10 border-[#10B981] text-[#10B981]'
                : 'bg-white border-gray-200 hover:border-[#10B981]/40'
              }`}
            >
              <p className="font-semibold">{c.label}</p>
              <p>{isPaid ? 'Paid' : c.existing ? `Due ${fmt(c.existing.balance)}` : fmt(student.monthlyTuitionFee ?? 0)}</p>
            </button>
          );
        })}
      </div>

      {selectedCount > 0 && (
        <div className="mt-3 space-y-2 border-t border-gray-100 pt-3">
          {candidates.filter((c) => c.key in selected).map((c) => (
            <div key={c.key} className="flex items-center justify-between gap-2">
              <span className="text-xs text-gray-600 shrink-0">{c.label}</span>
              <input
                type="number" min={0} step={0.01} value={selected[c.key]}
                onChange={(e) => setSelected((prev) => ({ ...prev, [c.key]: parseFloat(e.target.value) || 0 }))}
                className="w-28 h-8 px-2 rounded-lg border border-gray-200 text-xs text-right focus:outline-none focus:ring-2 focus:ring-[#10B981]/30"
              />
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 mt-4">
        <button onClick={() => setMode('cash')} className={`h-10 rounded-xl text-sm font-semibold border ${mode === 'cash' ? 'bg-[#10B981] text-white border-[#10B981]' : 'bg-white text-gray-600 border-gray-200'}`}>Cash</button>
        <button onClick={() => setMode('upi')} className={`h-10 rounded-xl text-sm font-semibold border ${mode === 'upi' ? 'bg-[#10B981] text-white border-[#10B981]' : 'bg-white text-gray-600 border-gray-200'}`}>Online</button>
      </div>
      {mode === 'upi' && (
        <input
          value={refNumber} onChange={(e) => setRefNumber(e.target.value)} placeholder="UTR / Reference number"
          className="w-full h-10 px-3 mt-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#10B981]/30"
        />
      )}

      {displayErr && <p className="text-xs text-red-500 mt-2">{displayErr}</p>}

      <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
        <div>
          <p className="text-xs text-gray-500">Total ({selectedCount} month{selectedCount === 1 ? '' : 's'})</p>
          <p className="text-lg font-bold text-gray-900">{fmt(total)}</p>
        </div>
        <button
          onClick={submit} disabled={isPending || !selectedCount}
          className="h-11 px-5 bg-[#10B981] hover:bg-[#059669] disabled:opacity-50 text-white rounded-xl text-sm font-semibold flex items-center gap-2"
        >
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Collect Payment
        </button>
      </div>
    </div>
  );
}

// ── Fee history (full record, not just unpaid) ─────────────────────────────────

function FeeHistoryList({ fees }: { fees: FeeRecord[] }) {
  const sorted = useMemo(
    () => [...fees].sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime()),
    [fees],
  );
  if (!sorted.length) return <p className="text-sm text-gray-400 text-center py-6">No fee history yet.</p>;
  return (
    <div className="space-y-2">
      {sorted.map((fee) => (
        <div key={fee._id} className="bg-white rounded-xl border border-gray-200 p-3.5 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-gray-900 truncate">
                {fee.month || new Date(fee.dueDate).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
              </p>
              <FeeStatusBadge status={fee.status} size="sm" />
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              {fee.feeHead === 'tuition' ? 'Tuition' : fee.feeHead} · Paid {fmt(fee.paidAmount)} of {fmt(fee.totalAmount)}
            </p>
          </div>
          <p className="text-xs text-gray-400 shrink-0">Due {new Date(fee.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
        </div>
      ))}
    </div>
  );
}

// ── Quick collect: assign + collect a one-off payment in a single step ─────────
// Creates a fee record for the entered amount, then immediately records full
// payment against it, so the accountant never has to leave this page to
// collect an ad-hoc payment (e.g. a student with no fee assigned yet).

const QUICK_FEE_HEADS: { value: FeeHead; label: string }[] = [
  { value: 'tuition',       label: 'Tuition Fee' },
  { value: 'admission',     label: 'Admission Fee' },
  { value: 'examination',   label: 'Examination Fee' },
  { value: 'transport',     label: 'Transport Fee' },
  { value: 'hostel',        label: 'Hostel Fee' },
  { value: 'miscellaneous', label: 'Miscellaneous' },
];

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function currentAcademicYear(): string {
  const y = new Date().getFullYear();
  const m = new Date().getMonth();
  return m >= 3 ? `${y}-${String(y + 1).slice(-2)}` : `${y - 1}-${String(y).slice(-2)}`;
}

function QuickCollectForm({
  student, onClose, onSuccess,
}: {
  student: Student; onClose: () => void;
  onSuccess: (receiptNumber: string | undefined, lineItems: ReceiptLineItem[], total: number, paymentMode: string) => void;
}) {
  const { mutateAsync: createFee, isPending: creating } = useCreateFeeRecord();
  const { mutateAsync: recordPayment, isPending: paying } = useRecordPayment();

  const [feeHead, setFeeHead] = useState<FeeHead>('tuition');
  const [amount, setAmount] = useState(student.monthlyTuitionFee ? String(student.monthlyTuitionFee) : '');
  const [description, setDescription] = useState('');
  const [mode, setMode] = useState<'cash' | 'upi'>('cash');
  const [refNumber, setRefNumber] = useState('');
  const [error, setError] = useState('');

  const isPending = creating || paying;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) return setError('Enter a valid amount.');
    if (mode === 'upi' && !refNumber.trim()) return setError('Enter the UTR number for the online payment.');

    const month = MONTHS[new Date().getMonth()];
    const feeLabel = QUICK_FEE_HEADS.find((h) => h.value === feeHead)?.label ?? 'Fee';
    const today = new Date().toISOString().slice(0, 10);

    const fee = await createFee({
      studentId: student._id,
      feeHead,
      month,
      description: description.trim() || `${month} ${feeLabel}`,
      academicYear: currentAcademicYear(),
      dueDate: today,
      totalAmount: Math.round(amt * 100) / 100,
    });

    const paymentMode: PaymentMode = mode === 'upi' ? 'online' : 'cash';
    const result = await recordPayment({
      feeRecordId: fee._id,
      amount: Math.round(amt * 100) / 100,
      paymentDate: today,
      paymentMode,
      referenceNumber: mode === 'upi' ? refNumber.trim() : undefined,
    });

    onSuccess(
      result.payment.receiptNumber,
      [{ label: description.trim() || `${month} ${feeLabel}`, amount: result.payment.amount }],
      result.payment.amount,
      paymentMode,
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold text-gray-900">Collect Payment</h3>
        <button type="button" onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100">
          <X className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Fee Type</label>
          <div className="relative">
            <select
              value={feeHead}
              onChange={(e) => setFeeHead(e.target.value as FeeHead)}
              className="w-full h-11 px-3.5 pr-9 rounded-xl border border-gray-200 bg-white text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-[#10B981]/30 focus:border-[#10B981]"
            >
              {QUICK_FEE_HEADS.map((h) => <option key={h.value} value={h.value}>{h.label}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Amount (₹)</label>
          <div className="relative">
            <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
              min={0.01} step={0.01} required
              className="w-full h-11 pl-9 pr-3.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#10B981]/30 focus:border-[#10B981]"
              placeholder="0.00"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Description (Optional)</label>
          <input
            type="text" value={description} onChange={(e) => setDescription(e.target.value)}
            className="w-full h-11 px-3.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#10B981]/30 focus:border-[#10B981]"
            placeholder={`${MONTHS[new Date().getMonth()]} ${QUICK_FEE_HEADS.find((h) => h.value === feeHead)?.label}`}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Payment Mode</label>
          <div className="grid grid-cols-2 gap-2.5">
            {([{ value: 'cash', label: 'Cash', icon: Banknote }, { value: 'upi', label: 'Online', icon: CreditCard }] as const).map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setMode(value)}
                className={`flex flex-col items-center justify-center gap-1.5 h-16 rounded-xl border-2 font-semibold text-xs transition-colors ${
                  mode === value ? 'border-[#10B981] bg-[#10B981]/5 text-[#10B981]' : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-4 h-4" /> {label}
              </button>
            ))}
          </div>
        </div>

        {mode === 'upi' && (
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">UTR Number</label>
            <input
              type="text" value={refNumber} onChange={(e) => setRefNumber(e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#10B981]/30 focus:border-[#10B981]"
              placeholder="e.g. 123456789012" maxLength={30}
            />
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}

        <button
          type="submit" disabled={isPending}
          className="w-full h-11 bg-[#10B981] hover:bg-[#059669] disabled:opacity-60 text-white font-semibold rounded-xl text-sm flex items-center justify-center gap-2"
        >
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <IndianRupee className="w-4 h-4" />}
          {isPending ? 'Collecting…' : 'Collect & Print Receipt'}
        </button>
      </form>
    </div>
  );
}

// ── Student profile: card + assign fee + monthly record ────────────────────────

function StudentDetailCard({
  student, onBack, onSelectFee, onBulkSuccess,
}: {
  student: Student; onBack: () => void; onSelectFee: (fee: FeeRecord) => void;
  onBulkSuccess: (batchId: string, lineItems: ReceiptLineItem[], total: number, paymentMode: string) => void;
}) {
  const { data: fees, isLoading } = useStudentFees(student._id);
  const [multiMonthOpen, setMultiMonthOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [quickCollectOpen, setQuickCollectOpen] = useState(false);

  const allFees = fees ?? [];
  const unpaid = useMemo(() => {
    return [...allFees]
      .filter((f) => f.status !== 'paid' && f.status !== 'waived')
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }, [allFees]);

  const current = unpaid[0];

  return (
    <div className="px-4 py-5 max-w-6xl mx-auto space-y-4">
      <button onClick={onBack} className="text-xs font-semibold text-[#10B981] flex items-center gap-1 hover:underline">
        <ArrowLeft className="w-3.5 h-3.5" /> Search another student
      </button>

      {/* Landscape layout: profile + fees record side-by-side on wide screens, no scrolling needed to see it all */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-start">
        <div className="lg:col-span-2">
          <StudentSummaryCard student={student} current={current} />
        </div>

        <div className="lg:col-span-3 space-y-4">
          {/* Monthly Fees Record — includes current + any pending (past) fees */}
          <div>
            <div className="flex items-center justify-between mb-2 px-1">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Monthly Fees Record</h3>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setQuickCollectOpen((v) => !v)}
                  className="text-xs font-semibold text-[#10B981] hover:underline flex items-center gap-1"
                >
                  <IndianRupee className="w-3.5 h-3.5" /> Collect Payment
                </button>
                <button
                  onClick={() => setMultiMonthOpen((v) => !v)}
                  className="text-xs font-semibold text-[#10B981] hover:underline flex items-center gap-1"
                >
                  <CalendarRange className="w-3.5 h-3.5" /> Pay Multiple Months
                </button>
              </div>
            </div>
            {quickCollectOpen && (
              <div className="mb-3">
                <QuickCollectForm
                  student={student}
                  onClose={() => setQuickCollectOpen(false)}
                  onSuccess={(receiptNumber, lineItems, total, paymentMode) => {
                    setQuickCollectOpen(false);
                    onBulkSuccess(receiptNumber ?? '', lineItems, total, paymentMode);
                  }}
                />
              </div>
            )}
            {isLoading ? (
              <div className="space-y-2">{Array.from({ length: 2 }).map((_, i) => <div key={i} className="h-20 bg-white rounded-xl border border-gray-100 animate-pulse" />)}</div>
            ) : !unpaid.length ? (
              !quickCollectOpen && (
                <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center">
                  <CheckCircle2 className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-gray-700">No pending fees</p>
                  <p className="text-xs text-gray-400 mt-1">Click "Collect Payment" above to record an ad-hoc payment.</p>
                </div>
              )
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {unpaid.map((fee) => (
                  <div key={fee._id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {fee.month || new Date(fee.dueDate).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
                        </p>
                        <FeeStatusBadge status={fee.status} size="sm" />
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Due {new Date(fee.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} · Balance {fmt(fee.balance)}
                      </p>
                    </div>
                    <button
                      onClick={() => onSelectFee(fee)}
                      className="h-9 px-3 bg-[#10B981] hover:bg-[#059669] text-white rounded-lg text-xs font-semibold shrink-0 flex items-center gap-1.5"
                    >
                      <IndianRupee className="w-3.5 h-3.5" /> Collect
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {multiMonthOpen && (
            <PayMultipleMonthsPanel
              student={student}
              fees={allFees}
              onClose={() => setMultiMonthOpen(false)}
              onSuccess={(batchId, lineItems, total, paymentMode) => {
                setMultiMonthOpen(false);
                onBulkSuccess(batchId, lineItems, total, paymentMode);
              }}
            />
          )}

          <div>
            <button
              onClick={() => setHistoryOpen((v) => !v)}
              className="w-full flex items-center justify-between text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 px-1"
            >
              <span className="flex items-center gap-1.5"><History className="w-3.5 h-3.5" /> Full Fee History</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${historyOpen ? 'rotate-180' : ''}`} />
            </button>
            {historyOpen && (isLoading ? (
              <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 bg-white rounded-xl border border-gray-100 animate-pulse" />)}</div>
            ) : (
              <FeeHistoryList fees={allFees} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Receipt ────────────────────────────────────────────────────────────────────

function ReceiptRow({
  icon: Icon, label, value,
}: { icon: React.ComponentType<{ className?: string }>; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-dotted border-gray-200 last:border-b-0">
      <span className="flex items-center gap-2 text-sm text-gray-500">
        <Icon className="w-4 h-4 text-gray-400" />
        {label}
      </span>
      <span className="font-semibold text-gray-900 text-right">{value}</span>
    </div>
  );
}

// On-screen preview — a wide, invoice-style landscape card (school brand + receipt
// meta on top, student info / fee breakdown side-by-side, signatures on the bottom).
function ReceiptCopy({
  context, lineItems, total, paymentMode, receiptNumber, copyLabel,
}: {
  context: CollectContext; lineItems: ReceiptLineItem[]; total: number;
  paymentMode: string; receiptNumber?: string; copyLabel: string;
}) {
  const dateLabel = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div className="receipt-copy relative bg-white rounded-[28px] border border-gray-200 shadow-sm p-10 text-left w-full">
      <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full px-3 py-1 mb-5">
        <ShieldCheck className="w-3.5 h-3.5" />
        {copyLabel.toUpperCase()}
      </span>

      <div className="flex items-start justify-between pb-6 border-b border-gray-100">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full border-2 border-emerald-600 flex items-center justify-center bg-white shrink-0">
            <GraduationCap className="w-8 h-8 text-emerald-600" strokeWidth={1.5} />
          </div>
          <div>
            <p className="font-serif text-2xl font-bold text-gray-900 leading-tight">{SCHOOL_NAME}</p>
            <p className="text-sm text-gray-400 mt-0.5 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-gray-300 shrink-0" />{SCHOOL_ADDRESS}
            </p>
            <p className="text-lg font-bold text-emerald-600 mt-2">Fee Receipt</p>
          </div>
        </div>
        <div className="text-right shrink-0 w-40">
          <p className="text-[11px] font-semibold text-gray-400 tracking-wide">RECEIPT NO.</p>
          <p className="text-base font-bold text-gray-900 mt-0.5">{receiptNumber || '—'}</p>
          <div className="border-t border-dashed border-gray-200 my-2" />
          <p className="text-[11px] font-semibold text-gray-400 tracking-wide">DATE</p>
          <p className="text-base font-bold text-gray-900 mt-0.5">{dateLabel}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-10 py-6">
        <div>
          <ReceiptRow icon={User} label="Student Name" value={context.studentName} />
          <ReceiptRow icon={User} label="Father's Name" value={context.fatherName || '—'} />
          <ReceiptRow icon={GraduationCap} label="Class" value={context.class} />
          <ReceiptRow icon={FolderKanban} label="Section" value={context.section} />
          <ReceiptRow icon={CreditCard} label="Payment Mode" value={<span className="capitalize">{paymentMode}</span>} />
        </div>

        <div>
          <p className="text-[11px] font-bold text-gray-400 tracking-wide mb-2">FEE DETAILS</p>
          <div className="rounded-2xl border border-gray-200 overflow-hidden">
            <div className="grid grid-cols-2 bg-gray-50 px-5 py-2.5 border-b border-dashed border-gray-200">
              <span className="text-[11px] font-bold text-gray-400 tracking-wide">DESCRIPTION</span>
              <span className="text-[11px] font-bold text-gray-400 tracking-wide text-right">AMOUNT (₹)</span>
            </div>
            {lineItems.map((li, i) => (
              <div key={i} className="grid grid-cols-2 px-5 py-3 text-sm text-gray-700">
                <span>{li.label}</span>
                <span className="text-right font-medium text-gray-800">{fmt(li.amount)}</span>
              </div>
            ))}
            <div className="grid grid-cols-2 px-5 py-3.5 bg-emerald-50/70 border-t-2 border-emerald-500">
              <span className="text-sm font-bold text-emerald-700 tracking-wide">TOTAL AMOUNT PAID</span>
              <span className="text-right text-lg font-bold text-emerald-700">{fmt(total)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-end justify-between pt-8 mt-2 border-t border-dashed border-gray-200">
        <div className="w-56">
          <div className="border-t-2 border-gray-800 mb-2" />
          <p className="text-[11px] text-gray-400">Student/Guardian Signature</p>
        </div>
        <div className="w-56 text-right">
          <div className="border-t-2 border-gray-800 mb-2" />
          <p className="text-[11px] text-gray-400">Accountant Stamp/Signature</p>
        </div>
      </div>
    </div>
  );
}

// Compact label/value pair used inside the landscape print layout.
function PrintReceiptRow({
  icon: Icon, label, value, last,
}: { icon: React.ComponentType<{ className?: string }>; label: string; value: React.ReactNode; last?: boolean }) {
  return (
    <div className={`flex items-center justify-between py-[1.8mm] ${last ? '' : 'border-b border-dotted border-gray-200'}`}>
      <span className="flex items-center gap-[2mm] text-[7.5px] text-gray-500">
        <Icon className="w-[3mm] h-[3mm] text-gray-400" />
        {label}
      </span>
      <span className="text-[8.5px] font-semibold text-gray-900 text-right">{value}</span>
    </div>
  );
}

// Print copy — the exact same visual design as the on-screen ReceiptCopy above,
// scaled down in real mm units so it fits cleanly within half of an A4 landscape
// sheet (see the @page rule in SuccessStep below) with nothing clipped.
function PrintReceiptCopy({
  context, lineItems, total, paymentMode, receiptNumber, copyLabel,
}: {
  context: CollectContext; lineItems: ReceiptLineItem[]; total: number;
  paymentMode: string; receiptNumber?: string; copyLabel: string;
}) {
  const dateLabel = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div className="print-receipt-copy relative bg-white rounded-[3mm] border border-gray-200 p-[7mm] text-left w-full">
      <span className="inline-flex items-center gap-[1mm] text-[7px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full px-[3mm] py-[1mm] mb-[3mm]">
        <ShieldCheck className="w-[3mm] h-[3mm]" />
        {copyLabel.toUpperCase()}
      </span>

      <div className="flex items-start justify-between pb-[3mm] border-b border-gray-100">
        <div className="flex items-center gap-[4mm]">
          <div className="w-[13mm] h-[13mm] rounded-full border-[1.2px] border-emerald-600 flex items-center justify-center bg-white shrink-0">
            <GraduationCap className="w-[6.5mm] h-[6.5mm] text-emerald-600" strokeWidth={1.5} />
          </div>
          <div>
            <p className="font-serif text-[13px] font-bold text-gray-900 leading-tight">{SCHOOL_NAME}</p>
            <p className="text-[7.5px] text-gray-400 mt-[0.5mm] flex items-center gap-[1mm]">
              <MapPin className="w-[2.5mm] h-[2.5mm] text-gray-300 shrink-0" />{SCHOOL_ADDRESS}
            </p>
            <p className="text-[11px] font-bold text-emerald-600 mt-[1.5mm]">Fee Receipt</p>
          </div>
        </div>
        <div className="text-right shrink-0 w-[30mm]">
          <p className="text-[7px] font-semibold text-gray-400 tracking-wide">RECEIPT NO.</p>
          <p className="text-[10px] font-bold text-gray-900">{receiptNumber || '—'}</p>
          <div className="border-t border-dashed border-gray-200 my-[1.5mm]" />
          <p className="text-[7px] font-semibold text-gray-400 tracking-wide">DATE</p>
          <p className="text-[10px] font-bold text-gray-900">{dateLabel}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-[8mm] py-[3.5mm]">
        <div>
          <PrintReceiptRow icon={User} label="Student Name" value={context.studentName} />
          <PrintReceiptRow icon={User} label="Father's Name" value={context.fatherName || '—'} />
          <PrintReceiptRow icon={GraduationCap} label="Class" value={context.class} />
          <PrintReceiptRow icon={FolderKanban} label="Section" value={context.section} />
          <PrintReceiptRow icon={CreditCard} label="Payment Mode" value={<span className="capitalize">{paymentMode}</span>} last />
        </div>

        <div>
          <p className="text-[7px] font-bold text-gray-400 tracking-wide mb-[1.5mm]">FEE DETAILS</p>
          <div className="rounded-[2mm] border border-gray-200 overflow-hidden">
            <div className="grid grid-cols-2 bg-gray-50 px-[4mm] py-[1.5mm] border-b border-dashed border-gray-200">
              <span className="text-[7px] font-bold text-gray-400 tracking-wide">DESCRIPTION</span>
              <span className="text-[7px] font-bold text-gray-400 tracking-wide text-right">AMOUNT (₹)</span>
            </div>
            {lineItems.map((li, i) => (
              <div key={i} className="grid grid-cols-2 px-[4mm] py-[1.5mm] text-[8.5px] text-gray-700">
                <span>{li.label}</span>
                <span className="text-right font-medium text-gray-800">{fmt(li.amount)}</span>
              </div>
            ))}
            <div className="grid grid-cols-2 px-[4mm] py-[2mm] bg-emerald-50 border-t-2 border-emerald-500">
              <span className="text-[8px] font-bold text-emerald-700 tracking-wide">TOTAL AMOUNT PAID</span>
              <span className="text-right text-[12px] font-bold text-emerald-700">{fmt(total)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-end justify-between pt-[4mm] mt-[1mm] border-t border-dashed border-gray-200">
        <div className="w-[45mm]">
          <div className="border-t-2 border-gray-800 mb-[1.5mm]" />
          <p className="text-[7px] text-gray-400">Student/Guardian Signature</p>
        </div>
        <div className="w-[45mm] text-right">
          <div className="border-t-2 border-gray-800 mb-[1.5mm]" />
          <p className="text-[7px] text-gray-400">Accountant Stamp/Signature</p>
        </div>
      </div>
    </div>
  );
}

// ── "Classic" template — a formal, portrait certificate-style receipt ──────────
// Alternative to the landscape design above; selectable via the toggle in
// SuccessStep and remembered per-browser (localStorage).

function CrestLogo({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 120" className={className} fill="none">
      {/* laurel wreath */}
      <g stroke="#0F5132" strokeWidth="2" strokeLinecap="round" opacity="0.8">
        <path d="M58 112 C40 106 24 92 20 72 C18 60 19 48 23 38" />
        <ellipse cx="34" cy="102" rx="5.5" ry="2.5" transform="rotate(-35 34 102)" fill="#0F5132" stroke="none" />
        <ellipse cx="26" cy="90" rx="5.5" ry="2.5" transform="rotate(-55 26 90)" fill="#0F5132" stroke="none" />
        <ellipse cx="21" cy="76" rx="5.5" ry="2.5" transform="rotate(-75 21 76)" fill="#0F5132" stroke="none" />
        <ellipse cx="20" cy="60" rx="5.5" ry="2.5" transform="rotate(-95 20 60)" fill="#0F5132" stroke="none" />
        <ellipse cx="22" cy="46" rx="5.5" ry="2.5" transform="rotate(-110 22 46)" fill="#0F5132" stroke="none" />
      </g>
      <g stroke="#0F5132" strokeWidth="2" strokeLinecap="round" opacity="0.8" transform="scale(-1,1) translate(-120,0)">
        <path d="M58 112 C40 106 24 92 20 72 C18 60 19 48 23 38" />
        <ellipse cx="34" cy="102" rx="5.5" ry="2.5" transform="rotate(-35 34 102)" fill="#0F5132" stroke="none" />
        <ellipse cx="26" cy="90" rx="5.5" ry="2.5" transform="rotate(-55 26 90)" fill="#0F5132" stroke="none" />
        <ellipse cx="21" cy="76" rx="5.5" ry="2.5" transform="rotate(-75 21 76)" fill="#0F5132" stroke="none" />
        <ellipse cx="20" cy="60" rx="5.5" ry="2.5" transform="rotate(-95 20 60)" fill="#0F5132" stroke="none" />
        <ellipse cx="22" cy="46" rx="5.5" ry="2.5" transform="rotate(-110 22 46)" fill="#0F5132" stroke="none" />
      </g>
      {/* shield */}
      <path
        d="M60 10 L96 22 L96 58 C96 82 80 98 60 108 C40 98 24 82 24 58 L24 22 Z"
        fill="white" stroke="#0F5132" strokeWidth="3"
      />
      {/* open book */}
      <path d="M60 48 L60 70" stroke="#0F5132" strokeWidth="2" />
      <path d="M60 50 C54 46 46 46 41 49 L41 66 C46 63 54 63 60 67 Z" fill="none" stroke="#0F5132" strokeWidth="2" strokeLinejoin="round" />
      <path d="M60 50 C66 46 74 46 79 49 L79 66 C74 63 66 63 60 67 Z" fill="none" stroke="#0F5132" strokeWidth="2" strokeLinejoin="round" />
      <text x="60" y="88" textAnchor="middle" fontSize="13" fontWeight="700" fill="#0F5132" fontFamily="serif">FNIC</text>
    </svg>
  );
}

function BuildingWatermark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 320 160" className={className} fill="none" stroke="currentColor" strokeWidth="1.5">
      <polygon points="160,14 260,64 60,64" />
      <circle cx="160" cy="40" r="9" />
      <rect x="40" y="64" width="240" height="72" />
      {[64, 92, 120, 148, 176, 204, 232, 260].map((x) => (
        <line key={x} x1={x} y1="64" x2={x} y2="136" />
      ))}
      <line x1="40" y1="136" x2="280" y2="136" />
    </svg>
  );
}

function StampSeal({ className = '' }: { className?: string }) {
  const uid = useId().replace(/[:]/g, '');
  return (
    <svg viewBox="0 0 100 100" className={className}>
      <defs>
        <path id={`stampPath-${uid}`} d="M 50,50 m -36,0 a 36,36 0 1,1 72,0 a 36,36 0 1,1 -72,0" />
      </defs>
      <circle cx="50" cy="50" r="44" fill="none" stroke="#0F5132" strokeWidth="1.2" opacity="0.7" />
      <circle cx="50" cy="50" r="36" fill="none" stroke="#0F5132" strokeWidth="1" opacity="0.7" />
      <text fontSize="6.2" fill="#0F5132" letterSpacing="1.5" opacity="0.85">
        <textPath href={`#stampPath-${uid}`} startOffset="1%">
          ★ FLORENCE NIGHTINGALE INTER COLLEGE ★ TRIVENI NAGAR
        </textPath>
      </text>
      <text x="50" y="47" textAnchor="middle" fontSize="8" fontWeight="700" fill="#0F5132" opacity="0.85">TRIVENI</text>
      <text x="50" y="58" textAnchor="middle" fontSize="8" fontWeight="700" fill="#0F5132" opacity="0.85">NAGAR</text>
    </svg>
  );
}

function ClassicRow({
  icon: Icon, label, value,
}: { icon: LucideIcon; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-3.5 border-b border-gray-100 last:border-b-0">
      <span className="flex items-center gap-3 text-gray-500">
        <Icon className="w-[18px] h-[18px] text-gray-400" strokeWidth={1.5} />
        {label}
      </span>
      <span className="font-bold text-gray-900 text-right">{value}</span>
    </div>
  );
}

function ClassicReceiptCopy({
  context, lineItems, total, paymentMode, receiptNumber, copyLabel,
}: {
  context: CollectContext; lineItems: ReceiptLineItem[]; total: number;
  paymentMode: string; receiptNumber?: string; copyLabel: string;
}) {
  const dateLabel = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div className="classic-receipt-copy relative bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden p-10 text-left w-full">
      {/* Decorative corner accent */}
      <div
        className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#14532D] to-[#0B3D2E]"
        style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 0)' }}
      />
      <BuildingWatermark className="absolute top-10 right-6 w-64 text-gray-300 opacity-[0.15] pointer-events-none" />

      <span className="relative z-10 inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full px-3.5 py-1.5">
        <ShieldCheck className="w-3.5 h-3.5" />
        {copyLabel.toUpperCase()}
      </span>

      <div className="relative z-10 text-center pt-2 pb-4">
        <CrestLogo className="w-24 h-24 mx-auto mb-3" />
        <p className="font-serif text-3xl font-bold text-gray-900">{SCHOOL_NAME}</p>
        <p className="text-sm text-gray-400 mt-2 flex items-center justify-center gap-3">
          <span className="w-8 h-px bg-amber-200" />{SCHOOL_ADDRESS.split(',')[0]}<span className="w-8 h-px bg-amber-200" />
        </p>
        <p className="text-xl font-bold text-emerald-600 mt-2">Fee Receipt</p>
      </div>

      <div className="relative z-10 bg-gray-50 rounded-2xl p-4 flex items-center gap-4 mb-4">
        <div className="flex items-center gap-3 flex-1">
          <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
            <FileText className="w-[18px] h-[18px] text-emerald-700" strokeWidth={1.5} />
          </div>
          <div>
            <p className="text-xs text-gray-400">Bill No.</p>
            <p className="font-bold text-gray-900 text-sm">{receiptNumber || '—'}</p>
          </div>
        </div>
        <div className="w-px h-9 bg-gray-200" />
        <div className="flex items-center gap-3 flex-1">
          <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
            <Calendar className="w-[18px] h-[18px] text-emerald-700" strokeWidth={1.5} />
          </div>
          <div>
            <p className="text-xs text-gray-400">Date</p>
            <p className="font-bold text-gray-900 text-sm">{dateLabel}</p>
          </div>
        </div>
      </div>

      <div className="relative z-10 bg-white rounded-2xl border border-gray-100 px-4 mb-4">
        <ClassicRow icon={User} label="Student Name" value={context.studentName} />
        <ClassicRow icon={User} label="Father's Name" value={context.fatherName || '—'} />
        <ClassicRow icon={GraduationCap} label="Class" value={context.class} />
        <ClassicRow icon={FolderKanban} label="Section" value={context.section} />
        <ClassicRow icon={CreditCard} label="Payment Mode" value={<span className="capitalize">{paymentMode}</span>} />
      </div>

      <div className="relative z-10 bg-gray-50 rounded-2xl p-4">
        {lineItems.map((li, i) => (
          <div key={i} className="flex items-center justify-between text-sm py-1.5">
            <span className="flex items-center gap-2.5 text-gray-500">
              <span className="w-7 h-7 rounded-full bg-white flex items-center justify-center shrink-0">
                <IndianRupee className="w-3.5 h-3.5 text-gray-400" />
              </span>
              {li.label}
            </span>
            <span className="font-semibold text-gray-800">{fmt(li.amount)}</span>
          </div>
        ))}
        <div className="border-t border-dashed border-gray-300 my-2.5" />
        <div className="flex items-center justify-between bg-emerald-50 rounded-xl px-3 py-2.5">
          <span className="flex items-center gap-2.5 font-bold text-emerald-700 text-sm">
            <span className="w-7 h-7 rounded-full bg-emerald-600 flex items-center justify-center shrink-0">
              <IndianRupee className="w-3.5 h-3.5 text-white" />
            </span>
            Amount Paid
          </span>
          <span className="font-bold text-emerald-700 text-lg">{fmt(total)}</span>
        </div>
      </div>

      <div className="relative z-10 flex items-end justify-between mt-10 pt-2 gap-4">
        <div className="text-center flex-1">
          <div className="h-9" />
          <p className="text-[11px] text-gray-400 border-t border-gray-300 pt-1.5 mt-1">Student/Guardian Signature</p>
        </div>
        <StampSeal className="w-20 h-20 shrink-0 mb-2" />
        <div className="text-center flex-1">
          <div className="h-9" />
          <p className="text-[11px] text-gray-400 border-t border-gray-300 pt-1.5 mt-1">Accountant Stamp/Signature</p>
        </div>
      </div>
    </div>
  );
}

// Compact label/value row for the Classic print layout (no icon circle, dotted divider).
function ClassicPrintRow({
  icon: Icon, label, value,
}: { icon: React.ComponentType<{ className?: string }>; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-[1mm] border-b border-dotted border-gray-200">
      <span className="flex items-center gap-[1.5mm] text-[6.5px] text-gray-500">
        <Icon className="w-[2.5mm] h-[2.5mm] text-gray-400" />
        {label}
      </span>
      <span className="text-[7.5px] font-semibold text-gray-900 text-right">{value}</span>
    </div>
  );
}

// Classic print copy — same visual design as ClassicReceiptCopy, scaled down in
// real mm units so BOTH copies fit as two halves of a single A4 portrait sheet
// (see the @page rule in SuccessStep) instead of spanning two separate pages.
function ClassicPrintCopy({
  context, lineItems, total, paymentMode, receiptNumber, copyLabel,
}: {
  context: CollectContext; lineItems: ReceiptLineItem[]; total: number;
  paymentMode: string; receiptNumber?: string; copyLabel: string;
}) {
  const dateLabel = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div className="classic-print-copy relative bg-white rounded-[4mm] border border-gray-100 overflow-hidden p-[5mm] text-left w-full h-full flex flex-col">
      <div
        className="absolute top-0 right-0 w-[20mm] h-[20mm] bg-gradient-to-br from-[#14532D] to-[#0B3D2E]"
        style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 0)' }}
      />
      <BuildingWatermark className="absolute top-[4mm] right-[3mm] w-[40mm] text-gray-300 opacity-[0.15] pointer-events-none" />

      <span className="relative z-10 inline-flex items-center gap-[1mm] text-[6px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full px-[2.5mm] py-[0.8mm] self-start">
        <ShieldCheck className="w-[2.5mm] h-[2.5mm]" />
        {copyLabel.toUpperCase()}
      </span>

      <div className="relative z-10 text-center pt-[1mm] pb-[2mm]">
        <CrestLogo className="w-[15mm] h-[15mm] mx-auto mb-[1mm]" />
        <p className="font-serif text-[12px] font-bold text-gray-900 leading-tight">{SCHOOL_NAME}</p>
        <p className="text-[7px] text-gray-400 mt-[0.5mm] flex items-center justify-center gap-[2mm]">
          <span className="w-[5mm] h-px bg-amber-200" />{SCHOOL_ADDRESS.split(',')[0]}<span className="w-[5mm] h-px bg-amber-200" />
        </p>
        <p className="text-[9px] font-bold text-emerald-600 mt-[1mm]">Fee Receipt</p>
      </div>

      <div className="relative z-10 flex-1 flex flex-col justify-center gap-[2.5mm]">
        <div className="bg-gray-50 rounded-[2mm] px-[3mm] py-[1.5mm] flex items-center gap-[3mm]">
          <div className="flex items-center gap-[2mm] flex-1">
            <p className="text-[6px] text-gray-400">Bill No.</p>
            <p className="font-bold text-gray-900 text-[7.5px]">{receiptNumber || '—'}</p>
          </div>
          <div className="w-px h-[4mm] bg-gray-200" />
          <div className="flex items-center gap-[2mm] flex-1">
            <p className="text-[6px] text-gray-400">Date</p>
            <p className="font-bold text-gray-900 text-[7.5px]">{dateLabel}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-[6mm]">
          <ClassicPrintRow icon={User} label="Student Name" value={context.studentName} />
          <ClassicPrintRow icon={GraduationCap} label="Class" value={context.class} />
          <ClassicPrintRow icon={User} label="Father's Name" value={context.fatherName || '—'} />
          <ClassicPrintRow icon={FolderKanban} label="Section" value={context.section} />
          <ClassicPrintRow icon={CreditCard} label="Payment Mode" value={<span className="capitalize">{paymentMode}</span>} />
        </div>

        <div className="bg-gray-50 rounded-[2mm] px-[3mm] py-[1.5mm]">
          {lineItems.map((li, i) => (
            <div key={i} className="flex items-center justify-between text-[7px] text-gray-600 py-[0.5mm]">
              <span>{li.label}</span>
              <span className="font-semibold text-gray-800">{fmt(li.amount)}</span>
            </div>
          ))}
          <div className="flex items-center justify-between bg-emerald-50 rounded-[1.5mm] px-[2.5mm] py-[1mm] mt-[1mm]">
            <span className="font-bold text-emerald-700 text-[7px]">Amount Paid</span>
            <span className="font-bold text-emerald-700 text-[9px]">{fmt(total)}</span>
          </div>
        </div>
      </div>

      <div className="relative z-10 flex items-end justify-between pt-[2mm] mt-[1mm] border-t border-dashed border-gray-200 gap-[4mm]">
        <div className="text-center flex-1">
          <div className="h-[3mm]" />
          <p className="text-[6px] text-gray-400 border-t border-gray-300 pt-[1mm]">Student/Guardian Signature</p>
        </div>
        <StampSeal className="w-[13mm] h-[13mm] shrink-0" />
        <div className="text-center flex-1">
          <div className="h-[3mm]" />
          <p className="text-[6px] text-gray-400 border-t border-gray-300 pt-[1mm]">Accountant Stamp/Signature</p>
        </div>
      </div>
    </div>
  );
}

type ReceiptTemplate = 'modern' | 'classic';
const RECEIPT_TEMPLATE_KEY = 'schoolos.receiptTemplate';

function SuccessStep({
  context, lineItems, total, paymentMode, receiptNumber, onDone,
}: {
  context: CollectContext; lineItems: ReceiptLineItem[]; total: number;
  paymentMode: string; receiptNumber?: string; onDone: () => void;
}) {
  const { mutateAsync: sendEmail, isPending: sending, error, isSuccess } = useSendReceiptEmail();
  const { mutateAsync: updateStudent } = useUpdateStudent(context.studentId ?? '');
  const [email, setEmail] = useState(context.email ?? '');
  const paymentDate = new Date().toISOString().slice(0, 10);

  // Remembered per-browser so the accountant doesn't have to re-pick it every time.
  const [template, setTemplate] = useState<ReceiptTemplate>(() => {
    const saved = localStorage.getItem(RECEIPT_TEMPLATE_KEY);
    return saved === 'classic' || saved === 'modern' ? saved : 'modern';
  });
  useEffect(() => {
    localStorage.setItem(RECEIPT_TEMPLATE_KEY, template);
  }, [template]);

  async function handleSendEmail() {
    const toEmail = email.trim();
    if (!toEmail) return;
    await sendEmail({
      toEmail,
      studentName: context.studentName,
      class: context.class,
      section: context.section,
      feeDescription: lineItems.map((l) => l.label).join(', '),
      amount: total,
      paymentDate,
    });
    // Remember this email on the student record for future receipts, until changed again.
    if (context.studentId && toEmail !== context.email) {
      updateStudent({ email: toEmail }).catch(() => {});
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center px-6 text-center py-10">
      {/*
        The receipt printer's actual paper is a small landscape sheet — 8.5in x
        5.5in (216mm x 140mm) — NOT a full A4 page, and it holds exactly one
        copy per physical sheet. So we no longer split one big page into two
        halves with a cut-line; each copy just gets its own page at the
        printer's native size, centered on it. `@page` stays OUTSIDE
        `@media print` — nesting it inside the media block is unreliable
        across browsers.
      */}
      <style>{`
        @page { size: 216mm 140mm; margin: 6mm; }
        @media print {
          body * { visibility: hidden; }
          #receipt-print-area, #receipt-print-area * { visibility: visible; }
          #receipt-print-area { position: absolute; top: 0; left: 0; width: 100%; height: 100%; }
          #receipt-print-area .print-page {
            width: 100%; height: 100%;
            display: flex; align-items: center; justify-content: center;
            page-break-after: always;
          }
          #receipt-print-area .print-page:last-child { page-break-after: auto; }
        }
      `}</style>

      <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mb-5 print:hidden">
        <CheckCircle2 className="w-10 h-10 text-emerald-600" />
      </div>
      <h2 className="text-2xl font-bold text-gray-900 print:hidden">Payment Collected!</h2>

      {/* Template toggle — remembered in this browser via localStorage */}
      <div className="print:hidden inline-flex items-center gap-1 bg-gray-100 rounded-full p-1 mt-4">
        <button
          type="button"
          onClick={() => setTemplate('modern')}
          className={`px-4 h-8 rounded-full text-xs font-semibold transition-colors ${template === 'modern' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Modern
        </button>
        <button
          type="button"
          onClick={() => setTemplate('classic')}
          className={`px-4 h-8 rounded-full text-xs font-semibold transition-colors ${template === 'classic' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Classic
        </button>
      </div>

      <div className={`print:hidden w-full mt-5 ${template === 'classic' ? 'max-w-xl' : 'max-w-4xl'}`}>
        {template === 'classic' ? (
          <ClassicReceiptCopy context={context} lineItems={lineItems} total={total} paymentMode={paymentMode} receiptNumber={receiptNumber} copyLabel="School Copy" />
        ) : (
          <ReceiptCopy context={context} lineItems={lineItems} total={total} paymentMode={paymentMode} receiptNumber={receiptNumber} copyLabel="School Copy" />
        )}
      </div>

      {/* Two identical copies, only rendered for print — each on its own page, sized to the printer's native 216mm x 140mm paper. */}
      <div id="receipt-print-area" className="hidden print:block">
        {template === 'classic' ? (
          <>
            <div className="print-page">
              <ClassicPrintCopy context={context} lineItems={lineItems} total={total} paymentMode={paymentMode} receiptNumber={receiptNumber} copyLabel="Student / Parent Copy" />
            </div>
            <div className="print-page">
              <ClassicPrintCopy context={context} lineItems={lineItems} total={total} paymentMode={paymentMode} receiptNumber={receiptNumber} copyLabel="School Copy" />
            </div>
          </>
        ) : (
          <>
            <div className="print-page">
              <PrintReceiptCopy context={context} lineItems={lineItems} total={total} paymentMode={paymentMode} receiptNumber={receiptNumber} copyLabel="Student / Parent Copy" />
            </div>
            <div className="print-page">
              <PrintReceiptCopy context={context} lineItems={lineItems} total={total} paymentMode={paymentMode} receiptNumber={receiptNumber} copyLabel="School Copy" />
            </div>
          </>
        )}
      </div>

      <div className="flex flex-col gap-3 mt-6 w-full max-w-4xl print:hidden">
        <div className="flex gap-3">
          <button
            onClick={() => window.print()}
            className="flex-1 h-12 bg-emerald-700 text-white font-semibold rounded-xl text-sm hover:bg-emerald-800 transition-colors flex items-center justify-center gap-2"
          >
            <Printer className="w-4 h-4" /> Print / Save Receipt (2 copies)
          </button>
          <button
            onClick={() => window.print()}
            className="h-12 px-5 bg-white border border-gray-200 text-gray-700 font-semibold rounded-xl text-sm hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" /> Download PDF
          </button>
        </div>

        {/* Email receipt */}
        <div className="bg-white border border-gray-200 rounded-xl p-3.5">
          <label className="text-xs font-semibold text-gray-500 mb-1.5 flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> Email Receipt</label>
          <div className="flex gap-2">
            <input
              type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="parent@email.com"
              className="flex-1 h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#10B981]/30"
            />
            <button
              onClick={handleSendEmail}
              disabled={!email.trim() || sending}
              className="h-10 px-3.5 bg-gray-800 hover:bg-gray-900 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shrink-0"
            >
              {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Send'}
            </button>
          </div>
          {isSuccess ? (
            <p className="text-xs text-emerald-600 mt-1.5">Receipt sent — this email is now saved on the student's record.</p>
          ) : context.email ? (
            <p className="text-xs text-gray-400 mt-1.5">Pre-filled from the student's saved email. Change it to update.</p>
          ) : null}
          {error && <p className="text-xs text-red-500 mt-1.5">{error instanceof Error ? error.message : 'Failed to send'}</p>}
        </div>

        <button
          onClick={onDone}
          className="h-12 bg-white border border-gray-200 text-gray-700 font-semibold rounded-xl text-sm hover:bg-gray-50 transition-colors"
        >
          Collect Another Payment
        </button>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function FeeCollectionPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectStudentId = searchParams.get('studentId');

  const [student, setStudent] = useState<Student | null>(null);
  const [payingFee, setPayingFee] = useState<FeeRecord | null>(null);
  const [success, setSuccess] = useState<SuccessState | null>(null);

  const { data: preselected } = useStudentsPaginated(
    preselectStudentId ? { search: preselectStudentId, limit: 1 } : {},
  );
  useEffect(() => {
    if (preselectStudentId && !student && preselected?.data.length) {
      const match = preselected.data.find((s) => s._id === preselectStudentId);
      if (match) setStudent(match);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preselectStudentId, preselected]);

  if (success) {
    return (
      <SuccessStep
        context={success.context}
        lineItems={success.lineItems}
        total={success.total}
        paymentMode={success.paymentMode}
        receiptNumber={success.receiptNumber}
        onDone={() => { setSuccess(null); setStudent(null); }}
      />
    );
  }

  const activeContext = student ? studentToContext(student) : null;

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="bg-white border-b border-gray-100 px-4 py-4 flex items-center gap-3 print:hidden">
        <button
          type="button"
          onClick={() => navigate('/accountant')}
          className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <h1 className="text-base font-bold text-gray-900">Collect Fee</h1>
      </div>

      {student ? (
        <StudentDetailCard
          student={student}
          onBack={() => setStudent(null)}
          onSelectFee={setPayingFee}
          onBulkSuccess={(batchId, lineItems, total, paymentMode) => {
            if (!activeContext) return;
            setSuccess({ context: activeContext, lineItems, total, paymentMode, receiptNumber: batchId });
          }}
        />
      ) : (
        <StudentSearchPanel onSelectStudent={setStudent} />
      )}

      {payingFee && activeContext && (
        <CollectPaymentModal
          fee={payingFee}
          onClose={() => setPayingFee(null)}
          onSuccess={(payment) => {
            setSuccess({
              context: activeContext,
              lineItems: [{ label: payingFee.description || payingFee.feeHead, amount: payment.amount }],
              total: payment.amount,
              paymentMode: payment.paymentMode,
              receiptNumber: payment.receiptNumber,
            });
            setPayingFee(null);
          }}
        />
      )}
    </div>
  );
}
