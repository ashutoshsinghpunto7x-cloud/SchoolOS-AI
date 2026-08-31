import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Camera, FileText, Loader2, ChevronRight, Image as ImageIcon, BookOpen } from 'lucide-react';
import { useExtractQuestionsFromImage, useExtractQuestionsFromPdf, useQuestionSources } from '../hooks/useQuestionBank';
import { useTeacherSubjectOptions } from '@/features/teacher-workspace/hooks/useTeacherWorkspace';

export function QuestionUploadPage() {
  const navigate = useNavigate();
  const imageInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  const [cls, setCls] = useState('');
  const [subject, setSubject] = useState('');
  const [includeImages, setIncludeImages] = useState(false);

  // Picked from the teacher's own timetable, not typed — see the same note
  // in ChapterCapturePage.tsx / useTeacherSubjectOptions.
  const { options, classes, isLoading: optionsLoading } = useTeacherSubjectOptions();
  const subjectsForClass = useMemo(
    () => options.filter((o) => o.cls === cls).map((o) => o.subjectName),
    [options, cls],
  );

  function handleClassChange(next: string) {
    setCls(next);
    if (!options.some((o) => o.cls === next && o.subjectName === subject)) setSubject('');
  }

  const extractImage = useExtractQuestionsFromImage();
  const extractPdf = useExtractQuestionsFromPdf();

  const busy = extractImage.isPending || extractPdf.isPending;
  const target = { class: cls.trim(), subject: subject.trim() };
  const targetReady = !!target.class && !!target.subject;
  const { data: sources } = useQuestionSources(target.class, target.subject);

  async function handleImageFile(file: File) {
    if (!targetReady) { toast.error('Enter class and subject first'); return; }
    try {
      const result = await extractImage.mutateAsync({ target, file, detectImages: includeImages });
      if (!result.extractedText.trim()) toast.error('No readable text was found on that page');
      else toast.success('Text extracted and saved — open it below to generate questions');
    } catch (err) {
      toast.error('Could not read that photo', { description: err instanceof Error ? err.message : undefined });
    }
  }

  async function handlePdfFile(file: File) {
    if (!targetReady) { toast.error('Enter class and subject first'); return; }
    try {
      const result = await extractPdf.mutateAsync({ target, file });
      if (!result.extractedText.trim()) toast.error('No readable text was found in that document');
      else toast.success('Text extracted and saved — open it below to generate questions');
    } catch (err) {
      toast.error('Could not read that PDF', { description: err instanceof Error ? err.message : undefined });
    }
  }

  return (
    <div className="min-h-screen bg-[#FAFBFF] dark:bg-transparent pb-24">
      <div className="sticky top-0 z-10 bg-white/90 dark:bg-black/40 backdrop-blur border-b border-gray-100 dark:border-white/10 px-5 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} type="button" className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 dark:text-white/50">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <h1 className="text-sm font-bold text-gray-900 dark:text-white">Upload Questions</h1>
      </div>

      <div className="max-w-3xl mx-auto px-5 py-6 space-y-5">
        {!optionsLoading && classes.length === 0 ? (
          <div className="bg-white dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/10 p-4">
            <p className="text-xs text-amber-600">
              Your principal hasn't assigned you a subject on the timetable yet — that's needed before you can upload here.
            </p>
          </div>
        ) : (
          <div className="bg-white dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/10 p-4 flex gap-3">
            <div className="flex-1">
              <label className="text-xs font-semibold text-gray-500 dark:text-white/40">Class</label>
              <select value={cls} onChange={(e) => handleClassChange(e.target.value)} disabled={optionsLoading}
                className="mt-1 w-full h-9 px-3 rounded-lg border border-gray-200 dark:border-white/10 dark:bg-white/5 dark:text-white text-sm disabled:opacity-50">
                <option value="">{optionsLoading ? 'Loading…' : 'Select class'}</option>
                {classes.map((c) => <option key={c} value={c}>Class {c}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className="text-xs font-semibold text-gray-500 dark:text-white/40">Subject</label>
              <select value={subject} onChange={(e) => setSubject(e.target.value)} disabled={!cls}
                className="mt-1 w-full h-9 px-3 rounded-lg border border-gray-200 dark:border-white/10 dark:bg-white/5 dark:text-white text-sm disabled:opacity-50">
                <option value="">{cls ? 'Select subject' : 'Pick a class first'}</option>
                {subjectsForClass.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
        )}

        <p className="text-xs text-gray-400 dark:text-white/30 -mt-2">
          Uploading only reads and saves the text — you'll generate questions from it on the next screen, as many times as you like.
        </p>

        <button
          type="button"
          onClick={() => navigate('/teacher/question-bank/capture')}
          className="w-full h-14 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center gap-3 px-4"
        >
          <BookOpen className="w-5 h-5 shrink-0" />
          <div className="text-left">
            <div className="text-sm font-semibold">Capture a chapter (multi-page)</div>
            <div className="text-[11px] text-white/70">Photograph several pages and preserve tables, headings, lists & equations</div>
          </div>
          <ChevronRight className="w-4 h-4 ml-auto shrink-0" />
        </button>

        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-white/70 cursor-pointer -mt-1">
          <input type="checkbox" checked={includeImages} onChange={(e) => setIncludeImages(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300" />
          Include images <span className="text-xs text-gray-400 dark:text-white/30">(photo upload only — detects pictures for picture-based questions)</span>
        </label>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button" disabled={busy || !targetReady}
            onClick={() => imageInputRef.current?.click()}
            className="h-24 rounded-2xl border-2 border-dashed border-gray-200 dark:border-white/10 flex flex-col items-center justify-center gap-1.5 text-gray-500 dark:text-white/40 disabled:opacity-50"
          >
            {extractImage.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
            <span className="text-xs font-semibold">Photo of a page</span>
          </button>
          <button
            type="button" disabled={busy || !targetReady}
            onClick={() => pdfInputRef.current?.click()}
            className="h-24 rounded-2xl border-2 border-dashed border-gray-200 dark:border-white/10 flex flex-col items-center justify-center gap-1.5 text-gray-500 dark:text-white/40 disabled:opacity-50"
          >
            {extractPdf.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileText className="w-5 h-5" />}
            <span className="text-xs font-semibold">PDF (typed text)</span>
          </button>
        </div>
        <input ref={imageInputRef} type="file" accept="image/*" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageFile(f); e.target.value = ''; }} />
        <input ref={pdfInputRef} type="file" accept="application/pdf" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePdfFile(f); e.target.value = ''; }} />

        {targetReady && sources && sources.length > 0 && (
          <div className="bg-white dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/10 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2.5">
              Stored uploads — open one to view its text and generate questions
            </p>
            <div className="space-y-1.5">
              {sources.map((s) => (
                <button
                  key={s._id} type="button"
                  onClick={() => navigate(`/teacher/question-bank/sources/${s._id}`)}
                  className="w-full flex items-center gap-2.5 h-10 px-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5"
                >
                  {s.kind === 'image' ? <ImageIcon className="w-4 h-4 text-gray-400 shrink-0" /> : <FileText className="w-4 h-4 text-gray-400 shrink-0" />}
                  <span className="flex-1 text-xs text-gray-600 dark:text-white/60 truncate text-left">
                    {s.fileName || (s.kind === 'image' ? 'Photo upload' : 'PDF upload')}
                  </span>
                  <span className="text-[11px] text-gray-400 shrink-0">{new Date(s.createdAt).toLocaleDateString()}</span>
                  <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
