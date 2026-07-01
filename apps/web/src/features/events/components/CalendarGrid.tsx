import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SchoolEvent, EventType } from '@schoolos/types';
import { EVENT_TYPE_COLOR } from './EventTypeBadge';

interface CalendarGridProps {
  year: number;
  month: number; // 1-12
  events: SchoolEvent[];
  onMonthChange: (year: number, month: number) => void;
  onDaySelect: (date: string) => void;
  selectedDate?: string;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function toDateStr(d: Date): string {
  return d.toISOString().split('T')[0];
}

function getDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = [];
  const date = new Date(year, month - 1, 1);
  while (date.getMonth() === month - 1) {
    days.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }
  return days;
}

function getEventsForDay(events: SchoolEvent[], dateStr: string): SchoolEvent[] {
  return events.filter((e) => {
    const start = e.startDate.split('T')[0];
    const end   = e.endDate.split('T')[0];
    return start <= dateStr && dateStr <= end;
  });
}

const MAX_DOTS = 3;

export const CalendarGrid = ({
  year, month, events, onMonthChange, onDaySelect, selectedDate,
}: CalendarGridProps) => {
  const days    = getDaysInMonth(year, month);
  const firstDow = new Date(year, month - 1, 1).getDay(); // 0=Sun
  const today    = toDateStr(new Date());

  function prev() {
    if (month === 1) onMonthChange(year - 1, 12);
    else onMonthChange(year, month - 1);
  }
  function next() {
    if (month === 12) onMonthChange(year + 1, 1);
    else onMonthChange(year, month + 1);
  }

  // Build grid cells: leading blanks + days
  const cells: (Date | null)[] = [
    ...Array<null>(firstDow).fill(null),
    ...days,
  ];
  // Pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <button
          type="button"
          onClick={prev}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h2 className="text-base font-bold text-gray-900">
          {MONTH_NAMES[month - 1]} {year}
        </h2>
        <button
          type="button"
          onClick={next}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 border-b border-gray-50">
        {DAY_NAMES.map((d) => (
          <div key={d} className="py-2 text-center text-xs font-bold text-gray-400 uppercase tracking-wide">
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7">
        {cells.map((day, idx) => {
          if (!day) {
            return <div key={`blank-${idx}`} className="min-h-[72px] border-b border-r border-gray-50 last:border-r-0" />;
          }

          const dateStr = toDateStr(day);
          const dayEvents = getEventsForDay(events, dateStr);
          const isToday    = dateStr === today;
          const isSelected = dateStr === selectedDate;
          const isWeekend  = day.getDay() === 0 || day.getDay() === 6;
          const shown      = dayEvents.slice(0, MAX_DOTS);
          const overflow   = dayEvents.length - MAX_DOTS;

          return (
            <button
              key={dateStr}
              type="button"
              onClick={() => onDaySelect(dateStr)}
              className={cn(
                'min-h-[72px] p-1.5 flex flex-col items-start border-b border-r border-gray-50 last:border-r-0',
                'hover:bg-gray-50 transition-colors text-left',
                isSelected && 'bg-blue-50',
                isWeekend && !isSelected && 'bg-gray-50/50',
              )}
            >
              <span
                className={cn(
                  'w-6 h-6 text-xs font-semibold flex items-center justify-center rounded-full mb-1',
                  isToday    && 'bg-blue-600 text-white',
                  isSelected && !isToday && 'bg-blue-100 text-blue-700',
                  !isToday && !isSelected && (isWeekend ? 'text-gray-400' : 'text-gray-700'),
                )}
              >
                {day.getDate()}
              </span>

              <div className="flex flex-col gap-0.5 w-full">
                {shown.map((e) => (
                  <span
                    key={e._id}
                    className={cn(
                      'text-[10px] font-medium px-1 py-px rounded text-white truncate w-full',
                      EVENT_TYPE_COLOR[e.eventType as EventType],
                    )}
                  >
                    {e.title}
                  </span>
                ))}
                {overflow > 0 && (
                  <span className="text-[10px] font-medium text-blue-600 px-1">
                    +{overflow} more
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
