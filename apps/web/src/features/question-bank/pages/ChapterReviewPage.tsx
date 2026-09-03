import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, AlertTriangle, RotateCw } from 'lucide-react';
import { useChapterCaptureJob, useRetryChapterPage, useConfirmExtractedQuestions } from '../hooks/useQuestionBank';
import { ExtractedDraftsReview, type DraftEdit } from '../components/ExtractedDraftsReview';
import { getChapterCaptureSession, clearChapterCaptureSession } from '../lib/chapterCaptureSession';
import type { ChapterPage } from '@schoolos/types';

/**
 * Every captured page is read straight into question drafts server-side (see
 * enqueueChapterCapture) — this screen just polls the batch job and, once it's done, shows the
 * same "review before saving" drafts list the single-photo upload flow uses (ExtractedDraftsReview).
 * There is no more per-page OCR-text editor: a page's transcribed text was always an internal
 * artifact, and any bad AI output shows up here as a bad-looking draft the teacher can fix or
 * remove directly, the same way any other extracted question is reviewed.
 */
export function ChapterReviewPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const session = useRef(getChapterCaptureSession()).current;

  const { data: job, isError: jobLoadError } = useChapterCaptureJob(jobId);
  const retryPage = useRetryChapterPage();
  const confirm = useConfirmExtractedQuestions();

  const [drafts, setDrafts] = useState<DraftEdit[] | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [pages, setPages] = useState<ChapterPage[]>([]);
  const [initialized, setInitialized] = useState(false);

  // Seed local editable state once, when the job first completes — a later poll shouldn't clobber
  // teacher edits already made in the review list; a page retry updates this same local state
  // explicitly instead (see handleRetryPage), since its response is the freshest source of truth.
  useEffect(() => {
    if (!initialized && job?.status === 'completed' && job.result) {
      setDrafts(job.result.questions ?? []);
      setWarnings(job.result.warnings ?? []);
      setPages(job.result.pages ?? []);
      setInitialized(true);
    }
  }, [job, initialized]);

  if (!session) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-sm text-gray-500 dark:text-white/50">
          Captured pages were lost — this happens after a reload mid-session. Start the capture again.
        </p>
        <button onClick={() => navigate('/teacher/question-bank/capture')} type="button" className="text-sm font-semibold text-blue-600">
          Start over
        </button>
      </div>
    );
  }

  if (jobLoadError) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-red-500">Could not load this processing job — it may have expired.</div>;
  }

  const processing = !job || job.status === 'processing';
  const failed = job?.status === 'failed';
  const totalPages = job?.totalPages ?? session.pages.length;
  const completedPages = job?.completedPages ?? 0;

  async function handleRetryPage(pageNumber: number) {
    if (!jobId) return;
    const original = session!.pages[pageNumber - 1];
    if (!original) return;
    try {
      const result = await retryPage.mutateAsync({ jobId, pageNumber, file: original.file });
      setDrafts(result.questions ?? []);
      setPages(result.pages);
      toast.success(`Page ${pageNumber} reprocessed`);
    } catch (err) {
      toast.error('Retry failed', { description: err instanceof Error ? err.message : undefined });
    }
  }

  function updateDraft(index: number, patch: Partial<DraftEdit>) {
    setDrafts((prev) => prev?.map((d, i) => (i === index ? { ...d, ...patch } : d)) ?? null);
  }

  function removeDraft(index: number) {
    setDrafts((prev) => prev?.filter((_, i) => i !== index) ?? null);
  }

  async function handleConfirm() {
    if (!drafts || drafts.length === 0) return;
    try {
      const questions = drafts.map((d) => ({
        ...d,
        marks: d.marks === '' ? 0 : d.marks,
        estimatedTimeMinutes: d.estimatedTimeMinutes === '' ? 0 : d.estimatedTimeMinutes,
      }));
      const saved = await confirm.mutateAsync({ class: session!.class, subject: session!.subject, questions });
      clearChapterCaptureSession();
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
        <h1 className="text-sm font-bold text-gray-900 dark:text-white">Review Chapter</h1>
      </div>

      {processing && (
        <div className="max-w-3xl mx-auto px-5 py-10 flex flex-col items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          <p className="text-sm text-gray-500 dark:text-white/50">
            Reading page {completedPages + 1} of {totalPages}…
          </p>
          <div className="w-full max-w-xs h-1.5 rounded-full bg-gray-100 dark:bg-white/10 overflow-hidden">
            <div className="h-full bg-blue-600 transition-all" style={{ width: `${totalPages ? (completedPages / totalPages) * 100 : 0}%` }} />
          </div>
        </div>
      )}

      {failed && (
        <div className="max-w-3xl mx-auto px-5 py-10 text-center text-sm text-red-500">
          {job?.error || 'Processing failed.'}
        </div>
      )}

      {!processing && !failed && drafts && (
        <div className="max-w-3xl mx-auto px-5 py-6 space-y-5">
          {pages.some((p) => p.pageError) && (
            <div className="bg-white dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/10 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2.5">Pages</p>
              <div className="flex gap-1.5 flex-wrap">
                {pages.map((p) => (
                  <div key={p.pageNumber} className={`h-8 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 ${p.pageError ? 'bg-red-50 text-red-600 dark:bg-red-500/10' : 'bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-white/50'}`}>
                    Page {p.pageNumber}
                    {p.pageError && (
                      <>
                        <AlertTriangle className="w-3 h-3" />
                        <button type="button" onClick={() => handleRetryPage(p.pageNumber)} disabled={retryPage.isPending} className="flex items-center gap-1 underline disabled:opacity-50">
                          <RotateCw className="w-3 h-3" /> Retry
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-gray-400 mt-2">
                A failed page contributed no questions — retry it, or continue and save what the other pages produced.
              </p>
            </div>
          )}

          <ExtractedDraftsReview
            drafts={drafts}
            warnings={warnings}
            onUpdateDraft={updateDraft}
            onRemoveDraft={removeDraft}
            onConfirm={handleConfirm}
            confirming={confirm.isPending}
          />

          {drafts.length === 0 && (
            <p className="text-center text-sm text-gray-400 py-10">No questions could be drafted from these pages.</p>
          )}
        </div>
      )}
    </div>
  );
}
