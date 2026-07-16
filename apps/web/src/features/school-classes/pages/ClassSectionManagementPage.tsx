import { useMemo, useState } from 'react';
import { Plus, X, Loader2, GraduationCap, AlertCircle, Pencil, Check } from 'lucide-react';
import { PageContainer } from '@/components/workspace/PageContainer';
import { useAuth } from '@/features/auth/hooks/useAuth';
import {
  useSchoolClasses, useCreateSchoolClass, useRenameSchoolClass, useAddSection, useRemoveSection, useDeleteSchoolClass,
  useClassFeeOverview,
} from '../hooks/useSchoolClasses';
import type { SchoolClass } from '@schoolos/types';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

// Per-class fee amounts are managed on the dedicated Fee Structure page
// (accountant sidebar) — this page only shows classes/sections and a
// read-only collected/pending summary per class, to avoid two places that
// both claim to "manage" fee structure.

function ClassCard({ cls, feeSummary }: { cls: SchoolClass; feeSummary?: { collected: number; pending: number } }) {
  const [newSection, setNewSection] = useState('');
  const { mutateAsync: addSection, isPending: adding } = useAddSection();
  const { mutateAsync: removeSection } = useRemoveSection();
  const { mutateAsync: deleteClass, isPending: deleting } = useDeleteSchoolClass();
  const { mutateAsync: renameClass, isPending: renaming } = useRenameSchoolClass();

  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(cls.name);
  const [renameError, setRenameError] = useState('');

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
          <span className="font-semibold text-gray-800">{fmt(feeSummary.collected)} collected</span>
          {feeSummary.pending > 0 && <span className="font-semibold text-gray-500">{fmt(feeSummary.pending)} pending</span>}
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
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Classes & Sections</h1>
      <p className="text-sm text-gray-500 mb-6">
        {canManageFees
          ? 'Manage the class and section structure used across student records. Per-class fee amounts live on the Fee Structure page.'
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
          {classes.map((c) => <ClassCard key={c._id} cls={c} feeSummary={feeByClass.get(c.name.toLowerCase())} />)}
        </div>
      )}
    </PageContainer>
  );
}
