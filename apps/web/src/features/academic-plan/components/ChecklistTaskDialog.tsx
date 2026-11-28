import { useState } from 'react';
import { toast } from 'sonner';
import { X } from 'lucide-react';
import { useAddPlanDay, useEditChecklistDay } from '../hooks/useAcademicPlan';
import type { AcademicPlanChecklistItem } from '@schoolos/types';

export interface PlanChoice { planId: string; label: string }

const field = 'w-full rounded-xl border border-[#E8E2D6] dark:border-white/15 bg-white dark:bg-white/5 px-3 py-2.5 text-[14px] text-[#1B2A4E] dark:text-white outline-none focus:border-[#1B2A4E]';
const labelCls = 'block text-[13px] font-semibold text-[#1B2A4E] dark:text-white mb-1';

/** Add a new task (item = undefined) or edit an existing lesson of the checklist. */
export function ChecklistTaskDialog({
  item, plans, defaultDate, onClose,
}: {
  item?: AcademicPlanChecklistItem;
  plans: PlanChoice[];
  defaultDate: string;
  onClose: () => void;
}) {
  const add = useAddPlanDay();
  const edit = useEditChecklistDay();
  const [planId, setPlanId] = useState(item?.planId ?? plans[0]?.planId ?? '');
  const [date, setDate] = useState(item?.dateKey ?? defaultDate);
  const [title, setTitle] = useState(item ? (item.topicTitle ?? item.chapterName ?? '') : '');
  const [classWork, setClassWork] = useState(item?.classWork ?? '');
  const [homeWork, setHomeWork] = useState(item?.homeWork ?? '');
  const busy = add.isPending || edit.isPending;

  async function save() {
    if (!title.trim()) { toast.error('Please give the task a title'); return; }
    try {
      if (item) {
        await edit.mutateAsync({ planId: item.planId, payload: {
          date: item.date, topicTitle: title.trim(), classWork: classWork.trim(), homeWork: homeWork.trim(),
        } });
        toast.success('Task updated');
      } else {
        if (!planId) { toast.error('Choose a class'); return; }
        await add.mutateAsync({ planId, payload: {
          date: `${date}T00:00:00.000Z`, topicTitle: title.trim(), classWork: classWork.trim() || undefined, homeWork: homeWork.trim() || undefined,
        } });
        toast.success('Task added');
      }
      onClose();
    } catch (err) {
      toast.error('Could not save', { description: err instanceof Error ? err.message : undefined });
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#161b2e] p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[16px] font-bold text-[#1B2A4E] dark:text-white">{item ? 'Edit task' : 'Add a task'}</h3>
          <button type="button" onClick={onClose} aria-label="Close" className="p-1 cursor-pointer"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-3">
          {!item && (
            <>
              <div>
                <label className={labelCls}>Class</label>
                <select className={field} value={planId} onChange={(e) => setPlanId(e.target.value)}>
                  {plans.map((p) => <option key={p.planId} value={p.planId}>{p.label}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Date</label>
                <input type="date" className={field} value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
            </>
          )}
          <div>
            <label className={labelCls}>What are you teaching?</label>
            <input className={field} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Fractions — word problems" autoFocus />
          </div>
          <div>
            <label className={labelCls}>Class-work</label>
            <textarea className={field} rows={2} value={classWork} onChange={(e) => setClassWork(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Home-work</label>
            <textarea className={field} rows={2} value={homeWork} onChange={(e) => setHomeWork(e.target.value)} />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button type="button" onClick={onClose} className="h-11 px-5 rounded-xl text-[14px] font-semibold text-[#55607A] cursor-pointer">Cancel</button>
          <button type="button" onClick={() => void save()} disabled={busy}
            className="h-11 px-6 rounded-xl bg-[#1B2A4E] text-white text-[14px] font-bold cursor-pointer disabled:opacity-60">
            {busy ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
