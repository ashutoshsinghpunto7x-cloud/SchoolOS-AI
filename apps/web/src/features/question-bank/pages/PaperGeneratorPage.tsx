import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, Plus, Trash2, Sparkles, Files, ChevronUp, ChevronDown } from 'lucide-react';
import { useChapters, useGeneratePaper, useQuestionSources } from '../hooks/useQuestionBank';
import type { LanguageComplexity, PaperGenerationConfig, PaperSectionConfig, QuestionDifficulty, QuestionType } from '@schoolos/types';

const QUESTION_TYPES: QuestionType[] = ['mcq', 'fill_blank', 'true_false', 'assertion_reason', 'very_short', 'short', 'long', 'hots', 'case_study'];
const DIFFICULTIES: QuestionDifficulty[] = ['easy', 'medium', 'hard'];
const LANGUAGE_COMPLEXITY_OPTIONS: { value: LanguageComplexity; label: string }[] = [
  { value: 'auto', label: 'Auto (match class)' },
  { value: 'simple', label: 'Simple' },
  { value: 'standard', label: 'Standard' },
  { value: 'advanced', label: 'Advanced / HOTS' },
];

function labelize(s: string): string {
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

let sectionSeq = 0;
function nextSectionName(existing: SectionRow[]): string {
  const used = new Set(existing.map((s) => s.name));
  for (let i = 0; i < 26; i++) {
    const name = `Section ${String.fromCharCode(65 + i)}`;
    if (!used.has(name)) return name;
  }
  return `Section ${existing.length + 1}`;
}

interface SectionRow {
  key: number;
  name: string;
  questionTypes: Set<QuestionType>;
  difficulty: QuestionDifficulty | '';
  count: number | '';
  marksEach: number | '';
}

function defaultSection(existing: SectionRow[]): SectionRow {
  sectionSeq += 1;
  return { key: sectionSeq, name: nextSectionName(existing), questionTypes: new Set(), difficulty: '', count: 10, marksEach: 1 };
}

export function PaperGeneratorPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const prefill = (location.state as { prefillConfig?: PaperGenerationConfig } | null)?.prefillConfig;

  const [cls, setCls] = useState(prefill?.class ?? '');
  const [subject, setSubject] = useState(prefill?.subject ?? '');
  const [examType, setExamType] = useState(prefill?.examType ?? 'Half Yearly');
  const [durationMinutes, setDurationMinutes] = useState<number | ''>(prefill?.durationMinutes ?? '');
  const [selectedChapterIds, setSelectedChapterIds] = useState<Set<string>>(new Set(prefill?.chapterIds ?? []));
  const [sections, setSections] = useState<SectionRow[]>(() => {
    if (prefill?.sections?.length) {
      return prefill.sections.map((s) => {
        sectionSeq += 1;
        return {
          key: sectionSeq, name: s.name, questionTypes: new Set(s.questionTypes),
          difficulty: s.difficulty ?? '', count: s.count, marksEach: s.marksEach,
        };
      });
    }
    return [defaultSection([])];
  });
  const [languageComplexity, setLanguageComplexity] = useState<LanguageComplexity>(prefill?.languageComplexity ?? 'auto');
  const [includeAnswerKey, setIncludeAnswerKey] = useState(prefill?.includeAnswerKey ?? false);
  const [includeImages, setIncludeImages] = useState(prefill?.includeImages ?? false);
  const [blackAndWhite, setBlackAndWhite] = useState(prefill?.blackAndWhite ?? false);

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

  const totalMarks = sections.reduce((sum, s) => sum + Number(s.marksEach || 0) * Number(s.count || 0), 0);

  function toggleChapter(id: string) {
    setSelectedChapterIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleSectionType(key: number, t: QuestionType) {
    setSections((prev) => prev.map((s) => {
      if (s.key !== key) return s;
      const next = new Set(s.questionTypes);
      if (next.has(t)) next.delete(t); else next.add(t);
      return { ...s, questionTypes: next };
    }));
  }

  function updateSection(key: number, patch: Partial<SectionRow>) {
    setSections((prev) => prev.map((s) => (s.key === key ? { ...s, ...patch } : s)));
  }

  function addSection() {
    setSections((prev) => [...prev, defaultSection(prev)]);
  }

  function removeSection(key: number) {
    setSections((prev) => prev.filter((s) => s.key !== key));
  }

  function moveSection(key: number, dir: -1 | 1) {
    setSections((prev) => {
      const idx = prev.findIndex((s) => s.key === key);
      const swapWith = idx + dir;
      if (idx === -1 || swapWith < 0 || swapWith >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[swapWith]] = [next[swapWith], next[idx]];
      return next;
    });
  }

  async function handleGenerate() {
    if (selectedChapterIds.size === 0) { toast.error('Select at least one chapter'); return; }
    const validSections: PaperSectionConfig[] = sections
      .filter((s) => s.name.trim() && s.count !== '' && s.count > 0)
      .map((s) => ({
        name: s.name.trim(),
        questionTypes: [...s.questionTypes],
        difficulty: s.difficulty || undefined,
        count: s.count === '' ? 0 : s.count,
        marksEach: s.marksEach === '' ? 1 : s.marksEach,
      }));
    if (validSections.length === 0) { toast.error('Add at least one section with a question count'); return; }

    try {
      const paper = await generate.mutateAsync({
        class: cls.trim(),
        subject: subject.trim(),
        examType,
        chapterIds: [...selectedChapterIds],
        totalMarks,
        difficultyMix: { easy: 0, medium: 0, hard: 0 },
        marksBreakdown: [],
        sections: validSections,
        questionTypes: [],
        durationMinutes: durationMinutes === '' ? undefined : durationMinutes,
        languageComplexity,
        includeAnswerKey,
        includeImages,
        blackAndWhite,
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
        <h1 className="text-sm font-bold text-gray-900 dark:text-white flex-1">Generate Question Paper</h1>
        <button
          type="button" onClick={() => navigate('/teacher/question-bank/papers')}
          className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 dark:text-white/50"
        >
          <Files className="w-3.5 h-3.5" /> Past papers
        </button>
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
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Sections</p>
            <button type="button" onClick={addSection} className="text-xs font-semibold text-[#6D4AFF] flex items-center gap-1">
              <Plus className="w-3.5 h-3.5" /> Add section
            </button>
          </div>
          <p className="text-[11px] text-gray-400 mb-3">
            Each section is its own block of the paper — pick its question type(s), difficulty, how many questions, and the marks each one is worth.
          </p>

          <div className="space-y-3">
            {sections.map((s, i) => (
              <div key={s.key} className="rounded-xl border border-gray-200 dark:border-white/10 p-3 space-y-2.5">
                <div className="flex items-center gap-2">
                  <input
                    value={s.name} onChange={(e) => updateSection(s.key, { name: e.target.value })}
                    className="flex-1 h-8 px-2.5 rounded-lg border border-gray-200 dark:border-white/10 dark:bg-white/5 dark:text-white text-xs font-semibold"
                  />
                  <button type="button" onClick={() => moveSection(s.key, -1)} disabled={i === 0} className="text-gray-300 hover:text-gray-600 disabled:opacity-30">
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button type="button" onClick={() => moveSection(s.key, 1)} disabled={i === sections.length - 1} className="text-gray-300 hover:text-gray-600 disabled:opacity-30">
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  <button type="button" onClick={() => removeSection(s.key)} disabled={sections.length === 1} className="text-gray-300 hover:text-red-500 disabled:opacity-30">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] text-gray-400">Difficulty</label>
                    <select
                      value={s.difficulty} onChange={(e) => updateSection(s.key, { difficulty: e.target.value as QuestionDifficulty | '' })}
                      className="mt-0.5 w-full h-8 px-2 rounded-lg border border-gray-200 dark:border-white/10 dark:bg-white/5 dark:text-white text-xs"
                    >
                      <option value="">Mixed</option>
                      {DIFFICULTIES.map((d) => <option key={d} value={d}>{labelize(d)}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400">Questions</label>
                    <input
                      type="number" min={1} value={s.count}
                      onChange={(e) => updateSection(s.key, { count: e.target.value === '' ? '' : Math.max(1, Number(e.target.value)) })}
                      className="mt-0.5 w-full h-8 px-2 rounded-lg border border-gray-200 dark:border-white/10 dark:bg-white/5 dark:text-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400">Marks each</label>
                    <input
                      type="number" min={0} value={s.marksEach}
                      onChange={(e) => updateSection(s.key, { marksEach: e.target.value === '' ? '' : Math.max(0, Number(e.target.value)) })}
                      className="mt-0.5 w-full h-8 px-2 rounded-lg border border-gray-200 dark:border-white/10 dark:bg-white/5 dark:text-white text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-gray-400">Question types (optional — leave blank for any)</label>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {QUESTION_TYPES.map((t) => (
                      <button key={t} type="button" onClick={() => toggleSectionType(s.key, t)}
                        className={`h-6 px-2 rounded-md text-[10px] font-semibold border ${
                          s.questionTypes.has(t)
                            ? 'bg-[#1C2B4A] text-white border-[#1C2B4A]'
                            : 'bg-white dark:bg-transparent text-gray-600 dark:text-white/60 border-gray-200 dark:border-white/10'
                        }`}
                      >
                        {labelize(t)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-3">Total marks: <span className="font-semibold text-gray-700 dark:text-white/70">{totalMarks}</span></p>
        </div>

        <div className="bg-white dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/10 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2.5">Language & Answer Key</p>
          <div className="grid grid-cols-2 gap-3 items-end">
            <div>
              <label className="text-xs text-gray-500 dark:text-white/40">Question wording</label>
              <select value={languageComplexity} onChange={(e) => setLanguageComplexity(e.target.value as LanguageComplexity)}
                className="mt-1 w-full h-9 px-3 rounded-lg border border-gray-200 dark:border-white/10 dark:bg-white/5 dark:text-white text-sm">
                {LANGUAGE_COMPLEXITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <label className="h-9 flex items-center gap-2 text-sm text-gray-700 dark:text-white/70 cursor-pointer">
              <input type="checkbox" checked={includeAnswerKey} onChange={(e) => setIncludeAnswerKey(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300" />
              Include answer key
            </label>
            <label className="h-9 flex items-center gap-2 text-sm text-gray-700 dark:text-white/70 cursor-pointer">
              <input type="checkbox" checked={includeImages} onChange={(e) => setIncludeImages(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300" />
              Include images
            </label>
            <label className="h-9 flex items-center gap-2 text-sm text-gray-700 dark:text-white/70 cursor-pointer">
              <input type="checkbox" checked={blackAndWhite} onChange={(e) => setBlackAndWhite(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300" />
              Black &amp; white printing
            </label>
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
