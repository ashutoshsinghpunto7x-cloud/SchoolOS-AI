import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, Sparkles } from 'lucide-react';
import { useChapters, useGeneratePaper, useQuestionSources } from '../hooks/useQuestionBank';
import type { PaperMarksBreakdownEntry, QuestionType } from '@schoolos/types';

const QUESTION_TYPES: QuestionType[] = ['mcq', 'fill_blank', 'true_false', 'assertion_reason', 'very_short', 'short', 'long', 'hots', 'case_study'];
const DIFFICULTY_LEVELS = ['easy', 'medium', 'hard'] as const;

function labelize(s: string): string {
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function PaperGeneratorPage() {
  const navigate = useNavigate();
  const [cls, setCls] = useState('');
  const [subject, setSubject] = useState('');
  const [examType, setExamType] = useState('Half Yearly');
  const [durationMinutes, setDurationMinutes] = useState<number | ''>('');
  const [selectedChapterIds, setSelectedChapterIds] = useState<Set<string>>(new Set());
  const [difficultyMix, setDifficultyMix] = useState<{ easy: number | ''; medium: number | ''; hard: number | '' }>({ easy: 0, medium: 0, hard: 0 });
  // Marks are set once per difficulty level and applied to every question of that level —
  // replaces the old manual "marks × count" row list, which made teachers hand-add a row
  // per marks value instead of just saying "every easy question is worth 1 mark".
  const [marksPerDifficulty, setMarksPerDifficulty] = useState<{ easy: number | ''; medium: number | ''; hard: number | '' }>({ easy: 1, medium: 2, hard: 4 });
  const [questionTypes, setQuestionTypes] = useState<Set<QuestionType>>(new Set());

  const { data: chapters } = useChapters(cls.trim(), subject.trim());
  // Uploads can have a chapter name assigned before any question from them has actually
  // been generated + saved — that's when a real SyllabusChapter (what `chapters` reads from)
  // gets created. Surfacing those pending names too (disabled) so a teacher who assigned a
  // chapter to an upload isn't told "no chapters yet" as if they hadn't uploaded anything.
  const { data: pendingSources } = useQuestionSources(cls.trim(), subject.trim());
  const savedChapterNames = new Set((chapters ?? []).map((c) => c.chapterName.trim().toLowerCase()));
  const pendingChapterNames = [...new Set(
    (pendingSources ?? [])
      .map((s) => s.chapterName?.trim())
      .filter((name): name is string => !!name && !savedChapterNames.has(name.toLowerCase())),
  )];
  const generate = useGeneratePaper();

  const totalMarks = DIFFICULTY_LEVELS.reduce(
    (sum, level) => sum + Number(difficultyMix[level] || 0) * Number(marksPerDifficulty[level] || 0),
    0,
  );
  // The engine buckets by marks value, not by difficulty tag directly (it then prefers
  // difficulty-matching candidates within a bucket) — so two levels sharing the same marks
  // value collapse into one bucket with their counts combined.
  function buildMarksBreakdown(): PaperMarksBreakdownEntry[] {
    const byMarks = new Map<number, number>();
    for (const level of DIFFICULTY_LEVELS) {
      const count = Number(difficultyMix[level] || 0);
      if (count <= 0) continue;
      const marks = Number(marksPerDifficulty[level] || 0);
      byMarks.set(marks, (byMarks.get(marks) ?? 0) + count);
    }
    return [...byMarks.entries()].map(([marks, count]) => ({ marks, count }));
  }

  function toggleChapter(id: string) {
    setSelectedChapterIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleType(t: QuestionType) {
    setQuestionTypes((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t); else next.add(t);
      return next;
    });
  }

  async function handleGenerate() {
    if (selectedChapterIds.size === 0) { toast.error('Select at least one chapter'); return; }
    const marksBreakdown = buildMarksBreakdown();
    if (marksBreakdown.length === 0) { toast.error('Set the difficulty mix first — how many easy/medium/hard questions you want'); return; }
    const missingMarks = DIFFICULTY_LEVELS.some(
      (level) => Number(difficultyMix[level] || 0) > 0 && Number(marksPerDifficulty[level] || 0) <= 0,
    );
    if (missingMarks) { toast.error('Set marks per question for every difficulty level you’re using'); return; }
    try {
      const paper = await generate.mutateAsync({
        class: cls.trim(),
        subject: subject.trim(),
        examType,
        chapterIds: [...selectedChapterIds],
        totalMarks,
        difficultyMix: {
          easy: difficultyMix.easy === '' ? 0 : difficultyMix.easy,
          medium: difficultyMix.medium === '' ? 0 : difficultyMix.medium,
          hard: difficultyMix.hard === '' ? 0 : difficultyMix.hard,
        },
        marksBreakdown,
        questionTypes: [...questionTypes],
        durationMinutes: durationMinutes === '' ? undefined : durationMinutes,
      });
      navigate(`/teacher/question-bank/papers/${paper._id}`);
    } catch (err) {
      toast.error('Could not generate the paper', { description: err instanceof Error ? err.message : undefined });
    }
  }

  return (
    <div className="min-h-screen bg-[#FAFBFF] dark:bg-transparent pb-24">
      <div className="sticky top-0 z-10 bg-white/90 dark:bg-black/40 backdrop-blur border-b border-gray-100 dark:border-white/10 px-5 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} type="button" className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 dark:text-white/50">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <h1 className="text-sm font-bold text-gray-900 dark:text-white">Generate Question Paper</h1>
      </div>

      <div className="max-w-3xl mx-auto px-5 py-6 space-y-5">
        <div className="bg-white dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/10 p-4 grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-gray-500 dark:text-white/40">Class</label>
            <input value={cls} onChange={(e) => setCls(e.target.value)} placeholder="e.g. 8"
              className="mt-1 w-full h-9 px-3 rounded-lg border border-gray-200 dark:border-white/10 dark:bg-white/5 dark:text-white text-sm" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 dark:text-white/40">Subject</label>
            <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Science"
              className="mt-1 w-full h-9 px-3 rounded-lg border border-gray-200 dark:border-white/10 dark:bg-white/5 dark:text-white text-sm" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 dark:text-white/40">Exam Type</label>
            <input value={examType} onChange={(e) => setExamType(e.target.value)} placeholder="e.g. Half Yearly"
              className="mt-1 w-full h-9 px-3 rounded-lg border border-gray-200 dark:border-white/10 dark:bg-white/5 dark:text-white text-sm" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 dark:text-white/40">Duration (minutes, optional)</label>
            <input type="number" min={1} value={durationMinutes} onChange={(e) => setDurationMinutes(e.target.value === '' ? '' : Number(e.target.value))}
              className="mt-1 w-full h-9 px-3 rounded-lg border border-gray-200 dark:border-white/10 dark:bg-white/5 dark:text-white text-sm" />
          </div>
        </div>

        <div className="bg-white dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/10 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2.5">Chapters</p>
          {!cls || !subject ? (
            <p className="text-xs text-gray-400">Enter class and subject to see chapters.</p>
          ) : (!chapters || chapters.length === 0) && pendingChapterNames.length === 0 ? (
            <p className="text-xs text-gray-400">No chapters yet for this class/subject — upload a page and generate questions from it first.</p>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                {(chapters ?? []).map((c) => (
                  <button
                    key={c._id} type="button" onClick={() => toggleChapter(c._id)}
                    className={`h-8 px-3 rounded-lg text-xs font-semibold border ${
                      selectedChapterIds.has(c._id)
                        ? 'bg-[#1C2B4A] text-white border-[#1C2B4A]'
                        : 'bg-white dark:bg-transparent text-gray-600 dark:text-white/60 border-gray-200 dark:border-white/10'
                    }`}
                  >
                    {c.chapterName}
                  </button>
                ))}
                {pendingChapterNames.map((name) => (
                  <button
                    key={`pending-${name}`} type="button" disabled
                    title="This upload has no saved questions yet — open it and use Generate Questions, then Save, before it can be used in a paper."
                    className="h-8 px-3 rounded-lg text-xs font-semibold border border-dashed border-gray-200 dark:border-white/10 text-gray-300 dark:text-white/25 cursor-not-allowed"
                  >
                    {name} (not ready)
                  </button>
                ))}
              </div>
              {pendingChapterNames.length > 0 && (
                <p className="text-[11px] text-gray-400 mt-2">
                  Greyed-out chapters have an upload but no saved questions yet — open the upload in Question Bank and use "Generate Questions" first.
                </p>
              )}
            </>
          )}
        </div>

        <div className="bg-white dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/10 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2.5">Difficulty Mix (question counts)</p>
          <div className="grid grid-cols-3 gap-3">
            {(['easy', 'medium', 'hard'] as const).map((level) => (
              <div key={level}>
                <label className="text-xs text-gray-500 dark:text-white/40 capitalize">{level}</label>
                <input type="number" min={0} value={difficultyMix[level]}
                  onChange={(e) => setDifficultyMix((prev) => ({ ...prev, [level]: e.target.value === '' ? '' : Number(e.target.value) }))}
                  className="mt-1 w-full h-9 px-3 rounded-lg border border-gray-200 dark:border-white/10 dark:bg-white/5 dark:text-white text-sm" />
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/10 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Marks per Question</p>
          <p className="text-[11px] text-gray-400 mb-2.5">Set once per difficulty level — applies to every question at that level.</p>
          <div className="grid grid-cols-3 gap-3">
            {DIFFICULTY_LEVELS.map((level) => {
              const count = Number(difficultyMix[level] || 0);
              return (
                <div key={level}>
                  <label className="text-xs text-gray-500 dark:text-white/40 capitalize">
                    {level}{count > 0 ? ` (${count}×)` : ''}
                  </label>
                  <input
                    type="number" min={0} value={marksPerDifficulty[level]} disabled={count === 0}
                    onChange={(e) => setMarksPerDifficulty((prev) => ({ ...prev, [level]: e.target.value === '' ? '' : Number(e.target.value) }))}
                    className="mt-1 w-full h-9 px-3 rounded-lg border border-gray-200 dark:border-white/10 dark:bg-white/5 dark:text-white text-sm disabled:opacity-40"
                  />
                </div>
              );
            })}
          </div>
          <p className="text-xs text-gray-400 mt-2.5">Total marks: <span className="font-semibold text-gray-700 dark:text-white/70">{totalMarks}</span></p>
        </div>

        <div className="bg-white dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/10 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2.5">Question Types (optional filter)</p>
          <div className="flex flex-wrap gap-2">
            {QUESTION_TYPES.map((t) => (
              <button key={t} type="button" onClick={() => toggleType(t)}
                className={`h-8 px-3 rounded-lg text-xs font-semibold border ${
                  questionTypes.has(t)
                    ? 'bg-[#1C2B4A] text-white border-[#1C2B4A]'
                    : 'bg-white dark:bg-transparent text-gray-600 dark:text-white/60 border-gray-200 dark:border-white/10'
                }`}
              >
                {labelize(t)}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button" onClick={handleGenerate} disabled={generate.isPending}
          className="w-full h-11 rounded-xl bg-[#1C2B4A] text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {generate.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          Generate Paper
        </button>
      </div>
    </div>
  );
}
