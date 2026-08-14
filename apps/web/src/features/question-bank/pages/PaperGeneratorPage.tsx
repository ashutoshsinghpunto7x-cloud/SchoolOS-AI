import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, Plus, Trash2, Sparkles } from 'lucide-react';
import { useChapters, useGeneratePaper, useQuestionSources } from '../hooks/useQuestionBank';
import type { PaperMarksBreakdownEntry, QuestionType } from '@schoolos/types';

const QUESTION_TYPES: QuestionType[] = ['mcq', 'fill_blank', 'true_false', 'assertion_reason', 'very_short', 'short', 'long', 'hots', 'case_study'];

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
  const [marksBreakdown, setMarksBreakdown] = useState<{ marks: number | ''; count: number | '' }[]>([{ marks: 1, count: 10 }]);
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

  const totalMarks = marksBreakdown.reduce((sum, e) => sum + Number(e.marks || 0) * Number(e.count || 0), 0);

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

  function updateBreakdown(index: number, patch: Partial<{ marks: number | ''; count: number | '' }>) {
    setMarksBreakdown((prev) => prev.map((e, i) => (i === index ? { ...e, ...patch } : e)));
  }

  async function handleGenerate() {
    if (selectedChapterIds.size === 0) { toast.error('Select at least one chapter'); return; }
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
        marksBreakdown: marksBreakdown.map((e): PaperMarksBreakdownEntry => ({
          marks: e.marks === '' ? 0 : e.marks,
          count: e.count === '' ? 0 : e.count,
        })),
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
          <div className="flex items-center justify-between mb-2.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Marks Breakdown</p>
            <button type="button" onClick={() => setMarksBreakdown((prev) => [...prev, { marks: 1, count: 1 }])}
              className="text-xs font-semibold text-[#6D4AFF] flex items-center gap-1">
              <Plus className="w-3.5 h-3.5" /> Add row
            </button>
          </div>
          <div className="space-y-2">
            {marksBreakdown.map((entry, i) => (
              <div key={i} className="flex items-center gap-2">
                <input type="number" min={0} value={entry.marks} onChange={(e) => updateBreakdown(i, { marks: e.target.value === '' ? '' : Number(e.target.value) })}
                  placeholder="Marks each" className="h-9 flex-1 px-3 rounded-lg border border-gray-200 dark:border-white/10 dark:bg-white/5 dark:text-white text-sm" />
                <span className="text-xs text-gray-400">×</span>
                <input type="number" min={0} value={entry.count} onChange={(e) => updateBreakdown(i, { count: e.target.value === '' ? '' : Number(e.target.value) })}
                  placeholder="Count" className="h-9 flex-1 px-3 rounded-lg border border-gray-200 dark:border-white/10 dark:bg-white/5 dark:text-white text-sm" />
                <button type="button" onClick={() => setMarksBreakdown((prev) => prev.filter((_, idx) => idx !== i))} className="text-gray-300 hover:text-red-500">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-2">Total marks: <span className="font-semibold text-gray-700 dark:text-white/70">{totalMarks}</span></p>
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
