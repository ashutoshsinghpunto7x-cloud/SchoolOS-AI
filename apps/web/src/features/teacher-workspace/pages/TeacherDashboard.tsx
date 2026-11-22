import { useNavigate } from 'react-router-dom';
import {Clock,ChevronRight,AlertCircle,Users,Calculator,FlaskConical,Globe2,Palette,Music2,Dumbbell,Calendar,BookOpen,} from 'lucide-react';
import { Fragment, useEffect, useRef, useState } from 'react';
import { useTeacherWorkspace } from '../hooks/useTeacherWorkspace';
import { useTeacherTheme } from '../context/TeacherThemeContext';
import { useFeature } from '@/lib/featureFlags';
import { useWinter } from '../winter/winterStore';
import { nextClassLabel, sortClasses, useNowMinutes } from '../winter/winterTime';
import { WinterHero } from '../winter/WinterHero';
import { SchoolDayRoute } from '../winter/SchoolDayRoute';
import { DailyQuestCard, StreakCard, type QuestTask } from '../winter/DailyQuest';
import { SnowCanvas } from '../winter/SnowCanvas';
import '../winter/winter.css';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { UpcomingEventsWidget } from '@/features/events/components/UpcomingEventsWidget';
import { ApplyLeaveModal } from '../components/ApplyLeaveModal';
import { useMyLeaveRequests } from '@/features/leave-requests/hooks/useLeaveRequests';
import type { TodayClass } from '@schoolos/types';
import { cn } from '@/lib/utils';

const SHOW_WIP_TEACHER_TOOLS = true;

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
  hindi:       { icon: BookOpen,     bg: 'bg-purple-100', text: 'text-[#254A9A]' },
  english:     { icon: BookOpen,     bg: 'bg-blue-100',   text: 'text-blue-600'   },
  'social science': { icon: Globe2,  bg: 'bg-teal-100',   text: 'text-teal-600'   },
  art:         { icon: Palette,      bg: 'bg-amber-100',  text: 'text-amber-600'  },
  music:       { icon: Music2,       bg: 'bg-pink-100',   text: 'text-pink-600'   },
  'physical education': { icon: Dumbbell, bg: 'bg-orange-100', text: 'text-orange-600' },
};

