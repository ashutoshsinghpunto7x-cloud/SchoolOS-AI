import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, Sparkles, Image as ImageIcon, FileText, AlertTriangle, Pencil, Check } from 'lucide-react';
import { useSource, useReExtractSource, useConfirmExtractedQuestions, useUpdateSourceChapter } from '../hooks/useQuestionBank';
import { ExtractedDraftsReview, type DraftEdit } from '../components/ExtractedDraftsReview';
import { BlockEditor } from '../components/ChapterCapture/BlockEditor';
import type { ExtractedQuestionDraft } from '@schoolos/types';

export function QuestionSourceDetailPage() {
  const navigate = useNavigate();
  const { sourceId } = useParams<{ sourceId: string }>();
  const { data: source, isLoading, isError, error } = useSource(sourceId ?? '');
  const generate = useReExtractSource();
  const confirm = useConfirmExtractedQuestions();
  const updateChapter = useUpdateSourceChapter();

  const [warnings, setWarnings] = useState<string[]>([]);
  const [drafts, setDrafts] = useState<DraftEdit[] | null>(null);
  const [editingChapter, setEditingChapter] = useState(false);
  const [chapterName, setChapterName] = useState('');

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
      const result = await generate.mutateAsync(sourceId);
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
        <h1 className="text-sm font-bold text-gray-900 dark:text-white">Stored Upload</h1>
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

            <button
              type="button" onClick={handleGenerate} disabled={generate.isPending}
              className="w-full h-11 rounded-xl bg-[#6D4AFF] text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {generate.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {drafts ? 'Regenerate Questions' : 'Generate Questions'}
            </button>

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
