import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, Search, CheckCircle2, Printer, IndianRupee, Mail, Loader2, Plus,
} from 'lucide-react';
import { useStudentsPaginated, useUpdateStudent } from '@/features/students/hooks/useStudents';
import { useStudentFees } from '@/features/fees/hooks/useFees';
import { CollectPaymentModal } from '../components/CollectPaymentModal';
import { AddFeeModal } from '../components/AddFeeModal';
import { useSendReceiptEmail } from '../hooks/useAccountantWorkspace';
import { FeeStatusBadge } from '@/features/fees/components/FeeStatusBadge';
import type { FeeRecord, Student } from '@schoolos/types';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

const SCHOOL_NAME = 'Florence Nightingale Inter College';
const SCHOOL_ADDRESS = 'Triveni Nagar'; // Edit with the full postal address as needed.

interface CollectContext {
  studentId?: string;
  studentName: string;
  class: string;
  section: string;
  fatherName?: string;
  parentPhone?: string;
  email?: string;
}

// ── Single search bar + default student list ──────────────────────────────────

function StudentSearchPanel({ onSelectStudent }: { onSelectStudent: (s: Student) => void }) {
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  // No query yet → show the existing student list so the accountant isn't staring at a blank screen.
  const { data: results, isLoading } = useStudentsPaginated({
    search: debounced || undefined, status: 'active', limit: 15,
  });

  // Narrow-down filters — only shown once the name search returns more than one match.
  const [narrowClass, setNarrowClass] = useState('');
  const [narrowFather, setNarrowFather] = useState('');
  useEffect(() => { setNarrowClass(''); setNarrowFather(''); }, [debounced]);

  const matches = results?.data ?? [];
  const hasCollision = debounced.length > 0 && matches.length > 1;
  const narrowedMatches = useMemo(() => {
    if (!hasCollision) return matches;
    return matches.filter((s) => {
      const cls = `${s.class}${s.section}`.toLowerCase();
      if (narrowClass && !cls.includes(narrowClass.toLowerCase())) return false;
      if (narrowFather && !(s.fatherName ?? '').toLowerCase().includes(narrowFather.toLowerCase())) return false;
      return true;
    });
  }, [matches, hasCollision, narrowClass, narrowFather]);

  return (
    <div className="px-4 py-5 max-w-lg mx-auto">
      <div className="relative mb-4">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text" autoFocus value={query} onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, admission number, or roll no."
          className="w-full h-12 pl-10 pr-4 rounded-xl border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#5B5CEB]/30 focus:border-[#5B5CEB]"
        />
      </div>

      {hasCollision && (
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 mb-3">
          <p className="text-xs font-semibold text-amber-700 mb-2">
            {matches.length} students match "{debounced}" — narrow down by:
          </p>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text" value={narrowClass} onChange={(e) => setNarrowClass(e.target.value)}
              placeholder="Class"
              className="h-9 px-2.5 rounded-lg border border-amber-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-amber-300"
            />
            <input
              type="text" value={narrowFather} onChange={(e) => setNarrowFather(e.target.value)}
              placeholder="Father's Name"
              className="h-9 px-2.5 rounded-lg border border-amber-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-amber-300"
            />
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-16 bg-white rounded-xl border border-gray-100 animate-pulse" />)}</div>
      ) : !narrowedMatches.length ? (
        <div className="text-center py-16 text-sm text-gray-400">
          {debounced ? 'No students found' : 'No students to show'}
        </div>
      ) : (
        <div className="space-y-2">
          {narrowedMatches.map((s) => (
            <StudentRow key={s._id} student={s} onClick={() => onSelectStudent(s)} showFatherName={hasCollision} />
          ))}
        </div>
      )}
    </div>
  );
}

