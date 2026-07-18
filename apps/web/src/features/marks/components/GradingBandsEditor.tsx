import { Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { GradeBand } from '@schoolos/types';

const cellInputCls =
  'w-full h-10 px-2.5 rounded-lg border border-gray-200 text-sm text-gray-900 ' +
  'focus:outline-none focus:ring-2 focus:ring-[#A855F7]/20 focus:border-[#A855F7]';

interface GradingBandsEditorProps {
  bands: GradeBand[];
  onChange: (bands: GradeBand[]) => void;
}

export const GradingBandsEditor = ({ bands, onChange }: GradingBandsEditorProps) => {
  const update = (index: number, patch: Partial<GradeBand>) =>
    onChange(bands.map((b, i) => (i === index ? { ...b, ...patch } : b)));

  const remove = (index: number) => onChange(bands.filter((_, i) => i !== index));

  const add = () => onChange([...bands, { label: '', minPercent: 0, maxPercent: 100 }]);

  return (
    <div className="flex flex-col gap-3">
      {bands.length > 0 && (
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-sm min-w-[420px]">
            <thead>
              <tr className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">
                <th className="px-1 py-2 w-28">Grade</th>
                <th className="px-1 py-2">Min %</th>
                <th className="px-1 py-2">Max %</th>
                <th className="px-1 py-2 w-10" />
              </tr>
            </thead>
            <tbody>
              {bands.map((b, i) => (
                <tr key={i} className="border-t border-gray-50">
                  <td className="px-1 py-2">
                    <input
                      value={b.label}
                      onChange={(e) => update(i, { label: e.target.value })}
                      placeholder="e.g. A"
                      className={cellInputCls}
                    />
                  </td>
                  <td className="px-1 py-2">
                    <input
                      type="number" min={0} max={100} step={0.01} value={b.minPercent}
                      onChange={(e) => update(i, { minPercent: Number(e.target.value) })}
                      className={cn(cellInputCls, 'tabular-nums')}
                    />
                  </td>
                  <td className="px-1 py-2">
                    <input
                      type="number" min={0} max={100} step={0.01} value={b.maxPercent}
                      onChange={(e) => update(i, { maxPercent: Number(e.target.value) })}
                      className={cn(cellInputCls, 'tabular-nums')}
                    />
                  </td>
                  <td className="px-1 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => remove(i)}
                      className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                      aria-label="Remove grade band"
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
        <Plus className="w-3.5 h-3.5" /> Add Grade Band
      </button>
    </div>
  );
};
