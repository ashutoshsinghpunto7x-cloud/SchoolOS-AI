import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, ChevronDown, ChevronLeft, ChevronRight, FileBarChart, Receipt, AlertCircle, Users } from 'lucide-react';
import { useFeeList, useReceiptLookup } from '@/features/fees/hooks/useFees';
import { useClassFeeSummary } from '../hooks/useAccountantWorkspace';
import { FeeStatusBadge } from '@/features/fees/components/FeeStatusBadge';
import type { FeeListOptions, FeeStatus } from '@schoolos/types';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 20;

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

const selectCls = 'h-10 px-3 rounded-xl border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-200 appearance-none pr-8';

// ── Bill number lookup ────────────────────────────────────────────────────────

function ReceiptLookup() {
  const [receiptNumber, setReceiptNumber] = useState('');
  const { mutate, data, error, isPending, reset } = useReceiptLookup();

  function handleSearch() {
    const trimmed = receiptNumber.trim();
    if (!trimmed) return;
    mutate(trimmed);
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-300 shadow-sm p-4">
      <h2 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
        <Receipt className="w-4 h-4 text-gray-900" /> Look Up a Receipt
      </h2>
      <p className="text-xs text-gray-400 mt-0.5">Enter a bill number to find that month's fee record</p>

      <div className="flex gap-2 mt-3">
        <input
          type="text"
          value={receiptNumber}
          onChange={(e) => { setReceiptNumber(e.target.value); if (data || error) reset(); }}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="e.g. RCPT-2026-00007"
          className="flex-1 h-10 px-3 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
        />
        <button
          onClick={handleSearch}
          disabled={!receiptNumber.trim() || isPending}
          className="h-10 px-4 bg-gray-900 hover:bg-black disabled:opacity-50 text-white rounded-xl text-sm font-semibold"
        >
          {isPending ? 'Searching…' : 'Search'}
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2 mt-3">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error instanceof Error ? error.message : 'Receipt not found'}
        </div>
      )}

      {data && (
        <div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50/60 p-3.5 text-sm">
          <div className="flex items-center justify-between">
            <p className="font-bold text-gray-900">{data.record.studentName}</p>
            <FeeStatusBadge status={data.record.status} size="sm" />
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Class {data.record.class}-{data.record.section} · {data.record.month || new Date(data.record.dueDate).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
          </p>
          <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-emerald-100">
            <div><p className="text-xs text-gray-400">Paid</p><p className="text-sm font-bold text-emerald-600">{fmt(data.payment.amount)}</p></div>
            <div><p className="text-xs text-gray-400">Mode</p><p className="text-sm font-bold text-gray-800 capitalize">{data.payment.paymentMode}</p></div>
            <div><p className="text-xs text-gray-400">Date</p><p className="text-sm font-bold text-gray-800">{new Date(data.payment.paymentDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p></div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Browse by Class: roll-ordered roster with overall balance per student ──────

const STATUS_PILL_CLASS: Record<'paid' | 'due' | 'no_records', string> = {
  paid:       'bg-emerald-100 text-emerald-800',
  due:        'bg-amber-100 text-amber-800',
  no_records: 'bg-gray-100 text-gray-500',
};

const STATUS_PILL_LABEL: Record<'paid' | 'due' | 'no_records', string> = {
  paid: 'Paid', due: 'Due', no_records: 'No records',
};

function BrowseByClass() {
  const navigate = useNavigate();
  const [classInput, setClassInput] = useState('');
  const [sectionInput, setSectionInput] = useState('');
  const { data, isLoading, isError } = useClassFeeSummary(classInput, sectionInput);

  return (
    <div className="space-y-4">
      <div className="flex gap-2.5">
        <input
          type="text"
          value={classInput}
          onChange={(e) => setClassInput(e.target.value)}
          placeholder="Class (e.g. 10)"
          className="w-32 h-10 px-3 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
        />
        <input
          type="text"
          value={sectionInput}
          onChange={(e) => setSectionInput(e.target.value.toUpperCase())}
          placeholder="Section (e.g. A)"
          maxLength={10}
          className="w-32 h-10 px-3 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
        />
      </div>

      {!classInput.trim() || !sectionInput.trim() ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
          <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-semibold text-gray-700">Enter a class and section</p>
          <p className="text-xs text-gray-400 mt-1">Students will be listed in roll number order with their overall fee balance.</p>
        </div>
      ) : isLoading ? (
        <div className="space-y-2">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-16 bg-white rounded-2xl border border-gray-100 animate-pulse" />)}</div>
      ) : isError ? (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">
          <AlertCircle className="w-4 h-4 shrink-0" /> Couldn't load this class.
        </div>
      ) : !data?.students.length ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
          <p className="text-sm font-semibold text-gray-700">No students found in Class {classInput}-{sectionInput}</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-50">
          {data.students.map((s) => (
            <button
              key={s.studentId}
              onClick={() => navigate(`/accountant/student-ledger/${s.studentId}`)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
            >
              <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-900 font-bold text-xs shrink-0">
                {s.fullName.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-gray-900 truncate">{s.fullName}</p>
                  <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold', STATUS_PILL_CLASS[s.status])}>
                    {STATUS_PILL_LABEL[s.status]}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">Roll {s.rollNumber || '—'} · {s.admissionNumber}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-bold text-gray-800">{fmt(s.totalPaid)} paid</p>
                <p className={cn('text-xs font-semibold', s.status === 'due' ? 'text-amber-600' : 'text-gray-400')}>
                  {s.status === 'due' ? `${fmt(s.balance)} due` : s.status === 'no_records' ? 'No fee records' : 'Fully paid'}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function FeeRecordsPage() {
  const navigate = useNavigate();
  const [view, setView] = useState<'search' | 'class'>('search');
  const [filters, setFilters] = useState<FeeListOptions>({ page: 1, limit: PAGE_SIZE, sortBy: 'createdAt', sortOrder: 'desc' });
  const [searchInput, setSearchInput] = useState('');

  const { data, isLoading } = useFeeList(filters);
  const rows = data?.data ?? [];
  const meta = data?.meta;
  const totalPages = meta?.totalPages ?? 1;
  const currentPage = filters.page ?? 1;

  function applySearch() {
    setFilters((f) => ({ ...f, search: searchInput.trim() || undefined, page: 1 }));
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="bg-white border-b border-gray-100 px-4 py-4 flex items-center gap-3">
        <button onClick={() => navigate('/accountant')} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors lg:hidden">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="flex-1">
          <h1 className="text-base font-bold text-gray-900">Fee Records</h1>
          <p className="text-xs text-gray-500">{meta ? `${meta.total} record${meta.total !== 1 ? 's' : ''}` : 'All students — paid & pending'}</p>
        </div>
        <button
          onClick={() => navigate('/accountant/student-ledger')}
          className="h-9 px-3.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-xs font-semibold text-gray-700 shrink-0"
        >
          Student Ledger
        </button>
      </div>

      <div className="px-4 py-4 max-w-4xl mx-auto space-y-4">
        {/* View toggle */}
        <div className="inline-flex items-center gap-1 bg-gray-100 rounded-full p-1">
          <button
            onClick={() => setView('search')}
            className={cn('px-4 h-8 rounded-full text-xs font-semibold transition-colors', view === 'search' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700')}
          >
            Search
          </button>
          <button
            onClick={() => setView('class')}
            className={cn('px-4 h-8 rounded-full text-xs font-semibold transition-colors', view === 'class' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700')}
          >
            Browse by Class
          </button>
        </div>

        {view === 'class' ? (
          <BrowseByClass />
        ) : (
          <>
            <ReceiptLookup />

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative flex-1 min-w-[180px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && applySearch()}
                  placeholder="Search student or admission no."
                  className="w-full h-10 pl-9 pr-3 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
                />
              </div>
              <input
                type="text"
                value={filters.class ?? ''}
                onChange={(e) => setFilters((f) => ({ ...f, class: e.target.value || undefined, page: 1 }))}
                placeholder="Class"
                className="w-24 h-10 px-3 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
              />
              <div className="relative">
                <select
                  value={filters.status ?? 'all'}
                  onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value === 'all' ? undefined : e.target.value as FeeStatus, page: 1 }))}
                  className={selectCls}
                >
                  <option value="all">All Status</option>
                  <option value="paid">Paid</option>
                  <option value="pending">Pending</option>
                  <option value="partially_paid">Partial</option>
                  <option value="overdue">Overdue</option>
                  <option value="waived">Waived</option>
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              </div>
              <button onClick={applySearch} className="h-10 px-4 bg-gray-900 hover:bg-black text-white rounded-xl text-sm font-semibold">
                Search
              </button>
            </div>

            {/* List */}
            {isLoading ? (
              <div className="space-y-2">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-16 bg-white rounded-2xl border border-gray-100 animate-pulse" />)}</div>
            ) : !rows.length ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
                <FileBarChart className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-sm font-semibold text-gray-700">No fee records found</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-50">
                {rows.map((f) => (
                  <button
                    key={f._id}
                    onClick={() => navigate(`/accountant/student-ledger/${f.studentId}`)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                  >
                    <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-900 font-bold text-xs shrink-0">
                      {f.studentName.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-gray-900 truncate">{f.studentName}</p>
                        <FeeStatusBadge status={f.status} size="sm" />
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Class {f.class}-{f.section} · {f.description || f.feeHead}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-gray-800">{fmt(f.totalAmount)}</p>
                      <p className={cn('text-xs font-semibold', f.status === 'paid' ? 'text-emerald-600' : 'text-amber-600')}>
                        {f.status === 'paid' ? 'Fully Paid' : `${fmt(f.balance)} due`}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between">
                <button
                  disabled={currentPage <= 1}
                  onClick={() => setFilters((f) => ({ ...f, page: currentPage - 1 }))}
                  className="h-9 px-3 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 disabled:opacity-40 flex items-center gap-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Prev
                </button>
                <p className="text-xs text-gray-400">Page {currentPage} of {totalPages}</p>
                <button
                  disabled={currentPage >= totalPages}
                  onClick={() => setFilters((f) => ({ ...f, page: currentPage + 1 }))}
                  className="h-9 px-3 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 disabled:opacity-40 flex items-center gap-1"
                >
                  Next <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
