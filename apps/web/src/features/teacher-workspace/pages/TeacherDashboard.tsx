import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  Clock,
  ChevronRight,
  AlertCircle,
  CalendarCheck,
  Users,
  Calculator,
  FlaskConical,
  Globe2,
  Palette,
  Music2,
  Dumbbell,
  Calendar,
  BookOpen,
} from 'lucide-react';
import { useTeacherWorkspace } from '../hooks/useTeacherWorkspace';
import { useAuth } from '@/features/auth/hooks/useAuth';
import type { TodayClass } from '@schoolos/types';
import { cn } from '@/lib/utils';

// ── Utilities ─────────────────────────────────────────────────────────────────

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
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
  const { icon: SubjectIcon, bg, text } = getSubjectStyle(cls.subjectName);

  return (
    <button
      type="button"
      onClick={onPress}
      className="w-full text-left bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3.5 flex items-center gap-4 hover:shadow-md hover:border-[#5B5CEB]/20 transition-all duration-200 group"
    >
      {/* Subject icon */}
      <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center shrink-0', bg)}>
        <SubjectIcon className={cn('w-5 h-5', text)} />
      </div>

      {/* Time / subject / class badge */}
      <div className="min-w-0 shrink-0 w-40">
        <div className="flex items-center gap-1.5">
          <p className="text-xs text-gray-400 font-medium">
            {cls.startTime} - {cls.endTime}
          </p>
          {isNow && (
            <span className="text-[9px] font-bold text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded-full uppercase tracking-wide">
              Now
            </span>
          )}
        </div>
        <p className="text-sm font-bold text-gray-900 truncate leading-tight mt-0.5">
          {cls.subjectName}
        </p>
        <span className="inline-block text-xs font-semibold text-[#5B5CEB] bg-[#5B5CEB]/10 px-2 py-0.5 rounded-full mt-1">
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
        ) : (
          <p className="text-sm text-gray-400">
            {cls.totalStudents} student{cls.totalStudents !== 1 ? 's' : ''} · tap to mark
          </p>
        )}
      </div>

      {/* Status pill */}
      <div className="flex items-center gap-2 shrink-0">
        {isMarked ? (
          <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full">
            {pct}%
          </span>
        ) : isNow ? (
          <span className="flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full">
            <Clock className="w-3 h-3" />
            Pending
          </span>
        ) : (
          <span className="flex items-center gap-1 text-xs font-bold text-[#5B5CEB] bg-[#5B5CEB]/10 px-2.5 py-1 rounded-full">
            <Clock className="w-3 h-3" />
            Starts {cls.startTime}
          </span>
        )}
        <ChevronRight
          className={cn(
            'w-4 h-4 shrink-0 transition-transform group-hover:translate-x-0.5',
            isMarked ? 'text-emerald-400' : 'text-[#5B5CEB]',
          )}
        />
      </div>
    </button>
  );
}

// ── Skeleton card ─────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden animate-pulse">
      <div className="px-4 pt-4 pb-3 border-b border-gray-50">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-gray-100 rounded w-24" />
            <div className="h-5 bg-gray-100 rounded w-36" />
            <div className="h-4 bg-gray-100 rounded w-20" />
          </div>
          <div className="w-10 h-10 bg-gray-100 rounded-xl" />
        </div>
      </div>
      <div className="px-4 py-3">
        <div className="h-3 bg-gray-100 rounded w-32" />
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function TeacherDashboard() {
  const navigate = useNavigate();
  const { user }  = useAuth();
  const { data, isLoading, isError, error } = useTeacherWorkspace();

  const firstName = user?.firstName ?? data?.teacher.fullName.split(' ')[0] ?? 'Teacher';

  const markedCount  = data?.attendanceSummary.classesMarkedToday ?? 0;
  const totalCount   = data?.attendanceSummary.totalClassesToday  ?? 0;
  const pendingCount = totalCount - markedCount;

  function goToAttendance(cls: TodayClass) {
    navigate(`/teacher/attendance/${cls.class}/${cls.section}`);
  }

  const currentPeriod = data ? getCurrentPeriod(data.todayClasses) : null;

  return (
    <div className="min-h-screen bg-[#F8FAFC]">

      {/* ── Hero header ────────────────────────────────────────────────────── */}
      <div
        className="px-5 pt-8 pb-8 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #5B5CEB 0%, #6C63FF 60%, #7B74FF 100%)' }}
      >
        {/* Decorative blobs */}
        <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-white/5 -translate-y-8 translate-x-8" />
        <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full bg-white/5 translate-y-6 -translate-x-6" />

        <p className="text-white/70 text-sm font-medium">{greeting()},</p>
        <h1 className="text-3xl font-bold text-white mt-0.5 tracking-tight">{firstName}</h1>
        <p className="text-white/60 text-sm mt-0.5">{todayDateStr()}</p>

        {/* Stat cards */}
        <div className="flex gap-3 mt-5">
          <div className="flex-1 bg-white/15 backdrop-blur-sm rounded-2xl px-4 py-3 border border-white/10 flex items-center justify-between gap-3">
            <div>
              <p className="text-2xl font-bold text-white">{markedCount}</p>
              <p className="text-[11px] text-white/70 font-semibold mt-0.5">Marked Today</p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-[18px] h-[18px] text-white" />
            </div>
          </div>
          <div className="flex-1 bg-white/15 backdrop-blur-sm rounded-2xl px-4 py-3 border border-white/10 flex items-center justify-between gap-3">
            <div>
              <p className={cn('text-2xl font-bold', pendingCount > 0 ? 'text-amber-200' : 'text-white')}>
                {pendingCount}
              </p>
              <p className="text-[11px] text-white/70 font-semibold mt-0.5">Pending</p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
              <Clock className="w-[18px] h-[18px] text-white" />
            </div>
          </div>
          <div className="flex-1 bg-white/15 backdrop-blur-sm rounded-2xl px-4 py-3 border border-white/10 flex items-center justify-between gap-3">
            <div>
              <p className="text-2xl font-bold text-white">{totalCount}</p>
              <p className="text-[11px] text-white/70 font-semibold mt-0.5">Classes Today</p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
              <Users className="w-[18px] h-[18px] text-white" />
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-5 space-y-6">

        {/* ── Today's Classes ─────────────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest">
              Today's Classes
            </h2>
            <button
              onClick={() => navigate('/teacher/classes')}
              className="text-xs font-semibold text-[#5B5CEB] flex items-center gap-0.5 hover:underline"
            >
              View all
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
              <div>
                <p className="text-sm font-semibold text-red-700">Failed to load workspace</p>
                <p className="text-xs text-red-500 mt-0.5">{(error as Error)?.message}</p>
              </div>
            </div>
          ) : !currentPeriod ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
              <div className="w-14 h-14 bg-[#5B5CEB]/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <CalendarCheck className="w-7 h-7 text-[#5B5CEB]" />
              </div>
              <p className="text-base font-semibold text-gray-700">
                {data?.todayClasses.length ? 'No more classes today' : 'No classes today'}
              </p>
              <p className="text-sm text-gray-400 mt-1">Enjoy your free day!</p>
            </div>
          ) : (
            <TodayClassCard
              key={`${currentPeriod.cls.class}-${currentPeriod.cls.section}-${currentPeriod.cls.slotId}`}
              cls={currentPeriod.cls}
              isNow={currentPeriod.isNow}
              onPress={() => goToAttendance(currentPeriod.cls)}
            />
          )}
        </section>
      </div>
    </div>
  );
}
