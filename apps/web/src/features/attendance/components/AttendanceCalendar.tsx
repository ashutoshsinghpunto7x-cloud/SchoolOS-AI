import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Attendance, AttendanceStatus } from '@schoolos/types';

interface Props {
  records: Attendance[];
  loading?: boolean;
}

const STATUS_COLOR: Record<AttendanceStatus, string> = {
  present:        'bg-green-500',
  absent:         'bg-red-500',
  late:           'bg-yellow-400',
  half_day:       'bg-orange-400',
  leave_approved: 'bg-blue-400',
};

const STATUS_LABEL: Record<AttendanceStatus, string> = {
  present:        'Present',
  absent:         'Absent',
  late:           'Late',
  half_day:       'Half Day',
  leave_approved: 'Leave',
};

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function buildCalendarDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days: (number | null)[] = Array(firstDay).fill(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);
  return days;
}

export function AttendanceCalendar({ records, loading }: Props) {
  const today = new Date();
  const [year, setYear]   = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const recordMap = new Map<string, AttendanceStatus>();
  for (const r of records) recordMap.set(r.date, r.status);

  const days = buildCalendarDays(year, month);

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  }

  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  }

  const monthLabel = new Date(year, month).toLocaleString('default', { month: 'long', year: 'numeric' });

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-32 mb-4" />
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="h-8 bg-gray-100 rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      {/* Month nav */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={prevMonth}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          aria-label="Previous month"
        >
          <ChevronLeft className="w-4 h-4 text-gray-600" />
        </button>
        <span className="text-sm font-semibold text-gray-900">{monthLabel}</span>
        <button
          onClick={nextMonth}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          aria-label="Next month"
        >
          <ChevronRight className="w-4 h-4 text-gray-600" />
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {DOW.map((d) => (
          <div key={d} className="text-center text-xs font-medium text-gray-400">{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, i) => {
          if (day === null) return <div key={`e-${i}`} />;

          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const status  = recordMap.get(dateStr);
          const isToday = dateStr === today.toISOString().split('T')[0];

          return (
            <div
              key={dateStr}
              title={status ? STATUS_LABEL[status] : undefined}
              className={`relative flex items-center justify-center h-8 rounded-lg text-xs font-medium
                ${isToday ? 'ring-2 ring-[#A855F7] ring-offset-1' : ''}
                ${status ? `${STATUS_COLOR[status]} text-white` : 'text-gray-700 hover:bg-gray-50'}`}
            >
              {day}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-gray-100">
        {(Object.entries(STATUS_LABEL) as [AttendanceStatus, string][]).map(([s, label]) => (
          <div key={s} className="flex items-center gap-1.5">
            <span className={`w-3 h-3 rounded-sm ${STATUS_COLOR[s]}`} />
            <span className="text-xs text-gray-600">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
