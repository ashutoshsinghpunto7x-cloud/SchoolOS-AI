import { useState } from 'react';
import { ChevronLeft, ChevronRight, Pencil, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { ImportRow, ImportRowStatus } from '@schoolos/types';
import { useImportRows, useUpdateRow } from '../hooks/useImport';
import { cn } from '@/lib/utils';

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

// Rows in these states can still be fixed by hand before Confirm — once
// imported/skipped the underlying record already exists elsewhere.
const EDITABLE_STATUSES: ImportRowStatus[] = ['error', 'warning', 'valid'];

function EditableCell({ sessionId, row, col }: { sessionId: string; row: ImportRow; col: string }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(row.mappedData[col] ?? ''));
  const updateRow = useUpdateRow(sessionId);
  const editable = EDITABLE_STATUSES.includes(row.status);

  async function commit() {
    setEditing(false);
    if (value === String(row.mappedData[col] ?? '')) return; // unchanged
    try {
      await updateRow.mutateAsync({ rowNumber: row.rowNumber, mappedData: { [col]: value } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save edit');
      setValue(String(row.mappedData[col] ?? '')); // revert on failure
    }
  }

  if (!editable) {
    return <td className="px-3 py-2 text-gray-500 max-w-[160px] truncate">{String(row.mappedData[col] ?? '')}</td>;
  }

  if (editing) {
    return (
      <td className="px-1.5 py-1">
        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={() => void commit()}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
            if (e.key === 'Escape') { setValue(String(row.mappedData[col] ?? '')); setEditing(false); }
          }}
          className="w-full min-w-[100px] h-7 px-1.5 rounded border border-indigo-300 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400"
        />
      </td>
    );
  }

  return (
    <td
      onClick={() => setEditing(true)}
      className="px-3 py-2 text-gray-700 max-w-[160px] truncate cursor-text hover:bg-indigo-50/60 group"
      title="Click to edit"
    >
      <span className="inline-flex items-center gap-1">
        {updateRow.isPending ? <Loader2 className="w-3 h-3 animate-spin text-gray-400" /> : null}
        {value || <span className="text-gray-300">—</span>}
        <Pencil className="w-2.5 h-2.5 text-gray-300 opacity-0 group-hover:opacity-100 shrink-0" />
      </span>
    </td>
  );
}

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

  // Union of every field across the current page's rows — a single row
  // missing a value (e.g. Class dropped by a bad mapping) used to hide that
  // column for the whole page, which is exactly what made it impossible to
  // spot or fix.
  const columns = Array.from(new Set(rows.flatMap((r) => Object.keys(r.mappedData))));

  const hasEditableRows = rows.some((r) => EDITABLE_STATUSES.includes(r.status));

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

      {hasEditableRows && (
        <p className="text-[11px] text-gray-400 -mt-1">Click any cell to fix its value — it re-checks automatically.</p>
      )}

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
                <tr key={row._id} className={cn('border-t border-gray-50 hover:bg-gray-50/50', row.status === 'error' && 'bg-red-50/20')}>
                  <td className="px-3 py-2 text-gray-500">{row.rowNumber}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-block px-2 py-0.5 rounded-full font-medium ${ROW_BADGE[row.status]}`}>
                      {row.status}
                    </span>
                  </td>
                  {columns.map((col) => (
                    <EditableCell key={col} sessionId={sessionId} row={row} col={col} />
                  ))}
                  <td className="px-3 py-2">
                    {[...row.errors, ...row.warnings].map((e, i) => (
                      <div key={i} className={`text-xs ${row.errors.includes(e) ? 'text-red-600' : 'text-yellow-600'}`}>
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
