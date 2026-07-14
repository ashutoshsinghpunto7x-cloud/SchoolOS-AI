import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CalendarCheck } from 'lucide-react';
import { useMyTeacherTimetable } from '@/features/timetable/hooks/useTeacherTimetable';
import { usePeriodSlots } from '@/features/timetable/hooks/useTimetable';
import type { TeacherTimetableEntry } from '@schoolos/types';

const DAY_LABELS = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_FULL   = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function currentDayOfWeek(): number {
  const d = new Date().getDay();
  return d === 0 ? 7 : d;
}

// Subject color palette — cycles through a set of warm/cool pairs
const SUBJECT_COLORS = [
  { bg: 'bg-violet-100', text: 'text-violet-700', dot: 'bg-violet-400', border: 'border-violet-200' },
  { bg: 'bg-pink-100',   text: 'text-pink-700',   dot: 'bg-pink-400',   border: 'border-pink-200'   },
  { bg: 'bg-emerald-100',text: 'text-emerald-700',dot: 'bg-emerald-400',border: 'border-emerald-200'},
  { bg: 'bg-amber-100',  text: 'text-amber-700',  dot: 'bg-amber-400',  border: 'border-amber-200'  },
  { bg: 'bg-sky-100',    text: 'text-sky-700',    dot: 'bg-sky-400',    border: 'border-sky-200'    },
  { bg: 'bg-rose-100',   text: 'text-rose-700',   dot: 'bg-rose-400',   border: 'border-rose-200'   },
  { bg: 'bg-teal-100',   text: 'text-teal-700',   dot: 'bg-teal-400',   border: 'border-teal-200'   },
  { bg: 'bg-indigo-100', text: 'text-indigo-700', dot: 'bg-indigo-400', border: 'border-indigo-200' },
];

function colorForSubject(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return SUBJECT_COLORS[Math.abs(hash) % SUBJECT_COLORS.length];
}

