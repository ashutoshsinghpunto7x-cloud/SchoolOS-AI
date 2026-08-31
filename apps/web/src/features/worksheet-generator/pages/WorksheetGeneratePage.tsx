import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Sparkles, Loader2, CheckCircle2, Trash2 } from 'lucide-react';
import { useChapters } from '@/features/question-bank/hooks/useQuestionBank';
import { useGenerateWorksheet, useSaveWorksheet } from '../hooks/useWorksheetGenerator';
import { CroppedFigureImage } from '@/features/question-bank/components/CroppedFigureImage';
import type { LanguageComplexity, ResolvedQuestionImage, WorksheetQuestion, WorksheetType } from '@schoolos/types';

const LANGUAGE_COMPLEXITY_OPTIONS: { value: LanguageComplexity; label: string }[] = [
  { value: 'auto', label: 'Auto (match class)' },
  { value: 'simple', label: 'Simple' },
  { value: 'standard', label: 'Standard' },
  { value: 'advanced', label: 'Advanced / HOTS' },
];

const WORKSHEET_TYPES: { value: WorksheetType; label: string; description: string; detail: string }[] = [
  {
    value: 'practice', label: 'Practice Worksheet', description: 'Balanced mix of difficulty levels',
    detail: 'A general-purpose worksheet with an even easy/medium/hard spread across the chapters you pick — good for regular classwork.',
  },
  {
    value: 'homework', label: 'Homework', description: 'Short, quick-to-answer questions',
    detail: 'Skews toward short-answer and objective questions (MCQ, fill-in-the-blank, true/false) that a student can finish quickly at home.',
  },
  {
    value: 'revision', label: 'Revision Sheet', description: 'Spread across selected chapters',
    detail: 'Draws questions evenly across every chapter selected, so it covers the whole syllabus range rather than going deep on one chapter.',
  },
  {
    value: 'hots', label: 'HOTS Questions', description: 'Higher-order thinking',
    detail: 'Only higher-order-thinking questions — application, analysis, and reasoning — skipping straight recall/definition questions.',
  },
  {
    value: 'olympiad', label: 'Olympiad Questions', description: 'Challenging enrichment questions',
    detail: 'Harder, competition-style enrichment questions meant to stretch stronger students beyond the regular syllabus difficulty.',
  },
  {
    value: 'remedial', label: 'Remedial Worksheet', description: 'Foundational reinforcement',
    detail: 'Weighted toward easy, foundational questions for students who need extra reinforcement of the basics before moving on.',
  },
];

