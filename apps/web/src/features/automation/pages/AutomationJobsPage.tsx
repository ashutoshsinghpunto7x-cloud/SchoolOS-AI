import { useState, useCallback } from 'react';
import { Loader2, AlertCircle, Zap, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAutomationJobs } from '../hooks/useAutomation';
import { AutomationJobCard } from '../components/AutomationJobCard';
import { SearchBar } from '@/components/ui/SearchBar';
import { PageContainer } from '@/components/workspace/PageContainer';
import type { AutomationJobType, AutomationJobStatus } from '@schoolos/types';

const PAGE_SIZE = 20;

const JOB_TYPES: { value: AutomationJobType | ''; label: string }[] = [
  { value: '', label: 'All Types' },
  { value: 'VOICE_CALL', label: 'Voice Call' },
  { value: 'WHATSAPP', label: 'WhatsApp' },
  { value: 'EMAIL', label: 'Email' },
  { value: 'SMS', label: 'SMS' },
  { value: 'FEE_REMINDER', label: 'Fee Reminder' },
  { value: 'PTM_REMINDER', label: 'PTM Reminder' },
  { value: 'GENERAL_BROADCAST', label: 'Broadcast' },
  { value: 'CUSTOM', label: 'Custom' },
];

const JOB_STATUSES: { value: AutomationJobStatus | ''; label: string }[] = [
  { value: '', label: 'All Statuses' },
  { value: 'QUEUED', label: 'Queued' },
  { value: 'RUNNING', label: 'Running' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'RETRYING', label: 'Retrying' },
];

const selectCls =
  'h-11 pl-3 pr-8 rounded-xl border border-gray-200 bg-white text-sm text-gray-700 font-medium ' +
  'shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 ' +
  'transition-colors appearance-none cursor-pointer hover:border-gray-300';

export const AutomationJobsPage = () => {
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [type, setType] = useState<AutomationJobType | ''>('');
  const [status, setStatus] = useState<AutomationJobStatus | ''>('');
  const [page, setPage] = useState(1);

  const { data, isLoading, isError } = useAutomationJobs({
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
    type: type || undefined,
    status: status || undefined,
  });

  const jobs = data?.data ?? [];
  const meta = data?.meta;

  const handleSearch = useCallback((val: string) => { setSearch(val); setPage(1); }, []);

  return (
    <PageContainer>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Automation Jobs</h1>
        <p className="text-base text-gray-500 mt-1">
          Monitor every automated workflow dispatched by FNIC.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <SearchBar
          placeholder="Search by type, triggered by, or error…"
          value={searchInput}
          onChange={setSearchInput}
          onSearch={handleSearch}
          className="flex-1"
        />
        <select
          value={type}
          onChange={(e) => { setType(e.target.value as AutomationJobType | ''); setPage(1); }}
          className={selectCls}
          aria-label="Filter by type"
        >
          {JOB_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value as AutomationJobStatus | ''); setPage(1); }}
          className={selectCls}
          aria-label="Filter by status"
        >
          {JOB_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          <p className="text-sm text-gray-500">Loading automation jobs…</p>
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center">
            <AlertCircle className="w-7 h-7 text-red-500" />
          </div>
          <p className="text-base font-medium text-gray-700">Failed to load automation jobs</p>
        </div>
      ) : jobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
          <div className="w-20 h-20 rounded-3xl bg-blue-50 flex items-center justify-center">
            <Zap className="w-9 h-9 text-blue-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">
              {search || type || status ? 'No jobs match your filters' : 'No automation jobs yet'}
            </h3>
            <p className="text-base text-gray-500 mt-1">
              {search || type || status
                ? 'Try adjusting your search or filters.'
                : 'Jobs appear here when AI calls or automations are dispatched.'}
            </p>
          </div>
        </div>
      ) : (
        <>
          {meta && (
            <p className="text-sm text-gray-400 mb-4">
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, meta.total)} of {meta.total} jobs
            </p>
          )}

          <div className="flex flex-col gap-3">
            {jobs.map((job) => (
              <AutomationJobCard key={job._id} job={job} />
            ))}
          </div>

          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-8">
              <button
                onClick={() => setPage((p) => p - 1)}
                disabled={!meta.hasPrevPage}
                className="w-10 h-10 rounded-xl border border-gray-200 bg-white flex items-center justify-center
                           text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                type="button"
                aria-label="Previous page"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-sm font-medium text-gray-600">
                Page {meta.page} of {meta.totalPages}
              </span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={!meta.hasNextPage}
                className="w-10 h-10 rounded-xl border border-gray-200 bg-white flex items-center justify-center
                           text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                type="button"
                aria-label="Next page"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </>
      )}
    </PageContainer>
  );
};
