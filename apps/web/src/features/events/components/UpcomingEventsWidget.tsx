import { useNavigate } from 'react-router-dom';
import { CalendarDays, ChevronRight } from 'lucide-react';
import { useUpcomingEvents } from '../hooks/useEvents';

const EVENT_TYPE_COLOR: Record<string, string> = {
  holiday:         'bg-green-100 text-green-700',
  ptm:             'bg-blue-100 text-blue-700',
  examination:     'bg-red-100 text-red-700',
  school_event:    'bg-purple-100 text-purple-700',
  staff_meeting:   'bg-indigo-100 text-indigo-700',
  fee_due_date:    'bg-amber-100 text-amber-700',
  admission_event: 'bg-emerald-100 text-emerald-700',
  general:         'bg-gray-100 text-gray-600',
};

const EVENT_TYPE_LABEL: Record<string, string> = {
  holiday:         'Holiday',
  ptm:             'PTM',
  examination:     'Exam',
  school_event:    'Event',
  staff_meeting:   'Meeting',
  fee_due_date:    'Fee Due',
  admission_event: 'Admission',
  general:         'Notice',
};

const isToday = (dateStr: string) => new Date().toISOString().split('T')[0] === dateStr.split('T')[0];

interface UpcomingEventsWidgetProps {
  /** Tailwind class for the section title + "View all" accent (defaults to purple). */
  accentClassName?: string;
  limit?: number;
  days?: number;
}

export function UpcomingEventsWidget({
  accentClassName = 'text-[#5B21B6]',
  limit = 5,
  days = 14,
}: UpcomingEventsWidgetProps) {
  const navigate = useNavigate();
  const { data: events, isLoading } = useUpcomingEvents({ limit, days });

  return (
    <section>
      <div className="flex items-center justify-between mb-3 px-1">
        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest">
          Upcoming Events
        </h2>
        <button
          type="button"
          onClick={() => navigate('/calendar')}
          className={`text-xs font-semibold flex items-center gap-0.5 hover:underline ${accentClassName}`}
        >
          View all
          <ChevronRight className="w-3 h-3" />
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-2">
        {isLoading ? (
          <div className="space-y-2 p-2 animate-pulse">
            {[1, 2, 3].map((i) => <div key={i} className="h-12 bg-gray-100 rounded-xl" />)}
          </div>
        ) : !events || events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <CalendarDays className="w-8 h-8 text-gray-300 mb-2" strokeWidth={1.5} />
            <p className="text-sm text-gray-400">No events in the next {days} days.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {events.map((ev) => {
              const today = isToday(ev.startDate);
              const colorClass = EVENT_TYPE_COLOR[ev.eventType] ?? EVENT_TYPE_COLOR.general;
              const typeLabel = EVENT_TYPE_LABEL[ev.eventType] ?? ev.eventType;

              return (
                <button
                  key={ev._id}
                  type="button"
                  onClick={() => navigate(`/calendar/${ev._id}`)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="flex-shrink-0 text-center w-9">
                    <p className="text-[11px] font-bold text-gray-400 uppercase leading-none">
                      {new Date(ev.startDate.split('T')[0] + 'T00:00:00').toLocaleDateString('en-IN', { month: 'short' })}
                    </p>
                    <p className="text-base font-bold text-gray-900 leading-tight">
                      {new Date(ev.startDate.split('T')[0] + 'T00:00:00').getDate()}
                    </p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{ev.title}</p>
                    {today && <p className="text-[11px] text-emerald-600 font-medium">Today</p>}
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${colorClass}`}>
                    {typeLabel}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
