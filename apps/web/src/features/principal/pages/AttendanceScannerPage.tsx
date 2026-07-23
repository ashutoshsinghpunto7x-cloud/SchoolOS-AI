import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { ScanLine, Camera, CheckCircle2, XCircle, Loader2, Clock, QrCode, ListChecks, Search, Check, X } from 'lucide-react';
import { PageContainer } from '@/components/workspace/PageContainer';
import { WorkspaceHeader } from '@/components/workspace/WorkspaceHeader';
import { useScanQr, useTodayStaffAttendance, useMarkAttendanceManual } from '@/features/employees/hooks/useStaffAttendance';
import { useTeacherList } from '@/features/teachers/hooks/useTeachers';
import type { StaffAttendanceScanResult, StaffAttendanceRecord, StaffAttendanceStatus } from '@schoolos/types';

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

// ── Manual mark panel — fallback for when a teacher's QR isn't handy ─────────

function ManualMarkPanel({ onMarked }: { onMarked: (result: StaffAttendanceScanResult) => void }) {
  const [search, setSearch] = useState('');
  const [rowError, setRowError] = useState<{ id: string; message: string } | null>(null);
  const { data: teachers = [], isLoading } = useTeacherList(search);
  const { data: todayRecords } = useTodayStaffAttendance();
  const { mutate: markManual, isPending, variables } = useMarkAttendanceManual();

  const statusByEmployeeId = useMemo(() => {
    const map = new Map<string, StaffAttendanceStatus>();
    for (const r of (todayRecords ?? []) as StaffAttendanceRecord[]) map.set(r.employeeId, r.status);
    return map;
  }, [todayRecords]);

  function mark(employeeId: string, status: StaffAttendanceStatus) {
    setRowError(null);
    markManual({ employeeId, status }, {
      onSuccess: (result) => onMarked(result),
      onError: (err) => setRowError({ id: employeeId, message: err instanceof Error ? err.message : 'Could not mark attendance' }),
    });
  }

  return (
    <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col">
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search teacher by name…"
          className="w-full h-10 pl-9 pr-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 transition-colors"
        />
      </div>

      <div className="flex-1 overflow-y-auto max-h-[420px] -mx-1 px-1 space-y-1.5">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-14 bg-gray-50 rounded-xl animate-pulse" />)
        ) : teachers.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-10">No teachers found.</p>
        ) : (
          teachers.map((t) => {
            const status = t.employeeId ? statusByEmployeeId.get(t.employeeId) : undefined;
            const pending = isPending && variables?.employeeId === t.employeeId;
            const hasEmployeeId = t.hasEmployeeRecord ?? true;
            return (
              <div key={t._id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors">
                <div className="w-9 h-9 rounded-full bg-violet-50 text-violet-700 flex items-center justify-center text-xs font-bold shrink-0">
                  {initialsOf(t.fullName)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{t.fullName}</p>
                  {status ? (
                    <p className={`text-xs mt-0.5 font-medium ${status === 'absent' ? 'text-red-500' : 'text-emerald-600'}`}>
                      {STATUS_LABEL[status] ?? (status === 'absent' ? 'Absent' : status)}
                    </p>
                  ) : rowError?.id === t.employeeId ? (
                    <p className="text-xs mt-0.5 font-medium text-red-500 truncate">{rowError.message}</p>
                  ) : !hasEmployeeId ? (
                    <p className="text-xs mt-0.5 font-medium text-amber-600 truncate">No HR employee record — add in Admin &gt; Employees</p>
                  ) : (
                    <p className="text-xs mt-0.5 text-gray-400">Not marked</p>
                  )}
                </div>
                <button
                  type="button"
                  disabled={!hasEmployeeId || pending}
                  onClick={() => t.employeeId && mark(t.employeeId, 'present')}
                  className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 flex items-center justify-center transition-colors disabled:opacity-40"
                  aria-label={`Mark ${t.fullName} present`}
                  title={hasEmployeeId ? 'Mark present' : 'No HR employee record for this teacher yet'}
                >
                  {pending && variables?.status === 'present' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  disabled={!hasEmployeeId || pending}
                  onClick={() => t.employeeId && mark(t.employeeId, 'absent')}
                  className="w-8 h-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 flex items-center justify-center transition-colors disabled:opacity-40"
                  aria-label={`Mark ${t.fullName} absent`}
                  title={hasEmployeeId ? 'Mark absent' : 'No HR employee record for this teacher yet'}
                >
                  {pending && variables?.status === 'absent' ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export function AttendanceScannerPage() {
  const [mode, setMode] = useState<'scan' | 'manual'>('scan');
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
        subtitle="Scan staff QR codes, or mark attendance manually when a QR isn't handy"
        backTo="/principal"
        backLabel="Principal Dashboard"
      />

      {/* Scan / Manual mode switch */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit mb-6">
        <button
          type="button"
          onClick={() => setMode('scan')}
          className={`flex items-center gap-2 h-9 px-4 rounded-lg text-sm font-semibold transition-colors ${
            mode === 'scan' ? 'bg-white text-[#5B21B6] shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <QrCode className="w-4 h-4" /> Scan QR
        </button>
        <button
          type="button"
          onClick={() => setMode('manual')}
          className={`flex items-center gap-2 h-9 px-4 rounded-lg text-sm font-semibold transition-colors ${
            mode === 'manual' ? 'bg-white text-[#5B21B6] shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <ListChecks className="w-4 h-4" /> Mark Manually
        </button>
      </div>

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
                  <img src={banner.result.employee.photoUrl} alt={banner.result.employee.fullName} className="w-full h-full object-cover" loading="lazy" decoding="async" />
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
        {mode === 'scan' ? (
          /* Scanner */
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
        ) : (
          <ManualMarkPanel onMarked={(result) => {
            if (bannerTimeoutRef.current) clearTimeout(bannerTimeoutRef.current);
            setBanner({ type: 'success', result });
            bannerTimeoutRef.current = setTimeout(() => setBanner(null), 5000);
          }} />
        )}

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
