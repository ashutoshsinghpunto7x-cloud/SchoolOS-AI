import { useEffect, useState } from 'react';
import { Clock, Loader2, CheckCircle2, AlertCircle, Plus, Smile, Frown, Minus, Pencil, Ban, RotateCcw } from 'lucide-react';
import { useSchoolSettings, useUpdateBehaviorWindow } from '../hooks/useSchoolSettings';
import {
  useBehaviorOptions,
  useCreateBehaviorOption,
  useUpdateBehaviorOption,
} from '@/features/behavior/hooks/useBehavior';
import type { BehaviorCategory } from '@schoolos/types';

const inputCls = 'w-full h-10 px-3 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#A855F7]/30 focus:border-[#5B21B6]';
const labelCls = 'block text-xs font-semibold text-gray-600 mb-1';

const CATEGORY_META: Record<BehaviorCategory, { icon: React.ElementType; text: string; bg: string; label: string }> = {
  positive: { icon: Smile, text: 'text-emerald-600', bg: 'bg-emerald-50', label: 'Positive' },
  negative: { icon: Frown,  text: 'text-red-500',    bg: 'bg-red-50',    label: 'Needs Attention' },
  neutral:  { icon: Minus,  text: 'text-gray-500',   bg: 'bg-gray-100',  label: 'Neutral' },
};

