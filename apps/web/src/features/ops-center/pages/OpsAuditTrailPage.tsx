import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useOpsAuditTrail, useOpsSchools } from '../hooks/useOpsData';
import { DataTable, type DataTableColumn } from '../components/DataTable';
import type { OpsAuditLogEntry } from '../api/opsApi';

const PAGE_SIZE = 50;

const COLUMNS: DataTableColumn<OpsAuditLogEntry>[] = [
  { key: 'time', header: 'Time', render: (r) => new Date(r.createdAt).toLocaleString() },
  { key: 'user', header: 'User', render: (r) => r.userDisplayName },
  { key: 'action', header: 'Action', render: (r) => <span className="font-mono text-xs">{r.action}</span> },
  { key: 'resource', header: 'Resource', render: (r) => `${r.resource} (${r.resourceId})` },
  { key: 'school', header: 'School', render: (r) => r.schoolId },
  { key: 'ip', header: 'IP', render: (r) => <span className="font-mono text-xs">{r.ip ?? '—'}</span> },
];

export function OpsAuditTrailPage() {
  const [schoolId, setSchoolId] = useState('');
  const [action, setAction] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);

  const { data: schools } = useOpsSchools();
  const { data, isLoading, isError, isFetching } = useOpsAuditTrail({
    schoolId: schoolId || undefined,
    action: action || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo ? `${dateTo}T23:59:59.999Z` : undefined,
    page,
    limit: PAGE_SIZE,
  });

  const resetToFirstPage = () => setPage(1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[#F4F6F8]">Audit Trail</h1>
        <p className="mt-1 text-sm text-[#98A2B3]">
          Every sensitive action across all schools — real activity log, not a sample.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs text-[#98A2B3]">School</label>
          <select
            value={schoolId}
            onChange={(e) => { setSchoolId(e.target.value); resetToFirstPage(); }}
            className="rounded-md border border-[#232D38] bg-[#121922] px-3 py-1.5 text-sm text-[#F4F6F8] focus:outline-none focus:ring-1 focus:ring-[#3B82F6]"
          >
            <option value="">All schools</option>
            {schools?.map((s) => (
              <option key={s.schoolId} value={s.schoolId}>{s.schoolName} ({s.schoolId})</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-[#98A2B3]">Action</label>
          <input
            value={action}
            onChange={(e) => { setAction(e.target.value); resetToFirstPage(); }}
            placeholder="e.g. auth.login"
            className="w-48 rounded-md border border-[#232D38] bg-[#121922] px-3 py-1.5 text-sm text-[#F4F6F8] placeholder:text-[#64748B] focus:outline-none focus:ring-1 focus:ring-[#3B82F6]"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-[#98A2B3]">From</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); resetToFirstPage(); }}
            className="rounded-md border border-[#232D38] bg-[#121922] px-3 py-1.5 text-sm text-[#F4F6F8] focus:outline-none focus:ring-1 focus:ring-[#3B82F6]"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-[#98A2B3]">To</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); resetToFirstPage(); }}
            className="rounded-md border border-[#232D38] bg-[#121922] px-3 py-1.5 text-sm text-[#F4F6F8] focus:outline-none focus:ring-1 focus:ring-[#3B82F6]"
          />
        </div>
        {isFetching && <Loader2 className="h-4 w-4 animate-spin text-[#64748B]" />}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-7 w-7 animate-spin text-[#3B82F6]" />
        </div>
      ) : isError || !data ? (
        <div className="text-sm text-[#EF4444]">Failed to load audit trail.</div>
      ) : (
        <>
          <DataTable columns={COLUMNS} rows={data.data} rowKey={(r) => r._id} emptyMessage="No matching audit events." />
          <div className="flex items-center justify-between text-sm text-[#98A2B3]">
            <span>
              Page {data.meta.page} of {Math.max(1, data.meta.totalPages)} — {data.meta.total.toLocaleString()} total events
            </span>
            <div className="flex gap-2">
              <button
                disabled={!data.meta.hasPrevPage}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-md border border-[#232D38] px-3 py-1.5 text-xs disabled:opacity-40 hover:text-[#F4F6F8]"
              >
                Previous
              </button>
              <button
                disabled={!data.meta.hasNextPage}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-md border border-[#232D38] px-3 py-1.5 text-xs disabled:opacity-40 hover:text-[#F4F6F8]"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
