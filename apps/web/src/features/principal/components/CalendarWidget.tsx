import { CalendarDays } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { PrincipalUpcomingEvent } from '@schoolos/types';

const EVENT_TYPE_COLOR: Record<string, string> = {
  holiday:       'bg-green-100 text-green-700',
  ptm:           'bg-[#A855F7]/20 text-[#4C1D95]',
  examination:   'bg-red-100 text-red-700',
  school_event:  'bg-purple-100 text-purple-700',
  staff_meeting: 'bg-[#A855F7]/20 text-[#4C1D95]',
  fee_due_date:  'bg-amber-100 text-amber-700',
  admission_event:'bg-emerald-100 text-emerald-700',
  general:       'bg-gray-100 text-gray-600',
};

const EVENT_TYPE_LABEL: Record<string, string> = {
  holiday:       'Holiday',
  ptm:           'PTM',
  examination:   'Exam',
  school_event:  'Event',
  staff_meeting: 'Meeting',
  fee_due_date:  'Fee Due',
  admission_event:'Admission',
  general:       'General',
};

const isToday = (dateStr: string) => {
  return new Date().toISOString().split('T')[0] === dateStr;
};

interface Props {
  events: PrincipalUpcomingEvent[];
  isLoading?: boolean;
}

export const CalendarWidget = ({ events, isLoading }: Props) => {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="space-y-2 animate-pulse">
        {[1, 2, 3].map((i) => <div key={i} className="h-12 bg-gray-100 rounded-xl" />)}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-6 text-center">
        <CalendarDays className="w-8 h-8 text-gray-300 mb-2" strokeWidth={1.5} />
        <p className="text-sm text-gray-400">No events in the next 14 days.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {events.map((ev) => {
        const today = isToday(ev.startDate);
        const colorClass = EVENT_TYPE_COLOR[ev.eventType] ?? EVENT_TYPE_COLOR.general;
        const typeLabel = EVENT_TYPE_LABEL[ev.eventType] ?? ev.eventType;

        return (
          <div
            key={ev.id}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors"
            onClick={() => navigate('/calendar')}
          >
            <div className="flex-shrink-0 text-center w-9">
              <p className="text-[11px] font-bold text-gray-400 uppercase leading-none">
                {new Date(ev.startDate + 'T00:00:00').toLocaleDateString('en-IN', { month: 'short' })}
              </p>
              <p className="text-base font-bold text-gray-900 leading-tight">
                {new Date(ev.startDate + 'T00:00:00').getDate()}
              </p>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{ev.title}</p>
              {today && <p className="text-[11px] text-[#5B21B6] font-medium">Today</p>}
            </div>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${colorClass}`}>
              {typeLabel}
            </span>
          </div>
        );
      })}
    </div>
  );
};