export function BehaviorSettingsPanel() {
  const { data: settings, isLoading: settingsLoading } = useSchoolSettings();
  const { mutateAsync: saveWindow, isPending: savingWindow, error: windowError, isSuccess: windowSaved } = useUpdateBehaviorWindow();

  const { data: options, isLoading: optionsLoading } = useBehaviorOptions();
  const { mutateAsync: createOption, isPending: creating, error: createError } = useCreateBehaviorOption();
  const { mutateAsync: updateOption, isPending: updating } = useUpdateBehaviorOption();

  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('15:00');

  const [newLabel, setNewLabel] = useState('');
  const [newCategory, setNewCategory] = useState<BehaviorCategory>('neutral');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState('');

  useEffect(() => {
    if (!settings) return;
    setStartTime(settings.behaviorWindow.startTime);
    setEndTime(settings.behaviorWindow.endTime);
  }, [settings]);

  async function handleSaveWindow(e: React.FormEvent) {
    e.preventDefault();
    await saveWindow({ startTime, endTime });
  }

  async function handleAddOption(e: React.FormEvent) {
    e.preventDefault();
    const label = newLabel.trim();
    if (!label) return;
    await createOption({ label, category: newCategory });
    setNewLabel('');
    setNewCategory('neutral');
  }

  async function handleToggleActive(id: string, isActive: boolean) {
    await updateOption({ id, payload: { isActive: !isActive } });
  }

  function startEdit(id: string, currentLabel: string) {
    setEditingId(id);
    setEditingLabel(currentLabel);
  }

  async function handleSaveEdit(id: string) {
    const label = editingLabel.trim();
    if (!label) return;
    await updateOption({ id, payload: { label } });
    setEditingId(null);
  }

  const windowErr = windowError instanceof Error ? windowError.message : null;
  const createErr = createError instanceof Error ? createError.message : null;

  const defaults = (options ?? []).filter((o) => o.isDefault);
  const custom = (options ?? []).filter((o) => !o.isDefault);

  return (
    <>
      {/* ── Behaviour marking window ──────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mt-5">
        <div className="flex items-center gap-2 mb-1">
          <Clock className="w-4 h-4 text-gray-400" />
          <h2 className="text-sm font-bold text-gray-900">Behaviour Marking Window</h2>
        </div>
        <p className="text-xs text-gray-400 mb-4">
          Teachers can only submit behaviour marks for a student during this daily window. Outside it, the marking screen shows as closed.
        </p>

        {settingsLoading ? (
          <div className="h-16 bg-gray-50 rounded-xl animate-pulse" />
        ) : (
          <form onSubmit={(e) => void handleSaveWindow(e)} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label>
                <span className={labelCls}>Opens At</span>
                <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className={inputCls} />
              </label>
              <label>
                <span className={labelCls}>Closes At</span>
                <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className={inputCls} />
              </label>
            </div>

            {windowErr && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">
                <AlertCircle className="w-4 h-4 shrink-0" /> {windowErr}
              </div>
            )}
            {windowSaved && !windowErr && (
              <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 rounded-xl px-3 py-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" /> Behaviour window saved.
              </div>
            )}

            <button
              type="submit"
              disabled={savingWindow}
              className="h-10 px-4 bg-[#5B21B6] hover:bg-[#4C1D95] disabled:opacity-60 text-white text-sm font-semibold rounded-xl flex items-center gap-2"
            >
              {savingWindow ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Save Window
            </button>
          </form>
        )}
      </div>

      {/* ── Behaviour options ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mt-5">
        <div className="flex items-center gap-2 mb-1">
          <Smile className="w-4 h-4 text-gray-400" />
          <h2 className="text-sm font-bold text-gray-900">Behaviour Options</h2>
        </div>
        <p className="text-xs text-gray-400 mb-4">
          The default quick-tap options every teacher sees. Deactivate one instead of deleting it — past records keep their original label.
        </p>

        {optionsLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-11 bg-gray-50 rounded-xl animate-pulse" />)}
          </div>
        ) : (
          <div className="space-y-2 mb-4">
            {defaults.map((opt) => {
              const meta = CATEGORY_META[opt.category];
              const Icon = meta.icon;
              const isEditing = editingId === opt._id;
              return (
                <div key={opt._id} className={`flex items-center gap-3 px-3 py-2 rounded-xl border ${opt.isActive ? 'border-gray-100' : 'border-gray-100 opacity-50'}`}>
                  <div className={`w-8 h-8 rounded-lg ${meta.bg} flex items-center justify-center shrink-0`}>
                    <Icon className={`w-4 h-4 ${meta.text}`} />
                  </div>
                  {isEditing ? (
                    <input
                      autoFocus
                      value={editingLabel}
                      onChange={(e) => setEditingLabel(e.target.value)}
                      className="flex-1 h-8 px-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#A855F7]/30"
                    />
                  ) : (
                    <span className="flex-1 text-sm font-semibold text-gray-800">{opt.label}</span>
                  )}
                  <span className="text-[11px] text-gray-400">{meta.label}</span>

                  {isEditing ? (
                    <button
                      type="button"
                      onClick={() => void handleSaveEdit(opt._id)}
                      disabled={updating}
                      className="h-7 px-2 text-xs font-semibold text-white bg-[#5B21B6] rounded-lg"
                    >
                      Save
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => startEdit(opt._id, opt.label)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400"
                      title="Rename"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => void handleToggleActive(opt._id, opt.isActive)}
                    disabled={updating}
                    className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400"
                    title={opt.isActive ? 'Deactivate' : 'Reactivate'}
                  >
                    {opt.isActive ? <Ban className="w-3.5 h-3.5" /> : <RotateCcw className="w-3.5 h-3.5" />}
                  </button>
                </div>
              );
            })}

            {custom.length > 0 && (
              <>
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide pt-2">Teacher-added options</p>
                {custom.map((opt) => {
                  const meta = CATEGORY_META[opt.category];
                  const Icon = meta.icon;
                  return (
                    <div key={opt._id} className={`flex items-center gap-3 px-3 py-2 rounded-xl border border-dashed border-gray-200 ${!opt.isActive ? 'opacity-50' : ''}`}>
                      <div className={`w-8 h-8 rounded-lg ${meta.bg} flex items-center justify-center shrink-0`}>
                        <Icon className={`w-4 h-4 ${meta.text}`} />
                      </div>
                      <span className="flex-1 text-sm font-semibold text-gray-800">{opt.label}</span>
                      <span className="text-[11px] text-gray-400">{opt.createdBy ?? 'Teacher'}</span>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        )}

        <form onSubmit={(e) => void handleAddOption(e)} className="flex items-end gap-2 flex-wrap pt-3 border-t border-gray-50">
          <label className="flex-1 min-w-[180px]">
            <span className={labelCls}>New Option</span>
            <input
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="e.g. Outstanding Teamwork"
              className={inputCls}
            />
          </label>
          <label>
            <span className={labelCls}>Category</span>
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value as BehaviorCategory)}
              className={`${inputCls} w-40`}
            >
              <option value="positive">Positive</option>
              <option value="negative">Needs Attention</option>
              <option value="neutral">Neutral</option>
            </select>
          </label>
          <button
            type="submit"
            disabled={creating || !newLabel.trim()}
            className="h-10 px-4 bg-[#5B21B6] hover:bg-[#4C1D95] disabled:opacity-60 text-white text-sm font-semibold rounded-xl flex items-center gap-2"
          >
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Add
          </button>
        </form>

        {createErr && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2 mt-3">
            <AlertCircle className="w-4 h-4 shrink-0" /> {createErr}
          </div>
        )}
      </div>
    </>
  );
}
