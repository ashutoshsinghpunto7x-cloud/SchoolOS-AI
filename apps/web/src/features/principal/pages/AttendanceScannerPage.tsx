import { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { ScanLine, Camera, CheckCircle2, XCircle, Loader2, Clock } from 'lucide-react';
import { PageContainer } from '@/components/workspace/PageContainer';
import { WorkspaceHeader } from '@/components/workspace/WorkspaceHeader';
import { useScanQr, useTodayStaffAttendance } from '@/features/employees/hooks/useStaffAttendance';
import type { StaffAttendanceScanResult, StaffAttendanceRecord } from '@schoolos/types';

const SCANNER_ELEMENT_ID = 'qr-reader';

const STATUS_LABEL: Record<string, string> = {
  present:  'Present',
  late:     'Late',
  half_day: 'Half Day',
};

function actionStatusText(result: StaffAttendanceScanResult): string {
  if (result.action === 'already_marked') return 'Already Marked';
  if (result.action === 'check_out') return 'Checked Out';
  return STATUS_LABEL[result.record.status] ?? 'Checked In';
}

function initialsOf(name: string): string {
  return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
}

function timeLabel(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

export function AttendanceScannerPage() {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [scannerRunning, setScannerRunning] = useState(false);
  const [scannerError, setScannerError] = useState('');
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; result?: StaffAttendanceScanResult; message?: string } | null>(null);
  const bannerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Debounce guard so the same QR frame can't fire the scan mutation twice
  // while the camera keeps decoding the same still-visible code.
  const processingRef = useRef(false);
  const lastTokenRef = useRef<{ token: string; at: number } | null>(null);

  const { mutateAsync: scan } = useScanQr();
  const { data: todayRecords, isLoading: loadingToday } = useTodayStaffAttendance();

  const handleDecoded = useCallback(async (decodedText: string) => {
    if (processingRef.current) return;

    // Ignore an identical re-decode of the same code within 5s (camera keeps
    // reading the same still-visible QR every frame).
    const now = Date.now();
    if (lastTokenRef.current && lastTokenRef.current.token === decodedText && now - lastTokenRef.current.at < 5000) {
      return;
    }
    lastTokenRef.current = { token: decodedText, at: now };
    processingRef.current = true;

    try {
      const result = await scan({ token: decodedText, device: 'principal-webcam' });
      if (bannerTimeoutRef.current) clearTimeout(bannerTimeoutRef.current);
      setBanner({ type: 'success', result });
      bannerTimeoutRef.current = setTimeout(() => setBanner(null), 5000);
    } catch (err) {
      if (bannerTimeoutRef.current) clearTimeout(bannerTimeoutRef.current);
      setBanner({ type: 'error', message: err instanceof Error ? err.message : 'Invalid or inactive QR code' });
      bannerTimeoutRef.current = setTimeout(() => setBanner(null), 4000);
    } finally {
      // Small delay before allowing the next scan so the camera has time to
      // move past the same frame.
      setTimeout(() => { processingRef.current = false; }, 1500);
    }
  }, [scan]);

  async function startScanner() {
    setScannerError('');
    try {
      const instance = new Html5Qrcode(SCANNER_ELEMENT_ID);
      scannerRef.current = instance;
      await instance.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => { void handleDecoded(decodedText); },
        () => { /* per-frame decode failures are expected and ignored */ },
      );
      setScannerRunning(true);
    } catch (err) {
      setScannerError(err instanceof Error ? err.message : 'Could not access the camera. Check permissions and try again.');
      setScannerRunning(false);
    }
  }

  async function stopScanner() {
    const instance = scannerRef.current;
    if (instance) {
      try { await instance.stop(); } catch { /* already stopped */ }
      try { instance.clear(); } catch { /* no-op */ }
    }
    scannerRef.current = null;
    setScannerRunning(false);
  }

  useEffect(() => {
    return () => {
      if (bannerTimeoutRef.current) clearTimeout(bannerTimeoutRef.current);
      const instance = scannerRef.current;
      if (instance) {
        instance.stop().catch(() => {}).finally(() => { try { instance.clear(); } catch { /* no-op */ } });
      }
    };
  }, []);

  return (
    <PageContainer>
      <WorkspaceHeader
        title="Today's Attendance"
        subtitle="Scan staff QR codes with your webcam to mark check-in / check-out"
        backTo="/principal"
        backLabel="Principal Dashboard"
      />

      {/* Status banner */}
      {banner && (
        <div
          className={`w-full rounded-2xl p-4 mb-6 flex items-center gap-4 border ${
            banner.type === 'success' ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'
          }`}
        >
          {banner.type === 'success' && banner.result ? (
            <>
              <div className="w-14 h-14 rounded-full bg-white border border-emerald-200 flex items-center justify-center overflow-hidden shrink-0">
                {banner.result.employee.photoUrl ? (
                  <img src={banner.result.employee.photoUrl} alt={banner.result.employee.fullName} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-emerald-700 font-bold text-sm">{initialsOf(banner.result.employee.fullName)}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <p className="text-sm font-bold text-emerald-800 truncate">{banner.result.employee.fullName}</p>
                </div>
                <p className="text-xs text-emerald-700 mt-0.5">
                  {banner.result.employee.designation}{banner.result.employee.department && ` · ${banner.result.employee.department}`}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-bold text-emerald-800">{actionStatusText(banner.result)}</p>
                <p className="text-xs text-emerald-600 mt-0.5 flex items-center gap-1 justify-end"><Clock className="w-3 h-3" /> {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p>
              </div>
            </>
          ) : (
            <>
              <XCircle className="w-6 h-6 text-red-500 shrink-0" />
              <p className="text-sm font-semibold text-red-700">{banner.message}</p>
            </>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Scanner */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col items-center">
          <div className="w-full max-w-sm aspect-square rounded-2xl bg-gray-50 border border-dashed border-gray-200 overflow-hidden flex items-center justify-center relative">
            <div id={SCANNER_ELEMENT_ID} className="w-full h-full" />
            {!scannerRunning && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-300 pointer-events-none">
                <ScanLine className="w-10 h-10 mb-2" />
                <p className="text-xs font-medium">Camera is off</p>
              </div>
            )}
          </div>

          {scannerError && <p className="text-xs text-red-500 mt-3 text-center">{scannerError}</p>}

          <button
            type="button"
            onClick={() => (scannerRunning ? stopScanner() : startScanner())}
            className={`mt-5 h-11 px-6 rounded-xl text-sm font-bold flex items-center gap-2 ${
              scannerRunning ? 'bg-white border border-gray-200 text-gray-700' : 'bg-gradient-to-r from-violet-600 to-pink-500 text-white'
            }`}
          >
            <Camera className="w-4 h-4" /> {scannerRunning ? 'Stop Scanner' : 'Start Scanner'}
          </button>
        </div>

        {/* Today's attendance table */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-sm font-bold text-gray-900 mb-4">Today's Attendance</h3>

          {loadingToday ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-12 bg-gray-50 rounded-xl animate-pulse" />)}
            </div>
          ) : !todayRecords?.length ? (
            <div className="py-10 text-center">
              <Loader2 className="hidden" />
              <p className="text-sm text-gray-400">No check-ins yet today</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[11px] text-gray-400 uppercase tracking-wide">
                    <th className="text-left font-semibold px-2 py-2">Employee ID</th>
                    <th className="text-left font-semibold px-2 py-2">Check-In</th>
                    <th className="text-left font-semibold px-2 py-2">Check-Out</th>
                    <th className="text-left font-semibold px-2 py-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {(todayRecords as StaffAttendanceRecord[]).map((r) => (
                    <tr key={r._id}>
                      <td className="px-2 py-2.5 font-semibold text-gray-800">{r.employeeId}</td>
                      <td className="px-2 py-2.5 text-gray-600">{timeLabel(r.checkIn?.time)}</td>
                      <td className="px-2 py-2.5 text-gray-600">{timeLabel(r.checkOut?.time)}</td>
                      <td className="px-2 py-2.5">
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#A855F7]/10 text-[#5B21B6] capitalize">
                          {r.status.replace('_', ' ')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </PageContainer>
  );
}
