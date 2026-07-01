import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, Search, User2, Phone, CheckCircle2, Printer, IndianRupee, ChevronDown, Mail, Loader2, Plus,
} from 'lucide-react';
import { useStudentsPaginated, useUpdateStudent } from '@/features/students/hooks/useStudents';
import { useStudentFees, useFeeList } from '@/features/fees/hooks/useFees';
import { CollectPaymentModal } from '../components/CollectPaymentModal';
import { AddFeeModal } from '../components/AddFeeModal';
import { useSendReceiptEmail } from '../hooks/useAccountantWorkspace';
import { FeeStatusBadge } from '@/features/fees/components/FeeStatusBadge';
import type { FeeRecord, FeeHead, Student } from '@schoolos/types';
import { cn } from '@/lib/utils';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

const FEE_HEADS: { value: FeeHead; label: string }[] = [
  { value: 'tuition',       label: 'Tuition Fee' },
  { value: 'admission',     label: 'Admission Fee' },
  { value: 'examination',   label: 'Examination Fee' },
  { value: 'transport',     label: 'Transport Fee' },
  { value: 'hostel',        label: 'Hostel Fee' },
  { value: 'miscellaneous', label: 'Miscellaneous' },
];

interface CollectContext {
  studentId?: string;
  studentName: string;
  class: string;
  section: string;
  fatherName?: string;
  parentPhone?: string;
  email?: string;
}

type SearchTab = 'name' | 'class' | 'feeType';

// ── Tabbed search step ────────────────────────────────────────────────────────

