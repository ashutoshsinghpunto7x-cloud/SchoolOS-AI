import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusCircle, IndianRupee, AlertTriangle, ChevronLeft, ChevronRight, Loader2, Phone, Mail, ChevronRight as ChevronRightIcon } from 'lucide-react';
import { useFeeList, useFeeSummary } from '../hooks/useFees';
import { FeeCard } from '../components/FeeCard';
import { FeeFilters } from '../components/FeeFilters';
import { FeeStatusBadge } from '../components/FeeStatusBadge';
import { RecordPaymentModal } from '../components/RecordPaymentModal';
import { PageContainer } from '@/components/workspace/PageContainer';
import { WorkspaceHeader } from '@/components/workspace/WorkspaceHeader';
import { SearchBar } from '@/components/ui/SearchBar';
import { EmptyState } from '@/components/ui/EmptyState';
import type { FeeRecord, FeeListOptions } from '@schoolos/types';

const PAGE_SIZE = 18;

const fmt = (amount: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

const fmtDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

const isOverdue = (fee: FeeRecord) =>
  (fee.status === 'pending' || fee.status === 'partially_paid') && new Date(fee.dueDate) < new Date();

const daysOverdue = (fee: FeeRecord) =>
  Math.max(0, Math.floor((Date.now() - new Date(fee.dueDate).getTime()) / (1000 * 60 * 60 * 24)));

const FEE_HEAD_LABEL: Record<string, string> = {
  tuition: 'Tuition', admission: 'Admission', examination: 'Examination',
  transport: 'Transport', hostel: 'Hostel', miscellaneous: 'Miscellaneous',
};

// ── Summary stat card ─────────────────────────────────────────────────────────

function StatCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${accent ?? 'text-gray-900'}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

// ── Fee records table (desktop) ─────────────────────────────────────────────

function FeeTable({ fees, onRecordPayment }: { fees: FeeRecord[]; onRecordPayment: (fee: FeeRecord) => void }) {
  const navigate = useNavigate();

  return (
    <div className="hidden md:block bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/60">
              {['Student', 'Class & Section', 'Fee Head', 'Due Date', 'Amount Due', 'Days Overdue', 'Status', 'Actions'].map((h) => (
                <th key={h} className="text-left font-semibold text-gray-500 text-xs uppercase tracking-wide px-4 py-3 whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {fees.map((fee) => {
              // fee.status can already be 'overdue' from the API (backend-computed);
              // isOverdue() only catches the case where it's still 'pending'/'partially_paid'
              // but past due — combine both so the badge and the days count always agree.
              const overdue = isOverdue(fee) || fee.status === 'overdue';
              const overdueDays = overdue ? daysOverdue(fee) : 0;
              const headLabel = fee.customHead || FEE_HEAD_LABEL[fee.feeHead] || fee.feeHead;
              return (
                <tr
                  key={fee._id}
                  onClick={() => navigate(`/fees/${fee._id}`)}
                  className="hover:bg-gray-50/80 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <span className="w-8 h-8 rounded-full bg-[#A855F7]/10 text-[#5B21B6] text-xs font-bold flex items-center justify-center shrink-0">
                        {fee.studentName?.[0]?.toUpperCase() ?? '?'}
                      </span>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{fee.studentName}</p>
                        <p className="text-xs text-gray-400">{fee.admissionNumber}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-gray-600 whitespace-nowrap">Class {fee.class} · Sec {fee.section}</td>
                  <td className="px-4 py-3.5 text-gray-600 whitespace-nowrap">
                    {headLabel}
                    <span className="block text-xs text-gray-400">{fee.academicYear}{fee.month ? ` · ${fee.month}` : ''}</span>
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <span className={overdue ? 'text-red-600 font-semibold' : 'text-gray-600'}>{fmtDate(fee.dueDate)}</span>
                  </td>
                  <td className="px-4 py-3.5 font-bold text-gray-900 whitespace-nowrap">{fmt(fee.balance)}</td>
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    {overdue ? <span className="text-red-600 font-semibold">{overdueDays} days</span> : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <FeeStatusBadge status={overdue ? 'overdue' : fee.status} size="sm" />
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        title="Calling isn't set up yet"
                        disabled
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-300 cursor-not-allowed"
                      >
                        <Phone className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        title="Email reminders aren't set up yet"
                        disabled
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-300 cursor-not-allowed"
                      >
                        <Mail className="w-4 h-4" />
                      </button>
                      {fee.status !== 'paid' && fee.status !== 'waived' && (
                        <button
                          type="button"
                          onClick={() => onRecordPayment(fee)}
                          className="ml-1 h-8 px-3 rounded-lg flex items-center gap-1 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors whitespace-nowrap"
                        >
                          <IndianRupee className="w-3 h-3" /> Record
                        </button>
                      )}
                      <ChevronRightIcon className="w-4 h-4 text-gray-300 ml-1" />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function FeeWorkspace() {
  const navigate = useNavigate();

  const [filters,     setFilters]     = useState<FeeListOptions>({ page: 1, limit: PAGE_SIZE, sortBy: 'dueDate', sortOrder: 'asc' });
  const [searchInput, setSearchInput] = useState('');
  const [payFee,      setPayFee]      = useState<FeeRecord | null>(null);

  const applySearch = (value: string) =>
    setFilters((f) => ({ ...f, search: value.trim() || undefined, page: 1 }));

  const { data, isLoading, isFetching, isError } = useFeeList(filters);
  const { data: summary } = useFeeSummary();

  const fees        = data?.data ?? [];
  const meta        = data?.meta;
  const totalPages  = meta?.totalPages ?? 1;
  const currentPage = filters.page ?? 1;

  const setPage = (page: number) => setFilters((f) => ({ ...f, page }));

  const hasActiveFilters = !!(filters.status || filters.feeHead || filters.class);

  return (
    <PageContainer>
      <WorkspaceHeader
        title="Fee Management"
        subtitle={meta ? `${meta.total} fee record${meta.total !== 1 ? 's' : ''}` : 'Loading…'}
        action={
          <button
            onClick={() => navigate('/fees/new')}
            className="h-12 px-6 rounded-xl bg-[#5B21B6] hover:bg-[#4C1D95] active:bg-[#3f1a94]
                       flex items-center gap-2 text-sm font-bold text-white transition-colors"
            type="button"
          >
            <PlusCircle className="w-5 h-5" />
            Assign Fee
          </button>
        }
      />

      {/* Summary stats */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            label="Total Outstanding"
            value={fmt(summary.totalOutstanding)}
            accent="text-orange-600"
          />
          <StatCard
            label="Total Collected"
            value={fmt(summary.totalCollected)}
            accent="text-green-600"
          />
          <StatCard
            label="Overdue Records"
            value={String(summary.overdueCount)}
            sub="Require attention"
            accent={summary.overdueCount > 0 ? 'text-red-600' : 'text-gray-900'}
          />
          <StatCard
            label="Pending Records"
            value={String(summary.pendingCount)}
            sub="Upcoming due dates"
          />
        </div>
      )}

      {/* Search + filters */}
      <div className="flex flex-col gap-3 mb-6">
        <SearchBar
          placeholder="Search by student name, admission number…"
          value={searchInput}
          onChange={(val) => {
            setSearchInput(val);
            if (!val.trim()) applySearch('');
          }}
          onSearch={applySearch}
        />
        <FeeFilters filters={filters} onChange={setFilters} />
      </div>

      {/* Content */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 h-52 animate-pulse" />
          ))}
        </div>
      )}

      {isError && !isLoading && (
        <EmptyState icon={AlertTriangle} title="Could not load fee records" description="Check your connection and try refreshing." />
      )}

      {!isLoading && !isError && fees.length === 0 && (
        <EmptyState
          icon={IndianRupee}
          title={hasActiveFilters || filters.search ? 'No results found' : 'No fee records yet'}
          description={
            hasActiveFilters || filters.search
              ? 'Try adjusting your filters or search term.'
              : 'Assign your first fee record by clicking Assign Fee above.'
          }
          action={
            hasActiveFilters || filters.search
              ? { label: 'Clear all', onClick: () => { setSearchInput(''); setFilters({ page: 1, limit: PAGE_SIZE }); }, variant: 'secondary' as const }
              : { label: 'Assign Fee', onClick: () => navigate('/fees/new') }
          }
        />
      )}

      {!isLoading && !isError && fees.length > 0 && (
        <>
          {isFetching && !isLoading && (
            <div className="flex items-center gap-2 text-sm text-gray-400 mb-3">
              <Loader2 className="w-4 h-4 animate-spin" />Updating…
            </div>
          )}

          <div className={`transition-opacity duration-150 ${isFetching ? 'opacity-60' : 'opacity-100'}`}>
            <FeeTable fees={fees} onRecordPayment={setPayFee} />

            {/* Cards on mobile — the table needs more width than a phone gives it */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:hidden">
              {fees.map((fee) => (
                <FeeCard key={fee._id} fee={fee} onRecordPayment={setPayFee} />
              ))}
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-100">
              <p className="text-sm text-gray-500">
                Page {currentPage} of {totalPages} · {meta!.total} records
              </p>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => setPage(currentPage - 1)}
                  disabled={!meta?.hasPrevPage || isFetching}
                  className="h-10 w-10 rounded-xl flex items-center justify-center text-gray-500 hover:bg-gray-100 disabled:opacity-40 transition-colors">
                  <ChevronLeft className="w-5 h-5" />
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                  .reduce<(number | '…')[]>((acc, page, idx, arr) => {
                    if (idx > 0 && page - (arr[idx - 1] as number) > 1) acc.push('…');
                    acc.push(page);
                    return acc;
                  }, [])
                  .map((item, idx) =>
                    item === '…'
                      ? <span key={`e-${idx}`} className="h-10 w-10 flex items-center justify-center text-gray-400 text-sm">…</span>
                      : <button key={item} type="button" onClick={() => setPage(item as number)}
                          disabled={isFetching}
                          className={`h-10 w-10 rounded-xl text-sm font-semibold transition-colors ${currentPage === item ? 'bg-[#5B21B6] text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
                          {item}
                        </button>
                  )}

                <button type="button" onClick={() => setPage(currentPage + 1)}
                  disabled={!meta?.hasNextPage || isFetching}
                  className="h-10 w-10 rounded-xl flex items-center justify-center text-gray-500 hover:bg-gray-100 disabled:opacity-40 transition-colors">
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </>
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
