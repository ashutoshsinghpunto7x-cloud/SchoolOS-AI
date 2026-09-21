import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, AlertCircle, ChevronRight, ClipboardList, Lock, FileText, Sparkles, Search, X } from 'lucide-react';
import { useMasterGrid } from '@/features/timetable/hooks/useTimetable';
import { useExamsForClass } from '../hooks/useExams';
import { TermAiCaptureModal } from '../components/TermAiCaptureModal';
import { cn } from '@/lib/utils';
import type { Exam } from '@schoolos/types';

function defaultAcademicYear(): string {
  const y = new Date().getFullYear();
  return `${y}-${String(y + 1).slice(2)}`;
}

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
  return <div className="h-20 rounded-2xl bg-white teacher-glass-card shadow-sm animate-pulse" />;
}

// ── Exam picker for a chosen class + subject ──────────────────────────────────

function ExamPicker({ entry, onBack, onPickExam }: { entry: SubjectEntry; onBack: () => void; onPickExam: (exam: Exam) => void }) {
  const { data: exams, isLoading, isError } = useExamsForClass(entry.cls);
  const applicable = (exams ?? []).filter((e) => e.subjects.includes(entry.subjectName));
  const [showTermAi, setShowTermAi] = useState(false);

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
          <div className="bg-white teacher-glass-card rounded-2xl border border-gray-100 dark:border-transparent p-8 text-center">
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

      {applicable.length >= 2 && (
        <button
          type="button"
          onClick={() => setShowTermAi(true)}
          className="w-full text-left flex items-center gap-4 rounded-2xl px-4 py-4 mt-3 shadow-sm hover:shadow-md transition-shadow bg-gradient-to-r from-violet-600 to-pink-500"
        >
          <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white">AI Fill — Unit Tests + Half Yearly</p>
            <p className="text-xs text-white/70 mt-0.5">One combined register photo fills all three exams at once</p>
          </div>
          <ChevronRight className="w-4 h-4 text-white/60 shrink-0" />
        </button>
      )}

      {showTermAi && (
        <TermAiCaptureModal
          cls={entry.cls}
          section={entry.section}
          subjectName={entry.subjectName}
          exams={applicable}
          onClose={() => setShowTermAi(false)}
        />
      )}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

// Marks access is open school-wide (2026-09-16): every teacher can see and
// enter marks for every class/section/subject in the school, not just the
// ones they're personally timetabled for. The whole-school master grid
// (the same data source as the Principal's School Timetable screen) already
// lists every class+section+subject combination, so it doubles as this
// "all classes and subjects" picker with no separate endpoint needed. A
// saved record is still protected — see the per-record edit lock shown on
// each student row once an exam is opened.
export function MarksHubPage({ basePath = '/teacher' }: { basePath?: string }) {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useMasterGrid({ academicYear: defaultAcademicYear() });
  const [selected, setSelected] = useState<SubjectEntry | null>(null);
  const [search, setSearch] = useState('');

  const entries = useMemo<SubjectEntry[]>(() => {
    if (!data) return [];
    const seen = new Map<string, SubjectEntry>();
    for (const row of data.rows) {
      for (const cell of Object.values(row.cells)) {
        if (!cell?.subjectName) continue;
        const key = `${row.class}||${row.section}||${cell.subjectName}`;
        seen.set(key, { cls: row.class, section: row.section, subjectName: cell.subjectName });
      }
    }
    return Array.from(seen.values()).sort((a, b) =>
      `${a.cls}${a.section}${a.subjectName}`.localeCompare(`${b.cls}${b.section}${b.subjectName}`),
    );
  }, [data]);

  // Free-text filter over class, section and subject — lets a teacher/
  // principal jump straight to e.g. "II A maths" instead of scanning a long
  // list, without needing a separate dropdown per field.
  const filteredEntries = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return entries;
    const terms = q.split(/\s+/).filter(Boolean);
    return entries.filter((e) => {
      const haystack = `class ${e.cls} ${e.cls} ${e.section} ${e.subjectName}`.toLowerCase();
      return terms.every((t) => haystack.includes(t));
    });
  }, [entries, search]);

  if (selected) {
    return (
      <ExamPicker
        entry={selected}
        onBack={() => setSelected(null)}
        onPickExam={(exam) =>
          navigate(
            `${basePath}/marks/${selected.cls}/${selected.section}/${encodeURIComponent(selected.subjectName)}/${exam._id}`,
          )
        }
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFBFF] dark:bg-transparent">
      <div className="px-5 pt-6 pb-4 max-w-3xl mx-auto">
        <button
          onClick={() => navigate(basePath)}
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

        <button
          type="button"
          onClick={() => navigate('/term-report-cards')}
          className="w-full text-left flex items-center gap-4 rounded-2xl px-4 py-4 mt-5 shadow-sm hover:shadow-md transition-shadow"
          style={{ backgroundColor: '#1C2B4A' }}
        >
          <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white">Generate Report Cards</p>
            <p className="text-xs text-white/60 mt-0.5">Term report cards, using the class's approved layout</p>
          </div>
          <ChevronRight className="w-4 h-4 text-white/50 shrink-0" />
        </button>

        {!isLoading && !isError && entries.length > 0 && (
          <div className="relative mt-5">
            <Search className="w-4 h-4 text-gray-400 dark:text-white/30 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by class or subject — e.g. &quot;II A Maths&quot;"
              className="w-full h-11 pl-10 pr-9 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#A855F7]/30"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-white/30 hover:text-gray-600 dark:hover:text-white/60"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

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
            <div className="bg-white teacher-glass-card rounded-2xl border border-gray-100 dark:border-transparent p-10 text-center">
              <BookOpen className="w-10 h-10 text-gray-300 dark:text-white/20 mx-auto mb-3" />
              <p className="text-base font-semibold text-gray-700 dark:text-white/80">No classes or subjects yet</p>
              <p className="text-sm text-gray-400 dark:text-white/30 mt-1">
                No class timetable has been set up yet — ask an admin to configure one first.
              </p>
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="bg-white teacher-glass-card rounded-2xl border border-gray-100 dark:border-transparent p-10 text-center">
              <Search className="w-10 h-10 text-gray-300 dark:text-white/20 mx-auto mb-3" />
              <p className="text-base font-semibold text-gray-700 dark:text-white/80">No matches</p>
              <p className="text-sm text-gray-400 dark:text-white/30 mt-1">Try a different class or subject name.</p>
            </div>
          ) : (
            filteredEntries.map((entry, i) => {
              const accent = ACCENTS[i % ACCENTS.length];
              return (
                <button
                  key={`${entry.cls}||${entry.section}||${entry.subjectName}`}
                  type="button"
                  onClick={() => setSelected(entry)}
                  className="w-full text-left flex items-center gap-4 bg-white teacher-glass-card rounded-2xl border border-gray-100 dark:border-transparent shadow-sm px-4 py-4 hover:shadow-md transition-shadow"
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
