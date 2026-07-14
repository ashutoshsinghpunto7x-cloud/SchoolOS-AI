import { useEffect, useMemo, useState } from 'react';
import { useBlocker } from 'react-router-dom';
import { toast } from 'sonner';
import { Plus, X, Loader2, GraduationCap, AlertCircle, Pencil, Check, ChevronDown, IndianRupee, CalendarRange, Save } from 'lucide-react';
import { PageContainer } from '@/components/workspace/PageContainer';
import { useAuth } from '@/features/auth/hooks/useAuth';
import {
  useSchoolClasses, useCreateSchoolClass, useRenameSchoolClass, useAddSection, useRemoveSection, useDeleteSchoolClass,
  useClassFeeOverview,
} from '../hooks/useSchoolClasses';
import { useFeeStructure, useUpsertFeeStructure } from '@/features/fees/hooks/useFeeStructure';
import type { SchoolClass, FeeHead } from '@schoolos/types';
import { cn } from '@/lib/utils';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

const FEE_HEADS: { value: FeeHead; label: string }[] = [
  { value: 'tuition',       label: 'Tuition' },
  { value: 'admission',     label: 'Admission' },
  { value: 'examination',   label: 'Examination' },
  { value: 'transport',     label: 'Transport' },
  { value: 'hostel',        label: 'Hostel' },
  { value: 'miscellaneous', label: 'Miscellaneous' },
];

const ACADEMIC_MONTHS = ['April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December', 'January', 'February', 'March'];

function currentAcademicYear(): string {
  const y = new Date().getFullYear();
  const m = new Date().getMonth();
  return m >= 3 ? `${y}-${String(y + 1).slice(-2)}` : `${y - 1}-${String(y).slice(-2)}`;
}

// ── Fee structure — one row of amount fields per fee head, for one class ───────
// Each academic month can have its own set of fee heads (e.g. April = Admission
// + Tuition, May = Tuition only). A month of "null" ("Whole Year") is for heads
// that don't vary by month, such as Transport.
//
// Edits are batched behind an explicit Save button rather than saving on blur —
// each save now also creates/updates the actual fee record for every student
// in the class (not just a pricing-catalog row), so it's a heavier action the
// accountant should trigger deliberately, with a clear "did this save?" answer
// instead of an easy-to-miss autosave-on-blur.

