import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { ImportRow, ImportRowStatus } from '@schoolos/types';
import { useImportRows } from '../hooks/useImport';

interface ValidationTableProps {
  sessionId: string;
}

const STATUS_FILTER_OPTIONS: { label: string; value: ImportRowStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Valid', value: 'valid' },
  { label: 'Warning', value: 'warning' },
  { label: 'Error', value: 'error' },
  { label: 'Imported', value: 'imported' },
];

const ROW_BADGE: Record<ImportRowStatus, string> = {
  pending:  'bg-gray-100 text-gray-600',
  valid:    'bg-green-50 text-green-700',
  warning:  'bg-yellow-50 text-yellow-700',
  error:    'bg-red-50 text-red-700',
  imported: 'bg-blue-50 text-blue-700',
  skipped:  'bg-gray-100 text-gray-500',
};

export function ValidationTable({ sessionId }: ValidationTableProps) {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<ImportRowStatus | 'all'>('all');
  const PAGE_SIZE = 20;

  const { data, isLoading } = useImportRows(sessionId, {
    page,
    limit: PAGE_SIZE,
    status: statusFilter === 'all' ? undefined : statusFilter,
  });

  const rows: ImportRow[] = data?.data ?? [];
  const total = data?.meta?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Derive columns from first row's mappedData
  const columns = rows.length > 0 ? Object.keys(rows[0].mappedData) : [];

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        {STATUS_FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => { setStatusFilter(opt.value); setPage(1); }}
            className={[
              'px-3 py-1 rounded-full text-xs font-medium border transition-colors',
              statusFilter === opt.value
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300',
            ].join(' ')}
          >
            {opt.label}
          </button>
        ))}
        <span className="text-xs text-gray-500 ml-auto">{total} rows</span>
      </div>

      {/* Table */}
      <div className="overflow-auto rounded-xl border border-gray-100">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="px-3 py-2.5 text-left font-medium text-gray-500 w-10">#</th>
              <th className="px-3 py-2.5 text-left font-medium text-gray-500 w-24">Status</th>
              {columns.map((col) => (
                <th key={col} className="px-3 py-2.5 text-left font-medium text-gray-500 whitespace-nowrap">{col}</th>
              ))}
              <th className="px-3 py-2.5 text-left font-medium text-gray-500">Issues</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={columns.length + 3} className="px-4 py-8 text-center text-gray-400">Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={columns.length + 3} className="px-4 py-8 text-center text-gray-400">No rows found</td></tr>
            ) : (
              rows.map((row) => (
                <tr key={row._id} className="border-t border-gray-50 hover:bg-gray-50/50">
                  <td className="px-3 py-2 text-gray-500">{row.rowNumber}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-block px-2 py-0.5 rounded-full font-medium ${ROW_BADGE[row.status]}`}>
                      {row.status}
                    </span>
                  </td>
                  {columns.map((col) => (
                    <td key={col} className="px-3 py-2 text-gray-700 max-w-[160px] truncate">
                      {String(row.mappedData[col] ?? '')}
                    </td>
                  ))}
                  <td className="px-3 py-2">
                    {[...row.errors, ...row.warnings].map((e, i) => (
                      <div key={i} className={`text-xs ${e.code ? 'text-red-600' : 'text-yellow-600'}`}>
                        <span className="font-medium">{e.field}:</span> {e.message}
                      </div>
                    ))}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-1">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Prev
          </button>
          <span className="text-xs text-gray-500">Page {page} of {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
          >
            Next <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