function StudentRow({ student, onClick, showFatherName }: { student: Student; onClick: () => void; showFatherName?: boolean }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 bg-white rounded-xl border border-gray-200 shadow-sm px-4 py-3 hover:border-[#5B5CEB]/40 hover:shadow-md transition-all text-left"
    >
      <div className="w-10 h-10 rounded-full bg-[#5B5CEB]/10 flex items-center justify-center text-[#5B5CEB] font-bold text-sm shrink-0">
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

// ── Green detail card + Monthly Fees Record ────────────────────────────────────

function StudentDetailCard({
  student, onBack, onSelectFee,
}: {
  student: Student; onBack: () => void; onSelectFee: (fee: FeeRecord) => void;
}) {
  const { data: fees, isLoading } = useStudentFees(student._id);
  const [addFeeOpen, setAddFeeOpen] = useState(false);

  const unpaid = useMemo(() => {
    const list = fees ?? [];
    return [...list]
      .filter((f) => f.status !== 'paid' && f.status !== 'waived')
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }, [fees]);

  const current = unpaid[0];

  return (
    <div className="px-4 py-5 max-w-lg mx-auto space-y-4">
      <button onClick={onBack} className="text-xs font-semibold text-[#5B5CEB] flex items-center gap-1 hover:underline">
        <ArrowLeft className="w-3.5 h-3.5" /> Search another student
      </button>

      {/* Green detail tab */}
      <div className="bg-emerald-50 rounded-2xl border border-emerald-200 shadow-sm p-5">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-emerald-500/15 flex items-center justify-center text-emerald-700 font-bold text-lg shrink-0">
            {student.fullName.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-bold text-gray-900 truncate">{student.fullName}</p>
            <p className="text-sm text-gray-600">{student.admissionNumber}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 mt-4 pt-4 border-t border-emerald-100 text-sm">
          <div><p className="text-xs text-gray-500">Father's Name</p><p className="font-semibold text-gray-800">{student.fatherName || '—'}</p></div>
          <div><p className="text-xs text-gray-500">Class</p><p className="font-semibold text-gray-800">{student.class}</p></div>
          <div><p className="text-xs text-gray-500">Section</p><p className="font-semibold text-gray-800">{student.section}</p></div>
          <div>
            <p className="text-xs text-gray-500">Month of Fee Submission</p>
            <p className="font-semibold text-gray-800">
              {current ? (current.month || new Date(current.dueDate).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })) : '—'}
            </p>
          </div>
          <div className="col-span-2">
            <p className="text-xs text-gray-500">Fees Amount</p>
            <p className="font-bold text-gray-900 text-base">{current ? fmt(current.totalAmount) : '—'}</p>
          </div>
        </div>
      </div>

      {/* Monthly Fees Record — includes current + any pending (past) fees */}
      <div>
        <div className="flex items-center justify-between mb-2 px-1">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Monthly Fees Record</h3>
          <button
            onClick={() => setAddFeeOpen(true)}
            className="text-xs font-semibold text-[#5B5CEB] hover:underline flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> Add Fee
          </button>
        </div>
        {isLoading ? (
          <div className="space-y-2">{Array.from({ length: 2 }).map((_, i) => <div key={i} className="h-20 bg-white rounded-xl border border-gray-100 animate-pulse" />)}</div>
        ) : !unpaid.length ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
            <p className="text-sm font-semibold text-gray-700">No pending fees</p>
            <p className="text-xs text-gray-400 mt-1 mb-4">Assign this month's fee to start collecting.</p>
            <button
              onClick={() => setAddFeeOpen(true)}
              className="h-10 px-4 bg-[#5B5CEB] hover:bg-[#4a4bd9] text-white rounded-xl text-sm font-semibold inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Assign New Fee
            </button>
          </div>
        ) : (
          <div className="space-y-2">
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
                  className="h-9 px-3 bg-[#5B5CEB] hover:bg-[#4a4bd9] text-white rounded-lg text-xs font-semibold shrink-0 flex items-center gap-1.5"
                >
                  <IndianRupee className="w-3.5 h-3.5" /> Collect
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {addFeeOpen && (
        <AddFeeModal
          studentId={student._id}
          onClose={() => setAddFeeOpen(false)}
          onCreated={(fee) => { setAddFeeOpen(false); onSelectFee(fee); }}
        />
      )}
    </div>
  );
}

// ── Receipt ────────────────────────────────────────────────────────────────────

function ReceiptRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between text-sm py-1">
      <span className="text-gray-500">{label}</span>
      <span className="font-semibold text-gray-900 text-right">{value}</span>
    </div>
  );
}

