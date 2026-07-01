import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusCircle, IndianRupee, AlertTriangle, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { useFeeList, useFeeSummary } from '../hooks/useFees';
import { FeeCard } from '../components/FeeCard';
import { FeeFilters } from '../components/FeeFilters';
import { RecordPaymentModal } from '../components/RecordPaymentModal';
import { PageContainer } from '@/components/workspace/PageContainer';
import { WorkspaceHeader } from '@/components/workspace/WorkspaceHeader';
import { SearchBar } from '@/components/ui/SearchBar';
import { EmptyState } from '@/components/ui/EmptyState';
import type { FeeRecord, FeeListOptions } from '@schoolos/types';

const PAGE_SIZE = 18;

const fmt = (amount: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

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
            className="h-12 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800
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

          <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 transition-opacity duration-150 ${isFetching ? 'opacity-60' : 'opacity-100'}`}>
            {fees.map((fee) => (
              <FeeCard key={fee._id} fee={fee} onRecordPayment={setPayFee} />
            ))}
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
                          className={`h-10 w-10 rounded-xl text-sm font-semibold transition-colors ${currentPage === item ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
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
