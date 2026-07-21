import { useNavigate } from 'react-router-dom';
import {Clock,ChevronRight,AlertCircle,CalendarCheck,ClipboardList,Users,Calculator,FlaskConical,Globe2,Palette,Music2,Dumbbell,Calendar,BookOpen,} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTeacherWorkspace } from '../hooks/useTeacherWorkspace';
import { useTeacherTheme } from '../context/TeacherThemeContext';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { UpcomingEventsWidget } from '@/features/events/components/UpcomingEventsWidget';
import { ApplyLeaveModal } from '../components/ApplyLeaveModal';
import { useMyLeaveRequests } from '@/features/leave-requests/hooks/useLeaveRequests';
import type { TodayClass } from '@schoolos/types';
import { cn } from '@/lib/utils';

// ── Utilities ─────────────────────────────────────────────────────────────────

function greeting() {
  const h = new Date().getHours();if (h < 12) return 'Good morning';if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function todayDateStr() {
  return new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

// ── Subject styling ───────────────────────────────────────────────────────────

const SUBJECT_STYLES: Record<string, { icon: React.ElementType; bg: string; text: string }> = {
  maths:       { icon: Calculator,   bg: 'bg-indigo-100', text: 'text-indigo-600' },
  mathematics: { icon: Calculator,   bg: 'bg-indigo-100', text: 'text-indigo-600' },
  science:     { icon: FlaskConical, bg: 'bg-rose-100',   text: 'text-rose-600'   },
  hindi:       { icon: BookOpen,     bg: 'bg-purple-100', text: 'text-purple-600' },
  english:     { icon: BookOpen,     bg: 'bg-blue-100',   text: 'text-blue-600'   },
  'social science': { icon: Globe2,  bg: 'bg-teal-100',   text: 'text-teal-600'   },
  art:         { icon: Palette,      bg: 'bg-amber-100',  text: 'text-amber-600'  },
  music:       { icon: Music2,       bg: 'bg-pink-100',   text: 'text-pink-600'   },
  'physical education': { icon: Dumbbell, bg: 'bg-orange-100', text: 'text-orange-600' },
};

const FALLBACK_STYLES = [
  { bg: 'bg-indigo-100', text: 'text-indigo-600' },
  { bg: 'bg-purple-100', text: 'text-purple-600' },
  { bg: 'bg-rose-100',   text: 'text-rose-600'   },
  { bg: 'bg-teal-100',   text: 'text-teal-600'   },
];

function getSubjectStyle(subjectName: string) {
  const key = subjectName.trim().toLowerCase();
  if (SUBJECT_STYLES[key]) return SUBJECT_STYLES[key];
  const hash = [...key].reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const fallback = FALLBACK_STYLES[hash % FALLBACK_STYLES.length];
  return { icon: Calendar, ...fallback };
}

// ── Current period helper ─────────────────────────────────────────────────────

function toMinutes(t: string) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function getCurrentPeriod(classes: TodayClass[]): { cls: TodayClass; isNow: boolean } | null {
  if (!classes.length) return null;
  const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();
  const sorted = [...classes].sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));

  const current = sorted.find(
    (c) => nowMinutes >= toMinutes(c.startTime) && nowMinutes < toMinutes(c.endTime),
  );
  if (current) return { cls: current, isNow: true };

  const next = sorted.find((c) => toMinutes(c.startTime) > nowMinutes);
  if (next) return { cls: next, isNow: false };

  return null;
}

// ── Class info modal — tapping a Today's Classes card shows where/what the
// class is; it no longer jumps straight into the attendance sheet. ──────────

