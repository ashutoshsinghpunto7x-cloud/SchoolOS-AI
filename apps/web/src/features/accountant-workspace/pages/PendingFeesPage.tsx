import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Wallet, Plus, Send, Pencil, Check, X, Loader2, CalendarClock } from 'lucide-react';
import { useFeeList, useUpdateFeeRecord } from '@/features/fees/hooks/useFees';
import { useGroupedDefaulters } from '../hooks/useAccountantWorkspace';
import { FeeStatusBadge } from '@/features/fees/components/FeeStatusBadge';
import { RecordPaymentModal } from '@/features/fees/components/RecordPaymentModal';
import { AssignFeeModal } from '../components/AssignFeeModal';
import { SendDefaultersModal } from '../components/SendDefaultersModal';
import type { FeeRecord, FeeStatus, ClassDefaulterGroup } from '@schoolos/types';
import { cn } from '@/lib/utils';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

const selectCls =
  'h-10 px-3 rounded-xl border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#10B981]/30';

type StatusFilter = 'all' | FeeStatus;

function daysOverdue(dueDate: string): number {
  const due = new Date(dueDate); due.setHours(0, 0, 0, 0);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.floor((today.getTime() - due.getTime()) / 86_400_000);
}

// ── Inline due-date editor ───────────────────────────────────────────────────

function DueDateEditor({ fee }: { fee: FeeRecord }) {
  const { mutateAsync, isPending } = useUpdateFeeRecord(fee._id);
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(fee.dueDate.slice(0, 10));

  async function save() {
    await mutateAsync({ dueDate: value });
    setEditing(false);
  }

  if (!editing) {
    return (
      <button
        onClick={() => { setValue(fee.dueDate.slice(0, 10)); setEditing(true); }}
        className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-[#10B981]"
        title="Change due date"
      >
        Due {new Date(fee.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} <Pencil className="w-3 h-3" />
      </button>
    );
  }

  return (
    <div className="inline-flex items-center gap-1">
      <input
        type="date" value={value} onChange={(e) => setValue(e.target.value)}
        className="h-7 px-1.5 rounded-lg border border-[#10B981] text-xs"
      />
      <button onClick={save} disabled={isPending} className="w-6 h-6 flex items-center justify-center rounded-md bg-[#10B981] text-white shrink-0">
        {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
      </button>
      <button onClick={() => setEditing(false)} className="w-6 h-6 flex items-center justify-center rounded-md bg-gray-100 text-gray-500 shrink-0">
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}

// ── Notify class teachers panel — early defaulter warning before the due date ──

function NotifyClassTeachersPanel({ onClose }: { onClose: () => void }) {
  const { data: groups, isLoading } = useGroupedDefaulters();
  const [sendingGroup, setSendingGroup] = useState<ClassDefaulterGroup | null>(null);

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-5 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-base font-bold text-gray-900">Notify Class Teachers</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100"><X className="w-4 h-4 text-gray-500" /></button>
        </div>
        <p className="text-xs text-gray-400 mb-4">Send each class's fee defaulter list to its class teacher — useful ahead of the due date, not just after.</p>

        {isLoading ? (
          <div className="py-6 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
        ) : !groups?.length ? (
          <p className="text-sm text-gray-400 text-center py-8">No outstanding fees right now.</p>
        ) : (
          <div className="space-y-2">
            {groups.map((g) => (
              <div key={`${g.class}-${g.section}`} className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 px-3.5 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-800">Class {g.class}-{g.section}</p>
                  <p className="text-xs text-gray-400">
                    {g.students.length} student{g.students.length !== 1 ? 's' : ''} · {fmt(g.totalBalance)}
                    {g.classTeacherName && <> · Teacher: {g.classTeacherName}</>}
                  </p>
                </div>
                <button
                  onClick={() => setSendingGroup(g)}
                  className="h-9 px-3 bg-[#10B981] hover:bg-[#059669] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shrink-0"
                >
                  <Send className="w-3.5 h-3.5" /> Send
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      {sendingGroup && <SendDefaultersModal group={sendingGroup} onClose={() => setSendingGroup(null)} />}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function PendingFeesPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [cls, setCls] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [dueBefore, setDueBefore] = useState('');
  const [payingFee, setPayingFee] = useState<FeeRecord | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [notifyOpen, setNotifyOpen] = useState(false);

  const { data, isLoading } = useFeeList({
    search: search || undefined,
    class: cls || undefined,
    dueBefore: dueBefore || undefined,
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
        <div className="flex-1">
          <h1 className="text-base font-bold text-gray-900">Fee Management</h1>
          <p className="text-xs text-gray-500">{rows.length} record{rows.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setNotifyOpen(true)}
          className="h-9 px-3 border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-50 flex items-center gap-1.5"
        >
          <Send className="w-3.5 h-3.5" /> Notify Teachers
        </button>
        <button
          onClick={() => setAssignOpen(true)}
          className="h-9 px-3 bg-[#10B981] hover:bg-[#059669] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" /> Assign Fee
        </button>
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
              className="w-full h-10 pl-9 pr-3 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#10B981]/30"
            />
          </div>
          <input
            type="text"
            value={cls}
            onChange={(e) => setCls(e.target.value)}
            placeholder="Class"
            className="w-24 h-10 px-3 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#10B981]/30"
          />
          <select value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)} className={cn(selectCls, 'appearance-none pr-8')}>
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="partially_paid">Partial</option>
            <option value="overdue">Overdue</option>
          </select>
          <div className="relative">
            <CalendarClock className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            <input
              type="date" value={dueBefore} onChange={(e) => setDueBefore(e.target.value)}
              title="Show fees due on or before this date — use this to spot defaulters early, ahead of the due date"
              className="h-10 pl-8 pr-2.5 rounded-xl border border-gray-200 bg-white text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#10B981]/30"
            />
          </div>
          {dueBefore && (
            <button onClick={() => setDueBefore('')} className="text-xs text-gray-400 hover:text-gray-600">Clear date</button>
          )}
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
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-xs text-gray-400">Class {fee.class}-{fee.section} ·</p>
                      <DueDateEditor fee={fee} />
                      {isOverdue && <span className="text-red-500 font-semibold text-xs">· {overdue}d overdue</span>}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={cn('text-sm font-bold', isOverdue ? 'text-red-600' : 'text-amber-600')}>{fmt(fee.balance)}</p>
                    <button
                      onClick={() => setPayingFee(fee)}
                      className="mt-1.5 h-8 px-3 bg-[#10B981] hover:bg-[#059669] text-white rounded-lg text-xs font-semibold"
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
      {assignOpen && (
        <AssignFeeModal onClose={() => setAssignOpen(false)} onAssigned={() => setAssignOpen(false)} />
      )}
      {notifyOpen && <NotifyClassTeachersPanel onClose={() => setNotifyOpen(false)} />}
    </div>
  );
}