function EntryCard({
  entry,
  startTime,
  endTime,
  isCurrentPeriod,
}: {
  entry: TeacherTimetableEntry;
  startTime?: string;
  endTime?: string;
  isCurrentPeriod: boolean;
}) {
  const color = colorForSubject(entry.subjectName);
  return (
    <div
      className={`relative flex items-center gap-4 rounded-2xl border px-4 py-4 shadow-sm transition-all ${
        isCurrentPeriod
          ? 'bg-gradient-to-r from-[#5B21B6] to-[#DB2777] border-transparent text-white shadow-lg shadow-violet-500/20'
          : `bg-white dark:bg-[#150C29] ${color.border} dark:border-white/10`
      }`}
    >
      {/* Time column */}
      <div className="w-14 shrink-0 text-center">
        {startTime ? (
          <>
            <p className={`text-xs font-bold ${isCurrentPeriod ? 'text-white/90' : `${color.text} dark:text-white/80`}`}>{startTime}</p>
            <p className={`text-[10px] mt-0.5 ${isCurrentPeriod ? 'text-white/60' : 'text-gray-400 dark:text-white/40'}`}>{endTime}</p>
          </>
        ) : (
          <p className="text-xs text-gray-300 dark:text-white/20">—</p>
        )}
      </div>

      {/* Divider */}
      <div className={`w-px h-10 shrink-0 ${isCurrentPeriod ? 'bg-white/30' : 'bg-gray-100 dark:bg-white/10'}`} />

      {/* Subject + class */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-bold truncate ${isCurrentPeriod ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
          {entry.subjectName}
        </p>
        {(entry.class || entry.section) && (
          <p className={`text-xs mt-0.5 ${isCurrentPeriod ? 'text-white/70' : 'text-gray-500 dark:text-white/50'}`}>
            Class {entry.class ?? '—'} – {entry.section ?? '—'}
          </p>
        )}
      </div>

      {/* Room tag */}
      <div className="shrink-0">
        {entry.roomNumber ? (
          <span
            className={`text-[10px] font-bold px-2 py-1 rounded-lg ${
              isCurrentPeriod ? 'bg-white/20 text-white' : `${color.bg} dark:bg-white/10 ${color.text} dark:text-white/70`
            }`}
          >
            Rm {entry.roomNumber}
          </span>
        ) : null}
      </div>

      {isCurrentPeriod && (
        <span className="absolute -top-2 -right-2 text-[9px] font-bold bg-emerald-400 text-white px-2 py-0.5 rounded-full shadow-sm">
          NOW
        </span>
      )}
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
  const [activeDay, setActiveDay] = useState(Math.min(todayDow, 6));

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

  // Determine the currently active period (for today only)
  const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();
  function currentPeriodSlotId(): string | null {
    if (activeDay !== todayDow) return null;
    for (const e of activeDayEntries) {
      const slot = slotMap.get(e.slotId);
      if (!slot) continue;
      const [sh, sm] = slot.startTime.split(':').map(Number);
      const [eh, em] = slot.endTime.split(':').map(Number);
      if (nowMinutes >= sh * 60 + sm && nowMinutes < eh * 60 + em) return e.slotId;
    }
    return null;
  }
  const activePeriodSlotId = currentPeriodSlotId();

  return (
    <div className="min-h-screen bg-[#F8F7FF] dark:bg-[#0B0518] relative overflow-x-hidden">
      {/* Background decoration */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-violet-200/40 dark:bg-violet-500/10 blur-3xl" />
        <div className="absolute top-1/2 -left-12 w-48 h-48 rounded-full bg-pink-200/35 dark:bg-pink-500/10 blur-3xl" />
        <div className="absolute bottom-20 right-0 w-40 h-40 rounded-full bg-indigo-200/30 dark:bg-indigo-500/10 blur-3xl" />
        <svg className="absolute top-[18%] right-[15%] w-6 h-6 text-violet-300/50 dark:text-violet-400/60" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2l1.5 4.5L18 8l-4.5 1.5L12 14l-1.5-4.5L6 8l4.5-1.5z" />
        </svg>
        <svg className="absolute top-[48%] left-[10%] w-4 h-4 text-pink-300/50 dark:text-pink-400/60" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2l1.5 4.5L18 8l-4.5 1.5L12 14l-1.5-4.5L6 8l4.5-1.5z" />
        </svg>
        <svg className="absolute bottom-[30%] right-[10%] w-5 h-5 text-fuchsia-300/40 dark:text-fuchsia-400/60" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2l1.5 4.5L18 8l-4.5 1.5L12 14l-1.5-4.5L6 8l4.5-1.5z" />
        </svg>
        <div className="absolute top-[10%] left-[6%] w-3 h-3 rounded-full bg-violet-400/30 dark:bg-violet-400/40" />
        <div className="absolute top-[35%] right-[8%] w-2.5 h-2.5 rounded-full bg-pink-400/35 dark:bg-pink-400/40" />
        <div className="absolute bottom-[50%] left-[4%] w-2 h-2 rounded-full bg-indigo-400/35 dark:bg-indigo-400/40" />
        {/* Ringed planet — dark theme only, echoes the reference design */}
        <svg className="hidden dark:block absolute bottom-[6%] right-[4%] w-24 h-24 opacity-70" viewBox="0 0 100 100" fill="none">
          <circle cx="50" cy="50" r="22" fill="#6D28D9" />
          <ellipse cx="50" cy="50" rx="40" ry="10" stroke="#C4B5FD" strokeWidth="2" fill="none" transform="rotate(-18 50 50)" />
        </svg>
      </div>

      {/* Header */}
      <div
        className="relative px-5 pt-10 pb-6 overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #4C1D95 0%, #7C3AED 55%, #DB2777 100%)' }}
      >
        <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-white/5 -translate-y-12 translate-x-12" />
        <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full bg-white/5 translate-y-8 -translate-x-8" />

        <div className="relative flex items-center gap-3 mb-4">
          <button
            onClick={() => navigate('/teacher')}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/15 hover:bg-white/25 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-white">My Timetable</h1>
            <p className="text-sm text-white/60">{DAY_FULL[activeDay]}</p>
          </div>
          {/* Decorative book illustration (inline SVG) */}
          <svg viewBox="0 0 80 64" className="w-20 h-16 opacity-70 shrink-0" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="4" y="12" width="32" height="44" rx="4" fill="#C4B5FD" />
            <rect x="8" y="16" width="24" height="36" rx="2" fill="#EDE9FE" />
            <rect x="12" y="22" width="16" height="2" rx="1" fill="#8B5CF6" />
            <rect x="12" y="28" width="12" height="2" rx="1" fill="#A78BFA" />
            <rect x="12" y="34" width="14" height="2" rx="1" fill="#A78BFA" />
            <rect x="44" y="8" width="32" height="44" rx="4" fill="#F9A8D4" />
            <rect x="48" y="12" width="24" height="36" rx="2" fill="#FDF2F8" />
            <rect x="52" y="18" width="16" height="2" rx="1" fill="#EC4899" />
            <rect x="52" y="24" width="12" height="2" rx="1" fill="#F472B6" />
            <rect x="52" y="30" width="14" height="2" rx="1" fill="#F472B6" />
            <circle cx="62" cy="10" r="6" fill="#FDE68A" />
            <path d="M62 7v3l2 1" stroke="#92400E" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>

        {/* Day selector chips */}
        <div className="relative flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {[1, 2, 3, 4, 5, 6].map((day) => {
            const isToday  = day === todayDow;
            const isActive = day === activeDay;
            const hasClass = (entriesByDay.get(day)?.length ?? 0) > 0;
            return (
              <button
                key={day}
                onClick={() => setActiveDay(day)}
                className={`relative flex-shrink-0 min-w-[52px] px-3 py-2 rounded-2xl text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-white text-[#5B21B6] shadow-lg shadow-black/10'
                    : 'bg-white/15 text-white/80 hover:bg-white/25'
                }`}
              >
                {DAY_LABELS[day]}
                {hasClass && (
                  <span
                    className={`absolute top-1 right-1 w-1.5 h-1.5 rounded-full ${
                      isActive ? 'bg-[#5B21B6]' : isToday ? 'bg-yellow-300' : 'bg-white/60'
                    }`}
                  />
                )}
                {isToday && !isActive && (
                  <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-white/80 rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="relative px-4 py-5">
        {isLoading ? (
          <div className="space-y-3 animate-pulse">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-[72px] bg-white/70 dark:bg-white/5 rounded-2xl" />
            ))}
          </div>
        ) : !tt ? (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
            {/* Illustrated empty state */}
            <div className="w-32 h-32 rounded-full bg-violet-100/80 dark:bg-[#1B1033] flex items-center justify-center">
              <svg viewBox="0 0 80 80" className="w-20 h-20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="40" cy="40" r="36" fill="#EDE9FE" className="dark:fill-[#2A1B4D]" />
                <rect x="18" y="24" width="24" height="32" rx="3" fill="#C4B5FD" />
                <rect x="22" y="28" width="16" height="2.5" rx="1.25" fill="#8B5CF6" />
                <rect x="22" y="34" width="12" height="2.5" rx="1.25" fill="#A78BFA" />
                <rect x="22" y="40" width="14" height="2.5" rx="1.25" fill="#A78BFA" />
                <rect x="38" y="20" width="24" height="32" rx="3" fill="#F9A8D4" />
                <rect x="42" y="24" width="16" height="2.5" rx="1.25" fill="#EC4899" />
                <rect x="42" y="30" width="12" height="2.5" rx="1.25" fill="#F472B6" />
                <rect x="42" y="36" width="14" height="2.5" rx="1.25" fill="#F472B6" />
                {/* paper plane */}
                <path d="M54 16 L70 10 L64 26 L58 20 Z" fill="#FDE68A" />
                <path d="M58 20 L64 26 L60 22" stroke="#92400E" strokeWidth="1.2" />
              </svg>
            </div>
            <div>
              <p className="text-base font-bold text-gray-800 dark:text-white">No timetable yet</p>
              <p className="text-sm text-gray-400 dark:text-white/40 mt-1">Ask your Principal to build it.</p>
            </div>
          </div>
        ) : activeDayEntries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
            <div className="w-32 h-32 rounded-full bg-violet-100/80 dark:bg-[#1B1033] flex items-center justify-center">
              <svg viewBox="0 0 80 80" className="w-20 h-20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="40" cy="40" r="36" fill="#EDE9FE" className="dark:fill-[#2A1B4D]" />
                <rect x="18" y="24" width="24" height="32" rx="3" fill="#C4B5FD" />
                <rect x="22" y="28" width="16" height="2.5" rx="1.25" fill="#8B5CF6" />
                <rect x="22" y="34" width="12" height="2.5" rx="1.25" fill="#A78BFA" />
                <rect x="22" y="40" width="14" height="2.5" rx="1.25" fill="#A78BFA" />
                <rect x="38" y="20" width="24" height="32" rx="3" fill="#F9A8D4" />
                <rect x="42" y="24" width="16" height="2.5" rx="1.25" fill="#EC4899" />
                <rect x="42" y="30" width="12" height="2.5" rx="1.25" fill="#F472B6" />
                <rect x="42" y="36" width="14" height="2.5" rx="1.25" fill="#F472B6" />
                <path d="M52 14 L68 8 L62 24 L56 18 Z" fill="#FDE68A" />
              </svg>
            </div>
            <div>
              <p className="text-base font-bold text-gray-800 dark:text-white">No classes on {DAY_FULL[activeDay]}</p>
              <p className="text-sm text-gray-400 dark:text-white/40 mt-1">Enjoy your day! 😊</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {activeDay === todayDow && (
              <div className="flex items-center gap-2 bg-white/70 dark:bg-white/5 border border-[#A855F7]/20 dark:border-white/10 rounded-2xl px-4 py-2.5 backdrop-blur-sm">
                <CalendarCheck className="w-4 h-4 text-[#5B21B6] dark:text-violet-300 shrink-0" />
                <p className="text-sm text-[#5B21B6] dark:text-violet-300 font-semibold">Today's schedule</p>
                <span className="ml-auto text-xs text-gray-400 dark:text-white/40 font-medium">
                  {activeDayEntries.length} period{activeDayEntries.length !== 1 ? 's' : ''}
                </span>
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
                  isCurrentPeriod={entry.slotId === activePeriodSlotId}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
