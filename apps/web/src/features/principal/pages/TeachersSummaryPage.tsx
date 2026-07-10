import { useState } from 'react';
import { ChevronLeft, ChevronRight, Users, UserCheck, CalendarOff, Loader2, AlertCircle } from 'lucide-react';
import { PageContainer } from '@/components/workspace/PageContainer';
import { BackLink } from '@/components/workspace/BackLink';
import { useTeachersSummary } from '../hooks/usePrincipal';

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function addDays(dateStr: string, n: number) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

function formatDisplayDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

function StatCard({ icon: Icon, label, value, tone }: { icon: React.ElementType; label: string; value: number; tone: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${tone}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900 leading-none">{value}</p>
        <p className="text-xs text-gray-500 mt-1">{label}</p>
      </div>
    </div>
  );
}

export function TeachersSummaryPage() {
  const today = todayStr();
  const [date, setDate] = useState(today);
  const { data, isLoading, isError } = useTeachersSummary(date);
  const isToday = date === today;

  return (
    <PageContainer>
      <BackLink to="/principal" label="Principal Dashboard" />

      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Teachers</h1>
          <p className="text-sm text-gray-500 mt-0.5">{formatDisplayDate(date)}</p>
        </div>

        <div className="flex items-center gap-2 bg-white rounded-xl border border-gray-200 px-2 py-1.5">
          <button
            type="button"
            onClick={() => setDate((d) => addDays(d, -1))}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Previous day"
          >
            <ChevronLeft className="w-4 h-4 text-gray-500" />
          </button>
          <input
            type="date"
            value={date}
            max={today}
            onChange={(e) => e.target.value && setDate(e.target.value)}
            className="text-sm font-medium text-gray-700 border-none focus:outline-none bg-transparent"
          />
          <button
            type="button"
            onClick={() => setDate((d) => addDays(d, 1))}
            disabled={isToday}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="Next day"
          >
            <ChevronRight className="w-4 h-4 text-gray-500" />
          </button>
          {!isToday && (
            <button type="button" onClick={() => setDate(today)} className="text-xs font-semibold text-[#5B21B6] hover:underline px-2">
              Today
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-7 h-7 text-[#7C3AED] animate-spin" />
        </div>
      ) : isError || !data ? (
        <div className="flex items-center gap-3 bg-red-50 border border-red-100 rounded-2xl p-5">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
          <p className="text-sm font-semibold text-red-700">Couldn't load teacher data.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <StatCard icon={Users} label="Total Teachers" value={data.total} tone="bg-[#A855F7]/10 text-[#5B21B6]" />
            <StatCard icon={UserCheck} label="Present Today" value={data.presentCount} tone="bg-emerald-50 text-emerald-600" />
            <StatCard icon={CalendarOff} label="On Leave" value={data.onLeave.length} tone="bg-amber-50 text-amber-600" />
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-bold text-gray-900">Teachers on Leave</h2>
              <p className="text-xs text-gray-400 mt-0.5">Approved leave requests covering this date</p>
            </div>
            {data.onLeave.length === 0 ? (
              <div className="p-10 text-center">
                <p className="text-sm font-semibold text-gray-700">No teachers on leave</p>
                <p className="text-xs text-gray-400 mt-1">Everyone on the active roster is expected in today.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {data.onLeave.map((l) => (
                  <div key={l.leaveRequestId} className="flex items-center justify-between px-5 py-3.5">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{l.teacherName}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {l.leaveType === 'full_day' ? 'Full day' : 'Half day'}
                        {' · '}
                        {l.dateFrom === l.dateTo ? l.dateFrom : `${l.dateFrom} – ${l.dateTo}`}
                      </p>
                    </div>
                    <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full">On Leave</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </PageContainer>
  );
}
