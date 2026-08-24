import { Plus, X } from 'lucide-react';

/** Editable option list + correct-answer picker for an mcq question — shared between the AI-draft
 * review screen (ExtractedDraftsReview) and the saved-question edit form (QuestionChapterPage), the
 * only two places in the app a teacher can see/fix what an MCQ actually contains. */
export function OptionsEditor({ options, correctAnswer, onChange }: {
  options: string[];
  correctAnswer: string;
  onChange: (options: string[], correctAnswer: string) => void;
}) {
  function updateOption(index: number, value: string) {
    const prev = options[index];
    const next = options.map((o, i) => (i === index ? value : o));
    // If the correct answer was pointing at the option text being edited, keep it in sync.
    onChange(next, correctAnswer === prev ? value : correctAnswer);
  }

  function removeOption(index: number) {
    const removed = options[index];
    onChange(options.filter((_, i) => i !== index), correctAnswer === removed ? '' : correctAnswer);
  }

  const nonEmptyCount = options.filter((o) => o.trim()).length;

  return (
    <div>
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-semibold text-gray-400">Options — tap one to mark it correct</label>
        <button type="button" onClick={() => onChange([...options, ''], correctAnswer)} className="text-[11px] font-semibold text-[#6D4AFF] flex items-center gap-0.5">
          <Plus className="w-3 h-3" /> Add option
        </button>
      </div>
      {nonEmptyCount < 2 && (
        <p className="text-[11px] text-red-500 mt-1">Needs at least 2 options — this can't be saved yet.</p>
      )}
      <div className="space-y-1.5 mt-1">
        {options.map((opt, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <button
              type="button" onClick={() => onChange(options, opt)}
              title="Mark as the correct answer"
              className={`shrink-0 w-6 h-6 rounded-full border text-[10px] font-bold flex items-center justify-center ${
                opt.trim() && correctAnswer === opt
                  ? 'bg-emerald-500 border-emerald-500 text-white'
                  : 'bg-white dark:bg-transparent border-gray-300 dark:border-white/20 text-gray-400'
              }`}
            >
              {String.fromCharCode(97 + i)}
            </button>
            <input
              value={opt} onChange={(e) => updateOption(i, e.target.value)}
              placeholder={`Option ${String.fromCharCode(97 + i)}`}
              className="flex-1 h-8 px-2 rounded-lg border border-gray-200 dark:border-white/10 dark:bg-white/5 dark:text-white text-xs"
            />
            <button type="button" onClick={() => removeOption(i)} className="text-gray-300 hover:text-red-500 shrink-0">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
