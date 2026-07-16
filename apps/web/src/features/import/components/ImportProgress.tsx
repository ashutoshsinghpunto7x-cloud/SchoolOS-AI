import { Loader2, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import type { ImportSession } from '@schoolos/types';

interface ImportProgressProps {
  session: ImportSession;
}

export function ImportProgress({ session }: ImportProgressProps) {
  const { status, totalRows, importedRows, validRows, warningRows, failedRows } = session;

  const pct = totalRows > 0 ? Math.round((importedRows / totalRows) * 100) : 0;

  const isRunning = status === 'processing';
  const isDone = status === 'completed';
  const isFailed = status === 'failed';

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-800">Import Progress</h3>
        {isRunning && <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />}
        {isDone && <CheckCircle2 className="w-4 h-4 text-gray-700" />}
        {isFailed && <XCircle className="w-4 h-4 text-red-500" />}
      </div>

      {/* Bar */}
      <div>
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>{importedRows} of {totalRows} rows</span>
          <span>{pct}%</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${isFailed ? 'bg-red-400' : 'bg-[#5B21B6]'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 pt-1">
        <div className="text-center">
          <p className="text-lg font-bold text-gray-900">{validRows}</p>
          <p className="text-xs text-gray-500">Valid</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-gray-900">{warningRows}</p>
          <p className="text-xs text-gray-500">Warnings</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-red-600">{failedRows}</p>
          <p className="text-xs text-gray-500">Errors</p>
        </div>
      </div>

      {session.errorSummary && (
        <div className="flex gap-2 p-3 bg-red-50 rounded-lg border border-red-100">
          <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-red-700">{session.errorSummary}</p>
        </div>
      )}
    </div>
  );
}
