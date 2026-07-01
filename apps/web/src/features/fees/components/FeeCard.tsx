import { useNavigate } from 'react-router-dom';
import { IndianRupee, Calendar, User } from 'lucide-react';
import type { FeeRecord } from '@schoolos/types';
import { FeeStatusBadge } from './FeeStatusBadge';

interface Props {
  fee: FeeRecord;
  onRecordPayment?: (fee: FeeRecord) => void;
}

const FEE_HEAD_LABEL: Record<string, string> = {
  tuition:     'Tuition',
  admission:   'Admission',
  examination: 'Examination',
  transport:   'Transport',
  hostel:      'Hostel',
  miscellaneous: 'Miscellaneous',
};

const fmt = (amount: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

const fmtDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

const isOverdue = (fee: FeeRecord) =>
  (fee.status === 'pending' || fee.status === 'partially_paid') &&
  new Date(fee.dueDate) < new Date();

export function FeeCard({ fee, onRecordPayment }: Props) {
  const navigate = useNavigate();
  const overdue  = isOverdue(fee);
  const headLabel = fee.customHead || FEE_HEAD_LABEL[fee.feeHead] || fee.feeHead;

  return (
    <div
      className={`bg-white rounded-2xl border shadow-sm p-5 flex flex-col gap-4 transition-shadow hover:shadow-md cursor-pointer
        ${overdue ? 'border-red-200' : 'border-gray-100'}`}
      onClick={() => navigate(`/fees/${fee._id}`)}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-gray-900 truncate">
            {fee.description || headLabel}
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {fee.academicYear}{fee.month ? ` · ${fee.month}` : ''}
          </p>
        </div>
        <FeeStatusBadge status={overdue ? 'overdue' : fee.status} size="sm" />
      </div>

      {/* Student info */}
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <User className="w-3.5 h-3.5 shrink-0" />
        <span className="truncate font-medium text-gray-700">{fee.studentName}</span>
        <span className="text-gray-300">·</span>
        <span>{fee.admissionNumber}</span>
        <span className="text-gray-300">·</span>
        <span>Cl {fee.class}-{fee.section}</span>
      </div>

      {/* Amount breakdown */}
      <div className="grid grid-cols-3 gap-2">
        <div className="text-center">
          <p className="text-xs text-gray-400 mb-0.5">Total</p>
          <p className="text-sm font-bold text-gray-900">{fmt(fee.totalAmount)}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-400 mb-0.5">Paid</p>
          <p className="text-sm font-bold text-green-600">{fmt(fee.paidAmount)}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-400 mb-0.5">Balance</p>
          <p className={`text-sm font-bold ${fee.balance > 0 ? (overdue ? 'text-red-600' : 'text-orange-600') : 'text-gray-400'}`}>
            {fmt(fee.balance)}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      {fee.status !== 'waived' && (
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${fee.status === 'paid' ? 'bg-green-500' : overdue ? 'bg-red-400' : 'bg-blue-500'}`}
            style={{ width: `${Math.min(100, (fee.paidAmount / fee.totalAmount) * 100)}%` }}
          />
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <Calendar className="w-3.5 h-3.5" />
          <span className={overdue ? 'text-red-500 font-medium' : ''}>
            Due {fmtDate(fee.dueDate)}
          </span>
        </div>

        {fee.status !== 'paid' && fee.status !== 'waived' && onRecordPayment && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onRecordPayment(fee); }}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
          >
            <IndianRupee className="w-3 h-3" />
            Record Payment
          </button>
        )}
      </div>
    </div>
  );
}