function SuccessStep({
  context, fee, amount, paymentMode, receiptNumber, onDone,
}: {
  context: CollectContext; fee: FeeRecord; amount: number;
  paymentMode: string; receiptNumber?: string; onDone: () => void;
}) {
  const { mutateAsync: sendEmail, isPending: sending, error, isSuccess } = useSendReceiptEmail();
  const { mutateAsync: updateStudent } = useUpdateStudent(context.studentId ?? '');
  const [email, setEmail] = useState(context.email ?? '');
  const paymentDate = new Date().toISOString().slice(0, 10);

  async function handleSendEmail() {
    const toEmail = email.trim();
    if (!toEmail) return;
    await sendEmail({
      toEmail,
      studentName: context.studentName,
      class: context.class,
      section: context.section,
      feeDescription: fee.description || fee.feeHead,
      amount,
      paymentDate,
    });
    // Remember this email on the student record for future receipts, until changed again.
    if (context.studentId && toEmail !== context.email) {
      updateStudent({ email: toEmail }).catch(() => {});
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center py-10">
      <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mb-5 print:hidden">
        <CheckCircle2 className="w-10 h-10 text-emerald-600" />
      </div>
      <h2 className="text-2xl font-bold text-gray-900 print:hidden">Payment Collected!</h2>

      {/* Printable receipt — no input boxes, plain fields only */}
      <div id="receipt-print-area" className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mt-5 w-full max-w-sm text-left">
        <div className="text-center pb-3 border-b border-gray-200">
          <p className="text-base font-bold text-gray-900">{SCHOOL_NAME}</p>
          <p className="text-xs text-gray-500 mt-0.5">{SCHOOL_ADDRESS}</p>
          <p className="text-xs font-semibold text-gray-700 mt-2">Fee Receipt</p>
        </div>

        <div className="flex justify-between text-xs text-gray-500 mt-3">
          <span>Bill No: <span className="font-semibold text-gray-800">{receiptNumber || '—'}</span></span>
          <span>{new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
        </div>

        <div className="mt-3 pt-3 border-t border-gray-100">
          <ReceiptRow label="Student Name" value={context.studentName} />
          <ReceiptRow label="Father's Name" value={context.fatherName || '—'} />
          <ReceiptRow label="Class" value={context.class} />
          <ReceiptRow label="Section" value={context.section} />
          <ReceiptRow label="Fee" value={fee.description || fee.feeHead} />
          <ReceiptRow label="Payment Mode" value={<span className="capitalize">{paymentMode}</span>} />
        </div>

        <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-200">
          <span className="font-bold text-gray-900 text-base">Amount Paid</span>
          <span className="font-bold text-emerald-600 text-base">{fmt(amount)}</span>
        </div>

        <div className="flex justify-between items-end mt-10 pt-3">
          <div className="text-center">
            <div className="w-32 border-t border-gray-400 pt-1">
              <p className="text-[11px] text-gray-500">Student/Guardian Signature</p>
            </div>
          </div>
          <div className="text-center">
            <div className="w-32 border-t border-gray-400 pt-1">
              <p className="text-[11px] text-gray-500">Accountant Stamp/Signature</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 mt-6 w-full max-w-sm print:hidden">
        <button
          onClick={() => window.print()}
          className="h-12 bg-[#5B5CEB] text-white font-semibold rounded-xl text-sm hover:bg-[#4a4bd9] transition-colors flex items-center justify-center gap-2"
        >
          <Printer className="w-4 h-4" /> Print / Save Receipt
        </button>

        {/* Email receipt */}
        <div className="bg-white border border-gray-200 rounded-xl p-3.5">
          <label className="text-xs font-semibold text-gray-500 mb-1.5 flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> Email Receipt</label>
          <div className="flex gap-2">
            <input
              type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="parent@email.com"
              className="flex-1 h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#5B5CEB]/30"
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
  const [success, setSuccess] = useState<{
    context: CollectContext; fee: FeeRecord; amount: number; paymentMode: string; receiptNumber?: string;
  } | null>(null);

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

  function studentToContext(s: Student): CollectContext {
    return {
      studentId: s._id, studentName: s.fullName, class: s.class, section: s.section,
      fatherName: s.fatherName, parentPhone: s.parentPhone, email: s.email,
    };
  }

  if (success) {
    return (
      <SuccessStep
        context={success.context}
        fee={success.fee}
        amount={success.amount}
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
        <StudentDetailCard student={student} onBack={() => setStudent(null)} onSelectFee={setPayingFee} />
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
              fee: payingFee,
              amount: payment.amount,
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
