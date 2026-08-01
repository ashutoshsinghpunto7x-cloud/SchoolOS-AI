import { Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TemplateSubjectRow, SubjectEvaluationType } from '@schoolos/types';

const cellInputCls =
  'w-full h-10 px-2.5 rounded-lg border border-gray-200 text-sm text-gray-900 ' +
  'focus:outline-none focus:ring-2 focus:ring-[#A855F7]/20 focus:border-[#A855F7]';

const EVAL_TYPES: { value: SubjectEvaluationType; label: string }[] = [
  { value: 'marks', label: 'Marks' },
  { value: 'grade', label: 'Grade only' },
  { value: 'both', label: 'Marks + Grade' },
];

interface SubjectMarksEditorProps {
  subjects: TemplateSubjectRow[];
  onChange: (subjects: TemplateSubjectRow[]) => void;
}

export const SubjectMarksEditor = ({ subjects, onChange }: SubjectMarksEditorProps) => {
  const update = (index: number, patch: Partial<TemplateSubjectRow>) =>
    onChange(subjects.map((s, i) => (i === index ? { ...s, ...patch } : s)));

  const remove = (index: number) => onChange(subjects.filter((_, i) => i !== index));

  const add = () =>
    onChange([
      ...subjects,
      { name: '', evaluationType: 'marks', order: subjects.length, unitTestMaxMarks: 20, mainExamMaxMarks: 80 },
    ]);

  return (
    <div className="flex flex-col gap-3">
      {subjects.length > 0 && (
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-sm min-w-[680px]">
            <thead>
              <tr className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">
                <th className="px-1 py-2">Subject</th>
                <th className="px-1 py-2 w-40">Evaluation</th>
                <th className="px-1 py-2 w-28">Unit Test Max</th>
                <th className="px-1 py-2 w-28">Main Exam Max</th>
                <th className="px-1 py-2 w-10" />
              </tr>
            </thead>
            <tbody>
              {subjects.map((s, i) => (
                <tr key={s._id || `new-${i}`} className="border-t border-gray-50">
                  <td className="px-1 py-2">
                    <input
                      value={s.name}
                      onChange={(e) => update(i, { name: e.target.value })}
                      placeholder="e.g. Mathematics"
                      className={cellInputCls}
                    />
                  </td>
                  <td className="px-1 py-2">
                    <select
                      value={s.evaluationType}
                      onChange={(e) => update(i, { evaluationType: e.target.value as SubjectEvaluationType })}
                      className={cn(cellInputCls, 'cursor-pointer')}
                    >
                      {EVAL_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </td>
                  <td className="px-1 py-2">
                    <input
                      type="number" min={0} value={s.unitTestMaxMarks}
                      onChange={(e) => update(i, { unitTestMaxMarks: Number(e.target.value) })}
                      className={cn(cellInputCls, 'tabular-nums')}
                    />
                  </td>
                  <td className="px-1 py-2">
                    <input
                      type="number" min={0} value={s.mainExamMaxMarks}
                      onChange={(e) => update(i, { mainExamMaxMarks: Number(e.target.value) })}
                      className={cn(cellInputCls, 'tabular-nums')}
                    />
                  </td>
                  <td className="px-1 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => remove(i)}
                      className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                      aria-label="Remove subject"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <button
        type="button"
        onClick={add}
        className="inline-flex items-center gap-1.5 self-start h-9 px-3.5 rounded-xl border border-dashed border-gray-300 text-sm font-semibold text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-colors"
      >
        <Plus className="w-3.5 h-3.5" /> Add Subject
      </button>
    </div>
  );
};
