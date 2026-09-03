import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, Sparkles, Image as ImageIcon, FileText, AlertTriangle, Pencil, Check, Trash2 } from 'lucide-react';
import { useSource, useReExtractSource, useConfirmExtractedQuestions, useUpdateSourceChapter, useDeleteSource } from '../hooks/useQuestionBank';
import { ExtractedDraftsReview, type DraftEdit } from '../components/ExtractedDraftsReview';
import { BlockEditor } from '../components/ChapterCapture/BlockEditor';
import type { ExtractedQuestionDraft, QuestionDifficulty } from '@schoolos/types';

const DIFFICULTY_OPTIONS: { value: QuestionDifficulty | 'mixed'; label: string }[] = [
  { value: 'mixed', label: 'Mixed' },
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
];

export function QuestionSourceDetailPage() {
  const navigate = useNavigate();
  const { sourceId } = useParams<{ sourceId: string }>();
  const { data: source, isLoading, isError, error } = useSource(sourceId ?? '');
  const generate = useReExtractSource();
  const confirm = useConfirmExtractedQuestions();
  const updateChapter = useUpdateSourceChapter();
  const deleteSource = useDeleteSource();

  const [warnings, setWarnings] = useState<string[]>([]);
  const [drafts, setDrafts] = useState<DraftEdit[] | null>(null);
  const [editingChapter, setEditingChapter] = useState(false);
  const [chapterName, setChapterName] = useState('');
  const [count, setCount] = useState<number | ''>(5);
  const [difficulty, setDifficulty] = useState<QuestionDifficulty | 'mixed'>('mixed');
  const [includeImages, setIncludeImages] = useState(false);

  useEffect(() => { setChapterName(source?.chapterName ?? ''); }, [source?.chapterName]);

  async function saveChapter() {
    if (!sourceId || !chapterName.trim()) { setEditingChapter(false); return; }
    try {
      await updateChapter.mutateAsync({ id: sourceId, payload: { chapterName: chapterName.trim() } });
      setEditingChapter(false);
    } catch (err) {
      toast.error('Could not update chapter', { description: err instanceof Error ? err.message : undefined });
    }
  }

  async function handleGenerate() {
    if (!sourceId) return;
    try {
      const effectiveCount = count === '' ? 1 : count;
      const result = await generate.mutateAsync({ id: sourceId, options: { count: effectiveCount, difficulty, includeImages } });
      setDrafts(result.extracted);
      setWarnings(result.warnings);
      if (result.extracted.length === 0) toast.error('No questions found in that text');
      else toast.success(`${result.extracted.length} question(s) generated — review before saving`);
    } catch (err) {
      toast.error('Could not generate questions', { description: err instanceof Error ? err.message : undefined });
    }
  }

  function updateDraft(index: number, patch: Partial<DraftEdit>) {
    setDrafts((prev) => prev?.map((d, i) => (i === index ? { ...d, ...patch } : d)) ?? null);
  }

  function removeDraft(index: number) {
    setDrafts((prev) => prev?.filter((_, i) => i !== index) ?? null);
  }

  async function handleDeleteSource() {
    if (!sourceId) return;
    // Irreversible (removes the converted text itself) — confirm first.
    if (!window.confirm('Delete this upload? Its converted text will be gone for good — any questions already saved from it are kept.')) return;
    try {
      await deleteSource.mutateAsync(sourceId);
      toast.success('Upload deleted');
      navigate('/teacher/question-bank');
    } catch (err) {
      toast.error('Could not delete upload', { description: err instanceof Error ? err.message : undefined });
    }
  }

  async function handleConfirm() {
    if (!drafts || drafts.length === 0 || !source) return;
    try {
      const questions: ExtractedQuestionDraft[] = drafts.map((d) => ({
        ...d,
        marks: d.marks === '' ? 0 : d.marks,
        estimatedTimeMinutes: d.estimatedTimeMinutes === '' ? 0 : d.estimatedTimeMinutes,
      }));
      const saved = await confirm.mutateAsync({ class: source.class, subject: source.subject, questions });
      toast.success(`${saved.length} question(s) saved to the bank`);
      navigate('/teacher/question-bank');
    } catch (err) {
      toast.error('Could not save questions', { description: err instanceof Error ? err.message : undefined });
    }
  }

  return (
    <div className="min-h-screen bg-[#FAFBFF] dark:bg-transparent pb-24">
      <div className="sticky top-0 z-10 bg-white/90 dark:bg-black/40 backdrop-blur border-b border-gray-100 dark:border-white/10 px-5 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} type="button" className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 dark:text-white/50">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <h1 className="flex-1 text-sm font-bold text-gray-900 dark:text-white">Stored Upload</h1>
        {source && (
          <button
            type="button" onClick={handleDeleteSource} disabled={deleteSource.isPending}
            title="Delete this upload" className="flex items-center gap-1.5 text-xs font-medium text-gray-400 hover:text-red-500 disabled:opacity-50 shrink-0"
          >
            <Trash2 className="w-4 h-4" /> Delete
          </button>
        )}
      </div>

      <div className="max-w-3xl mx-auto px-5 py-6 space-y-5">
        {isError ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center text-gray-400">
            <AlertTriangle className="w-6 h-6 text-amber-500" />
            <p className="text-sm font-medium text-gray-600 dark:text-white/60">
              {error instanceof Error ? error.message : 'Could not load this upload.'}
            </p>
          </div>
        ) : isLoading || !source ? (
          <div className="flex items-center justify-center py-16 text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : (
          <>
            <div className="rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 px-3 py-2 flex items-center gap-2">
              <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <p className="text-xs text-emerald-700 dark:text-emerald-300">
                This upload is already saved — generating questions below is optional, any time.
              </p>
            </div>

            <div className="bg-white dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/10 p-4">
              <div className="flex items-center gap-2 mb-3">
                {source.kind === 'image' ? <ImageIcon className="w-4 h-4 text-gray-400" /> : <FileText className="w-4 h-4 text-gray-400" />}
                <span className="text-sm font-semibold text-gray-800 dark:text-white">
                  {source.fileName || (source.kind === 'image' ? 'Photo upload' : 'PDF upload')}
                </span>
                <span className="text-xs text-gray-400 ml-auto">
                  Class {source.class} · {source.subject} · {new Date(source.createdAt).toLocaleDateString()}
                </span>
              </div>

              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">Chapter</span>
                {editingChapter ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      autoFocus value={chapterName} onChange={(e) => setChapterName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && saveChapter()}
                      placeholder="e.g. Force and Motion"
                      className="h-7 px-2 rounded-md border border-gray-200 dark:border-white/10 dark:bg-white/5 dark:text-white text-xs"
                    />
                    <button type="button" onClick={saveChapter} disabled={updateChapter.isPending} className="text-emerald-500">
                      <Check className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button type="button" onClick={() => setEditingChapter(true)} className="flex items-center gap-1 text-xs font-medium text-gray-600 dark:text-white/60 px-2 py-0.5 rounded-md bg-gray-100 dark:bg-white/10">
                    {source.chapterName || 'Assign chapter'} <Pencil className="w-3 h-3" />
                  </button>
                )}
              </div>

              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1.5">
                {source.pages?.length ? 'Structured content' : 'Extracted text'}
              </p>
              <div className="max-h-96 overflow-y-auto rounded-xl bg-gray-50 dark:bg-black/20 border border-gray-100 dark:border-white/10 p-3">
                {source.pages?.length ? (
                  <div className="space-y-6">
                    {source.pages.map((page) => (
                      <div key={page.pageNumber}>
                        {source.pages!.length > 1 && (
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-2">Page {page.pageNumber}</p>
                        )}
                        <BlockEditor blocks={page.blocks} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-700 dark:text-white/70 whitespace-pre-wrap">{source.extractedText}</p>
                )}
              </div>
            </div>

            <div className="bg-white dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/10 p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <label htmlFor="question-count" className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  How many questions?
                </label>
                <input
                  id="question-count" type="number" min={1} max={100} value={count}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw === '') { setCount(''); return; }
                    const n = Number(raw);
                    if (Number.isNaN(n)) return;
                    setCount(Math.min(100, Math.max(1, n)));
                  }}
                  onBlur={() => setCount((c) => (c === '' ? 1 : c))}
                  className="w-16 h-8 px-2 rounded-md border border-gray-200 dark:border-white/10 dark:bg-white/5 dark:text-white text-sm text-center"
                />
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1.5">Difficulty</p>
                <div className="flex gap-1.5">
                  {DIFFICULTY_OPTIONS.map((opt) => (
                    <button
                      key={opt.value} type="button" onClick={() => setDifficulty(opt.value)}
                      className={`flex-1 h-8 rounded-lg text-xs font-semibold transition-colors ${
                        difficulty === opt.value
                          ? 'bg-[#6D4AFF] text-white'
                          : 'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-white/60'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {(source.figures?.length || source.pages?.some((p) => p.figures?.length)) ? (
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-white/70 cursor-pointer">
                  <input type="checkbox" checked={includeImages} onChange={(e) => setIncludeImages(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300" />
                  Include images (allow picture-based questions from this upload's detected figures)
                </label>
              ) : null}

              {!drafts && source.chapterName?.trim() && (
                <p className="text-xs text-gray-500 dark:text-white/50">
                  First-time processing generates a comprehensive set covering every question type this content supports (MCQ, fill-in-the-blank, short/long answer, HOTS, and more) — the count above only applies to later top-ups.
                </p>
              )}

              <button
                type="button" onClick={handleGenerate} disabled={generate.isPending}
                className="w-full h-11 rounded-xl bg-[#6D4AFF] text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {generate.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {drafts ? 'Regenerate Questions' : 'Generate Questions'}
              </button>
            </div>

            {drafts && (
              <ExtractedDraftsReview
                drafts={drafts}
                warnings={warnings}
                onUpdateDraft={updateDraft}
                onRemoveDraft={removeDraft}
                onConfirm={handleConfirm}
                confirming={confirm.isPending}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
