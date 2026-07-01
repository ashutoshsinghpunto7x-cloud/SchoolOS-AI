import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SchoolEvent, EventType } from '@schoolos/types';
import { EVENT_TYPE_COLOR } from './EventTypeBadge';

interface WeekViewProps {
  weekStart: Date;
  events: SchoolEvent[];
  onWeekChange: (delta: number) => void;
  onEventClick: (id: string) => void;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function toDateStr(d: Date): string {
  return d.toISOString().split('T')[0];
}

function getWeekDays(start: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d;
  });
}

function getEventsForDay(events: SchoolEvent[], dateStr: string): SchoolEvent[] {
  return events.filter((e) => {
    const start = e.startDate.split('T')[0];
    const end   = e.endDate.split('T')[0];
    return start <= dateStr && dateStr <= end;
  });
}

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

export const WeekView = ({ weekStart, events, onWeekChange, onEventClick }: WeekViewProps) => {
  const days  = getWeekDays(weekStart);
  const today = toDateStr(new Date());

  const weekLabel = (() => {
    const s = days[0];
    const e = days[6];
    if (s.getMonth() === e.getMonth()) {
      return `${s.getDate()}–${e.getDate()} ${MONTH_NAMES[s.getMonth()]} ${s.getFullYear()}`;
    }
    return `${s.getDate()} ${MONTH_NAMES[s.getMonth()]} – ${e.getDate()} ${MONTH_NAMES[e.getMonth()]} ${e.getFullYear()}`;
  })();

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <button
          type="button"
          onClick={() => onWeekChange(-1)}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h2 className="text-base font-bold text-gray-900">{weekLabel}</h2>
        <button
          type="button"
          onClick={() => onWeekChange(1)}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Columns */}
      <div className="grid grid-cols-7 divide-x divide-gray-100">
        {days.map((day) => {
          const dateStr   = toDateStr(day);
          const dayEvents = getEventsForDay(events, dateStr);
          const isToday   = dateStr === today;
          const isWeekend = day.getDay() === 0 || day.getDay() === 6;

          return (
            <div key={dateStr} className={cn('flex flex-col min-h-[240px]', isWeekend && 'bg-gray-50/50')}>
              {/* Day header */}
              <div className="py-2 text-center border-b border-gray-100">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">
                  {DAY_NAMES[day.getDay()]}
                </p>
                <div
                  className={cn(
                    'w-7 h-7 mx-auto mt-1 flex items-center justify-center rounded-full',
                    'text-sm font-bold',
                    isToday ? 'bg-blue-600 text-white' : (isWeekend ? 'text-gray-400' : 'text-gray-800'),
                  )}
                >
                  {day.getDate()}
                </div>
              </div>

              {/* Events */}
              <div className="flex flex-col gap-1 p-1.5 flex-1">
                {dayEvents.length === 0 && (
                  <p className="text-[10px] text-gray-300 text-center mt-4">—</p>
                )}
                {dayEvents.map((e) => (
                  <button
                    key={e._id}
                    type="button"
                    onClick={() => onEventClick(e._id)}
                    className={cn(
                      'text-left text-[10px] font-semibold text-white px-1.5 py-1 rounded',
                      'truncate w-full hover:brightness-110 transition-all',
                      EVENT_TYPE_COLOR[e.eventType as EventType],
                    )}
                  >
                    {!e.isAllDay && e.startTime && (
                      <span className="opacity-80 mr-1">{e.startTime}</span>
                    )}
                    {e.title}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
