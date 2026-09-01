import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkles, AlertCircle, ChevronRight } from 'lucide-react';
import { useTeacherWorkspace } from '@/features/teacher-workspace/hooks/useTeacherWorkspace';
import { cn } from '@/lib/utils';

const ACCENTS = [
  { bg: 'bg-[#EAF6FF]', text: 'text-[#0284C7]' },
  { bg: 'bg-emerald-50', text: 'text-[#20C997]' },
  { bg: 'bg-amber-50', text: 'text-[#FFB547]' },
  { bg: 'bg-[#F3EEFF]', text: 'text-[#6D4AFF]' },
];

function SkeletonCard() {
  return <div className="h-20 rounded-2xl bg-white teacher-glass-card shadow-sm animate-pulse" />;
}

/** Class + section + subject triples straight from the Timetable-derived
 *  weekly schedule — same source Teacher Planner v2's hub used, but keeping
 *  section (v2's dedup dropped it since it never needed real period counts;
 *  the Academic Planning Engine does, to size teaching capacity correctly). */
function useTeacherClassSectionSubjectOptions() {
  const { data, isLoading, isError } = useTeacherWorkspace();

  const options = useMemo(() => {
    if (!data) return [];
    const seen = new Map<string, { cls: string; section: string; subjectName: string }>();
    for (const day of data.weekSchedule) {
      for (const e of day.entries) {
        if (!e.subjectName) continue;
        seen.set(`${e.class}||${e.section}||${e.subjectName}`, { cls: e.class, section: e.section, subjectName: e.subjectName });
      }
    }
    return Array.from(seen.values()).sort((a, b) => `${a.cls}${a.section}${a.subjectName}`.localeCompare(`${b.cls}${b.section}${b.subjectName}`));
  }, [data]);

  return { options, isLoading, isError };
}

export function AcademicPlanHubPage() {
  const navigate = useNavigate();
  const { options: entries, isLoading, isError } = useTeacherClassSectionSubjectOptions();

  return (
    <div className="min-h-screen bg-[#FAFBFF] dark:bg-transparent">
      <div className="px-5 pt-6 pb-4 max-w-3xl mx-auto">
        <button
          onClick={() => navigate('/teacher')}
          className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors mb-4 -ml-1 p-1"
          type="button"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <h1 className="text-[28px] sm:text-[36px] font-bold text-gray-900 dark:text-white tracking-tight leading-none">
          Academic Plan
        </h1>
        <p className="text-base text-gray-500 dark:text-white/40 mt-2">
          Pick a class and subject — your day-by-day teaching plan is generated automatically from the syllabus, calendar, and exam dates.
        </p>

        <div className="flex flex-col gap-3 mt-6">
          {isLoading ? (
            <>
              <SkeletonCard />
              <SkeletonCard />
            </>
          ) : isError ? (
            <div className="bg-red-50 border border-red-100 rounded-2xl p-5 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm font-semibold text-red-700">Failed to load your classes</p>
            </div>
          ) : entries.length === 0 ? (
            <div className="bg-white teacher-glass-card rounded-2xl border border-gray-100 dark:border-transparent p-10 text-center">
              <Sparkles className="w-10 h-10 text-gray-300 dark:text-white/20 mx-auto mb-3" />
              <p className="text-base font-semibold text-gray-700 dark:text-white/80">No subjects assigned</p>
              <p className="text-sm text-gray-400 dark:text-white/30 mt-1">
                Your principal hasn't assigned you a subject on the timetable yet.
              </p>
            </div>
          ) : (
            entries.map((entry, i) => {
              const accent = ACCENTS[i % ACCENTS.length];
              return (
                <button
                  key={`${entry.cls}||${entry.section}||${entry.subjectName}`}
                  type="button"
                  onClick={() => navigate(`/teacher/academic-plan/${entry.cls}/${entry.section}/${encodeURIComponent(entry.subjectName)}`)}
                  className="w-full text-left flex items-center gap-4 bg-white teacher-glass-card rounded-2xl border border-gray-100 dark:border-transparent shadow-sm px-4 py-4 hover:shadow-md transition-shadow"
                >
                  <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center shrink-0', accent.bg)}>
                    <Sparkles className={cn('w-5 h-5', accent.text)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{entry.subjectName}</p>
                    <p className="text-xs text-gray-400 dark:text-white/40 mt-0.5">Class {entry.cls}-{entry.section}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 dark:text-white/30 shrink-0" />
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
