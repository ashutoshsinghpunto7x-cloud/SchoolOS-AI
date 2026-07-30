import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BookText, AlertCircle, ChevronRight } from 'lucide-react';
import { useTeacherWorkspace } from '@/features/teacher-workspace/hooks/useTeacherWorkspace';
import { useChapters } from '@/features/question-bank/hooks/useQuestionBank';
import { cn } from '@/lib/utils';

interface SubjectEntry {
  cls: string;
  subjectName: string;
}

const ACCENTS = [
  { bg: 'bg-[#FFF7ED]', text: 'text-[#EA580C]' },
  { bg: 'bg-[#F3EEFF]', text: 'text-[#6D4AFF]' },
  { bg: 'bg-emerald-50', text: 'text-[#20C997]' },
  { bg: 'bg-blue-50', text: 'text-[#4A90FF]' },
];

function SkeletonCard() {
  return <div className="h-20 rounded-2xl bg-white teacher-glass-card shadow-sm animate-pulse" />;
}

function ChapterPicker({ entry, onBack, onPickChapter }: { entry: SubjectEntry; onBack: () => void; onPickChapter: (chapterId: string, chapterName: string) => void }) {
  const { data: chapters, isLoading } = useChapters(entry.cls, entry.subjectName);

  return (
    <div className="px-4 py-5 max-w-2xl mx-auto">
      <button onClick={onBack} type="button" className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 mb-4 -ml-1 p-1">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>
      <h1 className="text-xl font-bold text-gray-900 dark:text-white">Class {entry.cls} · {entry.subjectName}</h1>
      <p className="text-sm text-gray-500 dark:text-white/40 mt-1">Choose a chapter to plan a lesson for.</p>

      <div className="mt-5 flex flex-col gap-3">
        {isLoading ? (
          <><SkeletonCard /><SkeletonCard /></>
        ) : !chapters || chapters.length === 0 ? (
          <div className="bg-white teacher-glass-card rounded-2xl border border-gray-100 dark:border-transparent p-8 text-center">
            <BookText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-gray-700 dark:text-white/80">No chapters yet</p>
            <p className="text-xs text-gray-400 mt-1">Upload a source to the Question Bank or Teacher Planner first — chapters are shared across both.</p>
          </div>
        ) : (
          chapters.map((c) => (
            <button
              key={c._id} type="button" onClick={() => onPickChapter(c._id, c.chapterName)}
              className="w-full text-left flex items-center gap-4 bg-white teacher-glass-card rounded-2xl border border-gray-100 dark:border-transparent shadow-sm px-4 py-4 hover:shadow-md transition-shadow"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{c.chapterName}</p>
                {c.topics.length > 0 && <p className="text-xs text-gray-400 mt-0.5 truncate">{c.topics.join(', ')}</p>}
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
            </button>
          ))
        )}
      </div>
    </div>
  );
}

export function LessonPlanHubPage() {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useTeacherWorkspace();
  const [selected, setSelected] = useState<SubjectEntry | null>(null);

  const entries = useMemo<SubjectEntry[]>(() => {
    if (!data) return [];
    const seen = new Map<string, SubjectEntry>();
    for (const day of data.weekSchedule) {
      for (const e of day.entries) {
        if (!e.subjectName) continue;
        seen.set(`${e.class}||${e.subjectName}`, { cls: e.class, subjectName: e.subjectName });
      }
    }
    return Array.from(seen.values()).sort((a, b) => `${a.cls}${a.subjectName}`.localeCompare(`${b.cls}${b.subjectName}`));
  }, [data]);

  if (selected) {
    return (
      <ChapterPicker
        entry={selected}
        onBack={() => setSelected(null)}
        onPickChapter={(chapterId, chapterName) =>
          navigate(`/teacher/lesson-planner/${selected.cls}/${encodeURIComponent(selected.subjectName)}/${chapterId}?chapterName=${encodeURIComponent(chapterName)}`)
        }
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFBFF] dark:bg-transparent">
      <div className="px-5 pt-6 pb-4 max-w-3xl mx-auto">
        <button onClick={() => navigate('/teacher')} className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 mb-4 -ml-1 p-1" type="button">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <h1 className="text-[28px] sm:text-[36px] font-bold text-gray-900 dark:text-white tracking-tight leading-none">Lesson Planner</h1>
        <p className="text-base text-gray-500 dark:text-white/40 mt-2">Pick a class and subject to plan a lesson.</p>

        <div className="flex flex-col gap-3 mt-6">
          {isLoading ? (
            <><SkeletonCard /><SkeletonCard /></>
          ) : isError ? (
            <div className="bg-red-50 border border-red-100 rounded-2xl p-5 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm font-semibold text-red-700">Failed to load your classes</p>
            </div>
          ) : entries.length === 0 ? (
            <div className="bg-white teacher-glass-card rounded-2xl border border-gray-100 dark:border-transparent p-10 text-center">
              <BookText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-base font-semibold text-gray-700 dark:text-white/80">No subjects assigned</p>
            </div>
          ) : (
            entries.map((entry, i) => {
              const accent = ACCENTS[i % ACCENTS.length];
              return (
                <button
                  key={`${entry.cls}||${entry.subjectName}`} type="button" onClick={() => setSelected(entry)}
                  className="w-full text-left flex items-center gap-4 bg-white teacher-glass-card rounded-2xl border border-gray-100 dark:border-transparent shadow-sm px-4 py-4 hover:shadow-md transition-shadow"
                >
                  <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center shrink-0', accent.bg)}>
                    <BookText className={cn('w-5 h-5', accent.text)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{entry.subjectName}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Class {entry.cls}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
