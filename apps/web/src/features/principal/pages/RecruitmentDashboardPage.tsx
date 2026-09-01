import { useNavigate } from 'react-router-dom';
import { Loader2, Inbox, FileCheck2, Users, CalendarClock, AlertCircle, Video, DoorOpen } from 'lucide-react';
import { useRecruitmentDashboard } from '../hooks/usePrincipal';

// Reception Management Module SRD (docs/reception-management-module-srd.md),
// Module 7 — "One screen where the Principal can run hiring without
// switching between reception's CV inbox and their own calendar."

function StatTile({ icon: Icon, label, value, onClick }: { icon: typeof Inbox; label: string; value: number; onClick?: () => void }) {
  return (
    <button
      type="button" onClick={onClick} disabled={!onClick}
      className="flex flex-col items-start gap-2 bg-white rounded-2xl border border-gray-100 p-5 text-left disabled:cursor-default hover:border-gray-200 transition-colors"
    >
      <Icon className="w-5 h-5 text-[#5B21B6]" />
      <span className="text-2xl font-bold text-gray-900">{value}</span>
      <span className="text-xs text-gray-500">{label}</span>
    </button>
  );
}

export function RecruitmentDashboardPage() {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useRecruitmentDashboard();

  if (isLoading) {
    return <div className="flex items-center justify-center py-32"><Loader2 className="w-6 h-6 animate-spin text-[#5B21B6]" /></div>;
  }
  if (isError || !data) {
    return <div className="text-center py-32 text-red-600 text-sm">Failed to load the recruitment dashboard.</div>;
  }

  return (
    <div className="px-6 py-6 max-w-screen-xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Recruitment & Admissions</h1>
        <p className="text-sm text-gray-500">CVs, admission forms, and today's interviews, in one place</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatTile icon={Inbox} label="New inquiries today" value={data.counts.newInquiriesToday} onClick={() => navigate('/enquiries')} />
        <StatTile icon={FileCheck2} label="Forms pending verification" value={data.counts.formsPendingVerification} />
        <StatTile icon={Users} label="CVs awaiting review" value={data.counts.cvsAwaitingReview} onClick={() => navigate('/reception/candidates')} />
        <StatTile icon={CalendarClock} label="Interviews today" value={data.counts.interviewsToday} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="text-sm font-bold text-gray-700 mb-4">Today's Schedule</h2>
          {data.todaysSchedule.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Nothing on the schedule today.</p>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {data.todaysSchedule.map((item) => (
                <li key={item.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                  {item.type === 'interview' ? <Video className="w-4 h-4 text-[#5B21B6] shrink-0" /> : <DoorOpen className="w-4 h-4 text-blue-500 shrink-0" />}
                  <span className="text-sm font-semibold text-gray-700 w-16 shrink-0">{item.time}</span>
                  <span className="text-sm text-gray-600 truncate">{item.label}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="text-sm font-bold text-gray-700 mb-4">Needs Your Attention</h2>
          {data.needsAttention.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Nothing needs your attention right now.</p>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {data.needsAttention.map((item, i) => (
                <li key={i} className="flex items-center gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-100">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span className="text-sm text-amber-800">{item}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
