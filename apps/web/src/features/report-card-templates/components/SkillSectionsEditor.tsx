import { Plus, Trash2, GripVertical } from 'lucide-react';
import type { TemplateSkillSection } from '@schoolos/types';

const inputCls =
  'w-full h-10 px-3 rounded-lg border border-gray-200 text-sm text-gray-900 ' +
  'focus:outline-none focus:ring-2 focus:ring-[#A855F7]/20 focus:border-[#A855F7]';

interface SkillSectionsEditorProps {
  sections: TemplateSkillSection[];
  onChange: (sections: TemplateSkillSection[]) => void;
}

export const SkillSectionsEditor = ({ sections, onChange }: SkillSectionsEditorProps) => {
  const updateSection = (index: number, patch: Partial<TemplateSkillSection>) =>
    onChange(sections.map((s, i) => (i === index ? { ...s, ...patch } : s)));

  const removeSection = (index: number) => onChange(sections.filter((_, i) => i !== index));

  const addSection = () =>
    onChange([...sections, { name: '', order: sections.length, rows: [] }]);

  const addRow = (sectionIndex: number) => {
    const section = sections[sectionIndex];
    updateSection(sectionIndex, { rows: [...section.rows, { label: '', order: section.rows.length }] });
  };

  const updateRow = (sectionIndex: number, rowIndex: number, label: string) => {
    const section = sections[sectionIndex];
    updateSection(sectionIndex, {
      rows: section.rows.map((r, i) => (i === rowIndex ? { ...r, label } : r)),
    });
  };

  const removeRow = (sectionIndex: number, rowIndex: number) => {
    const section = sections[sectionIndex];
    updateSection(sectionIndex, { rows: section.rows.filter((_, i) => i !== rowIndex) });
  };

  return (
    <div className="flex flex-col gap-5">
      {sections.map((section, si) => (
        <div key={section._id || `new-${si}`} className="rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 bg-gray-50/60 border-b border-gray-100">
            <GripVertical className="w-4 h-4 text-gray-300 shrink-0" />
            <input
              value={section.name}
              onChange={(e) => updateSection(si, { name: e.target.value })}
              placeholder="Section name — e.g. English Language Skills"
              className={inputCls}
            />
            <button
              type="button"
              onClick={() => removeSection(si)}
              className="w-9 h-9 shrink-0 inline-flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
              aria-label="Remove section"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4 flex flex-col gap-2">
            {section.rows.map((row, ri) => (
              <div key={row._id || `new-${ri}`} className="flex items-center gap-2">
                <input
                  value={row.label}
                  onChange={(e) => updateRow(si, ri, e.target.value)}
                  placeholder="e.g. Speaks in complete sentences"
                  className={inputCls}
                />
                <button
                  type="button"
                  onClick={() => removeRow(si, ri)}
                  className="w-9 h-9 shrink-0 inline-flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                  aria-label="Remove row"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}

            <button
              type="button"
              onClick={() => addRow(si)}
              className="inline-flex items-center gap-1.5 self-start h-8 px-3 rounded-lg border border-dashed border-gray-300 text-xs font-semibold text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-colors mt-1"
            >
              <Plus className="w-3 h-3" /> Add Row
            </button>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={addSection}
        className="inline-flex items-center gap-1.5 self-start h-9 px-3.5 rounded-xl border border-dashed border-gray-300 text-sm font-semibold text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-colors"
      >
        <Plus className="w-3.5 h-3.5" /> Add Section
      </button>
    </div>
  );
};
