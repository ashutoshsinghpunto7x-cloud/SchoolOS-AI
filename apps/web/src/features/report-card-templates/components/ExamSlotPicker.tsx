import { cn } from '@/lib/utils';
import { useExamsForClass } from '@/features/marks/hooks/useExams';
import type { TemplateExamSlot, TemplateExamSlots } from '@schoolos/types';

const inputCls =
  'w-full h-10 px-3 rounded-lg border border-gray-200 text-sm text-gray-900 ' +
  'focus:outline-none focus:ring-2 focus:ring-[#A855F7]/20 focus:border-[#A855F7]';

const selectCls = cn(inputCls, 'cursor-pointer');

interface ExamSlotPickerProps {
  cls: string;
  examSlots: TemplateExamSlots;
  onChange: (examSlots: TemplateExamSlots) => void;
}

function TermSlot({ title, cls, slot, mainLabel, onChange }: {
  title: string; cls: string; slot: TemplateExamSlot; mainLabel: string; onChange: (slot: TemplateExamSlot) => void;
}) {
  const { data: exams } = useExamsForClass(cls);

  const update = (patch: Partial<TemplateExamSlot>) => onChange({ ...slot, ...patch });

  return (
    <div className="rounded-xl border border-gray-200 p-4">
      <h4 className="text-sm font-bold text-gray-800 mb-3">{title}</h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-semibold text-gray-500 block mb-1.5">Unit Test 1</label>
          <select value={slot.unitTest1ExamId ?? ''} onChange={(e) => update({ unitTest1ExamId: e.target.value || undefined })} className={selectCls} disabled={!cls}>
            <option value="">— Not mapped —</option>
            {(exams ?? []).map((ex) => <option key={ex._id} value={ex._id}>{ex.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 block mb-1.5">Unit Test 2</label>
          <select value={slot.unitTest2ExamId ?? ''} onChange={(e) => update({ unitTest2ExamId: e.target.value || undefined })} className={selectCls} disabled={!cls}>
            <option value="">— Not mapped —</option>
            {(exams ?? []).map((ex) => <option key={ex._id} value={ex._id}>{ex.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 block mb-1.5">{mainLabel}</label>
          <select value={slot.mainExamId ?? ''} onChange={(e) => update({ mainExamId: e.target.value || undefined })} className={selectCls} disabled={!cls}>
            <option value="">— Not mapped —</option>
            {(exams ?? []).map((ex) => <option key={ex._id} value={ex._id}>{ex.name}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1.5">Term Start</label>
            <input type="date" value={slot.startDate ?? ''} onChange={(e) => update({ startDate: e.target.value || undefined })} className={inputCls} />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1.5">Term End</label>
            <input type="date" value={slot.endDate ?? ''} onChange={(e) => update({ endDate: e.target.value || undefined })} className={inputCls} />
          </div>
        </div>
      </div>
      <p className="text-xs text-gray-400 mt-3">
        The report card takes the best of Unit Test 1 and Unit Test 2 for each subject. Term start/end dates drive the attendance count shown on the card.
      </p>
    </div>
  );
}

export const ExamSlotPicker = ({ cls, examSlots, onChange }: ExamSlotPickerProps) => {
  if (!cls) {
    return <p className="text-sm text-gray-400">Set the class for this template first.</p>;
  }

  return (
    <div className="flex flex-col gap-5">
      <TermSlot
        title="First Term"
        cls={cls}
        slot={examSlots.firstTerm}
        mainLabel="Half Yearly"
        onChange={(slot) => onChange({ ...examSlots, firstTerm: slot })}
      />
      <TermSlot
        title="Final Term"
        cls={cls}
        slot={examSlots.finalTerm}
        mainLabel="Annual"
        onChange={(slot) => onChange({ ...examSlots, finalTerm: slot })}
      />
    </div>
  );
};
