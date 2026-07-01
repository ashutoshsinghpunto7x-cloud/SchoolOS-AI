import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  Clock,
  ChevronRight,
  AlertCircle,
  BookOpen,
  User2,
  UserPlus,
  CalendarCheck,
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

// ── Today class card ──────────────────────────────────────────────────────────

function TodayClassCard({
  cls,
  onPress,
}: {
  cls: TodayClass;
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
      className="w-full text-left bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md hover:border-[#5B5CEB]/20 transition-all duration-200 group"
    >
      {/* Card top strip */}
      <div
        className={cn(
          'px-4 pt-4 pb-3 border-b',
          isMarked ? 'border-emerald-50' : 'border-amber-50',
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            {/* Time */}
            <p
              className={cn(
                'text-[10px] font-bold uppercase tracking-widest mb-1',
                isMarked ? 'text-emerald-500' : 'text-amber-500',
              )}
            >
              {cls.slotName} · {cls.startTime}–{cls.endTime}
            </p>

            {/* Subject */}
            <p className="text-base font-bold text-gray-900 truncate leading-tight">
              {cls.subjectName}
            </p>

            {/* Class badge */}
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-xs font-semibold px-2 py-0.5 bg-[#5B5CEB]/10 text-[#5B5CEB] rounded-full">
                {cls.class} – {cls.section}
              </span>
            </div>
          </div>

          {/* Status icon */}
          <div
            className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
              isMarked ? 'bg-emerald-100' : 'bg-amber-100',
            )}
          >
            {isMarked ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            ) : (
              <Clock className="w-5 h-5 text-amber-600" />
            )}
          </div>
        </div>
      </div>

      {/* Card bottom */}
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex-1 min-w-0 mr-3">
          {isMarked ? (
            <>
              <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                <span>
                  <span className="font-semibold text-gray-700">{cls.attendanceCount}</span>
                  {' / '}{cls.totalStudents} students
                </span>
                <span className="font-bold text-emerald-600">{pct}%</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full"
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

// ── Quick action button ───────────────────────────────────────────────────────

function QuickAction({
  icon: Icon,
  label,
  color,
  bg,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  color: string;
  bg: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col items-center gap-2.5 hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
    >
      <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center', bg)}>
        <Icon className={cn('w-6 h-6', color)} />
      </div>
      <span className="text-xs font-semibold text-gray-700 text-center leading-tight">{label}</span>
    </button>
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
          <div className="flex-1 bg-white/15 backdrop-blur-sm rounded-2xl px-4 py-3 border border-white/10">
            <p className="text-2xl font-bold text-white">{markedCount}</p>
            <p className="text-[11px] text-white/70 font-semibold mt-0.5">Marked Today</p>
          </div>
          <div className="flex-1 bg-white/15 backdrop-blur-sm rounded-2xl px-4 py-3 border border-white/10">
            <p className={cn('text-2xl font-bold', pendingCount > 0 ? 'text-amber-200' : 'text-white')}>
              {pendingCount}
            </p>
            <p className="text-[11px] text-white/70 font-semibold mt-0.5">Pending</p>
          </div>
          <div className="flex-1 bg-white/15 backdrop-blur-sm rounded-2xl px-4 py-3 border border-white/10">
            <p className="text-2xl font-bold text-white">{totalCount}</p>
            <p className="text-[11px] text-white/70 font-semibold mt-0.5">Classes Today</p>
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
          ) : !data?.todayClasses.length ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
              <div className="w-14 h-14 bg-[#5B5CEB]/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <CalendarCheck className="w-7 h-7 text-[#5B5CEB]" />
              </div>
              <p className="text-base font-semibold text-gray-700">No classes today</p>
              <p className="text-sm text-gray-400 mt-1">Enjoy your free day!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.todayClasses.map((cls) => (
                <TodayClassCard
                  key={`${cls.class}-${cls.section}-${cls.slotId}`}
                  cls={cls}
                  onPress={() => goToAttendance(cls)}
                />
              ))}
            </div>
          )}
        </section>

        {/* ── Quick Actions ────────────────────────────────────────────────── */}
        <section>
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 px-1">
            Quick Actions
          </h2>
          <div className="grid grid-cols-4 gap-2.5">
            <QuickAction
              icon={UserPlus}
              label="Add Students"
              color="text-[#5B5CEB]"
              bg="bg-[#5B5CEB]/10"
              onClick={() => navigate('/teacher/add-student')}
            />
            <QuickAction
              icon={BookOpen}
              label="My Classes"
              color="text-emerald-600"
              bg="bg-emerald-100"
              onClick={() => navigate('/teacher/classes')}
            />
            <QuickAction
              icon={CalendarCheck}
              label="History"
              color="text-amber-600"
              bg="bg-amber-100"
              onClick={() => navigate('/teacher/history')}
            />
            <QuickAction
              icon={User2}
              label="My Profile"
              color="text-rose-600"
              bg="bg-rose-100"
              onClick={() => navigate('/teacher/profile')}
            />
          </div>
        </section>

        {/* ── Week overview strip ───────────────────────────────────────────── */}
        {data && data.weekSchedule.length > 0 && (
          <section>
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 px-1">
              This Week
            </h2>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {[...data.weekSchedule]
                .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
                .slice(0, 6)
                .map(({ dayOfWeek, entries }) => {
                  const DAY_SHORT = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                  const isToday = dayOfWeek === data.todayDayOfWeek;
                  return (
                    <div
                      key={dayOfWeek}
                      className={cn(
                        'flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0',
                        isToday && 'bg-[#5B5CEB]/5',
                      )}
                    >
                      <span
                        className={cn(
                          'text-xs font-bold w-8 shrink-0',
                          isToday ? 'text-[#5B5CEB]' : 'text-gray-400',
                        )}
                      >
                        {DAY_SHORT[dayOfWeek]}
                      </span>
                      <div className="flex-1 flex flex-wrap gap-1.5">
                        {entries.slice(0, 3).map((e, i) => (
                          <span
                            key={i}
                            className="text-[10px] font-semibold px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full"
                          >
                            {e.subjectName} · {e.class}-{e.section}
                          </span>
                        ))}
                        {entries.length > 3 && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">
                            +{entries.length - 3}
                          </span>
                        )}
                      </div>
                      {isToday && (
                        <span className="text-[9px] font-bold text-[#5B5CEB] uppercase tracking-wide shrink-0">
                          Today
                        </span>
                      )}
                    </div>
                  );
                })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
