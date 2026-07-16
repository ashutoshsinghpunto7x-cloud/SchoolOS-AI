import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Loader2, UserRound, Plus, X, Check } from 'lucide-react';
import { useTeachersPaginated, useUpdateTeacher } from '@/features/teachers/hooks/useTeachers';
import type { Teacher } from '@schoolos/types';

// ── Column config ────────────────────────────────────────────────────────────

type ColumnType = 'text' | 'date' | 'select' | 'number';

interface ColumnDef {
  key: string;
  label: string;
  type: ColumnType;
  options?: string[];
  isCustom?: boolean;
}

const FIXED_COLUMNS: ColumnDef[] = [
  { key: 'fullName',       label: 'Name',            type: 'text' },
  { key: 'gender',         label: 'Gender',          type: 'select', options: ['male', 'female', 'other'] },
  { key: 'dateOfBirth',    label: 'Date of Birth',   type: 'date' },
  { key: 'phone',          label: 'Phone',           type: 'text' },
  { key: 'alternatePhone', label: 'Alternate Phone', type: 'text' },
  { key: 'email',          label: 'Email',           type: 'text' },
  { key: 'address',        label: 'Address',         type: 'text' },
  { key: 'department',     label: 'Department',      type: 'text' },
  { key: 'experienceYears', label: 'Experience (yrs)', type: 'number' },
  { key: 'joiningDate',    label: 'Joining Date',    type: 'date' },
  {
    key: 'employmentStatus', label: 'Status', type: 'select',
    options: ['applicant', 'active', 'on_leave', 'suspended', 'resigned', 'retired', 'inactive'],
  },
];

const UNASSIGNED_DEPARTMENT = 'Unassigned';
const CUSTOM_COLUMNS_STORAGE_KEY = 'schoolos.teacherDirectory.customColumns';

