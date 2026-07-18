import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, AlertCircle, ChevronRight, ClipboardList, Lock } from 'lucide-react';
import { useTeacherWorkspace } from '@/features/teacher-workspace/hooks/useTeacherWorkspace';
import { useExamsForClass } from '../hooks/useExams';
import { cn } from '@/lib/utils';
import type { Exam } from '@schoolos/types';

interface SubjectEntry {
  cls: string;
  section: string;
  subjectName: string;
}

const ACCENTS = [
  { bg: 'bg-[#F3EEFF]', text: 'text-[#6D4AFF]' },
  { bg: 'bg-blue-50',   text: 'text-[#4A90FF]' },
  { bg: 'bg-emerald-50',text: 'text-[#20C997]' },
  { bg: 'bg-amber-50',  text: 'text-[#FFB547]' },
];

const EXAM_TYPE_LABELS: Record<Exam['examType'], string> = {
  unit_test: 'Unit Test',
  monthly_test: 'Monthly Test',
  half_yearly: 'Half Yearly',
  annual: 'Annual',
  practical: 'Practical',
  internal_assessment: 'Internal Assessment',
  other: 'Exam',
};

function SkeletonCard() {
  return <div className="h-20 rounded-2xl bg-white dark:teacher-glass-card shadow-sm animate-pulse" />;
}

// ── Exam picker for a chosen class + subject ──────────────────────────────────

function ExamPicker({ entry, onBack, onPickExam }: { entry: SubjectEntry; onBack: () => void; onPickExam: (exam: Exam) => void }) {
  const { data: exams, isLoading, isError } = useExamsForClass(entry.cls);
  const applicable = (exams ?? []).filter((e) => e.subjects.includes(entry.subjectName));

  return (
    <div className="px-4 py-5 max-w-2xl mx-auto">
      <button
        onClick={onBack}
        type="button"
        className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors mb-4 -ml-1 p-1"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      <h1 className="text-xl font-bold text-gray-900 dark:text-white">
        Class {entry.cls} – {entry.section} · {entry.subjectName}
      </h1>
      <p className="text-sm text-gray-500 dark:text-white/40 mt-1">Choose an exam to enter marks for.</p>

      <div className="mt-5 flex flex-col gap-3">
        {isLoading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : isError ? (
          <div className="bg-red-50 border border-red-100 rounded-2xl p-5 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm font-semibold text-red-700">Failed to load exams for this class</p>
          </div>
        ) : applicable.length === 0 ? (
          <div className="bg-white dark:teacher-glass-card rounded-2xl border border-gray-100 dark:border-transparent p-8 text-center">
            <ClipboardList className="w-10 h-10 text-gray-300 dark:text-white/20 mx-auto mb-3" />
            <p className="text-sm font-semibold text-gray-700 dark:text-white/80">No exams configured yet</p>
            <p className="text-xs text-gray-400 dark:text-white/30 mt-1">
              Ask an admin to configure an exam for {entry.subjectName} in Class {entry.cls} before entering marks.
            </p>
          </div>
        ) : (
          applicable.map((exam) => (
            <button
              key={exam._id}
              type="button"
              onClick={() => onPickExam(exam)}
              className="w-full text-left flex items-center gap-4 bg-white dark:teacher-glass-card rounded-2xl border border-gray-100 dark:border-transparent shadow-sm px-4 py-4 hover:shadow-md transition-shadow"
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

// ── Page ─────────────────────────────────────────────────────────────────────

export function MarksHubPage() {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useTeacherWorkspace();
  const [selected, setSelected] = useState<SubjectEntry | null>(null);

  const entries = useMemo<SubjectEntry[]>(() => {
    if (!data) return [];
    const seen = new Map<string, SubjectEntry>();
    for (const day of data.weekSchedule) {
      for (const e of day.entries) {
        if (!e.subjectName) continue;
        const key = `${e.class}||${e.section}||${e.subjectName}`;
        seen.set(key, { cls: e.class, section: e.section, subjectName: e.subjectName });
      }
    }
    return Array.from(seen.values()).sort((a, b) =>
      `${a.cls}${a.section}${a.subjectName}`.localeCompare(`${b.cls}${b.section}${b.subjectName}`),
    );
  }, [data]);

  if (selected) {
    return (
      <ExamPicker
        entry={selected}
        onBack={() => setSelected(null)}
        onPickExam={(exam) =>
          navigate(
            `/teacher/marks/${selected.cls}/${selected.section}/${encodeURIComponent(selected.subjectName)}/${exam._id}`,
          )
        }
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFBFF] dark:bg-transparent">
      <div className="px-5 pt-6 pb-4 max-w-3xl mx-auto">
        <button
          onClick={() => navigate('/teacher')}
          className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors mb-4 -ml-1 p-1"
          type="button"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <h1 className="text-[28px] sm:text-[36px] font-bold text-gray-900 dark:text-white tracking-tight leading-none">
          Marks & Report Cards
        </h1>
        <p className="text-base text-gray-500 dark:text-white/40 mt-2">
          Pick a class and subject to enter marks.
        </p>

        <div className="flex flex-col gap-3 mt-6">
          {isLoading ? (
            <>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </>
          ) : isError ? (
            <div className="bg-red-50 border border-red-100 rounded-2xl p-5 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm font-semibold text-red-700">Failed to load your classes</p>
            </div>
          ) : entries.length === 0 ? (
            <div className="bg-white dark:teacher-glass-card rounded-2xl border border-gray-100 dark:border-transparent p-10 text-center">
              <BookOpen className="w-10 h-10 text-gray-300 dark:text-white/20 mx-auto mb-3" />
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
                  onClick={() => setSelected(entry)}
                  className="w-full text-left flex items-center gap-4 bg-white dark:teacher-glass-card rounded-2xl border border-gray-100 dark:border-transparent shadow-sm px-4 py-4 hover:shadow-md transition-shadow"
                >
                  <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center shrink-0', accent.bg)}>
                    <BookOpen className={cn('w-5 h-5', accent.text)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{entry.subjectName}</p>
                    <p className="text-xs text-gray-400 dark:text-white/40 mt-0.5">
                      Class {entry.cls} – {entry.section}
                    </p>
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
