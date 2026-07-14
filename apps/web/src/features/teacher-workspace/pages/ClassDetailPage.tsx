import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, CalendarCheck, Loader2, AlertCircle } from 'lucide-react';
import { useTimetables, usePeriodSlots } from '@/features/timetable/hooks/useTimetable';
import { useTeacherWorkspace } from '../hooks/useTeacherWorkspace';
import { cn } from '@/lib/utils';

const DAY_FULL = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function ClassDetailPage() {
  const { cls, section } = useParams<{ cls: string; section: string }>();
  const navigate = useNavigate();
  const [activeDay, setActiveDay] = useState(new Date().getDay() || 1);

  const { data: workspace } = useTeacherWorkspace();
  const { data: timetables, isLoading: ttLoading, isError: ttError } = useTimetables({ class: cls, section, limit: 1 });
  const { data: periodSlots } = usePeriodSlots();

  const timetable = timetables?.data?.[0];
  const isClassTeacher = (workspace?.classTeacherOf ?? []).some((c) => c.class === cls && c.section === section);

  // Subjects taught in this class, derived from the teacher's own week schedule (already loaded).
  const subjectsTaught = useMemo(() => {
    const set = new Map<string, string>();
    for (const day of workspace?.weekSchedule ?? []) {
      for (const entry of day.entries) {
        if (entry.class === cls && entry.section === section && entry.subjectName) {
          set.set(entry.subjectName, entry.subjectName);
        }
      }
    }
    return Array.from(set.keys());
  }, [workspace, cls, section]);

  const dayEntries = useMemo(() => {
    if (!timetable) return [];
    return timetable.entries
      .filter((e) => e.dayOfWeek === activeDay)
      .sort((a, b) => {
        const aOrder = periodSlots?.find((p) => p._id === a.slotId)?.orderIndex ?? 0;
        const bOrder = periodSlots?.find((p) => p._id === b.slotId)?.orderIndex ?? 0;
        return aOrder - bOrder;
      });
  }, [timetable, activeDay, periodSlots]);

  function slotLabel(slotId: string) {
    const slot = periodSlots?.find((p) => p._id === slotId);
    return slot ? `${slot.startTime} – ${slot.endTime}` : '';
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-transparent">
      <div className="bg-white dark:teacher-glass-card border-b border-gray-100 dark:border-white/5 px-4 py-4 flex items-center gap-3">
        <button onClick={() => navigate('/teacher/classes')} className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-white/60" />
        </button>
        <div className="flex-1">
          <h1 className="text-base font-bold text-gray-900 dark:text-white">Class {cls}{section ? ` – ${section}` : ''}</h1>
          <p className="text-xs text-gray-500 dark:text-white/40">Subjects & timetable</p>
        </div>
        {isClassTeacher && (
          <button
            onClick={() => navigate(`/teacher/attendance/${cls}/${section}`)}
            className="h-9 px-3.5 bg-[#5B21B6] dark:bg-violet-600 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 hover:bg-[#4C1D95] dark:hover:bg-violet-700 transition-colors"
          >
            <CalendarCheck className="w-3.5 h-3.5" />
            Mark Attendance
          </button>
        )}
      </div>

      <div className="px-4 py-5 max-w-2xl mx-auto space-y-5">
        {/* Subjects taught */}
        <div className="bg-white dark:teacher-glass-card rounded-2xl border border-gray-100 dark:border-transparent shadow-sm p-4">
          <h2 className="text-xs font-bold text-gray-500 dark:text-white/40 uppercase tracking-widest mb-3 flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-gray-400 dark:text-white/30" /> Subject Taught
          </h2>
          {subjectsTaught.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-white/30">No subjects on record for this class.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {subjectsTaught.map((s) => (
                <span key={s} className="text-xs font-semibold text-[#5B21B6] dark:text-violet-300 bg-[#A855F7]/10 dark:bg-[#A855F7]/15 px-2.5 py-1 rounded-full">{s}</span>
              ))}
            </div>
          )}
        </div>

        {/* Timetable */}
        <div className="bg-white dark:teacher-glass-card rounded-2xl border border-gray-100 dark:border-transparent shadow-sm overflow-hidden">
          <div className="px-4 pt-4">
            <h2 className="text-xs font-bold text-gray-500 dark:text-white/40 uppercase tracking-widest mb-3">Class Timetable</h2>
            <div className="flex gap-1.5 overflow-x-auto pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {[1, 2, 3, 4, 5, 6].map((day) => (
                <button
                  key={day}
                  onClick={() => setActiveDay(day)}
                  className={cn(
                    'shrink-0 h-9 px-3.5 rounded-xl text-xs font-semibold transition-colors',
                    activeDay === day 
                      ? 'bg-[#5B21B6] dark:bg-violet-600 text-white' 
                      : 'bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-white/60 hover:bg-gray-200 dark:hover:bg-white/15',
                  )}
                >
                  {DAY_FULL[day].slice(0, 3)}
                </button>
              ))}
            </div>
          </div>

          {ttLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-5 h-5 text-gray-400 dark:text-white/30 animate-spin" />
            </div>
          ) : ttError || !timetable ? (
            <div className="flex items-center gap-2 text-sm text-gray-400 dark:text-white/30 px-4 pb-5">
              <AlertCircle className="w-4 h-4" /> No published timetable for this class yet.
            </div>
          ) : dayEntries.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-white/30 px-4 pb-5">No periods scheduled on {DAY_FULL[activeDay]}.</p>
          ) : (
            <div className="divide-y divide-gray-50 dark:divide-white/5 border-t border-gray-50 dark:border-white/5">
              {dayEntries.map((entry) => (
                <div key={String(entry._id)} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{entry.subjectName}</p>
                    <p className="text-xs text-gray-400 dark:text-white/40">{entry.teacherName ?? 'Unassigned'}</p>
                  </div>
                  <span className="text-xs text-gray-400 dark:text-white/40 shrink-0">{slotLabel(entry.slotId)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