function loadStoredCustomColumns(): string[] {
  try {
    const raw = localStorage.getItem(CUSTOM_COLUMNS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
function saveStoredCustomColumns(keys: string[]) {
  try { localStorage.setItem(CUSTOM_COLUMNS_STORAGE_KEY, JSON.stringify(keys)); } catch { /* ignore */ }
}

// ── One editable cell ────────────────────────────────────────────────────────

function EditableCell({ teacher, col }: { teacher: Teacher; col: ColumnDef }) {
  const { mutateAsync, isPending } = useUpdateTeacher(teacher._id);
  const [editing, setEditing] = useState(false);

  const rawValue = col.isCustom
    ? (teacher.customFields?.[col.key] as string | undefined) ?? ''
    : ((teacher as unknown as Record<string, unknown>)[col.key] as string | number | undefined) ?? '';
  const [value, setValue] = useState(String(rawValue ?? ''));

  useEffect(() => { setValue(String(rawValue ?? '')); }, [rawValue]);

  async function save() {
    setEditing(false);
    if (value === String(rawValue ?? '')) return;
    if (col.isCustom) {
      await mutateAsync({ customFields: { ...teacher.customFields, [col.key]: value } });
    } else if (col.type === 'number') {
      await mutateAsync({ [col.key]: value ? Number(value) : undefined });
    } else {
      await mutateAsync({ [col.key]: value || undefined });
    }
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="w-full text-left px-2 py-1.5 rounded-md hover:bg-blue-50 text-xs text-gray-700 truncate min-h-[28px] flex items-center"
        title="Click to edit"
      >
        {value || <span className="text-gray-300">—</span>}
      </button>
    );
  }

  if (col.type === 'select') {
    return (
      <select
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={save}
        disabled={isPending}
        className="w-full h-8 px-1.5 rounded-md border border-blue-400 text-xs focus:outline-none"
      >
        <option value="">—</option>
        {col.options?.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    );
  }

  return (
    <input
      autoFocus
      type={col.type === 'date' ? 'date' : col.type === 'number' ? 'number' : 'text'}
      value={col.type === 'date' ? value.slice(0, 10) : value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={save}
      onKeyDown={(e) => e.key === 'Enter' && save()}
      disabled={isPending}
      className="w-full h-8 px-1.5 rounded-md border border-blue-400 text-xs focus:outline-none"
    />
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function TeacherDirectoryPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useTeachersPaginated({ limit: 500, sortBy: 'fullName', sortOrder: 'asc' });
  const allTeachers = useMemo(() => data?.data ?? [], [data]);

  const departments = useMemo(() => {
    const set = new Set<string>();
    for (const t of allTeachers) set.add(t.department?.trim() || UNASSIGNED_DEPARTMENT);
    return [...set].sort();
  }, [allTeachers]);

  const [selectedDept, setSelectedDept] = useState('');
  const [customColumns, setCustomColumns] = useState<string[]>(() => loadStoredCustomColumns());
  const [addingColumn, setAddingColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');

  const teachers = useMemo(
    () => (selectedDept ? allTeachers.filter((t) => (t.department?.trim() || UNASSIGNED_DEPARTMENT) === selectedDept) : allTeachers),
    [allTeachers, selectedDept],
  );

  useEffect(() => {
    const discovered = new Set(customColumns);
    let changed = false;
    for (const t of allTeachers) {
      for (const key of Object.keys(t.customFields ?? {})) {
        if (!discovered.has(key)) { discovered.add(key); changed = true; }
      }
    }
    if (changed) {
      const next = [...discovered];
      setCustomColumns(next);
      saveStoredCustomColumns(next);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allTeachers]);

  const columns: ColumnDef[] = [
    ...FIXED_COLUMNS,
    ...customColumns.map((key) => ({ key, label: key, type: 'text' as const, isCustom: true })),
  ];

  function addColumn() {
    const name = newColumnName.trim();
    if (!name) return;
    const key = name.replace(/\s+/g, '_').toLowerCase();
    if (!customColumns.includes(key)) {
      const next = [...customColumns, key];
      setCustomColumns(next);
      saveStoredCustomColumns(next);
    }
    setNewColumnName('');
    setAddingColumn(false);
  }

  function exportToExcel() {
    const header = ['Employee ID', ...columns.map((c) => c.label)];
    const rows = teachers.map((t) => [
      t.employeeId,
      ...columns.map((c) => {
        if (c.isCustom) return String(t.customFields?.[c.key] ?? '');
        const v = (t as unknown as Record<string, unknown>)[c.key];
        return v == null ? '' : String(v);
      }),
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `teachers-${selectedDept || 'all'}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="bg-white border-b border-gray-200 px-4 py-4 flex items-center gap-3">
        <button onClick={() => navigate('/accountant')} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors lg:hidden">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="flex-1">
          <h1 className="text-base font-bold text-gray-900">Teacher Directory</h1>
          <p className="text-xs text-gray-500">All teachers — filter by department, or click any field to edit it directly</p>
        </div>
        <button
          onClick={exportToExcel}
          disabled={!teachers.length}
          className="h-9 px-3 border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-40 flex items-center gap-1.5"
        >
          <Download className="w-3.5 h-3.5" /> Export to Excel
        </button>
      </div>

      <div className="px-4 py-4 max-w-full mx-auto space-y-4">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Department</label>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="h-10 px-3 rounded-xl border border-gray-200 bg-white text-sm min-w-[160px] focus:outline-none focus:ring-2 focus:ring-gray-200"
            >
              <option value="">{isLoading ? 'Loading…' : 'All departments'}</option>
              {departments.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          {addingColumn ? (
            <div className="flex items-center gap-1.5">
              <input
                autoFocus
                value={newColumnName}
                onChange={(e) => setNewColumnName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addColumn()}
                placeholder="New column name"
                className="h-10 px-3 rounded-xl border border-gray-200 text-sm w-40 focus:outline-none focus:ring-2 focus:ring-gray-200"
              />
              <button onClick={addColumn} className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0"><Check className="w-4 h-4" /></button>
              <button onClick={() => { setAddingColumn(false); setNewColumnName(''); }} className="w-9 h-9 rounded-xl bg-gray-100 text-gray-500 flex items-center justify-center shrink-0"><X className="w-4 h-4" /></button>
            </div>
          ) : (
            <button
              onClick={() => setAddingColumn(true)}
              className="h-10 px-3 rounded-xl border border-dashed border-gray-300 text-xs font-semibold text-gray-500 hover:border-gray-400 hover:text-gray-700 flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> Add Column
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="h-64 bg-white rounded-2xl border border-gray-200 animate-pulse flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : !teachers.length ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
            <UserRound className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-gray-700">
              {selectedDept ? `No teachers found in ${selectedDept}` : 'No teachers found'}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-x-auto">
            <table className="w-full text-sm min-w-[1300px]">
              <thead>
                <tr className="bg-gray-50 text-[10px] text-gray-400 uppercase tracking-wide">
                  <th className="text-left font-semibold px-3 py-2.5 sticky left-0 bg-gray-50 min-w-[120px]">Employee ID</th>
                  {columns.map((c) => (
                    <th key={c.key} className="text-left font-semibold px-2 py-2.5 min-w-[140px]">{c.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {teachers.map((t) => (
                  <tr key={t._id} className="hover:bg-gray-50/60">
                    <td className="px-3 py-1.5 text-xs font-mono text-gray-500 whitespace-nowrap sticky left-0 bg-white">{t.employeeId}</td>
                    {columns.map((c) => (
                      <td key={c.key} className="px-1 py-1">
                        <EditableCell teacher={t} col={c} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-xs text-gray-400">{teachers.length} teacher{teachers.length !== 1 ? 's' : ''}</p>
      </div>
    </div>
  );
}
