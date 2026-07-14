import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Pencil, IndianRupee, User, Calendar,
  StickyNote, Loader2, AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFeeRecord, useUpdateFeeRecord } from '../hooks/useFees';
import { FeeStatusBadge } from '../components/FeeStatusBadge';
import { PaymentTimeline } from '../components/PaymentTimeline';
import { RecordPaymentModal } from '../components/RecordPaymentModal';
import { PageContainer } from '@/components/workspace/PageContainer';

// ── Tabs ──────────────────────────────────────────────────────────────────────

type Tab = 'overview' | 'payments' | 'notes';

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'payments', label: 'Payments' },
  { id: 'notes',    label: 'Notes' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (amount: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

const fmtDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

const FEE_HEAD_LABEL: Record<string, string> = {
  tuition:     'Tuition Fee',
  admission:   'Admission Fee',
  examination: 'Examination Fee',
  transport:   'Transport Fee',
  hostel:      'Hostel Fee',
  miscellaneous: 'Miscellaneous',
};

// ── Page ──────────────────────────────────────────────────────────────────────

export function FeeRecordDetailPage() {
  const { id }   = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [showPayModal, setShowPayModal] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue]     = useState('');

  const { data, isLoading, isError } = useFeeRecord(id!);
  const { mutateAsync: updateFee, isPending: savingNotes } = useUpdateFeeRecord(id!);

  if (isLoading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      </PageContainer>
    );
  }

  if (isError || !data) {
    return (
      <PageContainer>
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
          <AlertCircle className="w-10 h-10 text-red-400" />
          <p className="text-gray-600">Fee record not found.</p>
          <button onClick={() => navigate('/fees')}
            className="h-10 px-5 rounded-xl bg-gray-100 text-sm font-semibold text-gray-700 hover:bg-gray-200">
            Back to Fees
          </button>
        </div>
      </PageContainer>
    );
  }

  const { record, payments } = data;
  const isOverdue = (record.status === 'pending' || record.status === 'partially_paid') &&
    new Date(record.dueDate) < new Date();
  const canPay = record.status !== 'paid' && record.status !== 'waived';

  async function saveNotes() {
    await updateFee({ notes: notesValue });
    setEditingNotes(false);
  }

  return (
    <PageContainer>
      {/* Back */}
      <button onClick={() => navigate('/fees')}
        className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors mb-6"
        type="button">
        <ArrowLeft className="w-4 h-4" />
        Fee Management
      </button>

      {/* Header card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start gap-5">
          <div className="w-14 h-14 rounded-2xl bg-blue-100 flex items-center justify-center flex-shrink-0">
            <IndianRupee className="w-7 h-7 text-blue-600" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-start gap-3">
              <h1 className="text-2xl font-bold text-gray-900">
                {record.description || record.customHead || FEE_HEAD_LABEL[record.feeHead] || record.feeHead}
              </h1>
              <div className="mt-0.5">
                <FeeStatusBadge status={isOverdue ? 'overdue' : record.status} />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-gray-500">
              <span className="flex items-center gap-1.5">
                <User className="w-4 h-4" />{record.studentName} · {record.admissionNumber}
              </span>
              <span>Class {record.class}-{record.section}</span>
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                Due {fmtDate(record.dueDate)}
              </span>
            </div>
            <p className="text-sm text-gray-400 mt-1">
              {record.academicYear}{record.month ? ` · ${record.month}` : ''}
            </p>
          </div>
        </div>

        {/* Amount row */}
        <div className="grid grid-cols-4 gap-4 mt-5 pt-5 border-t border-gray-100">
          {[
            { label: 'Total',    value: fmt(record.totalAmount),    color: 'text-gray-900' },
            { label: 'Discount', value: fmt(record.discountAmount), color: 'text-blue-600' },
            { label: 'Paid',     value: fmt(record.paidAmount),     color: 'text-green-600' },
            { label: 'Balance',  value: fmt(record.balance),        color: record.balance > 0 ? (isOverdue ? 'text-red-600' : 'text-orange-600') : 'text-gray-400' },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-xs text-gray-400 mb-0.5">{s.label}</p>
              <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        {record.status !== 'waived' && (
          <div className="mt-4 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${record.status === 'paid' ? 'bg-green-500' : isOverdue ? 'bg-red-400' : 'bg-blue-500'}`}
              style={{ width: `${Math.min(100, (record.paidAmount / record.totalAmount) * 100)}%` }}
            />
          </div>
        )}
      </div>

      {/* Action buttons */}
      {canPay && (
        <div className="flex gap-3 mb-6">
          <button
            onClick={() => setShowPayModal(true)}
            className="h-11 px-6 rounded-xl bg-[#5B21B6] hover:bg-[#4C1D95] flex items-center gap-2 text-sm font-bold text-white transition-colors"
            type="button"
          >
            <IndianRupee className="w-4 h-4" />
            Record Payment
          </button>
          <button
            onClick={() => navigate(`/fees/student/${record.studentId}`)}
            className="h-11 px-5 rounded-xl bg-gray-50 hover:bg-gray-100 flex items-center gap-2 text-sm font-semibold text-gray-700 border border-gray-200 transition-colors"
            type="button"
          >
            <User className="w-4 h-4" />
            Student Fee Profile
          </button>
        </div>
      )}

      {/* Tab bar */}
      <div className="flex gap-1 mb-6 border-b border-gray-100 -mx-1 px-1">
        {TABS.map((tab) => (
          <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)}
            className={cn('h-11 px-5 text-sm font-semibold transition-colors rounded-t-xl',
              activeTab === tab.id
                ? 'text-blue-600 border-b-2 border-blue-600 -mb-px bg-blue-50/50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50')}>
            {tab.label}
            {tab.id === 'payments' && payments.length > 0 && (
              <span className="ml-1.5 text-xs bg-blue-100 text-blue-700 rounded-full px-1.5">{payments.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Overview tab ──────────────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-sm font-bold text-gray-900 mb-4">Fee Details</h3>
            <dl className="space-y-3">
              {[
                { label: 'Fee Head',       value: FEE_HEAD_LABEL[record.feeHead] || record.feeHead },
                { label: 'Custom Label',   value: record.customHead },
                { label: 'Academic Year',  value: record.academicYear },
                { label: 'Month',          value: record.month },
                { label: 'Created By',     value: record.createdBy },
              ].map(({ label, value }) => value ? (
                <div key={label} className="flex justify-between text-sm">
                  <dt className="text-gray-400">{label}</dt>
                  <dd className="font-medium text-gray-800">{value}</dd>
                </div>
              ) : null)}
            </dl>
          </div>

          {record.discountAmount > 0 && (
            <div className="bg-blue-50 rounded-2xl border border-blue-100 p-5">
              <h3 className="text-sm font-bold text-blue-900 mb-3">Discount / Scholarship</h3>
              <p className="text-2xl font-bold text-blue-700">{fmt(record.discountAmount)}</p>
              {record.discountReason && (
                <p className="text-sm text-blue-600 mt-1">{record.discountReason}</p>
              )}
            </div>
          )}

          {record.waivedAmount > 0 && (
            <div className="bg-gray-50 rounded-2xl border border-gray-200 p-5">
              <h3 className="text-sm font-bold text-gray-700 mb-3">Waived Amount</h3>
              <p className="text-2xl font-bold text-gray-600">{fmt(record.waivedAmount)}</p>
              {record.waivedReason && (
                <p className="text-sm text-gray-500 mt-1">{record.waivedReason}</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Payments tab ──────────────────────────────────────────────────── */}
      {activeTab === 'payments' && (
        <PaymentTimeline payments={payments} />
      )}

      {/* ── Notes tab ─────────────────────────────────────────────────────── */}
      {activeTab === 'notes' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <StickyNote className="w-4 h-4 text-gray-400" />
              Internal Notes
            </h3>
            {!editingNotes && (
              <button
                type="button"
                onClick={() => { setNotesValue(record.notes ?? ''); setEditingNotes(true); }}
                className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800"
              >
                <Pencil className="w-3.5 h-3.5" />
                {record.notes ? 'Edit' : 'Add Note'}
              </button>
            )}
          </div>

          {editingNotes ? (
            <div className="space-y-3">
              <textarea
                value={notesValue}
                onChange={(e) => setNotesValue(e.target.value)}
                rows={5}
                maxLength={2000}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#A855F7] resize-none"
                placeholder="Internal notes visible only to staff…"
              />
              <div className="flex gap-2">
                <button type="button" onClick={() => setEditingNotes(false)}
                  className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
                  Cancel
                </button>
                <button type="button" onClick={saveNotes} disabled={savingNotes}
                  className="px-4 py-2 text-sm font-semibold bg-[#5B21B6] text-white rounded-lg hover:bg-[#4C1D95] disabled:opacity-50">
                  {savingNotes ? 'Saving…' : 'Save Notes'}
                </button>
              </div>
            </div>
          ) : (
            <p className={`text-sm ${record.notes ? 'text-gray-700' : 'text-gray-400 italic'}`}>
              {record.notes || 'No notes added yet.'}
            </p>
          )}
        </div>
      )}

      {/* Record Payment Modal */}
      {showPayModal && (
        <RecordPaymentModal
          fee={record}
          onClose={() => setShowPayModal(false)}
          onSuccess={() => setShowPayModal(false)}
        />
      )}
    </PageContainer>
  );
}
