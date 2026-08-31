import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, AlertTriangle, RotateCw, Check } from 'lucide-react';
import { BlockEditor } from '../components/ChapterCapture/BlockEditor';
import { useChapterCaptureJob, useRetryChapterPage, useSaveChapterSource } from '../hooks/useQuestionBank';
import { getChapterCaptureSession, clearChapterCaptureSession } from '../lib/chapterCaptureSession';
import type { ChapterPage } from '@schoolos/types';

export function ChapterReviewPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const session = useRef(getChapterCaptureSession()).current;
  const retakeInputRef = useRef<HTMLInputElement>(null);

  const { data: job, isError: jobLoadError } = useChapterCaptureJob(jobId);
  const retryPage = useRetryChapterPage();
  const saveChapter = useSaveChapterSource();

  const [editedPages, setEditedPages] = useState<ChapterPage[] | null>(null);
  const [documentTitle, setDocumentTitle] = useState('');
  const [chapterName, setChapterName] = useState(session?.chapterName ?? '');
  const [activePage, setActivePage] = useState(0);
  const [initialized, setInitialized] = useState(false);
  // Per-page chapter override, keyed by pageNumber — lets one capture batch that actually spans
  // more than one chapter (e.g. photographed in one sitting) be split into separate saved sources
  // on Save, one per chapter, instead of forcing everything under a single chapterName. Pages left
  // untouched fall back to the document-level `chapterName` field above.
  const [pageChapterNames, setPageChapterNames] = useState<Record<number, string>>({});

  // Seed local editable state once, when the job first completes — subsequent
  // polls (if any) shouldn't clobber teacher edits made in the review UI.
  useEffect(() => {
    if (!initialized && job?.status === 'completed' && job.result) {
      setEditedPages(job.result.pages);
      setDocumentTitle(job.result.documentTitle ?? '');
      setInitialized(true);
    }
  }, [job, initialized]);

  if (!session) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-sm text-gray-500 dark:text-white/50">
          Captured pages were lost — this happens after a reload mid-session (pages are held in this tab only, never uploaded until you save). Start the capture again.
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

  async function handleRetryPage(pageNumber: number) {
    if (!jobId) return;
    const original = session!.pages[pageNumber - 1];
    if (!original) return;
    try {
      const result = await retryPage.mutateAsync({ jobId, pageNumber, file: original.file });
      setEditedPages(result.pages);
      toast.success(`Page ${pageNumber} reprocessed`);
    } catch (err) {
      toast.error('Retry failed', { description: err instanceof Error ? err.message : undefined });
    }
  }

  async function handleRetakeFile(pageNumber: number, file: File) {
    if (!jobId) return;
    try {
      const result = await retryPage.mutateAsync({ jobId, pageNumber, file });
      setEditedPages(result.pages);
      toast.success(`Page ${pageNumber} reprocessed with the new photo`);
    } catch (err) {
      toast.error('Could not process the new photo', { description: err instanceof Error ? err.message : undefined });
    }
  }

  function handleContinueWithoutPage(pageNumber: number) {
    setEditedPages((prev) => (prev ? prev.filter((p) => p.pageNumber !== pageNumber) : prev));
    setActivePage(0);
  }

  /** Effective chapter for a page: its own override if set, else the document-level field. */
  function chapterForPage(pageNumber: number): string {
    return (pageChapterNames[pageNumber] ?? '').trim() || chapterName.trim();
  }

  /** Splits pages into runs of consecutive pages sharing the same effective chapter name — each run becomes its own saved source. */
  function groupPagesByChapter(pages: ChapterPage[]): { chapterName: string; pages: ChapterPage[] }[] {
    const groups: { chapterName: string; pages: ChapterPage[] }[] = [];
    for (const p of pages) {
      const name = chapterForPage(p.pageNumber);
      const last = groups[groups.length - 1];
      if (last && last.chapterName === name) last.pages.push(p);
      else groups.push({ chapterName: name, pages: [p] });
    }
    return groups;
  }

  async function handleSave() {
    if (!editedPages || editedPages.length === 0) { toast.error('No pages to save'); return; }
    const groups = groupPagesByChapter(editedPages);
    try {
      const savedSources = [];
      for (const group of groups) {
        const source = await saveChapter.mutateAsync({
          class: session!.class,
          subject: session!.subject,
          documentTitle: documentTitle.trim() || undefined,
          chapterName: group.chapterName || undefined,
          pages: group.pages,
        });
        savedSources.push(source);
      }
      clearChapterCaptureSession();
      if (savedSources.length > 1) {
        toast.success(`${savedSources.length} chapters saved`);
        navigate('/teacher/question-bank');
      } else {
        toast.success('Chapter saved');
        navigate(`/teacher/question-bank/sources/${savedSources[0]._id}`);
      }
    } catch (err) {
      toast.error('Could not save chapter', { description: err instanceof Error ? err.message : undefined });
    }
  }

  const totalPages = job?.totalPages ?? session.pages.length;
  const completedPages = job?.completedPages ?? 0;
  const current = editedPages?.[activePage];
  const currentImage = current ? session.pages[current.pageNumber - 1]?.previewUrl : undefined;

  return (
    <div className="min-h-screen bg-[#FAFBFF] dark:bg-transparent pb-28">
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

      {!processing && !failed && editedPages && (
        <div className="max-w-5xl mx-auto px-5 py-6 space-y-5">
          <div className="bg-white dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/10 p-4 grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 dark:text-white/40">Chapter / document title</label>
              <input value={documentTitle} onChange={(e) => setDocumentTitle(e.target.value)}
                className="mt-1 w-full h-9 px-3 rounded-lg border border-gray-200 dark:border-white/10 dark:bg-white/5 dark:text-white text-sm" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 dark:text-white/40">Assign to chapter (optional)</label>
              <input value={chapterName} onChange={(e) => setChapterName(e.target.value)} placeholder="e.g. Chapter 4 — Light"
                className="mt-1 w-full h-9 px-3 rounded-lg border border-gray-200 dark:border-white/10 dark:bg-white/5 dark:text-white text-sm" />
            </div>
          </div>

          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {editedPages.map((p, i) => (
              <button
                key={p.pageNumber} type="button" onClick={() => setActivePage(i)}
                className={`shrink-0 h-8 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 ${
                  i === activePage ? 'bg-blue-600 text-white' : 'bg-white dark:bg-white/5 text-gray-500 dark:text-white/50 border border-gray-200 dark:border-white/10'
                }`}
              >
                Page {p.pageNumber}
                {p.pageError && <AlertTriangle className="w-3 h-3 text-red-400" />}
              </button>
            ))}
          </div>

          {editedPages.length > 1 && current && (
            <div className="bg-white dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/10 p-3 flex flex-col sm:flex-row sm:items-center gap-2">
              <label className="text-xs font-semibold text-gray-500 dark:text-white/40 shrink-0">
                Chapter for page {current.pageNumber}
              </label>
              <input
                value={pageChapterNames[current.pageNumber] ?? ''}
                onChange={(e) => setPageChapterNames((prev) => ({ ...prev, [current.pageNumber]: e.target.value }))}
                placeholder={chapterName.trim() || 'Same as document chapter'}
                className="w-full sm:flex-1 h-8 px-2.5 rounded-lg border border-gray-200 dark:border-white/10 dark:bg-white/5 dark:text-white text-xs min-w-0"
              />
              <span className="text-[11px] text-gray-400 sm:max-w-[45%]">
                Only set this where the chapter actually changes — pages are saved as one entry per chapter.
              </span>
            </div>
          )}

          {current && (
            <div className="grid lg:grid-cols-2 gap-4">
              <div className="bg-white dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/10 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Source Image — Page {current.pageNumber}</p>
                {currentImage && <img src={currentImage} alt={`Source page ${current.pageNumber}`} className="w-full rounded-lg" />}
              </div>

              <div className="bg-white dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/10 p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Extracted Content</p>
                  <div className="flex gap-2">
                    <button
                      type="button" onClick={() => handleRetryPage(current.pageNumber)} disabled={retryPage.isPending}
                      className="text-xs font-semibold text-blue-600 flex items-center gap-1 disabled:opacity-50"
                    ><RotateCw className="w-3 h-3" /> Retry Processing</button>
                    <button
                      type="button" onClick={() => retakeInputRef.current?.click()} disabled={retryPage.isPending}
                      className="text-xs font-semibold text-gray-500 disabled:opacity-50"
                    >Retake Page</button>
                    {current.pageError && (
                      <button
                        type="button" onClick={() => handleContinueWithoutPage(current.pageNumber)}
                        className="text-xs font-semibold text-red-500"
                      >Continue Without This Page</button>
                    )}
                  </div>
                </div>
                <input
                  ref={retakeInputRef} type="file" accept="image/*" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleRetakeFile(current.pageNumber, f); e.target.value = ''; }}
                />
                {current.pageError ? (
                  <p className="text-sm text-red-500">{current.pageError}</p>
                ) : (
                  <BlockEditor
                    blocks={current.blocks}
                    onChange={(blocks) => setEditedPages((prev) => prev!.map((p) => (p.pageNumber === current.pageNumber ? { ...p, blocks } : p)))}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {!processing && !failed && editedPages && (
        <div
          className="fixed inset-x-0 z-30 bg-white/95 dark:bg-black/80 backdrop-blur border-t border-gray-100 dark:border-white/10 px-5 py-3 sm:mx-auto sm:max-w-md"
          style={{ bottom: 'calc(4rem + env(safe-area-inset-bottom))' }}
        >
          <button
            type="button" onClick={handleSave} disabled={saveChapter.isPending}
            className="w-full h-11 rounded-xl bg-emerald-600 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {saveChapter.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Save Chapter
          </button>
        </div>
      )}
    </div>
  );
}