function ClassFeeStructure({ cls }: { cls: string }) {
  const academicYear = currentAcademicYear();
  const { data: structure, isLoading } = useFeeStructure(academicYear);
  const [selectedMonth, setSelectedMonth] = useState<string | null>('April');
  const [values, setValues] = useState<Partial<Record<FeeHead, string>>>({});
  const [dirtyHeads, setDirtyHeads] = useState<Set<FeeHead>>(new Set());
  const { mutateAsync: upsertFeeStructure, isPending: saving } = useUpsertFeeStructure();

  const isDirty = dirtyHeads.size > 0;

  const monthsWithEntries = useMemo(() => {
    const set = new Set<string>();
    for (const s of structure ?? []) {
      if (s.class === cls && s.month) set.add(s.month);
    }
    return set;
  }, [structure, cls]);

  function amountFor(feeHead: FeeHead): number | undefined {
    return structure?.find((s) => s.class === cls && s.feeHead === feeHead && (s.month ?? null) === selectedMonth)?.amount;
  }

  function valueFor(feeHead: FeeHead): string {
    if (feeHead in values) return values[feeHead] ?? '';
    const existing = amountFor(feeHead);
    return existing != null ? String(existing) : '';
  }

  function handleChange(feeHead: FeeHead, v: string) {
    setValues((prev) => ({ ...prev, [feeHead]: v }));
    setDirtyHeads((prev) => new Set(prev).add(feeHead));
  }

  // Warn before an in-app route change with unsaved edits.
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) => isDirty && currentLocation.pathname !== nextLocation.pathname,
  );
  useEffect(() => {
    if (blocker.state !== 'blocked') return;
    const leave = window.confirm('You have unsaved fee structure changes. Leave without saving?');
    if (leave) blocker.proceed();
    else blocker.reset();
  }, [blocker]);

  // Warn before closing/refreshing the tab with unsaved edits.
  useEffect(() => {
    if (!isDirty) return;
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue = '';
    }
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  function switchMonth(next: string | null) {
    if (isDirty) {
      const discard = window.confirm(
        `You have unsaved changes for ${selectedMonth ?? 'the whole year'}. Discard them and switch?`,
      );
      if (!discard) return;
    }
    setValues({});
    setDirtyHeads(new Set());
    setSelectedMonth(next);
  }

  async function saveAll() {
    const heads = Array.from(dirtyHeads);
    let savedCount = 0;
    try {
      for (const feeHead of heads) {
        const raw = values[feeHead];
        const amount = parseFloat(raw ?? '');
        if (isNaN(amount) || amount < 0) continue; // blank/invalid — leave that head untouched
        await upsertFeeStructure({ class: cls, feeHead, academicYear, month: selectedMonth, amount: Math.round(amount * 100) / 100 });
        savedCount++;
      }
      setValues({});
      setDirtyHeads(new Set());
      toast.success(savedCount > 0 ? `Saved ${savedCount} fee amount${savedCount === 1 ? '' : 's'} for every student in Class ${cls}.` : 'Nothing to save.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save fee structure');
    }
  }

  return (
    <div className="mt-3 pt-3 border-t border-gray-100">
      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2.5 flex items-center gap-1.5">
        <CalendarRange className="w-3.5 h-3.5" /> Fee Structure · {academicYear}
      </p>

      {/* Month tabs */}
      <div className="flex gap-1.5 flex-wrap mb-3">
        <button
          type="button"
          onClick={() => switchMonth(null)}
          className={cn(
            'h-7 px-2.5 rounded-lg text-[11px] font-semibold transition-colors',
            selectedMonth === null ? 'bg-[#5B21B6] text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
          )}
        >
          Whole Year
        </button>
        {ACADEMIC_MONTHS.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => switchMonth(m)}
            className={cn(
              'h-7 px-2.5 rounded-lg text-[11px] font-semibold transition-colors relative',
              selectedMonth === m
                ? 'bg-[#5B21B6] text-white'
                : monthsWithEntries.has(m)
                ? 'bg-violet-50 text-violet-700 hover:bg-violet-100'
                : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
            )}
          >
            {m.slice(0, 3)}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="h-16 bg-gray-50 rounded-lg animate-pulse" />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {FEE_HEADS.map((h) => (
            <div key={h.value}>
              <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">{h.label}</label>
              <div className="relative">
                <IndianRupee className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-300" />
                <input
                  type="number"
                  min={0}
                  value={valueFor(h.value)}
                  onChange={(e) => handleChange(h.value, e.target.value)}
                  placeholder="—"
                  className={cn(
                    'w-full h-9 pl-8 pr-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray-400',
                    dirtyHeads.has(h.value) ? 'border-amber-300 bg-amber-50/40' : 'border-gray-200',
                  )}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between gap-3 mt-3">
        <p className="text-[11px] text-gray-400">
          Amounts apply only to <strong>{selectedMonth ?? 'the whole year'}</strong> — leave blank if a fee doesn't apply then.
          Saving creates/updates the fee record for every student in this class right away.
        </p>
        <button
          type="button"
          onClick={() => void saveAll()}
          disabled={!isDirty || saving}
          className="shrink-0 h-9 px-4 rounded-xl bg-[#5B21B6] hover:bg-[#4C1D95] disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          Save Changes
        </button>
      </div>
    </div>
  );
}

function ClassCard({ cls, feeSummary, canManageFees }: { cls: SchoolClass; feeSummary?: { collected: number; pending: number }; canManageFees: boolean }) {
  const [newSection, setNewSection] = useState('');
  const { mutateAsync: addSection, isPending: adding } = useAddSection();
  const { mutateAsync: removeSection } = useRemoveSection();
  const { mutateAsync: deleteClass, isPending: deleting } = useDeleteSchoolClass();
  const { mutateAsync: renameClass, isPending: renaming } = useRenameSchoolClass();

  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(cls.name);
  const [renameError, setRenameError] = useState('');
  const [feesOpen, setFeesOpen] = useState(false);

  async function handleAddSection(e: React.FormEvent) {
    e.preventDefault();
    if (!newSection.trim()) return;
    await addSection({ id: cls._id, section: newSection.trim() });
    setNewSection('');
  }

  function startEditName() {
    setNameInput(cls.name);
    setRenameError('');
    setEditingName(true);
  }

  async function saveName() {
    const trimmed = nameInput.trim();
    if (!trimmed || trimmed === cls.name) { setEditingName(false); return; }
    setRenameError('');
    try {
      await renameClass({ id: cls._id, name: trimmed });
      setEditingName(false);
    } catch (err) {
      setRenameError(err instanceof Error ? err.message : 'Failed to rename class');
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-3 gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
            <GraduationCap className="w-4 h-4 text-blue-600" />
          </div>
          {editingName ? (
            <div className="flex items-center gap-1.5 min-w-0">
              <input
                autoFocus
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') void saveName(); if (e.key === 'Escape') setEditingName(false); }}
                maxLength={30}
                className="h-8 w-32 px-2 rounded-lg border border-gray-200 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#A855F7]"
              />
              <button
                type="button"
                onClick={() => void saveName()}
                disabled={renaming}
                className="w-7 h-7 rounded-lg bg-[#5B21B6] hover:bg-[#4C1D95] disabled:opacity-50 text-white flex items-center justify-center shrink-0"
              >
                {renaming ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 min-w-0">
              <h3 className="text-base font-bold text-gray-900 truncate">Class {cls.name}</h3>
              <button
                type="button"
                onClick={startEditName}
                title="Rename class"
                className="w-6 h-6 rounded-lg flex items-center justify-center text-gray-300 hover:text-blue-600 hover:bg-blue-50 transition-colors shrink-0"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => void deleteClass(cls._id)}
          disabled={deleting}
          className="text-xs font-semibold text-red-400 hover:text-red-600 disabled:opacity-50 shrink-0"
        >
          Remove Class
        </button>
      </div>
      {renameError && <p className="text-xs text-red-500 mb-2">{renameError}</p>}

      {feeSummary && (feeSummary.collected > 0 || feeSummary.pending > 0) && (
        <div className="flex items-center gap-3 text-xs mb-3 bg-gray-50 rounded-lg px-3 py-2">
          <span className="font-semibold text-emerald-600">{fmt(feeSummary.collected)} collected</span>
          {feeSummary.pending > 0 && <span className="font-semibold text-amber-600">{fmt(feeSummary.pending)} pending</span>}
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-3">
        {cls.sections.length === 0 ? (
          <p className="text-sm text-gray-400">No sections yet.</p>
        ) : (
          cls.sections.map((s) => (
            <span key={s} className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-700 bg-gray-100 rounded-full pl-3 pr-1.5 py-1">
              Section {s}
              <button
                type="button"
                onClick={() => void removeSection({ id: cls._id, section: s })}
                className="w-4 h-4 rounded-full flex items-center justify-center hover:bg-gray-300 transition-colors"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          ))
        )}
      </div>

      <form onSubmit={(e) => void handleAddSection(e)} className="flex gap-2">
        <input
          type="text"
          value={newSection}
          onChange={(e) => setNewSection(e.target.value)}
          placeholder="e.g. A"
          maxLength={10}
          className="flex-1 h-9 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#A855F7]"
        />
        <button
          type="submit"
          disabled={adding || !newSection.trim()}
          className="h-9 px-3.5 rounded-lg bg-[#5B21B6] hover:bg-[#4C1D95] disabled:opacity-50 text-white text-sm font-semibold flex items-center gap-1.5"
        >
          {adding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
          Add Section
        </button>
      </form>

      {canManageFees && (
        <>
          <button
            type="button"
            onClick={() => setFeesOpen((v) => !v)}
            className="w-full flex items-center justify-between mt-3 pt-3 border-t border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wide hover:text-gray-700"
          >
            <span className="flex items-center gap-1.5"><IndianRupee className="w-3.5 h-3.5" /> Manage Fee Structure</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${feesOpen ? 'rotate-180' : ''}`} />
          </button>
          {feesOpen && <ClassFeeStructure cls={cls.name} />}
        </>
      )}
    </div>
  );
}

export function ClassSectionManagementPage() {
  const { user } = useAuth();
  const canManageFees = user?.role === 'admin' || user?.role === 'principal' || user?.role === 'accountant';
  const { data: classes, isLoading, isError } = useSchoolClasses();
  const { data: feeOverview } = useClassFeeOverview();
  const { mutateAsync: createClass, isPending: creating } = useCreateSchoolClass();
  const [newClassName, setNewClassName] = useState('');
  const [error, setError] = useState('');

  // Sum each class's per-section totals into one collected/pending figure per class name.
  const feeByClass = useMemo(() => {
    const map = new Map<string, { collected: number; pending: number }>();
    for (const row of feeOverview ?? []) {
      const agg = map.get(row.class.toLowerCase()) ?? { collected: 0, pending: 0 };
      agg.collected += row.collected;
      agg.pending += row.pending;
      map.set(row.class.toLowerCase(), agg);
    }
    return map;
  }, [feeOverview]);

  async function handleCreateClass(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!newClassName.trim()) return;
    try {
      await createClass(newClassName.trim());
      setNewClassName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add class');
    }
  }

  return (
    <PageContainer>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">{canManageFees ? 'Classes & Fee Structure' : 'Classes & Sections'}</h1>
      <p className="text-sm text-gray-500 mb-6">
        {canManageFees
          ? 'Manage the class/section structure and each class\'s fee structure in one place.'
          : 'Manage the class and section structure used across student records.'}
      </p>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
        <h2 className="text-sm font-bold text-gray-900 mb-3">Add New Class</h2>
        <form onSubmit={(e) => void handleCreateClass(e)} className="flex gap-2">
          <input
            type="text"
            value={newClassName}
            onChange={(e) => setNewClassName(e.target.value)}
            placeholder="e.g. 10 or Nursery"
            className="flex-1 h-10 px-3.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#A855F7]"
          />
          <button
            type="submit"
            disabled={creating || !newClassName.trim()}
            className="h-10 px-4 rounded-xl bg-[#5B21B6] hover:bg-[#4C1D95] disabled:opacity-50 text-white text-sm font-semibold flex items-center gap-2"
          >
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Add Class
          </button>
        </form>
        {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-40 bg-white rounded-2xl border border-gray-100 animate-pulse" />)}
        </div>
      ) : isError ? (
        <div className="flex items-center gap-3 bg-red-50 border border-red-100 rounded-2xl p-5">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
          <p className="text-sm font-semibold text-red-700">Couldn't load classes.</p>
        </div>
      ) : !classes?.length ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
          <p className="text-sm font-semibold text-gray-700">No classes set up yet</p>
          <p className="text-xs text-gray-400 mt-1">Add your first class above to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {classes.map((c) => <ClassCard key={c._id} cls={c} feeSummary={feeByClass.get(c.name.toLowerCase())} canManageFees={canManageFees} />)}
        </div>
      )}
    </PageContainer>
  );
}
