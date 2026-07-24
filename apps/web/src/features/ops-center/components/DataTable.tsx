import type { ReactNode } from 'react';

export interface DataTableColumn<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  align?: 'left' | 'right';
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  emptyMessage = 'No data available.',
}: {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  emptyMessage?: string;
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-[#232D38] bg-[#121922]">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-[#232D38]">
            {columns.map((col) => (
              <th
                key={col.key}
                className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-[#98A2B3]"
                style={{ textAlign: col.align ?? 'left' }}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center text-sm text-[#64748B]">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={rowKey(row)} className="border-b border-[#232D38] last:border-0 transition-colors hover:bg-white/[0.02]">
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3 text-[#F4F6F8]" style={{ textAlign: col.align ?? 'left' }}>
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
