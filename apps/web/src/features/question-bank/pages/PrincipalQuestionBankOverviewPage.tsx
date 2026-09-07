import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Library, Search, ChevronRight, ChevronDown, AlertCircle, FileText, Users2 } from 'lucide-react';
import { usePrincipalMaterialsOverview } from '../hooks/useQuestionBank';
import type { PrincipalMaterialsChapter } from '@schoolos/types';

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  medium: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  hard: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
};

function formatDate(iso: string | null): string {
  if (!iso) return 'No material yet';
  const d = new Date(iso);
  return `Updated ${d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}`;
}

function chapterMatches(chapter: PrincipalMaterialsChapter, term: string): boolean {
  return chapter.chapterName.toLowerCase().includes(term);
}

function ChapterRow({ chapter }: { chapter: PrincipalMaterialsChapter }) {
  const [showPapers, setShowPapers] = useState(false);
  const difficultyEntries = Object.entries(chapter.questionCountByDifficulty).filter(([, count]) => count > 0);

  return (
    <div className="rounded-xl border border-gray-100 dark:border-white/10 bg-white dark:bg-white/[0.03] px-4 py-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <p className="text-sm font-bold text-gray-900 dark:text-white">{chapter.chapterName}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">{formatDate(chapter.lastUpdated)}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="inline-flex items-center h-6 px-2.5 rounded-full bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-white/70 text-[11px] font-bold">
            {chapter.questionCount} question{chapter.questionCount === 1 ? '' : 's'}
          </span>
        </div>
      </div>

      {difficultyEntries.length > 0 && (
        <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
          {difficultyEntries.map(([level, count]) => (
            <span key={level} className={`inline-flex items-center h-5 px-2 rounded-full text-[10px] font-bold capitalize ${DIFFICULTY_COLORS[level] ?? 'bg-gray-100 text-gray-600'}`}>
              {level} · {count}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-white/10">
        <button
          type="button"
          onClick={() => setShowPapers((v) => !v)}
          disabled={chapter.papers.length === 0}
          className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-white/50 hover:text-gray-900 dark:hover:text-white disabled:opacity-50 disabled:cursor-default"
        >
          <FileText className="w-3.5 h-3.5" />
          {chapter.papers.length} paper{chapter.papers.length === 1 ? '' : 's'}
          {chapter.papers.length > 0 && (showPapers ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />)}
        </button>
        <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-white/50" title={chapter.teacherNames.join(', ')}>
          <Users2 className="w-3.5 h-3.5" />
          <span className="truncate max-w-[160px]">{chapter.teacherNames.length > 0 ? chapter.teacherNames.join(', ') : 'Unknown'}</span>
        </div>
      </div>

      {showPapers && chapter.papers.length > 0 && (
        <div className="mt-2.5 space-y-1.5">
          {chapter.papers.map((p) => (
            <div key={p._id} className="flex items-center justify-between text-xs bg-gray-50 dark:bg-white/5 rounded-lg px-3 py-2">
              <span className="font-medium text-gray-700 dark:text-white/70 truncate">{p.title}</span>
              <span className="text-gray-400 shrink-0 ml-3">{new Date(p.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Principal/coordinator-only: every class → subject → chapter in the school's Question Bank, with
 *  material counts, generated papers, last-updated, and the contributing teacher(s) — a read-only
 *  oversight screen mirroring PrincipalPlannerPage/PrincipalAcademicPlanPage's accordion structure,
 *  one level deeper (class → subject → chapter instead of teacher → class/subject). */
export function PrincipalQuestionBankOverviewPage() {
  const navigate = useNavigate();
  const { data, isLoading, isError } = usePrincipalMaterialsOverview();
  const [search, setSearch] = useState('');
  const [expandedClasses, setExpandedClasses] = useState<Set<string>>(new Set());
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set());

  const classes = useMemo(() => {
    if (!data) return [];
    const term = search.trim().toLowerCase();
    if (!term) return data;

    return data
      .map((c) => ({
        ...c,
        subjects: c.subjects
          .map((s) => ({ ...s, chapters: s.chapters.filter((ch) => chapterMatches(ch, term)) }))
          .filter((s) => s.subject.toLowerCase().includes(term) || s.chapters.length > 0),
      }))
      .filter((c) => c.class.toLowerCase().includes(term) || c.subjects.length > 0);
  }, [data, search]);

  const toggleClass = (cls: string) => {
    setExpandedClasses((prev) => {
      const next = new Set(prev);
      if (next.has(cls)) next.delete(cls); else next.add(cls);
      return next;
    });
  };
  const toggleSubject = (key: string) => {
    setExpandedSubjects((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-[#FAFBFF] dark:bg-transparent pb-24">
      <div className="px-5 pt-6 pb-4 max-w-3xl mx-auto">
        <button onClick={() => navigate('/principal')} className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 mb-4 -ml-1 p-1" type="button">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <h1 className="text-[28px] sm:text-[36px] font-bold text-gray-900 dark:text-white tracking-tight leading-none">Question Bank Overview</h1>
        <p className="text-base text-gray-500 dark:text-white/40 mt-2">Materials by class — question counts, generated papers, and who authored each chapter.</p>

        <div className="mt-5 relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search class, subject, or chapter…"
            className="w-full h-11 pl-10 pr-4 rounded-xl border border-gray-200 dark:border-white/10 dark:bg-white/5 dark:text-white text-sm"
          />
        </div>

        <div className="mt-5 space-y-3">
          {isLoading ? (
            <>
              <div className="h-20 rounded-2xl bg-white shadow-sm animate-pulse" />
              <div className="h-20 rounded-2xl bg-white shadow-sm animate-pulse" />
            </>
          ) : isError ? (
            <div className="bg-red-50 border border-red-100 rounded-2xl p-5 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm font-semibold text-red-700">Failed to load Question Bank overview</p>
            </div>
          ) : classes.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
              <Library className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm font-semibold text-gray-700">No classes found</p>
            </div>
          ) : (
            classes.map((c) => {
              const isOpen = expandedClasses.has(c.class);
              const chapterCount = c.subjects.reduce((sum, s) => sum + s.chapters.length, 0);
              const questionCount = c.subjects.reduce((sum, s) => sum + s.chapters.reduce((qs, ch) => qs + ch.questionCount, 0), 0);

              return (
                <div key={c.class} className="bg-white dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggleClass(c.class)}
                    className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-gray-50/80 dark:hover:bg-white/10 transition-colors"
                  >
                    <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 bg-[#6D4AFF]">
                      <span className="text-sm font-bold text-white">{c.class}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900 dark:text-white">Class {c.class}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        {c.subjects.length} subject{c.subjects.length === 1 ? '' : 's'} · {chapterCount} chapter{chapterCount === 1 ? '' : 's'} · {questionCount} question{questionCount === 1 ? '' : 's'}
                      </p>
                    </div>
                    {isOpen ? <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" /> : <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />}
                  </button>

                  {isOpen && (
                    <div className="px-4 pb-4 space-y-2.5">
                      {c.subjects.map((s) => {
                        const subjectKey = `${c.class}::${s.subject}`;
                        const subjectOpen = expandedSubjects.has(subjectKey);
                        const subjectQuestionCount = s.chapters.reduce((sum, ch) => sum + ch.questionCount, 0);

                        return (
                          <div key={subjectKey} className="rounded-xl border border-gray-100 dark:border-white/10">
                            <button
                              type="button"
                              onClick={() => toggleSubject(subjectKey)}
                              className="w-full flex items-center justify-between gap-3 px-3.5 py-3 text-left hover:bg-gray-50/60 dark:hover:bg-white/5 transition-colors"
                            >
                              <div className="min-w-0">
                                <p className="text-sm font-bold text-gray-800 dark:text-white/90">{s.subject}</p>
                                <p className="text-[11px] text-gray-400 mt-0.5">
                                  {s.chapters.length} chapter{s.chapters.length === 1 ? '' : 's'} · {subjectQuestionCount} question{subjectQuestionCount === 1 ? '' : 's'}
                                </p>
                              </div>
                              {subjectOpen ? <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" /> : <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />}
                            </button>

                            {subjectOpen && (
                              <div className="px-3.5 pb-3.5 space-y-2">
                                {s.chapters.length === 0 ? (
                                  <p className="text-xs text-gray-400 py-2">No chapters yet</p>
                                ) : (
                                  s.chapters.map((chapter) => <ChapterRow key={chapter.chapterId} chapter={chapter} />)
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
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
