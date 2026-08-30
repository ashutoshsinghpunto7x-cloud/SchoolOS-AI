import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, BookOpen, ChevronDown, ChevronUp, ChevronRight, AlertCircle } from 'lucide-react';
import { usePrincipalPlannerOverview } from '@/features/teacher-planner/hooks/useTeacherPlanner';

/** Level 2 — one row per subject this teacher teaches, with the syllabus
 *  completion % averaged across that subject's classes. Expanding a subject
 *  reveals its per-class rows, each linking into the read/write detail view. */
export function PrincipalPlannerTeacherPage() {
  const { teacherId = '' } = useParams();
  const navigate = useNavigate();
  const { data, isLoading, isError } = usePrincipalPlannerOverview();
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);

  const { teacherName, subjects } = useMemo(() => {
    const entries = (data ?? []).filter((e) => e.teacherId === teacherId && e.hasPlanner);
    const name = data?.find((e) => e.teacherId === teacherId)?.teacherName ?? '';

    const bySubject = new Map<string, typeof entries>();
    for (const e of entries) {
      const list = bySubject.get(e.subject) ?? [];
      list.push(e);
      bySubject.set(e.subject, list);
    }

    const subjects = [...bySubject.entries()]
      .map(([subject, classes]) => ({
        subject,
        avgPercent: Math.round(classes.reduce((sum, e) => sum + e.yearPercent, 0) / classes.length),
        classes: [...classes].sort((a, b) => a.class.localeCompare(b.class)),
      }))
      .sort((a, b) => a.subject.localeCompare(b.subject));

    return { teacherName: name, subjects };
  }, [data, teacherId]);

  return (
    <div className="min-h-screen bg-[#FAFBFF] dark:bg-transparent pb-24">
      <div className="px-5 pt-6 pb-4 max-w-3xl mx-auto">
        <button onClick={() => navigate('/principal/planner')} className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 mb-4 -ml-1 p-1" type="button">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <h1 className="text-[26px] sm:text-[32px] font-bold text-gray-900 dark:text-white tracking-tight leading-none">{teacherName || 'Teacher'}</h1>
        <p className="text-base text-gray-500 dark:text-white/40 mt-2">Progress per subject — averaged across every class they teach it in.</p>

        <div className="mt-5 space-y-3">
          {isLoading ? (
            <>
              <div className="h-16 rounded-2xl bg-white shadow-sm animate-pulse" />
              <div className="h-16 rounded-2xl bg-white shadow-sm animate-pulse" />
            </>
          ) : isError ? (
            <div className="bg-red-50 border border-red-100 rounded-2xl p-5 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm font-semibold text-red-700">Failed to load this teacher's planners</p>
            </div>
          ) : subjects.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
              <BookOpen className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm font-semibold text-gray-700">No planner built yet</p>
            </div>
          ) : (
            subjects.map((s) => {
              const expanded = expandedSubject === s.subject;
              return (
                <div key={s.subject} className="bg-white dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setExpandedSubject(expanded ? null : s.subject)}
                    className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-gray-50/80 dark:hover:bg-white/5 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{s.subject}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">{s.classes.length} class{s.classes.length === 1 ? '' : 'es'}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="w-16 h-1.5 rounded-full bg-gray-100 dark:bg-white/10 overflow-hidden">
                        <div className="h-full rounded-full bg-[#6D4AFF]" style={{ width: `${s.avgPercent}%` }} />
                      </div>
                      <span className="text-sm font-bold text-gray-700 dark:text-white/70 w-9 text-right">{s.avgPercent}%</span>
                    </div>
                    {expanded ? <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />}
                  </button>
                  {expanded && (
                    <div>
                      {s.classes.map((c) => (
                        <button
                          key={c.class}
                          type="button"
                          onClick={() => navigate(`/principal/planner/${teacherId}/${c.class}/${encodeURIComponent(c.subject)}`)}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50/80 dark:hover:bg-white/5 transition-colors text-left border-t border-gray-50 dark:border-white/5"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-800 dark:text-white/80">Class {c.class}</p>
                            <p className="text-[11px] text-gray-400 mt-0.5">
                              {c.yearPercent}% complete
                              {c.teachingDaysBehind > 0 && <span className="text-amber-600"> · ~{c.teachingDaysBehind}d behind</span>}
                              {c.teachingDaysBehind < 0 && <span className="text-emerald-600"> · ahead of schedule</span>}
                            </p>
                          </div>
                          <div className="w-16 h-1.5 rounded-full bg-gray-100 dark:bg-white/10 overflow-hidden shrink-0">
                            <div className="h-full rounded-full bg-[#6D4AFF]" style={{ width: `${c.yearPercent}%` }} />
                          </div>
                          <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
