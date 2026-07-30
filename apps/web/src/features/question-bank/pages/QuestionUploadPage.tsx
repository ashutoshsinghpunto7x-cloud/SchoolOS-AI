import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Camera, FileText, Loader2, Trash2, CheckCircle2, AlertTriangle, RotateCw, Image as ImageIcon } from 'lucide-react';
import {
  useExtractQuestionsFromImage, useExtractQuestionsFromPdf, useConfirmExtractedQuestions,
  useQuestionSources, useReExtractSource,
} from '../hooks/useQuestionBank';
import type { ExtractedQuestionDraft, QuestionType, QuestionDifficulty, BloomsLevel } from '@schoolos/types';

const QUESTION_TYPES: QuestionType[] = ['mcq', 'fill_blank', 'true_false', 'assertion_reason', 'very_short', 'short', 'long', 'hots', 'case_study'];
const DIFFICULTIES: QuestionDifficulty[] = ['easy', 'medium', 'hard'];
const BLOOMS_LEVELS: BloomsLevel[] = ['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create'];

function labelize(s: string): string {
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

type DraftEdit = Omit<ExtractedQuestionDraft, 'marks' | 'estimatedTimeMinutes'> & {
  marks: number | '';
  estimatedTimeMinutes: number | '';
};

export function QuestionUploadPage() {
  const navigate = useNavigate();
  const imageInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  const [cls, setCls] = useState('');
  const [subject, setSubject] = useState('');
  const [warnings, setWarnings] = useState<string[]>([]);
  const [drafts, setDrafts] = useState<DraftEdit[] | null>(null);

  const extractImage = useExtractQuestionsFromImage();
  const extractPdf = useExtractQuestionsFromPdf();
  const confirm = useConfirmExtractedQuestions();
  const reExtract = useReExtractSource();

  const busy = extractImage.isPending || extractPdf.isPending;
  const target = { class: cls.trim(), subject: subject.trim() };
  const targetReady = !!target.class && !!target.subject;
  const { data: sources } = useQuestionSources(target.class, target.subject);

  async function handleReExtract(sourceId: string) {
    try {
      const result = await reExtract.mutateAsync(sourceId);
      setDrafts((prev) => [...(prev ?? []), ...result.extracted]);
      setWarnings(result.warnings);
      if (result.extracted.length === 0) toast.error('No questions found in that saved text');
      else toast.success(`${result.extracted.length} question(s) re-read — review before saving`);
    } catch (err) {
      toast.error('Could not re-extract from that upload', { description: err instanceof Error ? err.message : undefined });
    }
  }

  async function handleImageFile(file: File) {
    if (!targetReady) { toast.error('Enter class and subject first'); return; }
    try {
      const result = await extractImage.mutateAsync({ target, file });
      setDrafts((prev) => [...(prev ?? []), ...result.extracted]);
      setWarnings(result.warnings);
      if (result.extracted.length === 0) toast.error('No questions found on that page');
      else toast.success(`${result.extracted.length} question(s) read — review before saving`);
    } catch (err) {
      toast.error('Could not read that photo', { description: err instanceof Error ? err.message : undefined });
    }
  }

  async function handlePdfFile(file: File) {
    if (!targetReady) { toast.error('Enter class and subject first'); return; }
    try {
      const result = await extractPdf.mutateAsync({ target, file });
      setDrafts((prev) => [...(prev ?? []), ...result.extracted]);
      setWarnings(result.warnings);
      if (result.extracted.length === 0) toast.error('No questions found in that document');
      else toast.success(`${result.extracted.length} question(s) read — review before saving`);
    } catch (err) {
      toast.error('Could not read that PDF', { description: err instanceof Error ? err.message : undefined });
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
      const questions: ExtractedQuestionDraft[] = drafts.map((d) => ({
        ...d,
        marks: d.marks === '' ? 0 : d.marks,
        estimatedTimeMinutes: d.estimatedTimeMinutes === '' ? 0 : d.estimatedTimeMinutes,
      }));
      const saved = await confirm.mutateAsync({ class: target.class, subject: target.subject, questions });
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
        <h1 className="text-sm font-bold text-gray-900 dark:text-white">Upload Questions</h1>
      </div>

      <div className="max-w-3xl mx-auto px-5 py-6 space-y-5">
        <div className="bg-white dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/10 p-4 flex gap-3">
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
              Previously uploaded — re-extract without re-uploading
            </p>
            <div className="space-y-1.5">
              {sources.map((s) => (
                <div key={s._id} className="flex items-center gap-2.5 h-10 px-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5">
                  {s.kind === 'image' ? <ImageIcon className="w-4 h-4 text-gray-400 shrink-0" /> : <FileText className="w-4 h-4 text-gray-400 shrink-0" />}
                  <span className="flex-1 text-xs text-gray-600 dark:text-white/60 truncate">
                    {s.fileName || (s.kind === 'image' ? 'Photo upload' : 'PDF upload')}
                  </span>
                  <span className="text-[11px] text-gray-400 shrink-0">{new Date(s.createdAt).toLocaleDateString()}</span>
                  <button
                    type="button" onClick={() => handleReExtract(s._id)} disabled={reExtract.isPending}
                    className="shrink-0 h-7 px-2.5 rounded-md text-xs font-semibold text-[#6D4AFF] hover:bg-[#6D4AFF]/10 flex items-center gap-1 disabled:opacity-50"
                  >
                    {reExtract.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCw className="w-3.5 h-3.5" />}
                    Re-extract
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {warnings.length > 0 && (
          <div className="rounded-xl p-3.5 bg-amber-50 border border-amber-200 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <ul className="text-xs text-amber-700 list-disc pl-4 space-y-0.5">
              {warnings.map((w, i) => <li key={i}>{w}</li>)}
            </ul>
          </div>
        )}

        {drafts && drafts.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Review before saving — {drafts.length} question(s)</p>
            {drafts.map((d, i) => (
              <div key={i} className="bg-white dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/10 p-4 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <textarea
                    value={d.questionText}
                    onChange={(e) => updateDraft(i, { questionText: e.target.value })}
                    rows={2}
                    className="flex-1 text-sm text-gray-800 dark:text-white/80 border border-gray-200 dark:border-white/10 dark:bg-transparent rounded-lg p-2 resize-none"
                  />
                  <button type="button" onClick={() => removeDraft(i)} className="text-gray-300 hover:text-red-500 shrink-0 mt-1">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <select value={d.questionType} onChange={(e) => updateDraft(i, { questionType: e.target.value as QuestionType })}
                    className="h-8 px-2 rounded-lg border border-gray-200 dark:border-white/10 dark:bg-white/5 dark:text-white text-xs">
                    {QUESTION_TYPES.map((t) => <option key={t} value={t}>{labelize(t)}</option>)}
                  </select>
                  <select value={d.difficulty} onChange={(e) => updateDraft(i, { difficulty: e.target.value as QuestionDifficulty })}
                    className="h-8 px-2 rounded-lg border border-gray-200 dark:border-white/10 dark:bg-white/5 dark:text-white text-xs">
                    {DIFFICULTIES.map((t) => <option key={t} value={t}>{labelize(t)}</option>)}
                  </select>
                  <select value={d.bloomsLevel} onChange={(e) => updateDraft(i, { bloomsLevel: e.target.value as BloomsLevel })}
                    className="h-8 px-2 rounded-lg border border-gray-200 dark:border-white/10 dark:bg-white/5 dark:text-white text-xs">
                    {BLOOMS_LEVELS.map((t) => <option key={t} value={t}>{labelize(t)}</option>)}
                  </select>
                  <input type="number" min={0} value={d.marks} onChange={(e) => updateDraft(i, { marks: e.target.value === '' ? '' : Number(e.target.value) })}
                    placeholder="Marks" className="h-8 px-2 rounded-lg border border-gray-200 dark:border-white/10 dark:bg-white/5 dark:text-white text-xs" />
                  <input type="number" min={0} value={d.estimatedTimeMinutes} onChange={(e) => updateDraft(i, { estimatedTimeMinutes: e.target.value === '' ? '' : Number(e.target.value) })}
                    placeholder="Minutes" className="h-8 px-2 rounded-lg border border-gray-200 dark:border-white/10 dark:bg-white/5 dark:text-white text-xs" />
                  <input value={d.chapterName} onChange={(e) => updateDraft(i, { chapterName: e.target.value })}
                    placeholder="Chapter" className="h-8 px-2 rounded-lg border border-gray-200 dark:border-white/10 dark:bg-white/5 dark:text-white text-xs col-span-2" />
                  <input value={d.topic ?? ''} onChange={(e) => updateDraft(i, { topic: e.target.value })}
                    placeholder="Topic" className="h-8 px-2 rounded-lg border border-gray-200 dark:border-white/10 dark:bg-white/5 dark:text-white text-xs" />
                </div>
              </div>
            ))}

            <button
              type="button" onClick={handleConfirm} disabled={confirm.isPending}
              className="w-full h-11 rounded-xl bg-[#1C2B4A] text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {confirm.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Save {drafts.length} question(s) to the bank
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
