import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Camera, ImagePlus, X, Loader2, AlertTriangle, CheckCircle2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { marksApi } from '../api/marks.api';
import { marksKeys, useExtractTermMarksFromImage } from '../hooks/useMarks';
import type { Exam, TermExtractedRow, TermMarksExtractionResult } from '@schoolos/types';

interface Props {
  cls: string;
  section: string;
  subjectName: string;
  exams: Exam[];
  onClose: () => void;
}

type Step = 'pick-exams' | 'capture' | 'review';

// One combined register photo — Unit Test 1 + Unit Test 2 + Half Yearly
// columns for a single subject — fills all three underlying exams at once,
// instead of the single-exam "AI Fill" on the entry-table page which only
// ever touches whichever exam that page happens to be open on.
export function TermAiCaptureModal({ cls, section, subjectName, exams, onClose }: Props) {
  const [step, setStep] = useState<Step>('pick-exams');
  const [unitTest1ExamId, setUnitTest1ExamId] = useState('');
  const [unitTest2ExamId, setUnitTest2ExamId] = useState('');
  const [mainExamId, setMainExamId] = useState('');
  const [skill, setSkill] = useState('');
  const [result, setResult] = useState<TermMarksExtractionResult | null>(null);
  const [saving, setSaving] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const extractMutation = useExtractTermMarksFromImage();

  // Some subjects (typically in lower classes — e.g. English → Literature,
  // Writing, Reading, Dictation/Spelling) are split into skills, each
  // entered and stored as its own subjectName ("English - Literature") so a
  // report-card template row can pick it up individually. A skill-split
  // subject needs to know which skill this particular photo covers before
  // it can save anywhere — a plain subject (no configured skills) skips
  // this entirely and behaves exactly as before.
  const skillsForSubject = Array.from(new Set(
    exams.flatMap((e) => e.subjectConfigs?.find((c) => c.name === subjectName)?.skills ?? []),
  ));
  const effectiveSubjectName = skillsForSubject.length > 0 && skill ? `${subjectName} - ${skill}` : subjectName;

  const canContinue = !!unitTest1ExamId && !!unitTest2ExamId && !!mainExamId
    && new Set([unitTest1ExamId, unitTest2ExamId, mainExamId]).size === 3
    && (skillsForSubject.length === 0 || !!skill);

  async function handlePhotoSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const res = await extractMutation.mutateAsync({
        target: { class: cls, section, subjectName: effectiveSubjectName, unitTest1ExamId, unitTest2ExamId, mainExamId },
        file,
      });
      setResult(res);
      setStep('review');
    } catch (err) {
      toast.error('Could not read the photo', { description: err instanceof Error ? err.message : undefined });
    }
  }

  function editRow(studentId: string, field: keyof TermExtractedRow, value: number | undefined) {
    setResult((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        rows: prev.rows.map((r) => {
          if (r.studentId !== studentId) return r;
          const next = { ...r, [field]: value };
          // Keep Best/Total honest with a manual fix, same arithmetic the server applies.
          if (field === 'unitTest1' || field === 'unitTest2') {
            const a = field === 'unitTest1' ? value : next.unitTest1;
            const b = field === 'unitTest2' ? value : next.unitTest2;
            next.bestUnitTest = a !== undefined && b !== undefined ? Math.max(a, b) : (a ?? b);
          }
          if (next.bestUnitTest !== undefined && next.mainExam !== undefined) {
            next.total = next.bestUnitTest + next.mainExam;
          }
          return next;
        }),
      };
    });
  }

  async function handleSaveAll() {
    if (!result) return;
    const rowsToSave = result.rows.filter((r) => !r.absent);
    if (rowsToSave.length === 0) {
      toast.error('Nothing to save', { description: 'No student rows were read from the photo.' });
      return;
    }
    setSaving(true);
    try {
      const calls = [
        {
          examId: unitTest1ExamId,
          records: rowsToSave.filter((r) => r.unitTest1 !== undefined).map((r) => ({
            studentId: r.studentId,
            componentScores: [{ componentName: result.exams.unitTest1.componentName, score: r.unitTest1, status: 'present' as const }],
          })),
        },
        {
          examId: unitTest2ExamId,
          records: rowsToSave.filter((r) => r.unitTest2 !== undefined).map((r) => ({
            studentId: r.studentId,
            componentScores: [{ componentName: result.exams.unitTest2.componentName, score: r.unitTest2, status: 'present' as const }],
          })),
        },
        {
          examId: mainExamId,
          records: rowsToSave.filter((r) => r.mainExam !== undefined).map((r) => ({
            studentId: r.studentId,
            componentScores: [{ componentName: result.exams.mainExam.componentName, score: r.mainExam, status: 'present' as const }],
          })),
        },
      ];
      await Promise.all(
        calls
          .filter((c) => c.records.length > 0)
          .map((c) => marksApi.bulkUpsert({ examId: c.examId, class: cls, section, subjectName: effectiveSubjectName, records: c.records })),
      );
      await queryClient.invalidateQueries({ queryKey: marksKeys.all });
      toast.success('Marks saved', { description: `${rowsToSave.length} student(s) saved across Unit Test 1, Unit Test 2 and Half Yearly` });
      onClose();
    } catch (err) {
      toast.error('Could not save marks', { description: err instanceof Error ? err.message : 'Check your connection and try again.' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end lg:items-center justify-center" onClick={onClose}>
      <div
        className="bg-white dark:bg-[#0F0821] rounded-t-2xl lg:rounded-2xl w-full lg:max-w-lg max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-white/5">
          <div className="flex items-center gap-2">
            {step !== 'pick-exams' && (
              <button
                type="button"
                onClick={() => setStep(step === 'review' ? 'capture' : 'pick-exams')}
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-white/5"
              >
                <ArrowLeft className="w-4 h-4 text-gray-500 dark:text-white/50" />
              </button>
            )}
            <h2 className="text-sm font-bold text-gray-900 dark:text-white">AI Fill — Unit Tests + Half Yearly</h2>
          </div>
          <button type="button" onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-white/5">
            <X className="w-4 h-4 text-gray-500 dark:text-white/50" />
          </button>
        </div>

        {step === 'pick-exams' && (
          <div className="p-4 space-y-3">
            <p className="text-xs text-gray-500 dark:text-white/50">
              Pick the three exams this combined register covers. One photo will fill all three at once.
            </p>
            {skillsForSubject.length > 0 && (
              <label className="block">
                <span className="text-xs font-semibold text-gray-500 dark:text-white/40">
                  {subjectName} skill (this register is for)
                </span>
                <select
                  value={skill}
                  onChange={(e) => setSkill(e.target.value)}
                  className="mt-1 w-full h-10 px-2 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#A855F7]/30"
                >
                  <option value="">Select a skill…</option>
                  {skillsForSubject.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <span className="text-[11px] text-gray-400 dark:text-white/30 mt-1 block">
                  {subjectName} is split into skills here — each is entered and saved separately so it lands correctly on the report card. Repeat this AI Fill once per skill.
                </span>
              </label>
            )}
            {[
              { label: 'Unit Test 1 exam', value: unitTest1ExamId, set: setUnitTest1ExamId },
              { label: 'Unit Test 2 exam', value: unitTest2ExamId, set: setUnitTest2ExamId },
              { label: 'Half Yearly exam', value: mainExamId, set: setMainExamId },
            ].map(({ label, value, set }) => (
              <label key={label} className="block">
                <span className="text-xs font-semibold text-gray-500 dark:text-white/40">{label}</span>
                <select
                  value={value}
                  onChange={(e) => set(e.target.value)}
                  className="mt-1 w-full h-10 px-2 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#A855F7]/30"
                >
                  <option value="">Select an exam…</option>
                  {exams.map((e) => <option key={e._id} value={e._id}>{e.name}</option>)}
                </select>
              </label>
            ))}
            <button
              type="button"
              onClick={() => setStep('capture')}
              disabled={!canContinue}
              className="w-full h-10 rounded-xl bg-gradient-to-r from-violet-600 to-pink-500 text-white text-xs font-bold disabled:opacity-40"
            >
              Continue
            </button>
          </div>
        )}

        {step === 'capture' && (
          <div className="p-4">
            {extractMutation.isPending ? (
              <div className="w-full h-32 rounded-xl border-2 border-dashed border-gray-200 dark:border-white/10 flex flex-col items-center justify-center gap-2 text-gray-500 dark:text-white/50">
                <Loader2 className="w-6 h-6 animate-spin" />
                <span className="text-xs font-semibold px-4 text-center">Reading photo…</span>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="h-28 rounded-xl border-2 border-dashed border-gray-200 dark:border-white/10 flex flex-col items-center justify-center gap-2 text-gray-500 dark:text-white/50"
                >
                  <Camera className="w-6 h-6" />
                  <span className="text-xs font-semibold px-2 text-center">Take Photo</span>
                </button>
                <button
                  type="button"
                  onClick={() => uploadInputRef.current?.click()}
                  className="h-28 rounded-xl border-2 border-dashed border-gray-200 dark:border-white/10 flex flex-col items-center justify-center gap-2 text-gray-500 dark:text-white/50"
                >
                  <ImagePlus className="w-6 h-6" />
                  <span className="text-xs font-semibold px-2 text-center">Upload Photo</span>
                </button>
              </div>
            )}
            <p className="text-[11px] text-gray-400 dark:text-white/30 text-center mt-2">Combined register covering all three exams</p>
            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoSelected} />
            <input ref={uploadInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoSelected} />
          </div>
        )}

        {step === 'review' && result && (
          <div className="p-4 space-y-3">
            <p className="text-xs font-semibold text-violet-600 dark:text-violet-300 uppercase tracking-wide">{effectiveSubjectName}</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              {result.rows.length} student{result.rows.length === 1 ? '' : 's'} read — review before saving
            </p>
            <div className="space-y-1.5 max-h-[40vh] overflow-y-auto">
              {result.rows.map((row) => (
                <div key={row.studentId} className="flex items-center justify-between gap-2 text-xs bg-emerald-50 dark:bg-emerald-500/10 rounded-lg px-2.5 py-1.5">
                  <span className="flex items-center gap-1.5 text-gray-700 dark:text-white/80 font-medium truncate min-w-0 w-24 shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span className="truncate">{row.fullName}</span>
                  </span>
                  {row.absent ? (
                    <span className="text-[10px] font-semibold text-gray-400">Absent</span>
                  ) : (
                    <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                      {([
                        ['unitTest1', 'UT1'],
                        ['unitTest2', 'UT2'],
                        ['mainExam', 'Half Yr'],
                      ] as const).map(([field, label]) => (
                        <label key={field} className="flex items-center gap-1">
                          <span className="text-[9px] text-gray-400 dark:text-white/40">{label}</span>
                          <input
                            type="number"
                            inputMode="decimal"
                            value={row[field] ?? ''}
                            onChange={(e) => editRow(row.studentId, field, e.target.value === '' ? undefined : Number(e.target.value))}
                            className="w-11 h-6 px-1 rounded border border-gray-200 dark:border-white/10 bg-white dark:bg-white/10 text-[11px] text-center text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#A855F7]/30"
                          />
                        </label>
                      ))}
                      <span className="flex items-center gap-1">
                        <span className="text-[9px] text-gray-400 dark:text-white/40">Best</span>
                        <span className="w-9 text-[11px] text-center font-semibold text-gray-600 dark:text-white/60">{row.bestUnitTest ?? '—'}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="text-[9px] text-gray-400 dark:text-white/40">Total</span>
                        <span className="w-9 text-[11px] text-center font-semibold text-gray-600 dark:text-white/60">{row.total ?? '—'}</span>
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
            {result.warnings.length > 0 && (
              <div className="space-y-1 max-h-24 overflow-y-auto">
                {result.warnings.map((w, i) => (
                  <p key={i} className="text-xs text-amber-600 dark:text-amber-400 flex items-start gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" /> {w}
                  </p>
                ))}
              </div>
            )}
            {result.unmatched.length > 0 && (
              <div className="bg-amber-50 dark:bg-amber-500/10 rounded-lg p-3">
                <p className="text-xs font-semibold text-amber-700 dark:text-amber-300 mb-1">
                  Couldn&apos;t match {result.unmatched.length} entr{result.unmatched.length === 1 ? 'y' : 'ies'} to a student — enter these by hand:
                </p>
                {result.unmatched.map((u, i) => (
                  <p key={i} className="text-xs text-amber-600 dark:text-amber-400/80">
                    {u.rawName ?? u.rawRollNumber ?? 'Unknown'} — {Object.entries(u.scores).map(([k, v]) => `${k}: ${v}`).join(', ') || 'no scores read'}
                  </p>
                ))}
              </div>
            )}
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => { setResult(null); setStep('capture'); }} className="flex-1 h-10 rounded-xl border border-gray-200 dark:border-white/10 text-xs font-semibold text-gray-600 dark:text-white/60">
                Retry
              </button>
              <button
                type="button"
                onClick={handleSaveAll}
                disabled={saving || result.rows.length === 0}
                className={cn('flex-1 h-10 rounded-xl bg-gradient-to-r from-violet-600 to-pink-500 text-white text-xs font-bold disabled:opacity-40 flex items-center justify-center gap-1.5')}
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                Save All 3 Exams
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
