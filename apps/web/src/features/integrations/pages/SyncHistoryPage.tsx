import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useAllSyncHistory } from '../hooks/useIntegrations';

export function SyncHistoryPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useAllSyncHistory(page);

  const logs = data?.data ?? [];
  const total = data?.meta?.total ?? 0;
  const totalPages = Math.ceil(total / 20);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Sync History</h1>
        <p className="text-sm text-gray-500 mt-0.5">{total} total sync runs</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500">Provider</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500">Type</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500">Status</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500">Records</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500">Duration</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500">Started</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} className="px-5 py-10 text-center text-gray-400">Loading…</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={6} className="px-5 py-10 text-center text-gray-400">No sync history yet</td></tr>
            ) : (
              logs.map((log) => {
                const durationMs = log.completedAt
                  ? new Date(log.completedAt).getTime() - new Date(log.startedAt).getTime()
                  : null;
                return (
                  <tr key={log._id} className="border-t border-gray-50 hover:bg-gray-50/40 transition-colors">
                    <td className="px-5 py-3 font-medium text-gray-800 capitalize">{log.providerKey.replace(/_/g, ' ')}</td>
                    <td className="px-5 py-3 text-gray-600 capitalize">{log.syncType}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        log.status === 'completed' ? 'bg-green-50 text-green-700' :
                        log.status === 'failed'    ? 'bg-red-50 text-red-700' :
                        log.status === 'running'   ? 'bg-blue-50 text-blue-700' :
                        'bg-yellow-50 text-yellow-700'
                      }`}>{log.status}</span>
                    </td>
                    <td className="px-5 py-3 text-gray-600">
                      {log.recordsSynced} synced
                      {log.recordsFailed > 0 && <span className="text-red-500 ml-1">· {log.recordsFailed} failed</span>}
                    </td>
                    <td className="px-5 py-3 text-gray-500">{durationMs !== null ? `${(durationMs / 1000).toFixed(1)}s` : '—'}</td>
                    <td className="px-5 py-3 text-gray-500 whitespace-nowrap">{new Date(log.startedAt).toLocaleString()}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50">
            <ChevronLeft className="w-4 h-4" /> Prev
          </button>
          <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50">
            Next <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
