import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Camera, ImagePlus, Loader2 } from 'lucide-react';
import { CameraCapture } from '../components/ChapterCapture/CameraCapture';
import { PageList, type CapturedPage } from '../components/ChapterCapture/PageList';
import { useExtractChapter } from '../hooks/useQuestionBank';
import { setChapterCaptureSession } from '../lib/chapterCaptureSession';

let idCounter = 0;
const nextId = () => `page-${Date.now()}-${idCounter++}`;

export function ChapterCapturePage() {
  const navigate = useNavigate();
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [cls, setCls] = useState('');
  const [subject, setSubject] = useState('');
  const [chapterName, setChapterName] = useState('');
  const [pages, setPages] = useState<CapturedPage[]>([]);
  const [cameraOpen, setCameraOpen] = useState(false);
  const extractChapter = useExtractChapter();

  const targetReady = !!cls.trim() && !!subject.trim();

  function addFiles(files: File[]) {
    const added: CapturedPage[] = files.map((file) => ({ id: nextId(), file, previewUrl: URL.createObjectURL(file) }));
    setPages((prev) => [...prev, ...added]);
  }

  function handleDelete(id: string) {
    setPages((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((p) => p.id !== id);
    });
  }

  function moveBy(id: string, delta: number) {
    setPages((prev) => {
      const index = prev.findIndex((p) => p.id === id);
      const target = index + delta;
      if (index < 0 || target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function handleProcess() {
    if (pages.length === 0) { toast.error('Capture or choose at least one page first'); return; }
    try {
      const { jobId } = await extractChapter.mutateAsync(pages.map((p) => p.file));
      setChapterCaptureSession({ class: cls.trim(), subject: subject.trim(), chapterName: chapterName.trim(), pages });
      navigate(`/teacher/question-bank/capture/${jobId}/review`);
    } catch (err) {
      toast.error('Could not start processing', { description: err instanceof Error ? err.message : undefined });
    }
  }

  return (
    <div className="min-h-screen bg-[#FAFBFF] dark:bg-transparent pb-28">
      <div className="sticky top-0 z-10 bg-white/90 dark:bg-black/40 backdrop-blur border-b border-gray-100 dark:border-white/10 px-5 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} type="button" className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 dark:text-white/50">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <h1 className="text-sm font-bold text-gray-900 dark:text-white">Capture a Chapter</h1>
      </div>

      <div className="max-w-3xl mx-auto px-5 py-6 space-y-5">
        <div className="bg-white dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/10 p-4 space-y-3">
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs font-semibold text-gray-500 dark:text-white/40">Class</label>
              <input value={cls} onChange={(e) => setCls(e.target.value)} placeholder="e.g. 8"
                className="mt-1 w-full h-9 px-3 rounded-lg border border-gray-200 dark:border-white/10 dark:bg-white/5 dark:text-white text-sm" />
            </div>
            <div className="flex-1">
              <label className="text-xs font-semibold text-gray-500 dark:text-white/40">Subject</label>
              <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Science"
                className="mt-1 w-full h-9 px-3 rounded-lg border border-gray-200 dark:border-white/10 dark:bg-white/5 dark:text-white text-sm" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 dark:text-white/40">Chapter name (optional)</label>
            <input value={chapterName} onChange={(e) => setChapterName(e.target.value)} placeholder="e.g. Chapter 4 — Light"
              className="mt-1 w-full h-9 px-3 rounded-lg border border-gray-200 dark:border-white/10 dark:bg-white/5 dark:text-white text-sm" />
          </div>
        </div>

        <p className="text-xs text-gray-400 dark:text-white/30 -mt-2">
          Photograph or select every page of the chapter/section — page order matters, so capture them in reading order (you can reorder below too).
        </p>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button" disabled={!targetReady}
            onClick={() => setCameraOpen(true)}
            className="h-24 rounded-2xl border-2 border-dashed border-gray-200 dark:border-white/10 flex flex-col items-center justify-center gap-1.5 text-gray-500 dark:text-white/40 disabled:opacity-50"
          >
            <Camera className="w-5 h-5" />
            <span className="text-xs font-semibold">Camera (multi-page)</span>
          </button>
          <button
            type="button" disabled={!targetReady}
            onClick={() => galleryInputRef.current?.click()}
            className="h-24 rounded-2xl border-2 border-dashed border-gray-200 dark:border-white/10 flex flex-col items-center justify-center gap-1.5 text-gray-500 dark:text-white/40 disabled:opacity-50"
          >
            <ImagePlus className="w-5 h-5" />
            <span className="text-xs font-semibold">Choose from gallery</span>
          </button>
        </div>
        <input
          ref={galleryInputRef} type="file" accept="image/*" multiple className="hidden"
          onChange={(e) => { const files = Array.from(e.target.files ?? []); if (files.length) addFiles(files); e.target.value = ''; }}
        />

        {pages.length > 0 && (
          <div className="bg-white dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/10 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2.5">
              {pages.length} page{pages.length === 1 ? '' : 's'} — in reading order
            </p>
            <PageList pages={pages} onDelete={handleDelete} onMoveUp={(id) => moveBy(id, -1)} onMoveDown={(id) => moveBy(id, 1)} />
          </div>
        )}
      </div>

      {pages.length > 0 && (
        <div
          className="fixed inset-x-0 z-30 bg-white/95 dark:bg-black/80 backdrop-blur border-t border-gray-100 dark:border-white/10 px-5 py-3 sm:mx-auto sm:max-w-md"
          style={{ bottom: 'calc(4rem + env(safe-area-inset-bottom))' }}
        >
          <button
            type="button" onClick={handleProcess} disabled={extractChapter.isPending}
            className="w-full h-11 rounded-xl bg-blue-600 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {extractChapter.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Process {pages.length} Page{pages.length === 1 ? '' : 's'}
          </button>
        </div>
      )}

      {cameraOpen && (
        <CameraCapture onCapture={(file) => addFiles([file])} onClose={() => setCameraOpen(false)} />
      )}
    </div>
  );
}
