import { useState } from 'react';
import { Loader2, Plus, PhoneCall, CheckCircle2, CalendarClock, Trash2 } from 'lucide-react';
import type { FollowUpChannel } from '@schoolos/types';
import { useFollowUps, useCreateFollowUp, useCompleteFollowUp, useRescheduleFollowUp, useDeleteFollowUp } from '../hooks/useFollowUps';

interface FollowUpPanelProps {
  enquiryId: string;
}

const CHANNEL_LABEL: Record<FollowUpChannel, string> = {
  call: 'Call', whatsapp: 'WhatsApp', email: 'Email', in_person: 'In Person',
};

const STATUS_STYLES: Record<string, string> = {
  pending:     'bg-blue-50 text-blue-700 border-blue-200',
  completed:   'bg-green-50 text-green-700 border-green-200',
  missed:      'bg-red-50 text-red-700 border-red-200',
  rescheduled: 'bg-gray-100 text-gray-500 border-gray-200',
};

const fmtDateTime = (d: string) =>
  new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

function toDatetimeLocal(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export const FollowUpPanel = ({ enquiryId }: FollowUpPanelProps) => {
  const [scheduling, setScheduling] = useState(false);
  const [dueDate, setDueDate] = useState(toDatetimeLocal(new Date()));
  const [channel, setChannel] = useState<FollowUpChannel>('call');

  const { data, isLoading } = useFollowUps({ enquiryId, limit: 50 });
  const createFollowUp = useCreateFollowUp();
  const completeFollowUp = useCompleteFollowUp();
  const rescheduleFollowUp = useRescheduleFollowUp();
  const deleteFollowUp = useDeleteFollowUp();

  const followUps = data?.data ?? [];
  const hasPending = followUps.some((f) => f.status === 'pending');

  function handleSchedule() {
    createFollowUp.mutate(
      { enquiryId, dueDate: new Date(dueDate).toISOString(), channel },
      { onSuccess: () => setScheduling(false) },
    );
  }

  function handleComplete(id: string) {
    const scheduleNext = window.confirm('Mark as done. Schedule a next follow-up too?');
    if (!scheduleNext) {
      completeFollowUp.mutate({ id, payload: {} });
      return;
    }
    const input = window.prompt('Next follow-up date/time (YYYY-MM-DD HH:MM):');
    if (!input?.trim()) { completeFollowUp.mutate({ id, payload: {} }); return; }
    const next = new Date(input.trim());
    if (isNaN(next.getTime())) { completeFollowUp.mutate({ id, payload: {} }); return; }
    completeFollowUp.mutate({ id, payload: { nextFollowUpDate: next.toISOString() } });
  }

  function handleReschedule(id: string) {
    const input = window.prompt('Reschedule to (YYYY-MM-DD HH:MM):');
    if (!input?.trim()) return;
    const next = new Date(input.trim());
    if (isNaN(next.getTime())) return;
    rescheduleFollowUp.mutate({ id, payload: { nextFollowUpDate: next.toISOString() } });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-700">
          Follow-ups <span className="text-gray-400 font-normal">({followUps.length})</span>
        </h3>
        {!scheduling && !hasPending && (
          <button
            type="button"
            onClick={() => setScheduling(true)}
            className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-blue-50 hover:bg-blue-100
                       text-xs font-semibold text-blue-600 border border-blue-200 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Schedule
          </button>
        )}
      </div>

      {scheduling && (
        <div className="flex flex-col gap-2 p-3 rounded-xl bg-gray-50 border border-gray-100">
          <input
            type="datetime-local"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full h-9 px-2.5 rounded-lg border border-gray-200 text-sm"
          />
          <select
            value={channel}
            onChange={(e) => setChannel(e.target.value as FollowUpChannel)}
            className="w-full h-9 px-2.5 rounded-lg border border-gray-200 text-sm bg-white"
          >
            <option value="call">Call</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="email">Email</option>
            <option value="in_person">In Person</option>
          </select>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setScheduling(false)} className="h-8 px-3 rounded-lg border border-gray-200 text-sm text-gray-500 hover:bg-gray-50">
              Cancel
            </button>
            <button
              type="button" onClick={handleSchedule} disabled={createFollowUp.isPending}
              className="h-8 px-3 rounded-lg bg-[#5B21B6] hover:bg-[#4C1D95] flex items-center gap-1.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {createFollowUp.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CalendarClock className="w-3.5 h-3.5" />}
              Schedule
            </button>
          </div>
        </div>
      )}

      {followUps.length === 0 && !scheduling ? (
        <p className="text-sm text-gray-400 text-center py-4">No follow-ups scheduled yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {followUps.map((f) => (
            <div key={f._id} className="flex flex-col gap-2 p-3 rounded-xl bg-gray-50 border border-gray-100">
              <div className="flex items-center justify-between gap-2">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${STATUS_STYLES[f.status]}`}>
                  {f.status}
                </span>
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <PhoneCall className="w-3 h-3" /> {CHANNEL_LABEL[f.channel]}
                </span>
              </div>
              <p className="text-sm text-gray-800">{fmtDateTime(f.dueDate)}</p>
              {f.outcome && <p className="text-xs text-gray-500 italic">"{f.outcome}"</p>}
              {f.status === 'pending' && (
                <div className="flex gap-2 justify-end">
                  <button
                    type="button" onClick={() => handleReschedule(f._id)}
                    className="h-7 px-2.5 rounded-md border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-white"
                  >
                    Reschedule
                  </button>
                  <button
                    type="button" onClick={() => handleComplete(f._id)}
                    disabled={completeFollowUp.isPending}
                    className="h-7 px-2.5 rounded-md bg-green-600 hover:bg-green-500 text-white text-xs font-semibold flex items-center gap-1 disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-3 h-3" /> Done
                  </button>
                  <button
                    type="button" onClick={() => deleteFollowUp.mutate(f._id)}
                    disabled={deleteFollowUp.isPending}
                    className="h-7 px-2 rounded-md text-red-400 hover:bg-red-50 disabled:opacity-50"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
