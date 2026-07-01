import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, ChevronDown, Wallet } from 'lucide-react';
import { useFeeList } from '@/features/fees/hooks/useFees';
import { FeeStatusBadge } from '@/features/fees/components/FeeStatusBadge';
import { RecordPaymentModal } from '@/features/fees/components/RecordPaymentModal';
import type { FeeRecord, FeeStatus } from '@schoolos/types';
import { cn } from '@/lib/utils';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

const selectCls =
  'h-10 px-3 rounded-xl border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#5B5CEB]/30';

type StatusFilter = 'all' | FeeStatus;

function daysOverdue(dueDate: string): number {
  const due = new Date(dueDate); due.setHours(0, 0, 0, 0);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.floor((today.getTime() - due.getTime()) / 86_400_000);
}

export function PendingFeesPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [cls, setCls] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [payingFee, setPayingFee] = useState<FeeRecord | null>(null);

  const { data, isLoading } = useFeeList({
    search: search || undefined,
    class: cls || undefined,
    sortBy: 'dueDate',
    sortOrder: 'asc',
    limit: 100,
  });

  const rows = useMemo(() => {
    const list = (data?.data ?? []).filter((f) => f.status !== 'paid' && f.status !== 'waived');
    return status === 'all' ? list : list.filter((f) => f.status === status);
  }, [data, status]);

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="bg-white border-b border-gray-100 px-4 py-4 flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate('/accountant')}
          className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors lg:hidden"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-base font-bold text-gray-900">Pending Fees</h1>
          <p className="text-xs text-gray-500">{rows.length} record{rows.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      <div className="px-4 py-4 max-w-4xl mx-auto space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search student…"
              className="w-full h-10 pl-9 pr-3 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#5B5CEB]/30"
            />
          </div>
          <input
            type="text"
            value={cls}
            onChange={(e) => setCls(e.target.value)}
            placeholder="Class"
            className="w-24 h-10 px-3 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#5B5CEB]/30"
          />
          <div className="relative">
            <select value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)} className={cn(selectCls, 'appearance-none pr-8')}>
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="partially_paid">Partial</option>
              <option value="overdue">Overdue</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* List */}
        {isLoading ? (
          <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-20 bg-white rounded-2xl border border-gray-100 animate-pulse" />)}</div>
        ) : !rows.length ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
            <Wallet className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-gray-700">No pending fees found</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {rows.map((fee) => {
              const overdue = daysOverdue(fee.dueDate);
              const isOverdue = fee.status === 'overdue' || overdue > 0;
              const isDueSoon = !isOverdue && overdue >= -3;
              return (
                <div
                  key={fee._id}
                  className={cn(
                    'bg-white rounded-2xl border shadow-sm p-4 flex items-center gap-3',
                    isOverdue ? 'border-red-200' : isDueSoon ? 'border-amber-200' : 'border-gray-100',
                  )}
                >
                  <div className={cn('w-1.5 self-stretch rounded-full shrink-0', isOverdue ? 'bg-red-500' : isDueSoon ? 'bg-amber-500' : 'bg-emerald-400')} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-gray-900 truncate">{fee.studentName}</p>
                      <FeeStatusBadge status={fee.status} size="sm" />
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Class {fee.class}-{fee.section} · Due {new Date(fee.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      {isOverdue && <span className="text-red-500 font-semibold"> · {overdue}d overdue</span>}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={cn('text-sm font-bold', isOverdue ? 'text-red-600' : 'text-amber-600')}>{fmt(fee.balance)}</p>
                    <button
                      onClick={() => setPayingFee(fee)}
                      className="mt-1.5 h-8 px-3 bg-[#5B5CEB] hover:bg-[#4a4bd9] text-white rounded-lg text-xs font-semibold"
                    >
                      Collect
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {payingFee && (
        <RecordPaymentModal fee={payingFee} onClose={() => setPayingFee(null)} onSuccess={() => setPayingFee(null)} />
      )}
    </div>
  );
}