function labelize(s: string): string {
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function WorksheetGeneratePage() {
  const { cls = '', subject = '' } = useParams();
  const navigate = useNavigate();

  const { data: chapters } = useChapters(cls, subject);
  const [selectedChapterIds, setSelectedChapterIds] = useState<Set<string>>(new Set());
  const [worksheetType, setWorksheetType] = useState<WorksheetType>('practice');
  const [questionCount, setQuestionCount] = useState<number | ''>(10);
  const [title, setTitle] = useState('');
  const [addNewToBank, setAddNewToBank] = useState(true);
  const [languageComplexity, setLanguageComplexity] = useState<LanguageComplexity>('auto');
  const [includeImages, setIncludeImages] = useState(false);
  const [questions, setQuestions] = useState<WorksheetQuestion[] | null>(null);
  const [resolvedImages, setResolvedImages] = useState<Record<string, ResolvedQuestionImage>>({});

  const generate = useGenerateWorksheet();
  const save = useSaveWorksheet();

  function toggleChapter(id: string) {
    setSelectedChapterIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function handleGenerate() {
    if (selectedChapterIds.size === 0) { toast.error('Select at least one chapter'); return; }
    try {
      const draft = await generate.mutateAsync({
        class: cls, subject, chapterIds: [...selectedChapterIds], worksheetType,
        questionCount: questionCount === '' ? 1 : questionCount, languageComplexity, includeImages,
      });
      setQuestions(draft.questions);
      setResolvedImages(draft.resolvedImages ?? {});
      if (!title) {
        const typeLabel = WORKSHEET_TYPES.find((t) => t.value === worksheetType)?.label ?? '';
        setTitle(`${typeLabel} — Class ${cls} ${subject}`);
      }
    } catch (err) {
      toast.error('Could not generate the worksheet', { description: err instanceof Error ? err.message : undefined });
    }
  }

  function removeQuestion(index: number) {
    setQuestions((prev) => prev?.filter((_, i) => i !== index) ?? null);
  }

  async function handleSave() {
    if (!questions || questions.length === 0) return;
    try {
      const worksheet = await save.mutateAsync({
        class: cls, subject, chapterIds: [...selectedChapterIds], worksheetType, title, questions, addNewToBank,
      });
      toast.success('Worksheet saved');
      navigate(`/teacher/worksheet-generator/view/${worksheet._id}`);
    } catch (err) {
      toast.error('Could not save the worksheet', { description: err instanceof Error ? err.message : undefined });
    }
  }

  const hasNewQuestions = questions?.some((q) => q.isNew) ?? false;

  return (
    <div className="min-h-screen bg-[#FAFBFF] dark:bg-transparent pb-24">
      <div className="sticky top-0 z-10 bg-white/90 dark:bg-black/40 backdrop-blur border-b border-gray-100 dark:border-white/10 px-5 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} type="button" className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 dark:text-white/50">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <h1 className="text-sm font-bold text-gray-900 dark:text-white">Class {cls} · {subject}</h1>
      </div>

      <div className="max-w-2xl mx-auto px-5 py-6 space-y-5">
        <div className="bg-white dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/10 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2.5">Chapters</p>
          {!chapters || chapters.length === 0 ? (
            <p className="text-xs text-gray-400">No chapters yet — upload some questions to the bank first.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {chapters.map((c) => (
                <button
                  key={c._id} type="button" onClick={() => toggleChapter(c._id)}
                  className={`h-8 px-3 rounded-lg text-xs font-semibold border ${
                    selectedChapterIds.has(c._id) ? 'bg-[#1C2B4A] text-white border-[#1C2B4A]' : 'bg-white dark:bg-transparent text-gray-600 dark:text-white/60 border-gray-200 dark:border-white/10'
                  }`}
                >
                  {c.chapterName}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/10 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2.5">Worksheet Type</p>
          <div className="grid grid-cols-2 gap-2">
            {WORKSHEET_TYPES.map((t) => (
              <button
                key={t.value} type="button" onClick={() => setWorksheetType(t.value)}
                className={`text-left p-3 rounded-xl border ${
                  worksheetType === t.value ? 'bg-[#1C2B4A] text-white border-[#1C2B4A]' : 'bg-white dark:bg-transparent text-gray-700 dark:text-white/70 border-gray-200 dark:border-white/10'
                }`}
              >
                <p className="text-xs font-bold">{t.label}</p>
                <p className={`text-[10px] mt-0.5 ${worksheetType === t.value ? 'text-white/70' : 'text-gray-400'}`}>{t.description}</p>
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500 dark:text-white/40 mt-3 leading-relaxed">
            {WORKSHEET_TYPES.find((t) => t.value === worksheetType)?.detail}
          </p>
        </div>

        <div className="bg-white dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/10 p-4 flex items-center gap-3">
          <label className="text-xs font-semibold text-gray-500 dark:text-white/40">Number of Questions</label>
          <input
            type="number" min={1} max={50} value={questionCount}
            onChange={(e) => {
              const raw = e.target.value;
              if (raw === '') { setQuestionCount(''); return; }
              const n = Number(raw);
              if (Number.isNaN(n)) return;
              setQuestionCount(Math.min(50, Math.max(1, n)));
            }}
            onBlur={() => setQuestionCount((c) => (c === '' ? 10 : c))}
            className="h-9 w-20 px-3 rounded-lg border border-gray-200 dark:border-white/10 dark:bg-white/5 dark:text-white text-sm"
          />
        </div>

        <div className="bg-white dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/10 p-4 flex items-center gap-3">
          <label className="text-xs font-semibold text-gray-500 dark:text-white/40">Question Wording</label>
          <select value={languageComplexity} onChange={(e) => setLanguageComplexity(e.target.value as LanguageComplexity)}
            className="h-9 flex-1 px-3 rounded-lg border border-gray-200 dark:border-white/10 dark:bg-white/5 dark:text-white text-sm">
            {LANGUAGE_COMPLEXITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        <label className="bg-white dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/10 p-4 flex items-center gap-2.5 text-sm text-gray-700 dark:text-white/70 cursor-pointer">
          <input type="checkbox" checked={includeImages} onChange={(e) => setIncludeImages(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300" />
          Include images <span className="text-xs text-gray-400 dark:text-white/30">(allow picture-based questions where a chapter has detected figures)</span>
        </label>

        <button
          type="button" onClick={handleGenerate} disabled={generate.isPending}
          className="w-full h-11 rounded-xl bg-[#1C2B4A] text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {generate.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {questions ? 'Regenerate' : 'Generate Worksheet'}
        </button>

        {questions && (
          <div className="space-y-3">
            <input
              value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Worksheet title"
              className="w-full h-10 px-3 rounded-lg border border-gray-200 dark:border-white/10 dark:bg-white/5 dark:text-white text-sm font-semibold"
            />
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{questions.length} question(s)</p>
            {questions.map((q, i) => {
              const resolved = q.imageRef && resolvedImages[`${q.imageRef.sourceId}:${q.imageRef.figureId}`];
              return (
                <div key={i} className="bg-white dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/10 p-3.5 flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 dark:text-white/80">{q.questionText}</p>
                    {resolved && (
                      <div className="mt-2" style={{ maxWidth: '160px' }}>
                        <CroppedFigureImage dataUri={resolved.pageImageDataUri} boundingBox={resolved.boundingBox} style={{ borderRadius: 6 }} />
                      </div>
                    )}
                    {!resolved && q.imageRequirement && (
                      <p className="mt-1.5 text-[11px] italic text-gray-400">Image needed: {q.imageRequirement.imagePrompt || 'a suitable picture for this question'}</p>
                    )}
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      {q.isNew && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">New</span>}
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-white/60">{q.difficulty}</span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-white/60">{labelize(q.questionType)}</span>
                    </div>
                  </div>
                  <button type="button" onClick={() => removeQuestion(i)} className="text-gray-300 hover:text-red-500 shrink-0">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}

            {hasNewQuestions && (
              <label className="flex items-center gap-2.5 bg-emerald-50 rounded-xl p-3 text-xs font-semibold text-emerald-800">
                <input type="checkbox" checked={addNewToBank} onChange={(e) => setAddNewToBank(e.target.checked)} className="w-4 h-4" />
                Also add the new AI-authored questions to my Question Bank
              </label>
            )}

            <button
              type="button" onClick={handleSave} disabled={save.isPending || !title.trim()}
              className="w-full h-11 rounded-xl bg-emerald-600 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {save.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Save Worksheet
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
