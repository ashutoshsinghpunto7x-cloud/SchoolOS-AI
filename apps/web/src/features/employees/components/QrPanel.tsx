import { useState } from 'react';
import { QrCode, RefreshCw, Download, Printer, Ban, Loader2, AlertCircle } from 'lucide-react';
import { useEmployeeQr, useRegenerateEmployeeQr, useDisableEmployeeQr } from '../hooks/useEmployees';
import type { Employee } from '@schoolos/types';

const STATUS_STYLE: Record<string, string> = {
  active:   'bg-emerald-50 text-emerald-700 border-emerald-100',
  disabled: 'bg-gray-100 text-gray-500 border-gray-200',
  expired:  'bg-amber-50 text-amber-700 border-amber-100',
};

interface QrPanelProps {
  employee: Employee;
}

export function QrPanel({ employee }: QrPanelProps) {
  const hasQr = Boolean(employee.qr);
  const { data: qr, isLoading, error } = useEmployeeQr(employee._id, hasQr);
  const { mutateAsync: regenerate, isPending: regenerating } = useRegenerateEmployeeQr(employee._id);
  const { mutateAsync: disable, isPending: disabling } = useDisableEmployeeQr(employee._id);
  const [localErr, setLocalErr] = useState('');
  const [printing, setPrinting] = useState(false);

  const status = qr?.status ?? employee.qr?.status;

  async function handleRegenerate() {
    setLocalErr('');
    try {
      await regenerate();
    } catch (err) {
      setLocalErr(err instanceof Error ? err.message : 'Failed to regenerate QR');
    }
  }

  async function handleDisable() {
    setLocalErr('');
    try {
      await disable();
    } catch (err) {
      setLocalErr(err instanceof Error ? err.message : 'Failed to disable QR');
    }
  }

  // Only mounts its print-only DOM node while actively printing — otherwise this
  // panel's "hide everything else" print rule would also swallow other
  // print-scoped blocks on the same page (e.g. the ID Card preview below it).
  function handlePrint() {
    setPrinting(true);
    const reset = () => { setPrinting(false); window.removeEventListener('afterprint', reset); };
    window.addEventListener('afterprint', reset);
    setTimeout(() => window.print(), 50);
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
          <QrCode className="w-4 h-4 text-gray-400" /> Attendance QR
        </h3>
        {status && (
          <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border capitalize ${STATUS_STYLE[status] ?? STATUS_STYLE.expired}`}>
            {status}
          </span>
        )}
      </div>

      <div className="flex flex-col items-center">
        <div className="w-40 h-40 rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden print:hidden">
          {isLoading ? (
            <Loader2 className="w-6 h-6 text-gray-300 animate-spin" />
          ) : qr?.dataUri ? (
            <img id="qr-panel-image" src={qr.dataUri} alt="Attendance QR" className="w-full h-full object-contain" />
          ) : (
            <p className="text-xs text-gray-400 text-center px-4">No QR generated yet</p>
          )}
        </div>

        {(localErr || error) && (
          <p className="text-xs text-red-500 mt-3 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {localErr || (error instanceof Error ? error.message : '')}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-center gap-2 mt-4 print:hidden">
          <button
            type="button"
            onClick={handleRegenerate}
            disabled={regenerating}
            className="h-9 px-3 bg-[#5B21B6] hover:bg-[#4C1D95] disabled:opacity-60 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5"
          >
            {regenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            {hasQr ? 'Regenerate' : 'Generate'}
          </button>

          {qr?.dataUri && (
            <a
              href={qr.dataUri}
              download={`${employee.employeeId}-qr.png`}
              className="h-9 px-3 bg-white border border-gray-200 text-gray-700 rounded-xl text-xs font-semibold flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" /> Download
            </a>
          )}

          {qr?.dataUri && (
            <button
              type="button"
              onClick={handlePrint}
              className="h-9 px-3 bg-white border border-gray-200 text-gray-700 rounded-xl text-xs font-semibold flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" /> Print
            </button>
          )}

          {hasQr && status === 'active' && (
            <button
              type="button"
              onClick={handleDisable}
              disabled={disabling}
              className="h-9 px-3 bg-white border border-red-200 text-red-600 rounded-xl text-xs font-semibold flex items-center gap-1.5 disabled:opacity-60"
            >
              {disabling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Ban className="w-3.5 h-3.5" />}
              Deactivate
            </button>
          )}
        </div>
      </div>

      {/* Print-only isolated QR (so "Print" here doesn't print the whole profile page) —
          only rendered while `printing` is true, so it never collides with other
          print-scoped blocks (e.g. IdCardPreview) mounted elsewhere on the same page. */}
      {printing && qr?.dataUri && (
        <>
          <style>{`
            @media print {
              body * { visibility: hidden; }
              #qr-print-only, #qr-print-only * { visibility: visible; }
              #qr-print-only { position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; }
            }
          `}</style>
          <div id="qr-print-only" className="hidden print:flex">
            <img src={qr.dataUri} alt="Attendance QR" className="w-64 h-64 object-contain" />
          </div>
        </>
      )}
    </div>
  );
}
