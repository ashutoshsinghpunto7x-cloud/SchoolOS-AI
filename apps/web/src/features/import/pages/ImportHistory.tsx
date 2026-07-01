import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { useImportSessions } from '../hooks/useImport';
import { ImportStatusBadge } from '../components/ImportStatusBadge';
import type { ImportType, ImportStatus } from '@schoolos/types';

const TYPE_OPTIONS: { label: string; value: ImportType | 'all' }[] = [
  { label: 'All Types', value: 'all' },
  { label: 'Students', value: 'students' },
  { label: 'Teachers', value: 'teachers' },
  { label: 'Fees', value: 'fees' },
  { label: 'Admissions', value: 'admissions' },
];

const STATUS_OPTIONS: { label: string; value: ImportStatus | 'all' }[] = [
  { label: 'All Statuses', value: 'all' },
  { label: 'Preview', value: 'preview' },
  { label: 'Processing', value: 'processing' },
  { label: 'Completed', value: 'completed' },
  { label: 'Failed', value: 'failed' },
  { label: 'Cancelled', value: 'cancelled' },
];

const PAGE_SIZE = 15;

export function ImportHistory() {
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState<ImportType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<ImportStatus | 'all'>('all');

  const { data, isLoading } = useImportSessions({
    page,
    limit: PAGE_SIZE,
    importType: typeFilter === 'all' ? undefined : typeFilter,
    status: statusFilter === 'all' ? undefined : statusFilter,
  });

  const sessions = data?.data ?? [];
  const total = data?.meta?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Import History</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} total sessions</p>
        </div>
        <Link
          to="/import/upload"
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          New Import
        </Link>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value as ImportType | 'all'); setPage(1); }}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400 text-gray-700"
        >
          {TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value as ImportStatus | 'all'); setPage(1); }}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400 text-gray-700"
        >
          {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500">Type</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500">File</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500">Rows</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500">Status</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500">By</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500">Date</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} className="px-5 py-10 text-center text-gray-400">Loading…</td></tr>
            ) : sessions.length === 0 ? (
              <tr><td colSpan={7} className="px-5 py-10 text-center text-gray-400">No sessions found</td></tr>
            ) : (
              sessions.map((s) => (
                <tr key={s._id} className="border-t border-gray-50 hover:bg-gray-50/60 transition-colors">
                  <td className="px-5 py-3 font-medium text-gray-800 capitalize">{s.importType}</td>
                  <td className="px-5 py-3 text-gray-600 truncate max-w-[200px]">{s.originalFileName}</td>
                  <td className="px-5 py-3 text-gray-600">{s.totalRows}</td>
                  <td className="px-5 py-3"><ImportStatusBadge status={s.status} /></td>
                  <td className="px-5 py-3 text-gray-500">{s.createdByName}</td>
                  <td className="px-5 py-3 text-gray-500 whitespace-nowrap">
                    {new Date(s.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-3 py-3">
                    <Link to={`/import/sessions/${s._id}`} className="text-gray-400 hover:text-indigo-500 transition-colors">
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
          >
            <ChevronLeft className="w-4 h-4" /> Prev
          </button>
          <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
          >
            Next <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