const FALLBACK_STYLES = [
  { bg: 'bg-indigo-100', text: 'text-indigo-600' },
  { bg: 'bg-purple-100', text: 'text-[#254A9A]' },
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
              className="flex-1 h-11 rounded-xl bg-[#1B2A4E] hover:bg-[#2C4177] text-white text-sm font-bold transition-colors"
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
      className="w-full text-left bg-white teacher-glass-card rounded-2xl border border-gray-100 dark:border-transparent shadow-sm px-4 py-3.5 flex items-center gap-4 hover:shadow-md hover:border-[#1B2A4E]/20 dark:hover:border-[#1B2A4E]/20 transition-all duration-200 group"
    >
      {/* Time / subject / class badge */}
      <div className="min-w-0 shrink-0 w-40">
        <div className="flex items-center gap-2">
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
        <span className="inline-block text-xs font-semibold text-[#1B2A4E] dark:text-violet-300 bg-[#EEF1F8] dark:bg-[#A855F7]/15 px-2 py-0.5 rounded-full mt-1">
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
          <span className="flex items-center gap-1 text-xs font-bold text-[#1B2A4E] dark:text-violet-300 bg-[#EEF1F8] dark:bg-[#A855F7]/15 px-2.5 py-1 rounded-full">
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
          className="text-xs font-semibold text-[#1B2A4E] dark:text-violet-400 flex items-center gap-0.5 hover:underline"
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
              className="absolute right-1 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white dark:bg-white/10 shadow-md border border-gray-100 dark:border-white/10 flex items-center justify-center text-gray-500 dark:text-white/60 hover:text-[#1B2A4E] dark:hover:text-violet-300 transition-colors"
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
          className="absolute right-1 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white dark:bg-white/10 shadow-md border border-gray-100 dark:border-white/10 flex items-center justify-center text-gray-500 dark:text-white/60 hover:text-[#1B2A4E] dark:hover:text-violet-300 transition-colors"
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
  const { data, isLoading, isError, error, refetch } = useTeacherWorkspace();
  const { data: myLeaves } = useMyLeaveRequests();
  const [showApplyLeave, setShowApplyLeave] = useState(false);
  const [infoClass, setInfoClass] = useState<TodayClass | null>(null);
  const [moreQuick, setMoreQuick] = useState(false);

  // Seasonal winter theme. Light-mode only — the teacher dark theme has its own look.
  const { theme } = useTeacherTheme();
  const winter = useWinter(user?.userId);
  // Ops Center kill switch ("teacher-winter-theme" feature flag). Off while the flag is
  // loading/unreachable, so any problem falls back to the standard dashboard.
  const winterAllowed = useFeature('teacher-winter-theme');
  const winterOn = winterAllowed && winter.enabled && theme !== 'dark';
  const nowMin = useNowMinutes();

  const card = cn('bg-white border border-[#E8E2D6] rounded-[18px] shadow-xs', winterOn && 'tw-frost');
  // Stat tiles sit three-up on phones in winter mode, so the long hint text gets a short form.
  const cta = (long: string, short: string) =>
    winterOn ? (<><span className="hidden sm:inline">{long}</span><span className="sm:hidden">{short}</span></>) : long;

  const firstName = user?.firstName ?? data?.teacher.fullName.split(' ')[0] ?? 'Teacher';

  function goToAttendance(cls: TodayClass) {
    navigate(`/teacher/attendance/${cls.class}/${cls.section}`);
  }

  const currentPeriod = data ? getCurrentPeriod(data.todayClasses) : null;

  // ── Winter quest / hero data — all derived from the teacher's real day ──
  const todayClasses = data?.todayClasses ?? [];
  const markable = todayClasses.filter((c) => c.canMarkAttendance);
  const pendingAttendance = markable.filter((c) => !c.attendanceMarked).length;
  const attendanceDone = markable.length > 0 && pendingAttendance === 0;
  const nextLabel = nextClassLabel(sortClasses(todayClasses), nowMin);
  const questTasks: QuestTask[] = [
    ...(markable.length
      ? [{ id: 'attendance', label: 'Mark attendance for today', points: 10, auto: true, path: '/teacher/attendance' }]
      : []),
    { id: 'plan', label: "Update today's Academic Plan", points: 15, path: '/teacher/academic-plan' },
    { id: 'marks', label: 'Enter or review marks', points: 25, path: '/teacher/marks' },
  ];
  const frostyTips = [
    pendingAttendance > 0
      ? `${pendingAttendance} class${pendingAttendance > 1 ? 'es' : ''} still need attendance today ✅`
      : markable.length ? 'Attendance is all done today — nice! 🎉' : 'Tap me for a little winter cheer ❄',
    nextLabel ? `Up next: ${nextLabel} ⏱` : 'No more classes today — a good time to plan ahead 📚',
    winter.streak > 0 ? `${winter.streak}-day quest streak — keep it going! 🔥` : "Finish today's quest to start a streak 🔥",
    'No two snowflakes are alike — just like your students ❄',
  ];

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
    <div className={cn("flex-1 w-full font-['DM_Sans','Plus_Jakarta_Sans',sans-serif]", winterOn ? 'tw-winter' : 'bg-[#FBF8F3]')}>
      {winterOn && <SnowCanvas />}
      <div className="w-full max-w-[1100px] mx-auto px-4 py-6 md:py-8 space-y-6">
        {/* Greeting — snowy hero in winter mode, plain greeting otherwise */}
        {winterOn ? (
          <div className="tw-rise">
            <WinterHero
              greeting={greeting()}
              firstName={firstName}
              dateStr={todayDateStr()}
              streak={winter.streak}
              nextLabel={nextLabel}
              level={winter.level}
              points={winter.points}
              tips={frostyTips}
              onTurnOff={() => winter.setEnabled(false)}
            />
          </div>
        ) : (
          <div className="text-center">
            <h1 className="text-[26px] md:text-[34px] font-medium text-[#1B2A4E] tracking-tight m-0">
              {greeting()}
              {firstName ? `, ${firstName}` : ''}
            </h1>
            <p className="text-[14px] md:text-[16px] text-[#55607A] mt-1">{todayDateStr()}</p>
            {winterAllowed && theme !== 'dark' && (
              <button type="button" className="tw-toggle-pill mt-3" onClick={() => winter.setEnabled(true)}>
                ❄ Turn on winter theme
              </button>
            )}
          </div>
        )}

        {isError && (
          <div className="px-4 py-3 bg-red-50 border border-red-100 rounded-xl flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-red-600">{(error as Error)?.message || 'Failed to load workspace'}</p>
            <button
              type="button"
              onClick={() => void refetch()}
              className="h-8 px-3 shrink-0 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* Quick launch */}
        <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-2 sm:gap-3">
          {[
            { label: 'Attendance', onClick: handleMarkAttendance, d: 'M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11' },
            { label: 'Classes', onClick: () => navigate('/teacher/classes'), d: 'M22 10v6M2 10l10-5 10 5-10 5zM6 12v5c3 3 9 3 12 0v-5' },
            { label: 'Timetable', onClick: () => navigate('/teacher/timetable'), d: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2' },
            { label: 'Marks', onClick: () => navigate('/teacher/marks'), d: 'M12 3a5 5 0 1 0 0 10 5 5 0 0 0 0-10zM9 12l-2 9 5-3 5 3-2-9' },
            { label: 'Academic Plan', onClick: () => navigate('/teacher/academic-plan'), d: 'M12 6c-2-2-5-2-8-1v13c3-1 6-1 8 1 2-2 5-2 8-1V5c-3-1-6-1-8 1zM12 6v13' },
            { label: 'Planner', onClick: () => navigate('/teacher/planner'), d: 'M5 6h14v13H5zM5 10h14M9 4v3M15 4v3' },
            { label: 'Syllabus', onClick: () => navigate('/teacher/syllabus-tracker'), d: 'M18 20V10M12 20V4M6 20v-6' },
            { label: 'Worksheets', onClick: () => navigate('/teacher/worksheet-generator'), d: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8' },
            { label: 'Question Bank', onClick: () => navigate('/teacher/question-bank'), d: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z' },
            { label: 'Messages', onClick: () => navigate('/messages'), d: 'M3 6h18v12H3zM3 7l9 7 9-7' },
            { label: 'Calendar', onClick: () => navigate('/calendar'), d: 'M4 6h16v14H4zM4 10h16M8 3v5M16 3v5' },
            { label: 'Apply Leave', onClick: () => setShowApplyLeave(true), d: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z' },
          ].map((q, i) => (
            <Fragment key={q.label}>
              {/* Winter/phone layout: first 7 shortcuts + a "More" tile; the rest expand on tap. */}
              {winterOn && i === 7 && (
                <button
                  type="button"
                  onClick={() => setMoreQuick((v) => !v)}
                  aria-expanded={moreQuick}
                  className="tw-q group flex sm:hidden flex-col items-center gap-1.5 text-[11px] text-[#1B2A4E] font-medium cursor-pointer min-h-[44px]"
                >
                  <span className="tw-q-ic relative w-[56px] h-[56px] rounded-full bg-[#EEF1F8] flex items-center justify-center text-[#254A9A] text-lg font-bold">
                    {moreQuick ? '−' : '•••'}
                  </span>
                  <span className="text-center leading-tight">{moreQuick ? 'Less' : 'More'}</span>
                </button>
              )}
              <button
                type="button"
                onClick={q.onClick}
                className={cn(
                  'tw-q group flex-col items-center gap-1.5 text-[11px] sm:text-[12px] text-[#1B2A4E] font-medium cursor-pointer min-h-[44px]',
                  winterOn && i >= 7 && !moreQuick ? 'hidden sm:flex' : 'flex',
                )}
              >
                <span className="tw-q-ic relative w-[52px] h-[52px] sm:w-[58px] sm:h-[58px] rounded-full bg-[#EEF1F8] flex items-center justify-center transition-all group-hover:-translate-y-[2px] group-hover:bg-[#E2E8F5]">
                  <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="#254A9A" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                    <path d={q.d} />
                  </svg>
                </span>
                <span className="text-center leading-tight">{q.label}</span>
              </button>
            </Fragment>
          ))}
        </div>

        {/* 3 Key Metrics */}
        <div className={cn('grid gap-4', winterOn ? 'grid-cols-3 gap-2.5 sm:gap-4' : 'grid-cols-1 sm:grid-cols-3')}>
          <button type="button" onClick={handleMarkAttendance} className={cn(card, 'text-left cursor-pointer hover:shadow-md transition-shadow min-w-0', winterOn ? 'p-3 sm:p-5' : 'p-5')}>
            <div className="text-[11px] sm:text-[13px] text-[#55607A] leading-tight">Classes today</div>
            <div className="text-[26px] sm:text-[32px] font-medium text-[#1B2A4E] mt-1">
              {isLoading ? '…' : (data?.todayClasses.length ?? 0)}
            </div>
            <span className="text-[10.5px] sm:text-[11px] font-semibold text-emerald-600 leading-tight block">
              {cta('Tap to mark attendance →', 'Mark →')}
            </span>
          </button>

          <button type="button" onClick={() => navigate('/teacher/timetable')} className={cn(card, 'text-left cursor-pointer hover:shadow-md transition-shadow min-w-0', winterOn ? 'p-3 sm:p-5' : 'p-5')}>
            <div className="text-[11px] sm:text-[13px] text-[#55607A] leading-tight">{currentPeriod?.isNow ? 'Current period' : 'Next period'}</div>
            <div className={cn('font-medium text-[#1B2A4E] truncate', winterOn ? 'text-[16px] sm:text-[24px] mt-2.5 sm:mt-2' : 'text-[24px] mt-2')}>
              {isLoading ? '…' : currentPeriod ? currentPeriod.cls.subjectName : 'None'}
            </div>
            <span className="text-[10.5px] sm:text-[11px] font-semibold text-[#254A9A] leading-tight block">
              {currentPeriod ? `Class ${currentPeriod.cls.class}–${currentPeriod.cls.section} · ${currentPeriod.cls.startTime}` : 'No remaining periods today'}
            </span>
          </button>

          <button type="button" onClick={() => setShowApplyLeave(true)} className={cn(card, 'text-left cursor-pointer hover:shadow-md transition-shadow min-w-0', winterOn ? 'p-3 sm:p-5' : 'p-5')}>
            <div className="text-[11px] sm:text-[13px] text-[#55607A] leading-tight">{winterOn ? 'My leaves' : 'My leave requests'}</div>
            <div className="text-[26px] sm:text-[32px] font-medium text-[#1B2A4E] mt-1">{myLeaves ? myLeaves.length : '…'}</div>
            <span className="text-[10.5px] sm:text-[11px] font-semibold text-amber-600 leading-tight block">
              {cta('Tap to apply for leave →', 'Apply →')}
            </span>
          </button>
        </div>

        {/* 2-Column Detail Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className={`${card} p-5`}>
            <div className="flex items-center justify-between pb-2">
              <div className="text-[16px] font-bold text-[#1B2A4E]">Today&apos;s classes</div>
              <button
                type="button"
                onClick={() => navigate('/teacher/timetable')}
                className="text-[12px] font-semibold text-[#D9822B] hover:underline cursor-pointer"
              >
                View timetable →
              </button>
            </div>
            {isLoading ? (
              <div className="space-y-3">
                <SkeletonCard />
              </div>
            ) : !currentPeriod ? (
              <p className="text-sm text-[#55607A] py-4">
                {data?.todayClasses.length ? 'No more classes today.' : 'No classes scheduled today.'}
              </p>
            ) : (
              <TodaysClassesCarousel
                classes={data?.todayClasses ?? []}
                currentPeriod={currentPeriod}
                onPress={setInfoClass}
              />
            )}
          </div>

          <div className={`${card} p-5`}>
            <div className="text-[16px] font-bold text-[#1B2A4E] pb-1">Teaching tools</div>
            {[
              { label: 'Marks & Report Cards', tag: 'Marks', path: '/teacher/marks' },
              { label: 'Academic Plan', tag: 'Daily', path: '/teacher/academic-plan' },
              ...(SHOW_WIP_TEACHER_TOOLS
                ? [
                    { label: 'Syllabus Tracker', tag: 'Progress', path: '/teacher/syllabus-tracker' },
                    { label: 'Question Bank & Papers', tag: 'Papers', path: '/teacher/question-bank' },
                    { label: 'Worksheet Generator', tag: 'Practice', path: '/teacher/worksheet-generator' },
                  ]
                : []),
            ].map((r) => (
              <button
                key={r.label}
                type="button"
                onClick={() => navigate(r.path)}
                className="w-full flex items-center justify-between py-2.5 border-b last:border-b-0 border-[#E8E2D6]/60 text-left cursor-pointer hover:bg-[#FBF8F3] rounded-lg px-1"
              >
                <span className="text-[14px] text-[#1B2A4E]">{r.label}</span>
                <span className="px-2.5 h-6 rounded-full text-[11px] font-semibold bg-[#F3EEE3] text-[#55607A] flex items-center justify-center">
                  {r.tag}
                </span>
              </button>
            ))}
          </div>
        </div>

        {winterOn && (
          <>
            <SchoolDayRoute classes={todayClasses} onSelect={setInfoClass} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <DailyQuestCard
                winter={winter}
                tasks={questTasks}
                attendanceDone={attendanceDone}
                ready={!isLoading && !!data}
                onOpen={(path) => (path === '/teacher/attendance' ? handleMarkAttendance() : navigate(path))}
              />
              <StreakCard winter={winter} />
            </div>
          </>
        )}

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