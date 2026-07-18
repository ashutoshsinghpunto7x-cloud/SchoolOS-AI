import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowLeft, Loader2, IndianRupee, CalendarRange, Layers, Plus, X, RefreshCw, Info, School,
} from 'lucide-react';
import { PageContainer } from '@/components/workspace/PageContainer';
import {
  useFeeStructure, useFeeStructureTemplate, useApplyFeeStructureToAllClasses, useUpsertFeeStructure,
} from '../hooks/useFeeStructure';
import {
  useCollectionSchedule, useUpsertCollectionSchedule, useDeleteCollectionScheduleEntry, useUseDefaultSchedule,
} from '../hooks/useCollectionSchedule';
import { useSchoolClasses } from '@/features/school-classes/hooks/useSchoolClasses';
import type { FeeHead, CollectionScheduleItem } from '@schoolos/types';
import { cn } from '@/lib/utils';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

const FEE_HEADS: { value: FeeHead; label: string }[] = [
  { value: 'tuition',       label: 'Tuition Fee' },
  { value: 'examination',   label: 'Exam Fee' },
  { value: 'admission',     label: 'Admission Fee' },
  { value: 'hostel',        label: 'Hostel Fee' },
  { value: 'transport',     label: 'Transport Fee' },
  { value: 'miscellaneous', label: 'Miscellaneous Fee' },
];

const ACADEMIC_MONTHS = ['April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December', 'January', 'February', 'March'];

function currentAcademicYear(): string {
  const y = new Date().getFullYear();
  const m = new Date().getMonth();
  return m >= 3 ? `${y}-${String(y + 1).slice(-2)}` : `${y - 1}-${String(y).slice(-2)}`;
}

type ValuesByMonth = Record<string, Partial<Record<FeeHead, string>>>;

export function FeeStructureBuilderPage() {
  const navigate = useNavigate();
  const academicYear = useMemo(() => currentAcademicYear(), []);
  const [tab, setTab] = useState<'components' | 'schedule'>('components');

  return (
    <PageContainer>
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Fee Structure · {academicYear}</h1>
            <p className="text-sm text-gray-400">Set one amount for every class, or customize amounts per class where they differ.</p>
          </div>
        </div>

        <div className="inline-flex items-center gap-1 bg-gray-100 rounded-2xl p-1 w-fit">
          <button
            onClick={() => setTab('components')}
            className={cn(
              'h-10 px-4 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2',
              tab === 'components' ? 'bg-white text-[#5B21B6] shadow-sm' : 'text-gray-500 hover:text-gray-700',
            )}
          >
            <span className="w-5 h-5 rounded-full bg-[#5B21B6]/10 text-[#5B21B6] text-xs font-bold flex items-center justify-center">1</span>
            Fee Components (By Academic Month)
          </button>
          <button
            onClick={() => setTab('schedule')}
            className={cn(
              'h-10 px-4 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2',
              tab === 'schedule' ? 'bg-white text-[#5B21B6] shadow-sm' : 'text-gray-500 hover:text-gray-700',
            )}
          >
            <span className="w-5 h-5 rounded-full bg-[#5B21B6]/10 text-[#5B21B6] text-xs font-bold flex items-center justify-center">2</span>
            Collection Schedule (Deposit Month Mapping)
          </button>
        </div>

        {tab === 'components'
          ? <FeeComponentsTab academicYear={academicYear} />
          : <CollectionScheduleTab academicYear={academicYear} />}
      </div>
    </PageContainer>
  );
}

// ── Tab 1 — Fee Components (By Academic Month) ─────────────────────────────────