function ClassInfoModal({
  cls, onClose, onMarkAttendance,
}: {
  cls: TodayClass; onClose: () => void; onMarkAttendance: () => void;
}) {
  const { icon: SubjectIcon, bg, text } = getSubjectStyle(cls.subjectName);
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-sm p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-5">
          <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center shrink-0', bg)}>
            <SubjectIcon className={cn('w-6 h-6', text)} />
          </div>
          <div className="min-w-0">
            <p className="text-lg font-bold text-gray-900 truncate">{cls.subjectName}</p>
            <p className="text-sm text-gray-400">Class {cls.class} – {cls.section}</p>
          </div>
        </div>

        <div className="space-y-3 mb-6">
          <div className="flex items-center gap-2.5 text-sm text-gray-700">
            <Clock className="w-4 h-4 text-gray-400 shrink-0" />
            {cls.startTime} – {cls.endTime}
          </div>
          <div className="flex items-center gap-2.5 text-sm text-gray-700">
            <Users className="w-4 h-4 text-gray-400 shrink-0" />
            Class {cls.class} – {cls.section} · {cls.totalStudents} student{cls.totalStudents !== 1 ? 's' : ''}
          </div>
          <div className="flex items-center gap-2.5 text-sm text-gray-700">
            <BookOpen className="w-4 h-4 text-gray-400 shrink-0" />
            {cls.subjectName}
          </div>
        </div>

        {/* Only the assigned class teacher (or an active substitute) may mark
            attendance — teaching a subject period here isn't enough, and the
            server rejects the save with a 403 if attempted anyway. */}
        {!cls.canMarkAttendance && (
          <div className="flex items-start gap-2.5 mb-4 px-3.5 py-3 rounded-xl bg-amber-50 border border-amber-100">
            <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700 leading-relaxed">
              You teach a subject period here, but only the class teacher for {cls.class}-{cls.section} (or an active substitute) can mark its attendance.
            </p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-11 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
          {cls.canMarkAttendance && (
            <button
              type="button"
              onClick={onMarkAttendance}
              className="flex-1 h-11 rounded-xl bg-[#5B21B6] hover:bg-[#4C1D95] text-white text-sm font-bold transition-colors"
            >
              Mark Attendance
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Today class card ──────────────────────────────────────────────────────────

function TodayClassCard({
  cls,
  isNow,
  onPress,
}: {
  cls: TodayClass;
  isNow: boolean;
  onPress: () => void;
}) {
  const isMarked = cls.attendanceMarked;
  const pct = cls.totalStudents > 0
    ? Math.round((cls.attendanceCount / cls.totalStudents) * 100)
    : 0;

  return (
    <button
      type="button"
      onClick={onPress}
      className="w-full text-left bg-white teacher-glass-card rounded-2xl border border-gray-100 dark:border-transparent shadow-sm px-4 py-3.5 flex items-center gap-4 hover:shadow-md hover:border-[#A855F7]/20 dark:hover:border-[#A855F7]/30 transition-all duration-200 group"
    >
      {/* Time / subject / class badge */}
      <div className="min-w-0 shrink-0 w-40">
        <div className="flex items-center gap-20">
          <p className="text-xs text-gray-400 dark:text-white/35 font-medium">
            {cls.startTime} - {cls.endTime}
          </p>
          {isNow && (
            <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-500/15 px-1.5 py-0.5 rounded-full uppercase tracking-wide">
              Now
            </span>
          )}
        </div>
        <p className="text-sm font-bold text-gray-900 dark:text-white truncate leading-tight mt-0.5">
          {cls.subjectName}
        </p>
        <span className="inline-block text-xs font-semibold text-[#5B21B6] dark:text-violet-300 bg-[#A855F7]/10 dark:bg-[#A855F7]/15 px-2 py-0.5 rounded-full mt-1">
          {cls.class} - {cls.section}
        </span>
      </div>

      {/* Progress / status */}
      <div className="flex-1 min-w-0 hidden sm:block">
        {isMarked ? (
          <>
            <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1.5">
              <Users className="w-3.5 h-3.5 text-gray-400" />
              <span>
                <span className="font-semibold text-gray-700">{cls.attendanceCount}</span>
                {' / '}{cls.totalStudents} students
              </span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                style={{ width: `${pct}%` }}
              />
            </div>
          </>
        ) : cls.canMarkAttendance ? (
          <p className="text-sm text-gray-400">
            {cls.totalStudents} student{cls.totalStudents !== 1 ? 's' : ''} · tap to mark
          </p>
        ) : (
          <p className="text-sm text-gray-400">
            {cls.totalStudents} student{cls.totalStudents !== 1 ? 's' : ''} · subject period only
          </p>
        )}
      </div>

      {/* Status pill — "Pending" only for periods this teacher can actually
          mark; a subject-only period just shows its start time, since tapping
          it can't lead anywhere the teacher is authorized to save. */}
      <div className="flex items-center gap-2 shrink-0">
        {isMarked ? (
          <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-500/15 px-2.5 py-1 rounded-full">
            {pct}%
          </span>
        ) : isNow && cls.canMarkAttendance ? (
          <span className="flex items-center gap-1 text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-500/15 px-2.5 py-1 rounded-full">
            <Clock className="w-3 h-3" />
            Pending
          </span>
        ) : (
          <span className="flex items-center gap-1 text-xs font-bold text-[#5B21B6] dark:text-violet-300 bg-[#A855F7]/10 dark:bg-[#A855F7]/15 px-2.5 py-1 rounded-full">
            <Clock className="w-3 h-3" />
            Starts {cls.startTime}
          </span>
        )}
      </div>
    </button>
  );
}

// ── Skeleton card ─────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-white teacher-glass-card rounded-2xl border border-gray-100 dark:border-transparent shadow-sm overflow-hidden animate-pulse">
      <div className="px-4 pt-4 pb-3 border-b border-gray-50 dark:border-white/5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-gray-100 dark:bg-white/10 rounded w-24" />
            <div className="h-5 bg-gray-100 dark:bg-white/10 rounded w-36" />
            <div className="h-4 bg-gray-100 dark:bg-white/10 rounded w-20" />
          </div>
          <div className="w-10 h-10 bg-gray-100 dark:bg-white/10 rounded-xl" />
        </div>
      </div>
      <div className="px-4 py-3">
        <div className="h-3 bg-gray-100 dark:bg-white/10 rounded w-32" />
      </div>
    </div>
  );
}

// ── My Leave section ────────────────────────────────────────────────────────

const LEAVE_STATUS_STYLE: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
};

function MyLeaveSection({ onApply }: { onApply: () => void }) {
  const { data: requests, isLoading } = useMyLeaveRequests();
  const recent = (requests ?? []).slice(0, 5);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  function handleScroll() {
    const el = scrollerRef.current;
    if (!el || el.clientWidth === 0) return;
    setActiveIndex(Math.round(el.scrollLeft / el.clientWidth));
  }

  function goNext() {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTo({ left: Math.min(recent.length - 1, activeIndex + 1) * el.clientWidth, behavior: 'smooth' });
  }

  const hasMore = recent.length > 1 && activeIndex < recent.length - 1;

  return (
    <section>
      <div className="flex items-center justify-between mb-3 px-1">
        <h2 className="text-xs font-bold text-gray-500 dark:text-white/40 uppercase tracking-widest">
          My Leave
        </h2>
        <button
          onClick={onApply}
          className="text-xs font-semibold text-[#5B21B6] dark:text-violet-400 flex items-center gap-0.5 hover:underline"
        >
          Apply for leave
        </button>
      </div>

      {isLoading ? (
        <div className="bg-white teacher-glass-card rounded-2xl border border-gray-100 dark:border-transparent shadow-sm p-4 animate-pulse h-16" />
      ) : recent.length === 0 ? (
        <div className="bg-white teacher-glass-card rounded-2xl border border-gray-100 dark:border-transparent shadow-sm px-4 py-3.5 text-sm text-gray-400 dark:text-white/30">
          No leave requests yet.
        </div>
      ) : (
        <div className="relative">
          <div
            ref={scrollerRef}
            onScroll={handleScroll}
            className="flex overflow-x-auto snap-x snap-mandatory gap-3 -mx-1 px-1 scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {recent.map((req) => (
              <div
                key={req._id}
                className="w-full shrink-0 snap-center bg-white teacher-glass-card rounded-2xl border border-gray-100 dark:border-transparent shadow-sm px-4 py-3 pr-10 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                    {req.leaveType === 'full_day' ? 'Full day' : 'Half day'}
                    {' · '}
                    {req.dateFrom === req.dateTo ? req.dateFrom : `${req.dateFrom} – ${req.dateTo}`}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-white/30 truncate mt-0.5">{req.reason}</p>
                </div>
                <span className={cn('text-xs font-bold px-2.5 py-1 rounded-full shrink-0 capitalize', LEAVE_STATUS_STYLE[req.status])}>
                  {req.status}
                </span>
              </div>
            ))}
          </div>
          {hasMore && (
            <button
              type="button"
              onClick={goNext}
              aria-label="Next leave request"
              className="absolute right-1 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white dark:bg-white/10 shadow-md border border-gray-100 dark:border-white/10 flex items-center justify-center text-gray-500 dark:text-white/60 hover:text-[#5B21B6] dark:hover:text-violet-300 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
    </section>
  );
}

// ── Today's Classes carousel ────────────────────────────────────────────────
// Shows every class scheduled today, snapped to a horizontal slider so the
// teacher can swipe through past/upcoming periods instead of a static stack.
// Opens centered on whichever period is live/next right now.

function TodaysClassesCarousel({
  classes,
  currentPeriod,
  onPress,
}: {
  classes: TodayClass[];
  currentPeriod: { cls: TodayClass; isNow: boolean } | null;
  onPress: (cls: TodayClass) => void;
}) {
  const sorted = [...classes].sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const focusIndex = currentPeriod
      ? sorted.findIndex((c) => c.slotId === currentPeriod.cls.slotId)
      : 0;
    setActiveIndex(Math.max(0, focusIndex));
    const el = scrollerRef.current;
    if (el && focusIndex > 0) {
      el.scrollTo({ left: focusIndex * el.clientWidth, behavior: 'auto' });
    }
    // Only re-center when the set of classes for the day actually changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sorted.length]);

  function handleScroll() {
    const el = scrollerRef.current;
    if (!el || el.clientWidth === 0) return;
    setActiveIndex(Math.round(el.scrollLeft / el.clientWidth));
  }

  function goNext() {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTo({ left: Math.min(sorted.length - 1, activeIndex + 1) * el.clientWidth, behavior: 'smooth' });
  }

  const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();
  const hasMore = sorted.length > 1 && activeIndex < sorted.length - 1;

  return (
    <div className="relative">
      <div
        ref={scrollerRef}
        onScroll={handleScroll}
        className="flex overflow-x-auto snap-x snap-mandatory gap-3 -mx-1 px-1 scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {sorted.map((cls) => {
          const isNow = nowMinutes >= toMinutes(cls.startTime) && nowMinutes < toMinutes(cls.endTime);
          return (
            <div key={cls.slotId} className="w-full shrink-0 snap-center">
              <TodayClassCard cls={cls} isNow={isNow} onPress={() => onPress(cls)} />
            </div>
          );
        })}
      </div>
      {hasMore && (
        <button
          type="button"
          onClick={goNext}
          aria-label="Next class"
          className="absolute right-1 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white dark:bg-white/10 shadow-md border border-gray-100 dark:border-white/10 flex items-center justify-center text-gray-500 dark:text-white/60 hover:text-[#5B21B6] dark:hover:text-violet-300 transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function TeacherDashboard() {
  const navigate = useNavigate();
  const { user }  = useAuth();
  const { theme } = useTeacherTheme();
  const isDark = theme === 'dark';
  const { data, isLoading, isError, error, refetch } = useTeacherWorkspace();
  const [showApplyLeave, setShowApplyLeave] = useState(false);
  const [infoClass, setInfoClass] = useState<TodayClass | null>(null);

  const firstName = user?.firstName ?? data?.teacher.fullName.split(' ')[0] ?? 'Teacher';

  function goToAttendance(cls: TodayClass) {
    navigate(`/teacher/attendance/${cls.class}/${cls.section}`);
  }

  const currentPeriod = data ? getCurrentPeriod(data.todayClasses) : null;

  // "Mark Attendance" must always open a sheet directly, never an intermediate
  // list. If no period is currently active/upcoming (e.g. all of today's
  // classes already ended), fall back to the most recent one today instead of
  // bouncing to the class picker — only truly no-classes-today falls back to it.
  // Every candidate is restricted to canMarkAttendance: teaching a subject
  // period there isn't enough — the server rejects the save otherwise, and
  // this CTA must never route somewhere that's guaranteed to be rejected.
  function handleMarkAttendance() {
    const markable = (data?.todayClasses ?? []).filter((c) => c.canMarkAttendance);
    const current = getCurrentPeriod(markable);
    if (current) { goToAttendance(current.cls); return; }
    if (markable.length) {
      const mostRecent = [...markable].sort(
        (a, b) => toMinutes(b.startTime) - toMinutes(a.startTime),
      )[0];
      goToAttendance(mostRecent);
      return;
    }
    // No timetable period today references this teacher at all (e.g. a class
    // teacher who doesn't personally teach a subject period), but they may
    // still be the assigned class teacher for one or more classes — that
    // alone is enough to mark attendance, so route straight there instead of
    // landing on an empty "no classes" list right after being assigned.
    const classTeacherOf = data?.classTeacherOf ?? [];
    if (classTeacherOf.length === 1) {
      navigate(`/teacher/attendance/${classTeacherOf[0].class}/${classTeacherOf[0].section}`);
      return;
    }
    navigate('/teacher/classes');
  }

  return (
    <div className="min-h-screen bg-[#F8F7FF] dark:bg-transparent relative overflow-x-hidden">
      {/* ── Page-level decorative background — light mode only (dark uses aurora) ── */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden dark:hidden">
        {/* Large soft blobs */}
        <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-violet-200/40 blur-3xl" />
        <div className="absolute top-1/3 -left-16 w-56 h-56 rounded-full bg-fuchsia-200/35 blur-3xl" />
        <div className="absolute bottom-40 -right-10 w-48 h-48 rounded-full bg-pink-200/30 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 w-40 h-40 rounded-full bg-indigo-200/30 blur-3xl" />
        {/* Small accent circles */}
        <div className="absolute top-[12%] left-[8%] w-4 h-4 rounded-full bg-violet-400/30" />
        <div className="absolute top-[28%] right-[12%] w-3 h-3 rounded-full bg-pink-400/40" />
        <div className="absolute top-[55%] left-[5%] w-2.5 h-2.5 rounded-full bg-fuchsia-400/35" />
        <div className="absolute top-[70%] right-[18%] w-2 h-2 rounded-full bg-indigo-400/40" />
        {/* Sparkle/star shapes */}
        <svg className="absolute top-[15%] right-[18%] w-6 h-6 text-violet-300/60" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2l1.5 4.5L18 8l-4.5 1.5L12 14l-1.5-4.5L6 8l4.5-1.5z" />
        </svg>
        <svg className="absolute top-[42%] left-[12%] w-4 h-4 text-pink-300/60" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2l1.5 4.5L18 8l-4.5 1.5L12 14l-1.5-4.5L6 8l4.5-1.5z" />
        </svg>
        <svg className="absolute bottom-[25%] right-[8%] w-5 h-5 text-fuchsia-300/50" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2l1.5 4.5L18 8l-4.5 1.5L12 14l-1.5-4.5L6 8l4.5-1.5z" />
        </svg>
        <svg className="absolute bottom-[45%] left-[20%] w-3 h-3 text-indigo-300/60" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2l1.5 4.5L18 8l-4.5 1.5L12 14l-1.5-4.5L6 8l4.5-1.5z" />
        </svg>
      </div>

      {/* ── Hero header ────────────────────────────────────────────────────── */}
      {/* Dark mode swaps the solid gradient for a frosted glass panel — translucent
          gradient fill + backdrop blur + hairline border — so the aurora page
          background shows through instead of a flat, saturated block. */}
      <div
        className={cn(
          'mx-4 mt-4 px-5 pt-8 pb-8 relative overflow-hidden rounded-[28px]',
          isDark && 'backdrop-blur-2xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)]',
        )}
        style={{
          background: isDark
            ? 'linear-gradient(160deg, rgba(5,5,9,0.98) 0%, rgba(30,14,54,0.55) 55%, rgba(90,20,60,0.22) 100%)'
            : 'linear-gradient(160deg, #4C1D95 0%, #7C3AED 45%, #DB2777 100%)',
        }}
      >
        {/* Decorative blobs */}
        <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-white/5 -translate-y-8 translate-x-8" />
        <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full bg-white/5 translate-y-6 -translate-x-6" />

        {/* Liquid-glass sheen — diagonal highlight, dark mode only */}
        {isDark && (
          <div
            className="pointer-events-none absolute inset-0"
            style={{ background: 'linear-gradient(115deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.03) 22%, transparent 45%)' }}
          />
        )}

        {/* School calendar shortcut */}
        <button
          type="button"
          onClick={() => navigate('/calendar')}
          aria-label="School calendar"
          className="absolute top-5 right-5 w-9 h-9 rounded-xl bg-white/15 dark:bg-white/10 dark:border dark:border-white/10 hover:bg-white/25 dark:hover:bg-white/15 flex items-center justify-center transition-colors backdrop-blur-md"
        >
          <Calendar className="w-[18px] h-[18px] text-white" />
        </button>

        <p className="text-white/70 text-sm font-medium">{greeting()},</p>
        <h1 className="text-3xl font-bold mt-0.5 tracking-tight text-white dark:bg-gradient-to-r dark:from-white dark:via-violet-200 dark:to-violet-400 dark:bg-clip-text dark:text-transparent">
          {firstName}
        </h1>
        <p className="text-white/60 text-sm mt-0.5">{todayDateStr()}</p>

        {/* Mark Attendance CTA */}
        <button
          type="button"
          onClick={handleMarkAttendance}
          className="mt-5 w-full h-12 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 active:scale-[0.99] transition-all
                     bg-white text-[#5B21B6] shadow-lg shadow-black/10 hover:bg-white/90
                     dark:bg-white/10 dark:text-violet-200 dark:border dark:border-white/10 dark:backdrop-blur-md dark:shadow-none dark:hover:bg-white/15"
        >
          <CalendarCheck className="w-[18px] h-[18px]" />
          Mark Attendance
        </button>
      </div>

      {/* ── Section labels & section links ──────────────────────────────────── */}
      <div className="px-4 py-5 space-y-6">

        {/* ── Today's Classes ─────────────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-xs font-bold text-gray-500 dark:text-white/40 uppercase tracking-widest">
              Today's Classes
            </h2>
            <button
              onClick={() => navigate('/teacher/timetable')}
              className="text-xs font-semibold text-[#5B21B6] dark:text-violet-400 flex items-center gap-0.5 hover:underline"
            >
              View timetable
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : isError ? (
            <div className="bg-red-50 border border-red-100 rounded-2xl p-5 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-red-700">Failed to load workspace</p>
                <p className="text-xs text-red-500 mt-0.5">{(error as Error)?.message}</p>
                <button
                  type="button"
                  onClick={() => void refetch()}
                  className="mt-2 h-8 px-3 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold"
                >
                  Retry
                </button>
              </div>
            </div>
          ) : !currentPeriod ? (
            <div className="bg-white teacher-glass-card rounded-2xl border border-gray-100 dark:border-transparent shadow-sm p-8 text-center">
              <div className="w-14 h-14 bg-[#A855F7]/10 dark:bg-[#A855F7]/15 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <CalendarCheck className="w-7 h-7 text-[#5B21B6] dark:text-violet-300" />
              </div>
              <p className="text-base font-semibold text-gray-700 dark:text-white/80">
                {data?.todayClasses.length ? 'No more classes today' : 'No classes today'}
              </p>
              <p className="text-sm text-gray-400 dark:text-white/30 mt-1">Enjoy your free day!</p>
            </div>
          ) : (
            <TodaysClassesCarousel
              classes={data?.todayClasses ?? []}
              currentPeriod={currentPeriod}
              onPress={setInfoClass}
            />
          )}
        </section>

        {/* ── Marks & Report Cards ─────────────────────────────────────────── */}
        <button
          type="button"
          onClick={() => navigate('/teacher/marks')}
          className="w-full text-left flex items-center gap-3 bg-white teacher-glass-card rounded-2xl border border-gray-100 dark:border-transparent shadow-sm px-4 py-3.5 hover:shadow-md transition-shadow"
        >
          <div className="w-11 h-11 rounded-xl bg-[#F3EEFF] dark:bg-[#A855F7]/15 flex items-center justify-center shrink-0">
            <ClipboardList className="w-5 h-5 text-[#6D4AFF] dark:text-violet-300" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-900 dark:text-white">Marks & Report Cards</p>
            <p className="text-xs text-gray-400 dark:text-white/40 mt-0.5">Enter marks for your classes</p>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-400 dark:text-white/30 shrink-0" />
        </button>

        <UpcomingEventsWidget />

        <MyLeaveSection onApply={() => setShowApplyLeave(true)} />
      </div>

      {infoClass && (
        <ClassInfoModal
          cls={infoClass}
          onClose={() => setInfoClass(null)}
          onMarkAttendance={() => { const c = infoClass; setInfoClass(null); goToAttendance(c); }}
        />
      )}

      {showApplyLeave && <ApplyLeaveModal onClose={() => setShowApplyLeave(false)} />}
    </div>
  );
}