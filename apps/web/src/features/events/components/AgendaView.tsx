import { useNavigate } from 'react-router-dom';
import { CalendarDays, MapPin, Clock } from 'lucide-react';
import type { SchoolEvent } from '@schoolos/types';
import { EventTypeBadge, EVENT_TYPE_COLOR } from './EventTypeBadge';
import { EventStatusBadge } from './EventStatusBadge';

interface AgendaViewProps {
  events: SchoolEvent[];
}

// ── Date helpers (mirrors CommunicationTimeline pattern) ──────────────────────

function toLocalDateStr(iso: string): string {
  return new Date(iso).toLocaleDateString('en-CA'); // YYYY-MM-DD in local TZ
}

function getDayLabel(dateStr: string): string {
  const d     = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - today.getTime()) / 86_400_000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  return d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function groupByDay(events: SchoolEvent[]): Map<string, SchoolEvent[]> {
  const map = new Map<string, SchoolEvent[]>();
  for (const e of events) {
    const key = toLocalDateStr(e.startDate);
    const arr = map.get(key) ?? [];
    arr.push(e);
    map.set(key, arr);
  }
  return map;
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ── Component ─────────────────────────────────────────────────────────────────

export const AgendaView = ({ events }: AgendaViewProps) => {
  const navigate = useNavigate();

  if (!events.length) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
        <CalendarDays className="w-12 h-12 text-gray-200" />
        <p className="text-gray-400 text-sm font-medium">No events found</p>
        <p className="text-gray-300 text-xs">Try adjusting your filters or adding a new event</p>
      </div>
    );
  }

  const sorted = [...events].sort(
    (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
  );
  const groups = groupByDay(sorted);

  return (
    <div className="flex flex-col gap-6">
      {Array.from(groups.entries()).map(([dateStr, dayEvents]) => (
        <div key={dateStr}>
          {/* Day header */}
          <div className="flex items-center gap-3 mb-3">
            <span className="text-sm font-bold text-gray-700">{getDayLabel(dateStr)}</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          {/* Events for this day */}
          <div className="flex flex-col gap-3">
            {dayEvents.map((event) => {
              const isMultiDay =
                toLocalDateStr(event.startDate) !== toLocalDateStr(event.endDate);

              return (
                <div
                  key={event._id}
                  onClick={() => navigate(`/calendar/${event._id}`)}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm
                             hover:shadow-md hover:-translate-y-0.5 transition-all duration-200
                             p-4 cursor-pointer flex gap-4"
                >
                  <div className={`w-1 rounded-full flex-shrink-0 ${EVENT_TYPE_COLOR[event.eventType]}`} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <h3 className="text-sm font-bold text-gray-900">{event.title}</h3>
                      <div className="flex gap-2 flex-wrap">
                        <EventTypeBadge type={event.eventType} />
                        <EventStatusBadge status={event.status} />
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <Clock className="w-3.5 h-3.5" />
                        {isMultiDay
                          ? `${fmtDate(event.startDate)} – ${fmtDate(event.endDate)}`
                          : event.isAllDay
                          ? 'All day'
                          : event.startTime
                          ? `${event.startTime}${event.endTime ? ` – ${event.endTime}` : ''}`
                          : 'All day'}
                      </span>
                      {event.location && (
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <MapPin className="w-3.5 h-3.5" />
                          {event.location}
                        </span>
                      )}
                    </div>

                    {event.description && (
                      <p className="text-xs text-gray-400 mt-1.5 line-clamp-2">{event.description}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};
