import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, AlertTriangle, RotateCw } from 'lucide-react';
import { ExtractedDraftsReview, type DraftEdit } from '@/features/question-bank/components/ExtractedDraftsReview';
import { getChapterCaptureSession, clearChapterCaptureSession } from '@/features/question-bank/lib/chapterCaptureSession';
import { useOpsChapterCaptureJob, useOpsRetryChapterPage, useOpsConfirmExtracted } from '../hooks/useOpsContent';
import type { ChapterPage } from '@schoolos/types';

/** Ops Centre counterpart of ChapterReviewPage.tsx — same review-then-save screen, scoped to the
 * school the ops user picked on the previous screen (carried via the shared capture session). */
export function OpsChapterReviewPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const session = useRef(getChapterCaptureSession()).current;
  const schoolId = session?.schoolId;

  const { data: job, isError: jobLoadError } = useOpsChapterCaptureJob(schoolId, jobId);
  const retryPage = useOpsRetryChapterPage(schoolId);
  const confirm = useOpsConfirmExtracted(schoolId);

  const [drafts, setDrafts] = useState<DraftEdit[] | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [pages, setPages] = useState<ChapterPage[]>([]);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!initialized && job?.status === 'completed' && job.result) {
      setDrafts(job.result.questions ?? []);
      setWarnings(job.result.warnings ?? []);
      setPages(job.result.pages ?? []);
      setInitialized(true);
    }
  }, [job, initialized]);

  if (!session || !schoolId) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
        <p className="text-sm text-[#98A2B3]">
          Captured pages were lost — this happens after a reload mid-session. Start the capture again.
        </p>
        <button onClick={() => navigate('/ops/chapter-capture')} type="button" className="text-sm font-semibold text-blue-400">
          Start over
        </button>
      </div>
    );
  }

  if (jobLoadError) {
    return <div className="flex items-center justify-center py-24 text-sm text-red-400">Could not load this processing job — it may have expired.</div>;
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
      navigate('/ops/chapter-capture');
    } catch (err) {
      toast.error('Could not save questions', { description: err instanceof Error ? err.message : undefined });
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} type="button" className="flex items-center gap-1.5 text-sm font-medium text-[#98A2B3] hover:text-[#F4F6F8]">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <h1 className="text-lg font-semibold text-[#F4F6F8]">Review Chapter</h1>
      </div>

      {processing && (
        <div className="flex flex-col items-center gap-3 py-16">
          <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
          <p className="text-sm text-[#98A2B3]">
            Reading page {completedPages + 1} of {totalPages}…
          </p>
          <div className="w-full max-w-xs h-1.5 rounded-full bg-[#232D38] overflow-hidden">
            <div className="h-full bg-blue-500 transition-all" style={{ width: `${totalPages ? (completedPages / totalPages) * 100 : 0}%` }} />
          </div>
        </div>
      )}

      {failed && (
        <div className="py-16 text-center text-sm text-red-400">
          {job?.error || 'Processing failed.'}
        </div>
      )}

      {!processing && !failed && drafts && (
        <div className="max-w-3xl space-y-5">
          {pages.some((p) => p.pageError) && (
            <div className="rounded-2xl border border-[#232D38] bg-[#0F141B] p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#64748B] mb-2.5">Pages</p>
              <div className="flex gap-1.5 flex-wrap">
                {pages.map((p) => (
                  <div key={p.pageNumber} className={`h-8 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 ${p.pageError ? 'bg-red-500/10 text-red-400' : 'bg-[#232D38] text-[#98A2B3]'}`}>
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
              <p className="text-[11px] text-[#64748B] mt-2">
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
            <p className="text-center text-sm text-[#64748B] py-10">No questions could be drafted from these pages.</p>
          )}
        </div>
      )}
    </div>
  );
}
