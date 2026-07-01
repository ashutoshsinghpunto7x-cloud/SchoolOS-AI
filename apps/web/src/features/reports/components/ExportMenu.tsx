import { useState, useRef, useEffect } from 'react';
import { Download, ChevronDown, FileText, Table } from 'lucide-react';

interface ExportMenuProps {
  onExportCSV: () => void;
  onExportPDF?: () => void;
  disabled?: boolean;
}

export const ExportMenu = ({ onExportCSV, onExportPDF, disabled = false }: ExportMenuProps) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((p) => !p)}
        disabled={disabled}
        className="flex items-center gap-1.5 h-9 px-3 text-sm font-medium text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        type="button"
      >
        <Download size={14} />
        Export
        <ChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl border border-gray-100 shadow-lg z-20 py-1">
          <button
            onClick={() => { onExportCSV(); setOpen(false); }}
            className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            type="button"
          >
            <Table size={14} className="text-green-600" />
            Export CSV
          </button>
          <button
            onClick={() => { onExportPDF?.(); setOpen(false); }}
            disabled={!onExportPDF}
            className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            type="button"
            title={!onExportPDF ? 'PDF export coming soon' : undefined}
          >
            <FileText size={14} className="text-red-500" />
            Export PDF
            {!onExportPDF && <span className="ml-auto text-[10px] text-gray-400">Soon</span>}
          </button>
        </div>
      )}
    </div>
  );
};

export const exportToCSV = (rows: Record<string, unknown>[], filename: string) => {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csvContent = [
    headers.join(','),
    ...rows.map((row) =>
      headers
        .map((h) => {
          const val = row[h] ?? '';
          const str = String(val);
          return str.includes(',') || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
        })
        .join(','),
    ),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};
