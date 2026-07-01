import { MapPin, Clock, Users, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { SchoolEvent } from '@schoolos/types';
import { EventStatusBadge } from './EventStatusBadge';
import { EventTypeBadge, EVENT_TYPE_COLOR } from './EventTypeBadge';

interface EventCardProps {
  event: SchoolEvent;
}

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

const AUDIENCE_LABEL: Record<string, string> = {
  all: 'Everyone', students: 'Students', teachers: 'Teachers',
  parents: 'Parents', staff: 'Staff',
};

export const EventCard = ({ event }: EventCardProps) => {
  const navigate = useNavigate();

  const isMultiDay =
    new Date(event.startDate).toDateString() !== new Date(event.endDate).toDateString();

  const dateLabel = isMultiDay
    ? `${fmtDate(event.startDate)} – ${fmtDate(event.endDate)}`
    : fmtDate(event.startDate);

  const audienceLabel = event.audience
    .map((a) => AUDIENCE_LABEL[a] ?? a)
    .join(', ');

  return (
    <div
      onClick={() => navigate(`/calendar/${event._id}`)}
      className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5
                 transition-all duration-200 ease-out p-5 cursor-pointer flex gap-4"
    >
      <div className={`w-1 rounded-full flex-shrink-0 ${EVENT_TYPE_COLOR[event.eventType]}`} />

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-base font-bold text-gray-900 leading-tight">{event.title}</h3>
          <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0 mt-0.5" />
        </div>

        <div className="flex flex-wrap gap-2 mt-2">
          <EventTypeBadge type={event.eventType} />
          <EventStatusBadge status={event.status} />
        </div>

        <div className="flex flex-col gap-1 mt-3">
          <div className="flex items-center gap-1.5 text-sm text-gray-500">
            <Clock className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{dateLabel}</span>
            {!event.isAllDay && event.startTime && (
              <span className="text-gray-400">· {event.startTime}{event.endTime ? ` – ${event.endTime}` : ''}</span>
            )}
          </div>

          {event.location && (
            <div className="flex items-center gap-1.5 text-sm text-gray-500">
              <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">{event.location}</span>
            </div>
          )}

          <div className="flex items-center gap-1.5 text-sm text-gray-500">
            <Users className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{audienceLabel}</span>
          </div>
        </div>

        {event.description && (
          <p className="text-sm text-gray-400 mt-2 line-clamp-2">{event.description}</p>
        )}
      </div>
    </div>
  );
};
