import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, GraduationCap, AlertCircle, ChevronRight, ClipboardList, Lock } from 'lucide-react';
import { useTeacherWorkspace } from '@/features/teacher-workspace/hooks/useTeacherWorkspace';
import { useExamsForClass } from '@/features/marks/hooks/useExams';
import type { Exam } from '@schoolos/types';

interface ClassEntry {
  cls: string;
  section: string;
}

const EXAM_TYPE_LABELS: Record<Exam['examType'], string> = {
  unit_test: 'Unit Test', monthly_test: 'Monthly Test', half_yearly: 'Half Yearly',
  annual: 'Annual', practical: 'Practical', internal_assessment: 'Internal Assessment', other: 'Exam',
};

function SkeletonCard() {
  return <div className="h-20 rounded-2xl bg-white teacher-glass-card shadow-sm animate-pulse" />;
}

function ExamPicker({ entry, onBack, onPickExam }: { entry: ClassEntry; onBack: () => void; onPickExam: (exam: Exam) => void }) {
  const { data: exams, isLoading, isError } = useExamsForClass(entry.cls);

  return (
    <div className="px-4 py-5 max-w-2xl mx-auto">
      <button onClick={onBack} type="button" className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors mb-4 -ml-1 p-1">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <h1 className="text-xl font-bold text-gray-900 dark:text-white">Class {entry.cls} – {entry.section}</h1>
      <p className="text-sm text-gray-500 dark:text-white/40 mt-1">Choose an exam to generate report cards for.</p>

      <div className="mt-5 flex flex-col gap-3">
        {isLoading ? (
          <><SkeletonCard /><SkeletonCard /></>
        ) : isError ? (
          <div className="bg-red-50 border border-red-100 rounded-2xl p-5 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm font-semibold text-red-700">Failed to load exams for this class</p>
          </div>
        ) : (exams ?? []).length === 0 ? (
          <div className="bg-white teacher-glass-card rounded-2xl border border-gray-100 dark:border-transparent p-8 text-center">
            <ClipboardList className="w-10 h-10 text-gray-300 dark:text-white/20 mx-auto mb-3" />
            <p className="text-sm font-semibold text-gray-700 dark:text-white/80">No exams configured yet</p>
          </div>
        ) : (
          (exams ?? []).map((exam) => (
            <button
              key={exam._id} type="button" onClick={() => onPickExam(exam)}
              className="w-full text-left flex items-center gap-4 bg-white teacher-glass-card rounded-2xl border border-gray-100 dark:border-transparent shadow-sm px-4 py-4 hover:shadow-md transition-shadow"
            >
              <div className="w-11 h-11 rounded-xl bg-[#F3EEFF] dark:bg-[#A855F7]/15 flex items-center justify-center shrink-0">
                <ClipboardList className="w-5 h-5 text-[#6D4AFF] dark:text-violet-300" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{exam.name}</p>
                <p className="text-xs text-gray-400 dark:text-white/40 mt-0.5">
                  {EXAM_TYPE_LABELS[exam.examType]}{exam.termLabel ? ` · ${exam.termLabel}` : ''}
                </p>
              </div>
              {exam.status === 'locked' && <Lock className="w-4 h-4 text-gray-300 dark:text-white/20 shrink-0" />}
              <ChevronRight className="w-4 h-4 text-gray-400 dark:text-white/30 shrink-0" />
            </button>
          ))
        )}
      </div>
    </div>
  );
}

export function ReportCardHubPage() {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useTeacherWorkspace();
  const [selected, setSelected] = useState<ClassEntry | null>(null);

  const entries = useMemo<ClassEntry[]>(() => {
    if (!data) return [];
    const seen = new Map<string, ClassEntry>();
    for (const day of data.weekSchedule) {
      for (const e of day.entries) {
        const key = `${e.class}||${e.section}`;
        seen.set(key, { cls: e.class, section: e.section });
      }
    }
    return Array.from(seen.values()).sort((a, b) => `${a.cls}${a.section}`.localeCompare(`${b.cls}${b.section}`));
  }, [data]);

  if (selected) {
    return (
      <ExamPicker
        entry={selected}
        onBack={() => setSelected(null)}
        onPickExam={(exam) => navigate(`/teacher/report-cards/${exam._id}/${selected.cls}/${selected.section}`)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFBFF] dark:bg-transparent">
      <div className="px-5 pt-6 pb-4 max-w-3xl mx-auto">
        <button onClick={() => navigate('/teacher')} className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors mb-4 -ml-1 p-1" type="button">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <h1 className="text-[28px] sm:text-[36px] font-bold text-gray-900 dark:text-white tracking-tight leading-none">Report Cards</h1>
        <p className="text-base text-gray-500 dark:text-white/40 mt-2">Pick a class to generate AI-assisted report cards.</p>

        <div className="flex flex-col gap-3 mt-6">
          {isLoading ? (
            <><SkeletonCard /><SkeletonCard /><SkeletonCard /></>
          ) : isError ? (
            <div className="bg-red-50 border border-red-100 rounded-2xl p-5 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm font-semibold text-red-700">Failed to load your classes</p>
            </div>
          ) : entries.length === 0 ? (
            <div className="bg-white teacher-glass-card rounded-2xl border border-gray-100 dark:border-transparent p-10 text-center">
              <GraduationCap className="w-10 h-10 text-gray-300 dark:text-white/20 mx-auto mb-3" />
              <p className="text-base font-semibold text-gray-700 dark:text-white/80">No classes assigned</p>
            </div>
          ) : (
            entries.map((entry) => (
              <button
                key={`${entry.cls}||${entry.section}`} type="button" onClick={() => setSelected(entry)}
                className="w-full text-left flex items-center gap-4 bg-white teacher-glass-card rounded-2xl border border-gray-100 dark:border-transparent shadow-sm px-4 py-4 hover:shadow-md transition-shadow"
              >
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 bg-[#F3EEFF]">
                  <GraduationCap className="w-5 h-5 text-[#6D4AFF]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 dark:text-white truncate">Class {entry.cls} – {entry.section}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 dark:text-white/30 shrink-0" />
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
