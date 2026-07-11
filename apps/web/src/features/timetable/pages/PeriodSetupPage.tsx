import { useState } from 'react';
import { ArrowLeft, Plus, Pencil, Trash2, Loader2, GripVertical, X, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePeriodSlots, useCreatePeriodSlot, useUpdatePeriodSlot, useDeletePeriodSlot } from '../hooks/useTimetable';
import type { PeriodSlot, CreatePeriodSlotPayload } from '@schoolos/types';

const inputCls = `h-10 w-full rounded-xl border border-gray-200 px-3 text-sm
  focus:outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/20 bg-white`;

const DAYS = [
  { value: 1, label: 'Mon' }, { value: 2, label: 'Tue' }, { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' }, { value: 5, label: 'Fri' }, { value: 6, label: 'Sat' },
];

const EMPTY_FORM: CreatePeriodSlotPayload = {
  name: '', orderIndex: 0, startTime: '', endTime: '',
  isBreak: false, daysApplicable: [1, 2, 3, 4, 5],
};

interface SlotFormProps {
  initial?: Partial<CreatePeriodSlotPayload>;
  onSave: (data: CreatePeriodSlotPayload) => void;
  onCancel: () => void;
  isPending: boolean;
}

const SlotForm = ({ initial = {}, onSave, onCancel, isPending }: SlotFormProps) => {
  const [form, setForm] = useState<CreatePeriodSlotPayload>({ ...EMPTY_FORM, ...initial });

  const set = (k: keyof CreatePeriodSlotPayload) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((p) => ({ ...p, [k]: e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value }));

  function toggleDay(day: number) {
    setForm((p) => ({
      ...p,
      daysApplicable: p.daysApplicable?.includes(day)
        ? p.daysApplicable.filter((d) => d !== day)
        : [...(p.daysApplicable ?? []), day].sort(),
    }));
  }

  return (
    <div className="p-4 bg-[#A855F7]/10/50 rounded-xl border border-[#A855F7]/20 flex flex-col gap-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="sm:col-span-2 flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-600">Name *</label>
          <input value={form.name} onChange={set('name')} className={inputCls} placeholder="e.g. Period 1" required />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-600">Start *</label>
          <input type="time" value={form.startTime} onChange={set('startTime')} className={inputCls} required />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-600">End *</label>
          <input type="time" value={form.endTime} onChange={set('endTime')} className={inputCls} required />
        </div>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            checked={form.isBreak}
            onChange={(e) => setForm((p) => ({ ...p, isBreak: e.target.checked }))}
            className="w-4 h-4 rounded border-gray-300 text-[#5B21B6]"
          />
          Break Period
        </label>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-500">Days:</span>
          {DAYS.map((d) => (
            <button
              key={d.value}
              type="button"
              onClick={() => toggleDay(d.value)}
              className={`h-7 w-9 rounded-lg text-xs font-bold border transition-colors ${
                form.daysApplicable?.includes(d.value)
                  ? 'bg-[#5B21B6] text-white border-[#5B21B6]'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-[#7C3AED]'
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel}
          className="h-9 px-4 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50">
          <X className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => form.name.trim() && form.startTime && form.endTime && onSave(form)}
          disabled={isPending || !form.name.trim() || !form.startTime || !form.endTime}
          className="h-9 px-4 rounded-xl bg-[#5B21B6] hover:bg-[#4C1D95] flex items-center gap-1.5 text-sm font-bold text-white disabled:opacity-50"
        >
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          Save
        </button>
      </div>
    </div>
  );
};

const SlotRow = ({ slot, index }: { slot: PeriodSlot; index: number }) => {
  const [editing, setEditing]       = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const { mutate: update, isPending: upPending }  = useUpdatePeriodSlot(slot._id);
  const { mutate: remove, isPending: delPending } = useDeletePeriodSlot(slot._id);

  return (
    <div className="flex flex-col gap-2">
      {editing ? (
        <SlotForm
          initial={{ name: slot.name, startTime: slot.startTime, endTime: slot.endTime, isBreak: slot.isBreak, daysApplicable: slot.daysApplicable }}
          onSave={(data) => update(data, { onSuccess: () => setEditing(false) })}
          onCancel={() => setEditing(false)}
          isPending={upPending}
        />
      ) : (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${slot.isBreak ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-100'}`}>
          <GripVertical className="w-4 h-4 text-gray-300 flex-shrink-0" />
          <span className="w-6 text-xs font-bold text-gray-400">{index + 1}</span>
          <div className="flex-1 min-w-0">
            <span className="text-sm font-bold text-gray-800">{slot.name}</span>
            {slot.isBreak && <span className="ml-2 text-xs text-amber-600 font-semibold">Break</span>}
          </div>
          <span className="text-sm text-gray-500 tabular-nums">{slot.startTime} – {slot.endTime}</span>
          <div className="flex gap-1 ml-2">
            {!confirmDel ? (
              <>
                <button type="button" onClick={() => setEditing(true)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-[#5B21B6] hover:bg-[#A855F7]/10 transition-colors">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button type="button" onClick={() => setConfirmDel(true)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </>
            ) : (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-red-600 font-medium">Delete?</span>
                <button type="button" onClick={() => remove()} disabled={delPending}
                  className="text-xs font-bold text-red-600 hover:text-red-800 disabled:opacity-50">Yes</button>
                <button type="button" onClick={() => setConfirmDel(false)}
                  className="text-xs font-bold text-gray-400 hover:text-gray-700">No</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export const PeriodSetupPage = () => {
  const navigate = useNavigate();
  const { data: slots = [], isLoading } = usePeriodSlots();
  const { mutate: create, isPending: creating }   = useCreatePeriodSlot();
  const [adding, setAdding] = useState(false);

  return (
    <div className="px-6 py-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button type="button" onClick={() => navigate('/timetable')}
          className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Period Setup</h1>
          <p className="text-sm text-gray-500 mt-0.5">Define daily periods and break times</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-gray-700">Period Slots ({slots.length})</p>
          {!adding && (
            <button type="button" onClick={() => setAdding(true)}
              className="flex items-center gap-1.5 h-9 px-4 rounded-xl bg-[#5B21B6] hover:bg-[#4C1D95] text-sm font-bold text-white">
              <Plus className="w-4 h-4" />
              Add Period
            </button>
          )}
        </div>

        {adding && (
          <SlotForm
            initial={{ orderIndex: slots.length }}
            onSave={(data) => create(data, { onSuccess: () => setAdding(false) })}
            onCancel={() => setAdding(false)}
            isPending={creating}
          />
        )}

        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 text-[#5B21B6] animate-spin" /></div>
        ) : slots.length === 0 && !adding ? (
          <p className="text-sm text-gray-400 text-center py-8">
            No periods configured. Click "Add Period" to start.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {slots.map((slot, i) => <SlotRow key={slot._id} slot={slot} index={i} />)}
          </div>
        )}
      </div>
    </div>
  );
};
