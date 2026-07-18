import { Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ExamComponent } from '@schoolos/types';

// Repeatable-row editors follow the local-array-state + inline add/remove
// pattern used by FeeStructureBuilderPage's collection-schedule table rather
// than react-hook-form's useFieldArray, matching this codebase's existing
// convention for structured array fields (no useFieldArray usage anywhere).

const cellInputCls =
  'w-full h-10 px-2.5 rounded-lg border border-gray-200 text-sm text-gray-900 ' +
  'focus:outline-none focus:ring-2 focus:ring-[#A855F7]/20 focus:border-[#A855F7]';

interface ExamComponentsEditorProps {
  components: ExamComponent[];
  onChange: (components: ExamComponent[]) => void;
}

export const ExamComponentsEditor = ({ components, onChange }: ExamComponentsEditorProps) => {
  const update = (index: number, patch: Partial<ExamComponent>) =>
    onChange(components.map((c, i) => (i === index ? { ...c, ...patch } : c)));

  const remove = (index: number) => onChange(components.filter((_, i) => i !== index));

  const add = () => onChange([...components, { name: '', maxMarks: 100 }]);

  return (
    <div className="flex flex-col gap-3">
      {components.length > 0 && (
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-sm min-w-[560px]">
            <thead>
              <tr className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">
                <th className="px-1 py-2">Component</th>
                <th className="px-1 py-2 w-28">Max Marks</th>
                <th className="px-1 py-2 w-28">Pass Marks</th>
                <th className="px-1 py-2 w-24">Weight %</th>
                <th className="px-1 py-2 w-10" />
              </tr>
            </thead>
            <tbody>
              {components.map((c, i) => (
                <tr key={i} className="border-t border-gray-50">
                  <td className="px-1 py-2">
                    <input
                      value={c.name}
                      onChange={(e) => update(i, { name: e.target.value })}
                      placeholder="e.g. Theory"
                      className={cellInputCls}
                    />
                  </td>
                  <td className="px-1 py-2">
                    <input
                      type="number" min={1} value={c.maxMarks}
                      onChange={(e) => update(i, { maxMarks: Number(e.target.value) })}
                      className={cn(cellInputCls, 'tabular-nums')}
                    />
                  </td>
                  <td className="px-1 py-2">
                    <input
                      type="number" min={0} value={c.passMarks ?? ''}
                      onChange={(e) => update(i, { passMarks: e.target.value === '' ? undefined : Number(e.target.value) })}
                      placeholder="Optional"
                      className={cn(cellInputCls, 'tabular-nums')}
                    />
                  </td>
                  <td className="px-1 py-2">
                    <input
                      type="number" min={0} max={100} value={c.weight ?? ''}
                      onChange={(e) => update(i, { weight: e.target.value === '' ? undefined : Number(e.target.value) })}
                      placeholder="Optional"
                      className={cn(cellInputCls, 'tabular-nums')}
                    />
                  </td>
                  <td className="px-1 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => remove(i)}
                      className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                      aria-label="Remove component"
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
        <Plus className="w-3.5 h-3.5" /> Add Component
      </button>
    </div>
  );
};