function FeeComponentsTab({ academicYear }: { academicYear: string }) {
  const [scope, setScope] = useState<'all' | 'perClass'>('all');
  const { data: template, isLoading: templateLoading } = useFeeStructureTemplate(academicYear);
  const { data: allEntries, isLoading: entriesLoading } = useFeeStructure(academicYear);
  const { data: classes } = useSchoolClasses();
  const { mutateAsync: applyAll, isPending: applyingAll } = useApplyFeeStructureToAllClasses();
  const { mutateAsync: upsertOne, isPending: savingOne } = useUpsertFeeStructure();
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState(ACADEMIC_MONTHS[0]);
  const [values, setValues] = useState<ValuesByMonth>({});
  const [dirty, setDirty] = useState<Set<string>>(new Set()); // "month::feeHead"

  const isLoading = scope === 'all' ? templateLoading : entriesLoading;
  const saving = scope === 'all' ? applyingAll : savingOne;

  useEffect(() => {
    if (!selectedClass && classes && classes.length > 0) setSelectedClass(classes[0].name);
  }, [classes, selectedClass]);

  // Editing scope changed — discard unsaved local edits, they belonged to the previous scope.
  useEffect(() => {
    setValues({});
    setDirty(new Set());
  }, [scope, selectedClass]);

  function amountFor(month: string, feeHead: FeeHead): number | undefined {
    if (scope === 'all') {
      return template?.find((t) => t.feeHead === feeHead && (t.month ?? null) === month)?.amount;
    }
    return allEntries?.find(
      (t) => t.class === selectedClass && t.feeHead === feeHead && (t.month ?? null) === month,
    )?.amount;
  }

  function valueFor(month: string, feeHead: FeeHead): string {
    const local = values[month]?.[feeHead];
    if (local !== undefined) return local;
    const existing = amountFor(month, feeHead);
    return existing != null ? String(existing) : '';
  }

  function handleChange(month: string, feeHead: FeeHead, v: string) {
    setValues((prev) => ({ ...prev, [month]: { ...prev[month], [feeHead]: v } }));
    setDirty((prev) => new Set(prev).add(`${month}::${feeHead}`));
  }

  const isDirty = dirty.size > 0;

  const monthTotal = useMemo(() => {
    return FEE_HEADS.reduce((sum, { value }) => {
      const raw = valueFor(selectedMonth, value);
      const n = parseFloat(raw);
      return sum + (isNaN(n) ? 0 : n);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, 0);
  }, [selectedMonth, values, template, allEntries, scope, selectedClass]);

  async function saveAll() {
    let savedCount = 0;
    try {
      for (const key of dirty) {
        const [month, feeHead] = key.split('::') as [string, FeeHead];
        const raw = values[month]?.[feeHead];
        if (raw === undefined) continue;
        const amount = parseFloat(raw);
        if (isNaN(amount) || amount < 0) continue;
        const rounded = Math.round(amount * 100) / 100;
        if (scope === 'all') {
          await applyAll({ feeHead, academicYear, month, amount: rounded });
        } else {
          await upsertOne({ class: selectedClass, feeHead, academicYear, month, amount: rounded });
        }
        savedCount++;
      }
      setValues({});
      setDirty(new Set());
      toast.success(
        savedCount === 0
          ? 'Nothing to save.'
          : scope === 'all'
            ? `Saved ${savedCount} amount${savedCount === 1 ? '' : 's'} — applied to every class.`
            : `Saved ${savedCount} amount${savedCount === 1 ? '' : 's'} for ${selectedClass}.`,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save fee structure');
    }
  }

  return (
    <div className="bg-white rounded-[18px] border border-gray-100 shadow-sm p-6">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h2 className="text-base font-bold text-gray-900">Fee Structure — {academicYear}</h2>
          <p className="text-sm text-gray-400 mt-0.5">Define fee amounts for each academic month and fee type.</p>
        </div>
        <button
          onClick={() => void saveAll()}
          disabled={!isDirty || saving}
          className="h-10 px-4 rounded-xl bg-[#5B21B6] hover:bg-[#4C1D95] disabled:opacity-50 text-white text-sm font-semibold flex items-center gap-2 shrink-0"
        >
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          Save All Changes
        </button>
      </div>

      <div className="inline-flex items-center gap-1 bg-gray-100 rounded-xl p-1 mb-4">
        <button
          onClick={() => setScope('all')}
          className={cn(
            'h-8 px-3 rounded-lg text-xs font-semibold transition-colors',
            scope === 'all' ? 'bg-white text-[#5B21B6] shadow-sm' : 'text-gray-500 hover:text-gray-700',
          )}
        >
          Same for all classes
        </button>
        <button
          onClick={() => setScope('perClass')}
          className={cn(
            'h-8 px-3 rounded-lg text-xs font-semibold transition-colors',
            scope === 'perClass' ? 'bg-white text-[#5B21B6] shadow-sm' : 'text-gray-500 hover:text-gray-700',
          )}
        >
          Different per class
        </button>
      </div>

      {scope === 'perClass' && (
        <div className="mb-5">
          <label className="block text-xs font-semibold text-gray-600 mb-1.5 flex items-center gap-1.5">
            <School className="w-3.5 h-3.5 text-gray-400" /> Class
          </label>
          <div className="flex flex-wrap gap-1.5">
            {(classes ?? []).map((c) => (
              <button
                key={c._id}
                onClick={() => setSelectedClass(c.name)}
                className={cn(
                  'h-9 px-3.5 rounded-xl text-sm font-semibold border transition-colors',
                  selectedClass === c.name
                    ? 'bg-[#5B21B6] border-[#5B21B6] text-white'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300',
                )}
              >
                {c.name}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Amounts saved here apply only to <span className="font-semibold text-gray-600">{selectedClass || '…'}</span> and update its students&apos; fee records immediately.
          </p>
        </div>
      )}

      {isLoading ? (
        <div className="h-40 flex items-center justify-center text-gray-400 text-sm">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading…
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-1.5 mb-5">
            {ACADEMIC_MONTHS.map((m) => (
              <button
                key={m}
                onClick={() => setSelectedMonth(m)}
                className={cn(
                  'h-9 px-3.5 rounded-xl text-sm font-semibold border transition-colors',
                  selectedMonth === m
                    ? 'bg-[#5B21B6] border-[#5B21B6] text-white'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300',
                )}
              >
                {m}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 mb-5">
            {FEE_HEADS.map(({ value, label }) => (
              <div key={value}>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">{label}</label>
                <div className="relative">
                  <IndianRupee className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={valueFor(selectedMonth, value)}
                    onChange={(e) => handleChange(selectedMonth, value, e.target.value)}
                    placeholder="0"
                    className="w-full h-11 pl-8 pr-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#A855F7]/30 focus:border-[#5B21B6]"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-800">Monthly Total Breakdown ({selectedMonth})</p>
              <p className="text-xs text-gray-500 mt-0.5">This total is used in the collection schedule mapping.</p>
            </div>
            <p className="text-lg font-bold text-gray-900">{fmt(monthTotal)}</p>
          </div>
        </>
      )}
    </div>
  );
}

// ── Tab 2 — Collection Schedule (Deposit Month Mapping) ────────────────────────

function CollectionScheduleTab({ academicYear }: { academicYear: string }) {
  const { data: template } = useFeeStructureTemplate(academicYear);
  const { data: schedule, isLoading } = useCollectionSchedule(academicYear);
  const { mutateAsync: upsert } = useUpsertCollectionSchedule();
  const { mutateAsync: removeEntry } = useDeleteCollectionScheduleEntry();
  const { mutateAsync: useDefault, isPending: applyingDefault } = useUseDefaultSchedule();
  const [addingFor, setAddingFor] = useState<string | null>(null);

  function amountOf(item: CollectionScheduleItem): number {
    return template?.find((t) => t.feeHead === item.feeHead && (t.month ?? null) === item.academicMonth)?.amount ?? 0;
  }

  function entryFor(depositMonth: string) {
    return schedule?.find((s) => s.depositMonth === depositMonth);
  }

  async function addItem(depositMonth: string, item: CollectionScheduleItem) {
    const existing = entryFor(depositMonth);
    const items = [...(existing?.items ?? []), item];
    await upsert({ academicYear, depositMonth, items });
    setAddingFor(null);
  }

  async function removeItem(depositMonth: string, idx: number) {
    const existing = entryFor(depositMonth);
    if (!existing) return;
    const items = existing.items.filter((_, i) => i !== idx);
    if (items.length === 0) {
      await removeEntry({ academicYear, depositMonth });
    } else {
      await upsert({ academicYear, depositMonth, items });
    }
  }

  const totalAnnual = useMemo(() => {
    return (schedule ?? []).reduce((sum, entry) => sum + entry.items.reduce((s, it) => s + amountOf(it), 0), 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schedule, template]);

  // Options for the "+Add" picker: every (academicMonth, feeHead) that currently has an amount defined.
  const availableItems = useMemo(
    () => (template ?? []).filter((t) => t.amount > 0).map((t) => ({ academicMonth: t.month ?? '', feeHead: t.feeHead })),
    [template],
  );

  return (
    <div className="bg-white rounded-[18px] border border-gray-100 shadow-sm p-6">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#5B21B6]/10 flex items-center justify-center shrink-0 mt-0.5">
            <Info className="w-4 h-4 text-[#5B21B6]" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-gray-900">How it works?</h2>
            <p className="text-xs text-gray-500 mt-0.5">Select a deposit month and add the academic months/fee components that will be collected in that month.</p>
          </div>
        </div>
        <button
          onClick={() => void useDefault(academicYear).then(() => toast.success('Default schedule applied.'))}
          disabled={applyingDefault}
          className="h-9 px-3.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 flex items-center gap-1.5 shrink-0 disabled:opacity-50"
        >
          {applyingDefault ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          Use Default Schedule
        </button>
      </div>

      {isLoading ? (
        <div className="h-40 flex items-center justify-center text-gray-400 text-sm">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading…
        </div>
      ) : (
        <>
          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  <th className="px-2 py-2 w-36">Deposit Month</th>
                  <th className="px-2 py-2">Fees Collected In This Month</th>
                  <th className="px-2 py-2 w-28 text-right">Total Amount</th>
                </tr>
              </thead>
              <tbody>
                {ACADEMIC_MONTHS.map((depositMonth) => {
                  const entry = entryFor(depositMonth);
                  const items = entry?.items ?? [];
                  const total = items.reduce((s, it) => s + amountOf(it), 0);
                  return (
                    <tr key={depositMonth} className="border-t border-gray-50">
                      <td className="px-2 py-3 align-top">
                        <div className="flex items-center gap-1.5 text-gray-700 font-semibold">
                          <CalendarRange className="w-3.5 h-3.5 text-gray-400" /> {depositMonth}
                        </div>
                      </td>
                      <td className="px-2 py-3 align-top">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {items.map((item, idx) => (
                            <span
                              key={`${item.academicMonth}-${item.feeHead}-${idx}`}
                              className="inline-flex items-center gap-1 h-7 pl-2.5 pr-1.5 rounded-lg bg-[#A855F7]/10 text-[#5B21B6] text-xs font-semibold"
                            >
                              {item.academicMonth} {FEE_HEADS.find((f) => f.value === item.feeHead)?.label ?? item.feeHead}
                              <button onClick={() => void removeItem(depositMonth, idx)} className="hover:bg-[#5B21B6]/10 rounded p-0.5">
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}

                          {addingFor === depositMonth ? (
                            <AddItemPicker
                              options={availableItems}
                              existing={items}
                              onPick={(item) => void addItem(depositMonth, item)}
                              onClose={() => setAddingFor(null)}
                            />
                          ) : (
                            <button
                              onClick={() => setAddingFor(depositMonth)}
                              className="inline-flex items-center gap-1 h-7 px-2.5 rounded-lg border border-dashed border-gray-300 text-xs font-semibold text-gray-500 hover:border-gray-400"
                            >
                              <Plus className="w-3 h-3" /> Add
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-2 py-3 align-top text-right font-bold text-gray-800">{fmt(total)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-5 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-gray-400" />
              <p className="text-sm font-semibold text-gray-800">Total Annual Collection</p>
            </div>
            <p className="text-lg font-bold text-gray-900">{fmt(totalAnnual)}</p>
          </div>
          <p className="text-xs text-gray-400 mt-1.5">This total should match the total of all fee components across all academic months.</p>
        </>
      )}
    </div>
  );
}

function AddItemPicker({
  options, existing, onPick, onClose,
}: {
  options: { academicMonth: string; feeHead: FeeHead }[];
  existing: CollectionScheduleItem[];
  onPick: (item: CollectionScheduleItem) => void;
  onClose: () => void;
}) {
  const remaining = options.filter(
    (o) => !existing.some((e) => e.academicMonth === o.academicMonth && e.feeHead === o.feeHead),
  );

  return (
    <div className="relative">
      <div className="absolute z-10 top-full left-0 mt-1 w-56 bg-white border border-gray-200 rounded-xl shadow-lg max-h-56 overflow-y-auto py-1">
        {remaining.length === 0 ? (
          <p className="px-3 py-2 text-xs text-gray-400">
            No fee components left to add — define more in the Fee Components tab first.
          </p>
        ) : (
          remaining.map((o) => (
            <button
              key={`${o.academicMonth}-${o.feeHead}`}
              onClick={() => onPick(o)}
              className="w-full text-left px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              {o.academicMonth} {FEE_HEADS.find((f) => f.value === o.feeHead)?.label ?? o.feeHead}
            </button>
          ))
        )}
        <button onClick={onClose} className="w-full text-left px-3 py-1.5 text-xs font-semibold text-gray-400 hover:bg-gray-50 border-t border-gray-100 mt-1">
          Cancel
        </button>
      </div>
    </div>
  );
}
