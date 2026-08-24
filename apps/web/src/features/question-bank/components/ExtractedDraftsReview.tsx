import { Loader2, Trash2, CheckCircle2, AlertTriangle } from 'lucide-react';
import type { ExtractedQuestionDraft, QuestionType, QuestionDifficulty, BloomsLevel } from '@schoolos/types';
import { OptionsEditor } from './OptionsEditor';
import { QUESTION_TYPES, DIFFICULTIES, BLOOMS_LEVELS, labelize, needsCorrectAnswerField } from '../lib/questionTypeMeta';

export type DraftEdit = Omit<ExtractedQuestionDraft, 'marks' | 'estimatedTimeMinutes'> & {
  marks: number | '';
  estimatedTimeMinutes: number | '';
};

interface ExtractedDraftsReviewProps {
  drafts: DraftEdit[];
  warnings: string[];
  onUpdateDraft: (index: number, patch: Partial<DraftEdit>) => void;
  onRemoveDraft: (index: number) => void;
  onConfirm: () => void;
  confirming: boolean;
}

/** Editable review list for AI-extracted question drafts, shared between the upload flow and the "generate from stored text" flow — nothing is saved to the bank until onConfirm runs. */
export function ExtractedDraftsReview({ drafts, warnings, onUpdateDraft, onRemoveDraft, onConfirm, confirming }: ExtractedDraftsReviewProps) {
  const hasInvalidMcq = drafts.some((d) => d.questionType === 'mcq' && (d.options ?? []).filter((o) => o.trim()).length < 2);

  return (
    <div className="space-y-3">
      {warnings.length > 0 && (
        <div className="rounded-xl p-3.5 bg-amber-50 border border-amber-200 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <ul className="text-xs text-amber-700 list-disc pl-4 space-y-0.5">
            {warnings.map((w, i) => <li key={i}>{w}</li>)}
          </ul>
        </div>
      )}

      {drafts.length > 0 && (
        <>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Review before saving — {drafts.length} question(s)</p>
          {drafts.map((d, i) => (
            <div key={i} className="bg-white dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/10 p-4 space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <textarea
                  value={d.questionText}
                  onChange={(e) => onUpdateDraft(i, { questionText: e.target.value })}
                  rows={2}
                  className="flex-1 text-sm text-gray-800 dark:text-white/80 border border-gray-200 dark:border-white/10 dark:bg-transparent rounded-lg p-2 resize-none"
                />
                <button type="button" onClick={() => onRemoveDraft(i)} className="text-gray-300 hover:text-red-500 shrink-0 mt-1">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <select value={d.questionType} onChange={(e) => onUpdateDraft(i, { questionType: e.target.value as QuestionType })}
                  className="h-8 px-2 rounded-lg border border-gray-200 dark:border-white/10 dark:bg-white/5 dark:text-white text-xs">
                  {QUESTION_TYPES.map((t) => <option key={t} value={t}>{labelize(t)}</option>)}
                </select>
                <select value={d.difficulty} onChange={(e) => onUpdateDraft(i, { difficulty: e.target.value as QuestionDifficulty })}
                  className="h-8 px-2 rounded-lg border border-gray-200 dark:border-white/10 dark:bg-white/5 dark:text-white text-xs">
                  {DIFFICULTIES.map((t) => <option key={t} value={t}>{labelize(t)}</option>)}
                </select>
                <select value={d.bloomsLevel} onChange={(e) => onUpdateDraft(i, { bloomsLevel: e.target.value as BloomsLevel })}
                  className="h-8 px-2 rounded-lg border border-gray-200 dark:border-white/10 dark:bg-white/5 dark:text-white text-xs">
                  {BLOOMS_LEVELS.map((t) => <option key={t} value={t}>{labelize(t)}</option>)}
                </select>
                <input type="number" min={0} value={d.marks} onChange={(e) => onUpdateDraft(i, { marks: e.target.value === '' ? '' : Number(e.target.value) })}
                  placeholder="Marks" className="h-8 px-2 rounded-lg border border-gray-200 dark:border-white/10 dark:bg-white/5 dark:text-white text-xs" />
                <input type="number" min={0} value={d.estimatedTimeMinutes} onChange={(e) => onUpdateDraft(i, { estimatedTimeMinutes: e.target.value === '' ? '' : Number(e.target.value) })}
                  placeholder="Minutes" className="h-8 px-2 rounded-lg border border-gray-200 dark:border-white/10 dark:bg-white/5 dark:text-white text-xs" />
                <input value={d.chapterName} onChange={(e) => onUpdateDraft(i, { chapterName: e.target.value })}
                  placeholder="Chapter" className="h-8 px-2 rounded-lg border border-gray-200 dark:border-white/10 dark:bg-white/5 dark:text-white text-xs col-span-2" />
                <input value={d.topic ?? ''} onChange={(e) => onUpdateDraft(i, { topic: e.target.value })}
                  placeholder="Topic" className="h-8 px-2 rounded-lg border border-gray-200 dark:border-white/10 dark:bg-white/5 dark:text-white text-xs" />
              </div>

              {d.questionType === 'mcq' && (
                <OptionsEditor
                  options={d.options ?? []}
                  correctAnswer={d.correctAnswer ?? ''}
                  onChange={(options, correctAnswer) => onUpdateDraft(i, { options, correctAnswer })}
                />
              )}

              {needsCorrectAnswerField(d.questionType) && (
                <div>
                  <label className="text-[11px] font-semibold text-gray-400">Correct answer</label>
                  <input
                    value={d.correctAnswer ?? ''} onChange={(e) => onUpdateDraft(i, { correctAnswer: e.target.value })}
                    placeholder={d.questionType === 'true_false' ? 'True or False' : 'Correct answer'}
                    className="mt-0.5 w-full h-8 px-2 rounded-lg border border-gray-200 dark:border-white/10 dark:bg-white/5 dark:text-white text-xs"
                  />
                </div>
              )}
            </div>
          ))}

          <button
            type="button" onClick={onConfirm} disabled={confirming || hasInvalidMcq}
            title={hasInvalidMcq ? 'Fix the MCQ question(s) missing 2+ options first' : undefined}
            className="w-full h-11 rounded-xl bg-[#1C2B4A] text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {confirming ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Save {drafts.length} question(s) to the bank
          </button>
        </>
      )}
    </div>
  );
}
