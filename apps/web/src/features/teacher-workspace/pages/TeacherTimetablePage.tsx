import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, CalendarCheck } from 'lucide-react';
import { useMyTeacherTimetable } from '@/features/timetable/hooks/useTeacherTimetable';
import { usePeriodSlots } from '@/features/timetable/hooks/useTimetable';
import type { TeacherTimetableEntry } from '@schoolos/types';

const DAY_LABELS = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_FULL   = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function currentDayOfWeek(): number {
  const d = new Date().getDay(); // 0=Sun
  return d === 0 ? 7 : d;        // 1=Mon…7=Sun
}

function EntryCard({ entry, startTime, endTime }: { entry: TeacherTimetableEntry; startTime?: string; endTime?: string }) {
  const hasTime = Boolean(startTime && endTime);
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3">
      <div className="w-14 shrink-0 text-center">
        {hasTime ? (
          <>
            <p className="text-xs font-bold text-[#5B21B6]">{startTime}</p>
            <p className="text-xs text-gray-400">{endTime}</p>
          </>
        ) : (
          <p className="text-xs text-gray-300">—</p>
        )}
      </div>
      <div className="w-px h-10 bg-gray-100 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-gray-900 truncate">{entry.subjectName}</p>
        {(entry.class || entry.section) && (
          <p className="text-xs text-gray-500">Class {entry.class ?? '—'} – {entry.section ?? '—'}</p>
        )}
      </div>
      <div className="shrink-0 text-right">
        {entry.roomNumber ? (
          <p className="text-xs font-semibold text-gray-500">Room {entry.roomNumber}</p>
        ) : (
          <p className="text-xs text-gray-300">No room</p>
        )}
      </div>
    </div>
  );
}

export function TeacherTimetablePage() {
  const navigate = useNavigate();
  const { data: tt, isLoading: ttLoading } = useMyTeacherTimetable();
  const { data: slots = [], isLoading: slotsLoading } = usePeriodSlots();
  const isLoading = ttLoading || slotsLoading;

  const slotMap = useMemo(() => new Map(slots.map((s) => [s._id, s])), [slots]);

  const todayDow = currentDayOfWeek();
  const [activeDay, setActiveDay] = useState(Math.min(todayDow, 6)); // clamp to Mon-Sat

  const entriesByDay = useMemo(() => {
    const map = new Map<number, TeacherTimetableEntry[]>();
    for (const e of tt?.entries ?? []) {
      const list = map.get(e.dayOfWeek) ?? [];
      list.push(e);
      map.set(e.dayOfWeek, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => (slotMap.get(a.slotId)?.startTime ?? '').localeCompare(slotMap.get(b.slotId)?.startTime ?? ''));
    }
    return map;
  }, [tt, slotMap]);

  const activeDayEntries = entriesByDay.get(activeDay) ?? [];

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-4 flex items-center gap-3">
        <button
          onClick={() => navigate('/teacher')}
          className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold text-gray-900">My Timetable</h1>
          <p className="text-xs text-gray-500">{DAY_FULL[activeDay]}</p>
        </div>
      </div>

      {/* Day tabs */}
      <div className="bg-white border-b border-gray-100 px-4 py-3">
        <div className="flex gap-2 overflow-x-auto pb-0.5">
          {[1, 2, 3, 4, 5, 6].map((day) => {
            const isToday   = day === todayDow;
            const isActive  = day === activeDay;
            const hasClass  = (entriesByDay.get(day)?.length ?? 0) > 0;
            return (
              <button
                key={day}
                onClick={() => setActiveDay(day)}
                className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-colors relative ${
                  isActive
                    ? 'bg-[#5B21B6] text-white'
                    : isToday
                    ? 'bg-[#A855F7]/10 text-[#5B21B6]'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {DAY_LABELS[day]}
                {hasClass && !isActive && (
                  <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-[#A855F7] rounded-full" />
                )}
                {isToday && !isActive && (
                  <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-[#5B21B6] rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-4 py-4">
        {isLoading ? (
          <div className="space-y-3 animate-pulse">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 bg-white rounded-2xl" />
            ))}
          </div>
        ) : !tt ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center mt-4">
            <BookOpen className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">Your timetable hasn't been set up yet</p>
            <p className="text-xs text-gray-400 mt-1">Ask your Principal to build it.</p>
          </div>
        ) : activeDayEntries.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center mt-4">
            <BookOpen className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No classes on {DAY_FULL[activeDay]}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeDay === todayDow && (
              <div className="flex items-center gap-2 bg-[#A855F7]/10 border border-[#A855F7]/20 rounded-2xl px-4 py-2.5">
                <CalendarCheck className="w-4 h-4 text-[#5B21B6] shrink-0" />
                <p className="text-sm text-[#5B21B6] font-medium">Today's schedule</p>
              </div>
            )}
            {activeDayEntries.map((entry) => {
              const slot = slotMap.get(entry.slotId);
              return (
                <EntryCard
                  key={`${entry.slotId}-${entry.class}-${entry.section}`}
                  entry={entry}
                  startTime={slot?.startTime}
                  endTime={slot?.endTime}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
