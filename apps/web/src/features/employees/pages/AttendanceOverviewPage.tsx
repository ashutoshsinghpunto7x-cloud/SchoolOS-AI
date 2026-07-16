import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ScanLine, Clock } from 'lucide-react';
import { useTodayStaffAttendance } from '../hooks/useStaffAttendance';

function timeLabel(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

export function AttendanceOverviewPage() {
  const navigate = useNavigate();
  const { data: records, isLoading } = useTodayStaffAttendance();

  return (
    <div className="min-h-screen bg-white">
      <div className="bg-white border-b border-gray-200 px-4 py-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 lg:hidden">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-base font-bold text-gray-900 flex items-center gap-2"><ScanLine className="w-4 h-4 text-gray-400" /> Today's Attendance</h1>
          <p className="text-xs text-gray-500">Staff check-in / check-out log via QR scan</p>
        </div>
      </div>

      <div className="px-4 py-4 max-w-3xl mx-auto">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-14 bg-white rounded-2xl border border-gray-200 animate-pulse" />)}
          </div>
        ) : !records?.length ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
            <ScanLine className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-gray-700">No check-ins yet today</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] text-gray-400 uppercase tracking-wide bg-gray-50">
                  <th className="text-left font-semibold px-4 py-2.5">Employee ID</th>
                  <th className="text-left font-semibold px-4 py-2.5">Check-In</th>
                  <th className="text-left font-semibold px-4 py-2.5">Check-Out</th>
                  <th className="text-left font-semibold px-4 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {records.map((r) => (
                  <tr key={r._id}>
                    <td className="px-4 py-3 font-semibold text-gray-800">{r.employeeId}</td>
                    <td className="px-4 py-3 text-gray-600 flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-gray-300" /> {timeLabel(r.checkIn?.time)}</td>
                    <td className="px-4 py-3 text-gray-600">{timeLabel(r.checkOut?.time)}</td>
                    <td className="px-4 py-3">
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#A855F7]/10 text-[#5B21B6] capitalize">{r.status.replace('_', ' ')}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
