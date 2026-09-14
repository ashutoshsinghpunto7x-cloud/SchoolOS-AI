import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Camera, ImagePlus, Loader2 } from 'lucide-react';
import { CameraCapture } from '@/features/question-bank/components/ChapterCapture/CameraCapture';
import { PageList, type CapturedPage } from '@/features/question-bank/components/ChapterCapture/PageList';
import { setChapterCaptureSession } from '@/features/question-bank/lib/chapterCaptureSession';
import { useOpsSchools } from '../hooks/useOpsData';
import { useOpsSchoolClasses, useOpsQuestionBankOverview, useOpsExtractChapter } from '../hooks/useOpsContent';

let idCounter = 0;
const nextId = () => `ops-page-${Date.now()}-${idCounter++}`;

/**
 * Ops Centre's version of the teacher "Capture a Chapter" flow (ChapterCapturePage.tsx) — same
 * upload-to-question-drafts pipeline, but for a school the ops user picks explicitly rather than
 * their own tenant (ops accounts aren't scoped to a school). See ops-content.controller.ts.
 */
export function OpsChapterCapturePage() {
  const navigate = useNavigate();
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [schoolId, setSchoolId] = useState('');
  const [cls, setCls] = useState('');
  const [subject, setSubject] = useState('');
  const [chapterName, setChapterName] = useState('');
  const [pages, setPages] = useState<CapturedPage[]>([]);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [includeImages, setIncludeImages] = useState(false);

  const { data: schools, isLoading: schoolsLoading } = useOpsSchools();
  const { data: classes, isLoading: classesLoading } = useOpsSchoolClasses(schoolId || undefined);
  const { data: overview } = useOpsQuestionBankOverview(schoolId || undefined);
  const extractChapter = useOpsExtractChapter(schoolId || undefined);

  // No canonical subject catalog exists anywhere in this app (teachers only ever see subjects
  // from their own timetable rows) — offer subjects already used for this class as suggestions,
  // but still allow typing a brand-new one, same as the underlying data model already allows.
  const subjectSuggestions = useMemo(
    () => overview?.find((c) => c.class === cls)?.subjects.map((s) => s.subject) ?? [],
    [overview, cls],
  );

  function handleSchoolChange(next: string) {
    setSchoolId(next);
    setCls('');
    setSubject('');
  }

  function handleClassChange(next: string) {
    setCls(next);
    setSubject('');
  }

  const targetReady = !!schoolId && !!cls.trim() && !!subject.trim() && !!chapterName.trim();

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
    if (!chapterName.trim()) { toast.error('Enter the chapter name first'); return; }
    try {
      const { jobId } = await extractChapter.mutateAsync({
        target: { class: cls.trim(), subject: subject.trim() },
        chapterName: chapterName.trim(),
        images: pages.map((p) => p.file),
        detectImages: includeImages,
      });
      setChapterCaptureSession({ class: cls.trim(), subject: subject.trim(), chapterName: chapterName.trim(), pages, schoolId });
      navigate(`/ops/chapter-capture/${jobId}/review`);
    } catch (err) {
      toast.error('Could not start processing', { description: err instanceof Error ? err.message : undefined });
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} type="button" className="flex items-center gap-1.5 text-sm font-medium text-[#98A2B3] hover:text-[#F4F6F8]">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <h1 className="text-lg font-semibold text-[#F4F6F8]">Upload Content — Chapter Capture</h1>
      </div>
      <p className="text-sm text-[#98A2B3] -mt-3">
        Runs the same photo-to-question-drafts pipeline teachers use, on behalf of any school — pick the school, class, subject
        and chapter, then upload every page in reading order.
      </p>

      <div className="max-w-2xl space-y-5">
        <div className="rounded-2xl border border-[#232D38] bg-[#0F141B] p-4 space-y-3">
          <div>
            <label className="text-xs font-semibold text-[#64748B]">School</label>
            <select value={schoolId} onChange={(e) => handleSchoolChange(e.target.value)} disabled={schoolsLoading}
              className="mt-1 w-full h-9 px-3 rounded-lg border border-[#232D38] bg-[#0B0F14] text-[#F4F6F8] text-sm disabled:opacity-50">
              <option value="">{schoolsLoading ? 'Loading…' : 'Select school'}</option>
              {schools?.map((s) => <option key={s.schoolId} value={s.schoolId}>{s.schoolName}</option>)}
            </select>
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs font-semibold text-[#64748B]">Class</label>
              <select value={cls} onChange={(e) => handleClassChange(e.target.value)} disabled={!schoolId || classesLoading}
                className="mt-1 w-full h-9 px-3 rounded-lg border border-[#232D38] bg-[#0B0F14] text-[#F4F6F8] text-sm disabled:opacity-50">
                <option value="">{!schoolId ? 'Pick a school first' : classesLoading ? 'Loading…' : 'Select class'}</option>
                {classes?.map((c) => <option key={c._id} value={c.name}>Class {c.name}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className="text-xs font-semibold text-[#64748B]">Subject</label>
              <input
                list="ops-subject-suggestions" value={subject} onChange={(e) => setSubject(e.target.value)} disabled={!cls}
                placeholder={cls ? 'Existing or new subject' : 'Pick a class first'}
                className="mt-1 w-full h-9 px-3 rounded-lg border border-[#232D38] bg-[#0B0F14] text-[#F4F6F8] text-sm disabled:opacity-50"
              />
              <datalist id="ops-subject-suggestions">
                {subjectSuggestions.map((s) => <option key={s} value={s} />)}
              </datalist>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-[#64748B]">Chapter name</label>
            <input value={chapterName} onChange={(e) => setChapterName(e.target.value)} placeholder="e.g. Chapter 4 — Light"
              className="mt-1 w-full h-9 px-3 rounded-lg border border-[#232D38] bg-[#0B0F14] text-[#F4F6F8] text-sm" />
          </div>
        </div>

        <p className="text-xs text-[#64748B]">
          Photograph or select every page of the chapter/section — page order matters, so capture them in reading order (you can
          reorder below too).
        </p>

        <label className="flex items-center gap-2 text-sm text-[#98A2B3] cursor-pointer">
          <input type="checkbox" checked={includeImages} onChange={(e) => setIncludeImages(e.target.checked)}
            className="w-4 h-4 rounded border-[#232D38]" />
          Include images <span className="text-xs text-[#64748B]">(detects pictures for picture-based questions)</span>
        </label>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button" disabled={!targetReady}
            onClick={() => setCameraOpen(true)}
            className="h-24 rounded-2xl border-2 border-dashed border-[#232D38] flex flex-col items-center justify-center gap-1.5 text-[#98A2B3] disabled:opacity-50"
          >
            <Camera className="w-5 h-5" />
            <span className="text-xs font-semibold">Camera (multi-page)</span>
          </button>
          <button
            type="button" disabled={!targetReady}
            onClick={() => galleryInputRef.current?.click()}
            className="h-24 rounded-2xl border-2 border-dashed border-[#232D38] flex flex-col items-center justify-center gap-1.5 text-[#98A2B3] disabled:opacity-50"
          >
            <ImagePlus className="w-5 h-5" />
            <span className="text-xs font-semibold">Choose files</span>
          </button>
        </div>
        <input
          ref={galleryInputRef} type="file" accept="image/*" multiple className="hidden"
          onChange={(e) => { const files = Array.from(e.target.files ?? []); if (files.length) addFiles(files); e.target.value = ''; }}
        />

        {pages.length > 0 && (
          <div className="rounded-2xl border border-[#232D38] bg-[#0F141B] p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#64748B] mb-2.5">
              {pages.length} page{pages.length === 1 ? '' : 's'} — in reading order
            </p>
            <PageList pages={pages} onDelete={handleDelete} onMoveUp={(id) => moveBy(id, -1)} onMoveDown={(id) => moveBy(id, 1)} />
          </div>
        )}

        {pages.length > 0 && (
          <button
            type="button" onClick={handleProcess} disabled={extractChapter.isPending}
            className="w-full h-11 rounded-xl bg-blue-600 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {extractChapter.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Process {pages.length} Page{pages.length === 1 ? '' : 's'}
          </button>
        )}
      </div>

      {cameraOpen && (
        <CameraCapture onCapture={(file) => addFiles([file])} onClose={() => setCameraOpen(false)} />
      )}
    </div>
  );
}