function SearchStep({
  onSelectStudent, onSelectFee,
}: {
  onSelectStudent: (s: Student) => void;
  onSelectFee: (fee: FeeRecord) => void;
}) {
  const [tab, setTab] = useState<SearchTab>('name');

  // Name search
  const [nameQuery, setNameQuery] = useState('');
  const [debouncedName, setDebouncedName] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebouncedName(nameQuery.trim()), 300);
    return () => clearTimeout(t);
  }, [nameQuery]);
  const { data: nameResults, isLoading: nameLoading } = useStudentsPaginated({
    search: debouncedName || undefined, status: 'active', limit: 15,
  });

  // Narrow-down filters — only shown once the name search returns more than one match
  const [narrowClass, setNarrowClass] = useState('');
  const [narrowFather, setNarrowFather] = useState('');
  const [narrowAdmission, setNarrowAdmission] = useState('');
  useEffect(() => { setNarrowClass(''); setNarrowFather(''); setNarrowAdmission(''); }, [debouncedName]);

  const nameMatches = nameResults?.data ?? [];
  const hasNameCollision = nameMatches.length > 1;
  const narrowedNameMatches = useMemo(() => {
    if (!hasNameCollision) return nameMatches;
    return nameMatches.filter((s) => {
      const cls = `${s.class}${s.section}`.toLowerCase();
      if (narrowClass && !cls.includes(narrowClass.toLowerCase())) return false;
      if (narrowFather && !(s.fatherName ?? '').toLowerCase().includes(narrowFather.toLowerCase())) return false;
      if (narrowAdmission && !(s.admissionNumber ?? '').toLowerCase().includes(narrowAdmission.toLowerCase())) return false;
      return true;
    });
  }, [nameMatches, hasNameCollision, narrowClass, narrowFather, narrowAdmission]);

  // Class + Section search
  const [cls, setCls] = useState('');
  const [section, setSection] = useState('');
  const { data: classResults, isLoading: classLoading } = useStudentsPaginated({
    class: cls || undefined, section: section || undefined, status: 'active', limit: 30,
  });

  // Fee type search
  const [feeHead, setFeeHead] = useState<FeeHead>('tuition');
  const { data: feeTypeResults, isLoading: feeTypeLoading } = useFeeList({
    feeHead, limit: 50, sortBy: 'dueDate', sortOrder: 'asc',
  });
  const pendingByFeeType = useMemo(
    () => (feeTypeResults?.data ?? []).filter((f) => f.status !== 'paid' && f.status !== 'waived'),
    [feeTypeResults],
  );

  return (
    <div className="px-4 py-5 max-w-lg mx-auto">
      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {([
          { id: 'name', label: 'Student Name' },
          { id: 'class', label: 'Class & Section' },
          { id: 'feeType', label: 'Fee Type' },
        ] as const).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'flex-1 h-10 rounded-xl text-xs font-semibold transition-colors',
              tab === t.id ? 'bg-[#5B5CEB] text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab: Name */}
      {tab === 'name' && (
        <>
          <div className="relative mb-4">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text" autoFocus value={nameQuery} onChange={(e) => setNameQuery(e.target.value)}
              placeholder="Search by name, admission number, or roll no."
              className="w-full h-12 pl-10 pr-4 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#5B5CEB]/30 focus:border-[#5B5CEB]"
            />
          </div>
          {nameLoading ? (
            <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-16 bg-white rounded-xl border border-gray-100 animate-pulse" />)}</div>
          ) : !nameMatches.length ? (
            <div className="text-center py-16 text-sm text-gray-400">{debouncedName ? 'No students found' : 'Start typing to search for a student'}</div>
          ) : (
            <>
              {hasNameCollision && (
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 mb-3">
                  <p className="text-xs font-semibold text-amber-700 mb-2">
                    {nameMatches.length} students match "{debouncedName}" — narrow down by:
                  </p>
                  <div className="grid grid-cols-3 gap-2">
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
                    <input
                      type="text" value={narrowAdmission} onChange={(e) => setNarrowAdmission(e.target.value)}
                      placeholder="Roll / Adm. No."
                      className="h-9 px-2.5 rounded-lg border border-amber-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-amber-300"
                    />
                  </div>
                </div>
              )}
              {!narrowedNameMatches.length ? (
                <div className="text-center py-8 text-sm text-gray-400">No match for those details</div>
              ) : (
                <div className="space-y-2">
                  {narrowedNameMatches.map((s) => (
                    <StudentRow key={s._id} student={s} onClick={() => onSelectStudent(s)} showFatherName={hasNameCollision} />
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Tab: Class & Section */}
      {tab === 'class' && (
        <>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <input type="text" autoFocus value={cls} onChange={(e) => setCls(e.target.value)} placeholder="Class (e.g. 6)"
              className="h-12 px-4 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#5B5CEB]/30 focus:border-[#5B5CEB]" />
            <input type="text" value={section} onChange={(e) => setSection(e.target.value.toUpperCase())} maxLength={2} placeholder="Section (e.g. A)"
              className="h-12 px-4 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#5B5CEB]/30 focus:border-[#5B5CEB]" />
          </div>
          {!cls ? (
            <div className="text-center py-16 text-sm text-gray-400">Enter a class to see students</div>
          ) : classLoading ? (
            <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-16 bg-white rounded-xl border border-gray-100 animate-pulse" />)}</div>
          ) : !classResults?.data.length ? (
            <div className="text-center py-16 text-sm text-gray-400">No students found in this class</div>
          ) : (
            <div className="space-y-2">
              {classResults.data.map((s) => <StudentRow key={s._id} student={s} onClick={() => onSelectStudent(s)} />)}
            </div>
          )}
        </>
      )}

      {/* Tab: Fee Type */}
      {tab === 'feeType' && (
        <>
          <div className="relative mb-4">
            <select
              value={feeHead} onChange={(e) => setFeeHead(e.target.value as FeeHead)}
              className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#5B5CEB]/30 appearance-none pr-10"
            >
              {FEE_HEADS.map((h) => <option key={h.value} value={h.value}>{h.label}</option>)}
            </select>
            <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
          <p className="text-xs text-gray-400 mb-3 px-1">Students with pending {FEE_HEADS.find((h) => h.value === feeHead)?.label}</p>
          {feeTypeLoading ? (
            <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-16 bg-white rounded-xl border border-gray-100 animate-pulse" />)}</div>
          ) : !pendingByFeeType.length ? (
            <div className="text-center py-16 text-sm text-gray-400">No pending fees of this type</div>
          ) : (
            <div className="space-y-2">
              {pendingByFeeType.map((f) => (
                <button
                  key={f._id}
                  onClick={() => onSelectFee(f)}
                  className="w-full flex items-center gap-3 bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 hover:border-[#5B5CEB]/30 hover:shadow-md transition-all text-left"
                >
                  <div className="w-10 h-10 rounded-full bg-[#5B5CEB]/10 flex items-center justify-center text-[#5B5CEB] font-bold text-sm shrink-0">
                    {f.studentName.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{f.studentName}</p>
                    <p className="text-xs text-gray-400">Class {f.class}-{f.section} · Due {new Date(f.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
                  </div>
                  <p className="text-sm font-bold text-amber-600 shrink-0">{fmt(f.balance)}</p>
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function StudentRow({ student, onClick, showFatherName }: { student: Student; onClick: () => void; showFatherName?: boolean }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 hover:border-[#5B5CEB]/30 hover:shadow-md transition-all text-left"
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

// ── Student fee summary + collection step ─────────────────────────────────────

function StudentFeeStep({
  student, onBack, onSelectFee,
}: {
  student: Student; onBack: () => void; onSelectFee: (fee: FeeRecord) => void;
}) {
  const { data: fees, isLoading } = useStudentFees(student._id);
  const [addFeeOpen, setAddFeeOpen] = useState(false);

  const { totalCharged, totalPaid, totalBalance, unpaid } = useMemo(() => {
    const list = fees ?? [];
    const unpaidList = list.filter((f) => f.status !== 'paid' && f.status !== 'waived');
    return {
      totalCharged: list.reduce((s, f) => s + f.totalAmount, 0),
      totalPaid:    list.reduce((s, f) => s + f.paidAmount, 0),
      totalBalance: list.reduce((s, f) => s + f.balance, 0),
      unpaid: unpaidList,
    };
  }, [fees]);

  return (
    <div className="px-4 py-5 max-w-lg mx-auto space-y-4">
      <button onClick={onBack} className="text-xs font-semibold text-[#5B5CEB] flex items-center gap-1 hover:underline">
        <ArrowLeft className="w-3.5 h-3.5" /> Search another student
      </button>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-[#5B5CEB]/10 flex items-center justify-center text-[#5B5CEB] font-bold text-lg shrink-0">
            {student.fullName.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-bold text-gray-900 truncate">{student.fullName}</p>
            <p className="text-sm text-gray-500">Class {student.class}-{student.section} · {student.admissionNumber}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-50 text-xs text-gray-500">
          <span className="flex items-center gap-1.5"><User2 className="w-3.5 h-3.5" /> {student.fatherName || '—'}</span>
          <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> {student.parentPhone || '—'}</span>
        </div>

        <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-gray-50">
          <div className="text-center"><p className="text-xs text-gray-400">Total Fee</p><p className="text-sm font-bold text-gray-800">{fmt(totalCharged)}</p></div>
          <div className="text-center"><p className="text-xs text-gray-400">Paid</p><p className="text-sm font-bold text-emerald-600">{fmt(totalPaid)}</p></div>
          <div className="text-center"><p className="text-xs text-gray-400">Pending</p><p className="text-sm font-bold text-amber-600">{fmt(totalBalance)}</p></div>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2 px-1">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Pending Fee Records</h3>
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
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
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
              <div key={fee._id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900 truncate">{fee.description || fee.feeHead}</p>
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

// ── Success screen ────────────────────────────────────────────────────────────

function SuccessStep({
  context, fee, amount, onDone,
}: {
  context: CollectContext; fee: FeeRecord; amount: number; onDone: () => void;
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
      <h2 className="text-2xl font-bold text-gray-900">Payment Collected!</h2>

      <div id="receipt-print-area" className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mt-5 w-full max-w-sm text-left">
        <p className="text-xs text-gray-400 uppercase tracking-widest font-bold mb-3">Receipt</p>
        <div className="flex justify-between text-sm mb-1.5"><span className="text-gray-500">Student</span><span className="font-semibold text-gray-800">{context.studentName}</span></div>
        <div className="flex justify-between text-sm mb-1.5"><span className="text-gray-500">Class</span><span className="font-semibold text-gray-800">{context.class}-{context.section}</span></div>
        <div className="flex justify-between text-sm mb-1.5"><span className="text-gray-500">Fee</span><span className="font-semibold text-gray-800">{fee.description || fee.feeHead}</span></div>
        <div className="flex justify-between text-sm mb-1.5"><span className="text-gray-500">Date</span><span className="font-semibold text-gray-800">{new Date().toLocaleDateString('en-IN')}</span></div>
        <div className="flex justify-between text-base mt-3 pt-3 border-t border-gray-100">
          <span className="font-bold text-gray-900">Amount Paid</span>
          <span className="font-bold text-emerald-600">{fmt(amount)}</span>
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
  const [directFeeContext, setDirectFeeContext] = useState<CollectContext | null>(null);
  const [payingFee, setPayingFee] = useState<FeeRecord | null>(null);
  const [success, setSuccess] = useState<{ context: CollectContext; fee: FeeRecord; amount: number } | null>(null);

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
        onDone={() => { setSuccess(null); setStudent(null); setDirectFeeContext(null); }}
      />
    );
  }

  const activeContext = student ? studentToContext(student) : directFeeContext;

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
        <StudentFeeStep student={student} onBack={() => setStudent(null)} onSelectFee={setPayingFee} />
      ) : !directFeeContext ? (
        <SearchStep
          onSelectStudent={setStudent}
          onSelectFee={(fee) => {
            setDirectFeeContext({ studentName: fee.studentName, class: fee.class, section: fee.section, studentId: fee.studentId });
            setPayingFee(fee);
          }}
        />
      ) : null}

      {payingFee && activeContext && (
        <CollectPaymentModal
          fee={payingFee}
          onClose={() => { setPayingFee(null); if (!student) setDirectFeeContext(null); }}
          onSuccess={(payment) => {
            setSuccess({ context: activeContext, fee: payingFee, amount: payment.amount });
            setPayingFee(null);
          }}
        />
      )}
    </div>
  );
}
