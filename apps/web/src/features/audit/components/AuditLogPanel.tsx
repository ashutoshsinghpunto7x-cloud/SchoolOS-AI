import { Loader2, X, Download, Printer, History } from 'lucide-react';
import { useAuditLog } from '../hooks/useAudit';
import { exportToCSV } from '@/features/reports/components/ExportMenu';

interface AuditLogPanelProps {
  resource: string;
  resourceId?: string;
  title?: string;
  onClose: () => void;
}

function formatAction(action: string): string {
  return action.split('.').pop()!.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDetails(details?: Record<string, unknown>): string {
  if (!details) return '—';
  if (typeof details.changes === 'object' && details.changes) {
    const changes = details.changes as Record<string, { from: unknown; to: unknown }>;
    const parts = Object.entries(changes).map(([field, { from, to }]) => `${field}: ${from ?? '—'} → ${to ?? '—'}`);
    return parts.length ? parts.join('; ') : JSON.stringify(details);
  }
  return Object.entries(details).map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`).join('; ');
}

export function AuditLogPanel({ resource, resourceId, title, onClose }: AuditLogPanelProps) {
  const { data, isLoading } = useAuditLog({ resource, resourceId, limit: 200 });
  const logs = data?.data ?? [];

  function handleExport() {
    exportToCSV(
      logs.map((l) => ({
        Date: new Date(l.createdAt).toLocaleString('en-IN'),
        Action: formatAction(l.action),
        By: l.userDisplayName,
        Details: formatDetails(l.details),
      })),
      `${resource}-history-${new Date().toISOString().slice(0, 10)}`,
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4 print:static print:bg-white print:p-0">
      <div className="bg-white w-full sm:max-w-2xl rounded-t-2xl sm:rounded-2xl p-5 max-h-[85vh] overflow-y-auto print:max-h-none print:rounded-none">
        <div className="flex items-center justify-between mb-1 print:hidden">
          <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <History className="w-4 h-4 text-gray-400" /> {title ?? 'Change History'}
          </h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <p className="text-xs text-gray-400 mb-4 print:hidden">What changed and when — exportable and printable for your records.</p>

        <div className="hidden print:block mb-4">
          <h2 className="text-lg font-bold">{title ?? 'Change History'}</h2>
          <p className="text-xs text-gray-500">Generated {new Date().toLocaleString('en-IN')}</p>
        </div>

        <div className="flex items-center justify-end gap-2 mb-3 print:hidden">
          <button
            type="button"
            disabled={!logs.length}
            onClick={handleExport}
            className="h-8 px-3 border border-gray-200 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-40 flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
          <button
            type="button"
            disabled={!logs.length}
            onClick={() => window.print()}
            className="h-8 px-3 border border-gray-200 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-40 flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" /> Print
          </button>
        </div>

        {isLoading ? (
          <div className="py-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
        ) : !logs.length ? (
          <p className="text-sm text-gray-400 text-center py-8">No history recorded yet.</p>
        ) : (
          <div className="border border-gray-100 rounded-xl divide-y divide-gray-50 overflow-hidden">
            {logs.map((l) => (
              <div key={l._id} className="px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-gray-900">{formatAction(l.action)}</p>
                  <p className="text-xs text-gray-400 shrink-0">{new Date(l.createdAt).toLocaleString('en-IN')}</p>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">by {l.userDisplayName}</p>
                <p className="text-xs text-gray-600 mt-1">{formatDetails(l.details)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
