import { useNavigate } from 'react-router-dom';
import { ArrowLeft, PhoneCall, CheckCircle2, CalendarClock, User } from 'lucide-react';
import type { FollowUp, FollowUpChannel } from '@schoolos/types';
import { useFollowUps, useCompleteFollowUp, useRescheduleFollowUp } from '@/features/enquiries/hooks/useFollowUps';

const CHANNEL_LABEL: Record<FollowUpChannel, string> = {
  call: 'Call', whatsapp: 'WhatsApp', email: 'Email', in_person: 'In Person',
};

function fmtDue(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const time = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  return isToday ? `Today, ${time}` : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) + `, ${time}`;
}

function todayEndISO(): string {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
}

// Reception Management Module SRD, Module 4 — "Daily reminder list:
// everything due today, sorted by overdue-first." Splits pending follow-ups
// into Overdue (dueDate already passed) and Due Today, since that split is
// the entire point of a follow-up dashboard reception actually opens.
function FollowUpRow({ followUp, overdue }: { followUp: FollowUp; overdue: boolean }) {
  const navigate = useNavigate();
  const completeFollowUp = useCompleteFollowUp();
  const rescheduleFollowUp = useRescheduleFollowUp();

  function handleComplete() {
    completeFollowUp.mutate({ id: followUp._id, payload: {} });
  }

  function handleReschedule() {
    const input = window.prompt('Reschedule to (YYYY-MM-DD HH:MM):');
    if (!input?.trim()) return;
    const next = new Date(input.trim());
    if (isNaN(next.getTime())) return;
    rescheduleFollowUp.mutate({ id: followUp._id, payload: { nextFollowUpDate: next.toISOString() } });
  }

  return (
    <li className={`flex flex-wrap items-center gap-3 border rounded-lg p-3 ${overdue ? 'border-red-200 bg-red-50/40' : 'border-gray-100'}`}>
      <div className="min-w-0 flex-1">
        <button
          onClick={() => navigate(`/enquiries/${followUp.enquiryId}`)}
          className="text-sm font-semibold text-gray-900 hover:underline decoration-dotted flex items-center gap-1.5"
        >
          <User className="w-3.5 h-3.5 text-gray-400" />
          {followUp.enquirySummary?.studentName ?? 'Enquiry'}
        </button>
        <p className={`text-xs mt-0.5 flex items-center gap-1.5 ${overdue ? 'text-red-500 font-semibold' : 'text-gray-400'}`}>
          <CalendarClock className="w-3 h-3" /> {fmtDue(followUp.dueDate)}
          <span className="text-gray-400"> · <PhoneCall className="w-3 h-3 inline" /> {CHANNEL_LABEL[followUp.channel]}</span>
          {followUp.enquirySummary?.parentPhone && (
            <span className="text-gray-400"> · {followUp.enquirySummary.parentName} · {followUp.enquirySummary.parentPhone}</span>
          )}
        </p>
      </div>
      <div className="flex items-center gap-1.5">
        <button
          type="button" onClick={handleReschedule} disabled={rescheduleFollowUp.isPending}
          className="h-8 px-2.5 rounded-md border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50"
        >
          Reschedule
        </button>
        <button
          type="button" onClick={handleComplete} disabled={completeFollowUp.isPending}
          className="inline-flex items-center gap-1 h-8 px-2.5 rounded-md bg-green-600 hover:bg-green-500 text-white text-xs font-semibold disabled:opacity-50"
        >
          <CheckCircle2 className="w-3.5 h-3.5" /> Done
        </button>
      </div>
    </li>
  );
}

export function FollowUpDashboardPage() {
  const navigate = useNavigate();

  // Both queries pull every pending follow-up due by end of today; the split
  // into Overdue/Due Today happens client-side against "now", since a
  // follow-up crosses from "due today" to "overdue" continuously through
  // the day, not at a fixed server-side boundary.
  const { data, isLoading, isError } = useFollowUps({ status: 'pending', dueBy: todayEndISO(), limit: 100 });
  const { data: missedData } = useFollowUps({ status: 'missed', limit: 100 });

  const pending = data?.data ?? [];
  const missed = missedData?.data ?? [];
  const now = Date.now();
  const overdue = [...pending.filter((f) => new Date(f.dueDate).getTime() < now), ...missed];
  const dueToday = pending.filter((f) => new Date(f.dueDate).getTime() >= now);

  return (
    <div className="min-h-screen bg-[#F5F5F7] p-4 sm:p-6">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/reception')}
          className="p-2 rounded-lg hover:bg-white border border-transparent hover:border-gray-200 transition-colors"
          aria-label="Back"
        >
          <ArrowLeft className="w-4 h-4 text-gray-600" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Today's Follow-ups</h1>
          <p className="text-sm text-gray-500">Every pending admission lead follow-up, overdue first</p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2 animate-pulse">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 bg-white rounded-xl border border-gray-200" />)}
        </div>
      ) : isError ? (
        <div className="text-center py-10 text-red-600 text-sm">Failed to load follow-ups.</div>
      ) : (
        <div className="flex flex-col gap-5">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-bold text-red-600 mb-3">
              Overdue <span className="text-gray-400 font-normal">({overdue.length})</span>
            </h2>
            {overdue.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">Nothing overdue.</p>
            ) : (
              <ul className="space-y-2">
                {overdue.map((f) => <FollowUpRow key={f._id} followUp={f} overdue />)}
              </ul>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-bold text-gray-900 mb-3">
              Due Today <span className="text-gray-400 font-normal">({dueToday.length})</span>
            </h2>
            {dueToday.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">Nothing else due today.</p>
            ) : (
              <ul className="space-y-2">
                {dueToday.map((f) => <FollowUpRow key={f._id} followUp={f} overdue={false} />)}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
