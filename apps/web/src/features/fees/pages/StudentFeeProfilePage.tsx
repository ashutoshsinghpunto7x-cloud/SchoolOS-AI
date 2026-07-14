import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, PlusCircle, IndianRupee,
  Loader2, AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStudent } from '@/features/students/hooks/useStudents';
import { useStudentFees, useFeeSummary } from '../hooks/useFees';
import { FeeCard } from '../components/FeeCard';
import { PaymentTimeline } from '../components/PaymentTimeline';
import { RecordPaymentModal } from '../components/RecordPaymentModal';
import { PageContainer } from '@/components/workspace/PageContainer';
import { feesApi } from '../api/fees.api';
import { useQuery } from '@tanstack/react-query';
import type { FeeRecord, FeePayment } from '@schoolos/types';

// ── Tabs ──────────────────────────────────────────────────────────────────────

type Tab = 'fees' | 'payments';

const TABS: { id: Tab; label: string }[] = [
  { id: 'fees',     label: 'Fee Records' },
  { id: 'payments', label: 'Payment History' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (amount: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

// ── Page ──────────────────────────────────────────────────────────────────────

export function StudentFeeProfilePage() {
  const { studentId } = useParams<{ studentId: string }>();
  const navigate       = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('fees');
  const [payFee,    setPayFee]    = useState<FeeRecord | null>(null);

  const { data: student, isLoading: studentLoading, isError: studentError } = useStudent(studentId!);
  const { data: feeRecords = [], isLoading: feesLoading } = useStudentFees(studentId!);
  useFeeSummary(); // keep cached summary fresh for the parent fee list

  // Load all payments for this student across all fee records (for history tab)
  const { data: allPayments = [] } = useQuery<FeePayment[]>({
    queryKey: ['fees', 'student-payments', studentId],
    queryFn:  async () => {
      if (!student) return [];
      const allPmt: FeePayment[] = [];
      for (const rec of feeRecords) {
        const detail = await feesApi.getById(rec._id);
        allPmt.push(...detail.payments);
      }
      return allPmt.sort((a, b) =>
        new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()
      );
    },
    enabled: activeTab === 'payments' && feeRecords.length > 0,
  });

  if (studentLoading || feesLoading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      </PageContainer>
    );
  }

  if (studentError || !student) {
    return (
      <PageContainer>
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
          <AlertCircle className="w-10 h-10 text-red-400" />
          <p className="text-gray-600">Student not found.</p>
          <button onClick={() => navigate('/fees')}
            className="h-10 px-5 rounded-xl bg-gray-100 text-sm font-semibold text-gray-700 hover:bg-gray-200">
            Back to Fees
          </button>
        </div>
      </PageContainer>
    );
  }

  // Compute student-level totals from their fee records
  const totalCharged    = feeRecords.reduce((s, r) => s + r.totalAmount, 0);
  const totalPaid       = feeRecords.reduce((s, r) => s + r.paidAmount, 0);
  const totalBalance    = feeRecords.reduce((s, r) => s + r.balance, 0);
  const overdueCount    = feeRecords.filter(
    (r) => (r.status === 'pending' || r.status === 'partially_paid') && new Date(r.dueDate) < new Date()
  ).length;

  const initials = student.fullName.split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase();

  return (
    <PageContainer>
      {/* Back */}
      <button onClick={() => navigate('/fees')}
        className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors mb-6"
        type="button">
        <ArrowLeft className="w-4 h-4" />
        Fee Management
      </button>

      {/* Student header */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-[#5B21B6] flex items-center justify-center flex-shrink-0">
            <span className="text-xl font-bold text-white">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-gray-900">{student.fullName}</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {student.admissionNumber} · Class {student.class}-{student.section}
            </p>
            <p className="text-sm text-gray-400 mt-0.5">{student.parentPhone}</p>
          </div>
          <button
            onClick={() => navigate(`/fees/new?studentId=${student._id}&studentName=${encodeURIComponent(student.fullName)}`)}
            className="h-11 px-5 rounded-xl bg-[#5B21B6] hover:bg-[#4C1D95] flex items-center gap-2 text-sm font-bold text-white transition-colors shrink-0"
            type="button"
          >
            <PlusCircle className="w-4 h-4" />
            Assign Fee
          </button>
        </div>
      </div>

      {/* Fee summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
          <p className="text-xs text-gray-400 mb-1">Total Charged</p>
          <p className="text-lg font-bold text-gray-900">{fmt(totalCharged)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
          <p className="text-xs text-gray-400 mb-1">Total Paid</p>
          <p className="text-lg font-bold text-green-600">{fmt(totalPaid)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
          <p className="text-xs text-gray-400 mb-1">Balance Due</p>
          <p className={`text-lg font-bold ${totalBalance > 0 ? 'text-orange-600' : 'text-gray-400'}`}>
            {fmt(totalBalance)}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
          <p className="text-xs text-gray-400 mb-1">Overdue</p>
          <p className={`text-lg font-bold ${overdueCount > 0 ? 'text-red-600' : 'text-gray-400'}`}>
            {overdueCount} record{overdueCount !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 mb-6 border-b border-gray-100 -mx-1 px-1">
        {TABS.map((tab) => (
          <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)}
            className={cn('h-11 px-5 text-sm font-semibold transition-colors rounded-t-xl',
              activeTab === tab.id
                ? 'text-blue-600 border-b-2 border-blue-600 -mb-px bg-blue-50/50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50')}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Fee Records tab ───────────────────────────────────────────────── */}
      {activeTab === 'fees' && (
        feeRecords.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-gray-400">
            <IndianRupee className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm">No fee records for this student yet.</p>
            <button
              onClick={() => navigate(`/fees/new?studentId=${student._id}&studentName=${encodeURIComponent(student.fullName)}`)}
              className="mt-4 h-10 px-5 rounded-xl bg-[#5B21B6] text-white text-sm font-semibold hover:bg-[#4C1D95]">
              Assign First Fee
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {feeRecords.map((fee) => (
              <FeeCard key={fee._id} fee={fee} onRecordPayment={setPayFee} />
            ))}
          </div>
        )
      )}

      {/* ── Payment History tab ───────────────────────────────────────────── */}
      {activeTab === 'payments' && (
        <PaymentTimeline payments={allPayments} />
      )}

      {/* Record Payment Modal */}
      {payFee && (
        <RecordPaymentModal
          fee={payFee}
          onClose={() => setPayFee(null)}
          onSuccess={() => setPayFee(null)}
        />
      )}
    </PageContainer>
  );
}
