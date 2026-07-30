import { useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Camera, FileText, Loader2, Trash2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useExtractPlannerFromImage, useExtractPlannerFromPdf, useConfirmPlanner } from '../hooks/useTeacherPlanner';
import type { PlannerDraftWeek, PlannerTaskType } from '@schoolos/types';

const TASK_TYPES: PlannerTaskType[] = ['explain', 'activity', 'worksheet', 'homework', 'doubt_session', 'revision', 'unit_test', 'other'];

function labelize(s: string): string {
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function PlannerUploadPage() {
  const { cls = '', subject = '' } = useParams();
  const navigate = useNavigate();
  const imageInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  const [warnings, setWarnings] = useState<string[]>([]);
  const [totalWeeks, setTotalWeeks] = useState<number | null>(null);
  const [weeks, setWeeks] = useState<PlannerDraftWeek[] | null>(null);

  const extractImage = useExtractPlannerFromImage();
  const extractPdf = useExtractPlannerFromPdf();
  const confirm = useConfirmPlanner();

  const busy = extractImage.isPending || extractPdf.isPending;
  const target = { class: cls, subject };

  function mergeWeeks(incoming: PlannerDraftWeek[]) {
    setWeeks((prev) => {
      const byNumber = new Map((prev ?? []).map((w) => [w.weekNumber, w]));
      for (const w of incoming) byNumber.set(w.weekNumber, w);
      return [...byNumber.values()].sort((a, b) => a.weekNumber - b.weekNumber);
    });
  }

  async function handleImageFile(file: File) {
    try {
      const result = await extractImage.mutateAsync({ target, file });
      setTotalWeeks(result.totalTeachingWeeks);
      mergeWeeks(result.weeks);
      setWarnings(result.warnings);
      if (result.weeks.length === 0) toast.error('No teaching schedule found on that page');
      else toast.success(`${result.weeks.length} week(s) read — review before saving`);
    } catch (err) {
      toast.error('Could not read that photo', { description: err instanceof Error ? err.message : undefined });
    }
  }

  async function handlePdfFile(file: File) {
    try {
      const result = await extractPdf.mutateAsync({ target, file });
      setTotalWeeks(result.totalTeachingWeeks);
      mergeWeeks(result.weeks);
      setWarnings(result.warnings);
      if (result.weeks.length === 0) toast.error('No teaching schedule found in that document');
      else toast.success(`${result.weeks.length} week(s) read — review before saving`);
    } catch (err) {
      toast.error('Could not read that PDF', { description: err instanceof Error ? err.message : undefined });
    }
  }

  function updateWeek(index: number, patch: Partial<PlannerDraftWeek>) {
    setWeeks((prev) => prev?.map((w, i) => (i === index ? { ...w, ...patch } : w)) ?? null);
  }

  function removeWeek(index: number) {
    setWeeks((prev) => prev?.filter((_, i) => i !== index) ?? null);
  }

  function removeTask(weekIndex: number, taskIndex: number) {
    setWeeks((prev) =>
      prev?.map((w, i) => (i === weekIndex ? { ...w, tasks: w.tasks.filter((_, ti) => ti !== taskIndex) } : w)) ?? null,
    );
  }

  function updateTaskType(weekIndex: number, taskIndex: number, type: PlannerTaskType) {
    setWeeks((prev) =>
      prev?.map((w, i) =>
        i === weekIndex ? { ...w, tasks: w.tasks.map((t, ti) => (ti === taskIndex ? { ...t, type } : t)) } : w,
      ) ?? null,
    );
  }

  async function handleConfirm() {
    if (!weeks || weeks.length === 0) return;
    try {
      await confirm.mutateAsync({ class: cls, subject, weeks });
      toast.success('Planner saved');
      navigate(`/teacher/planner/${cls}/${encodeURIComponent(subject)}`);
    } catch (err) {
      toast.error('Could not save the planner', { description: err instanceof Error ? err.message : undefined });
    }
  }

  return (
    <div className="min-h-screen bg-[#FAFBFF] dark:bg-transparent pb-24">
      <div className="sticky top-0 z-10 bg-white/90 dark:bg-black/40 backdrop-blur border-b border-gray-100 dark:border-white/10 px-5 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} type="button" className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 dark:text-white/50">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <h1 className="text-sm font-bold text-gray-900 dark:text-white">Upload Planner — Class {cls} {subject}</h1>
      </div>

      <div className="max-w-3xl mx-auto px-5 py-6 space-y-5">
        {totalWeeks !== null && (
          <p className="text-xs text-gray-400">This academic year has <strong className="text-gray-600 dark:text-white/60">{totalWeeks}</strong> teaching weeks.</p>
        )}

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button" disabled={busy}
            onClick={() => imageInputRef.current?.click()}
            className="h-24 rounded-2xl border-2 border-dashed border-gray-200 dark:border-white/10 flex flex-col items-center justify-center gap-1.5 text-gray-500 dark:text-white/40 disabled:opacity-50"
          >
            {extractImage.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
            <span className="text-xs font-semibold">Photo of a page</span>
          </button>
          <button
            type="button" disabled={busy}
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

        {warnings.length > 0 && (
          <div className="rounded-xl p-3.5 bg-amber-50 border border-amber-200 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <ul className="text-xs text-amber-700 list-disc pl-4 space-y-0.5">
              {warnings.map((w, i) => <li key={i}>{w}</li>)}
            </ul>
          </div>
        )}

        {weeks && weeks.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Review before saving — {weeks.length} week(s)</p>
            {weeks.map((w, wi) => (
              <div key={w.weekNumber} className="bg-white dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/10 p-4 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-gray-400">Week {w.weekNumber}</span>
                  <button type="button" onClick={() => removeWeek(wi)} className="text-gray-300 hover:text-red-500">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input value={w.chapterName} onChange={(e) => updateWeek(wi, { chapterName: e.target.value })}
                    placeholder="Chapter" className="h-8 px-2 rounded-lg border border-gray-200 dark:border-white/10 dark:bg-white/5 dark:text-white text-xs" />
                  <input value={w.topic ?? ''} onChange={(e) => updateWeek(wi, { topic: e.target.value })}
                    placeholder="Topic" className="h-8 px-2 rounded-lg border border-gray-200 dark:border-white/10 dark:bg-white/5 dark:text-white text-xs" />
                </div>
                <div className="space-y-1.5">
                  {w.tasks.map((t, ti) => (
                    <div key={ti} className="flex items-center gap-2">
                      <span className="flex-1 text-xs text-gray-700 dark:text-white/70">{t.title}</span>
                      <select value={t.type} onChange={(e) => updateTaskType(wi, ti, e.target.value as PlannerTaskType)}
                        className="h-7 px-1.5 rounded-md border border-gray-200 dark:border-white/10 dark:bg-white/5 dark:text-white text-[11px]">
                        {TASK_TYPES.map((t2) => <option key={t2} value={t2}>{labelize(t2)}</option>)}
                      </select>
                      <button type="button" onClick={() => removeTask(wi, ti)} className="text-gray-300 hover:text-red-500 shrink-0">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <button
              type="button" onClick={handleConfirm} disabled={confirm.isPending}
              className="w-full h-11 rounded-xl bg-[#1C2B4A] text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {confirm.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Save planner ({weeks.length} week(s))
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
