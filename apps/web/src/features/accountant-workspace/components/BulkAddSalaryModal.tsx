import { useState } from 'react';
import { X, Loader2, AlertCircle, Plus, Trash2, Users } from 'lucide-react';
import { useBulkCreateSalaryRecords } from '../hooks/useSalary';
import type { CreateSalaryRecordPayload } from '@schoolos/types';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function defaultDueDate(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 7).toISOString().slice(0, 10);
}

interface Row {
  key: string;
  employeeName: string;
  designation: string;
  amount: string;
  month: string;
  year: number;
  dueDate: string;
}

function newRow(): Row {
  const now = new Date();
  return {
    key: crypto.randomUUID(), employeeName: '', designation: '', amount: '',
    month: MONTHS[now.getMonth()], year: now.getFullYear(), dueDate: defaultDueDate(),
  };
}

const cellCls = 'w-full h-9 px-2 rounded-lg border border-gray-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-[#A855F7]/30 focus:border-[#5B21B6]';

interface Props {
  onClose: () => void;
}

export function BulkAddSalaryModal({ onClose }: Props) {
  const { mutateAsync, isPending, error } = useBulkCreateSalaryRecords();
  const [rows, setRows] = useState<Row[]>([newRow(), newRow(), newRow()]);
  const [localErr, setLocalErr] = useState('');

  function updateRow(key: string, field: keyof Row, value: string | number) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, [field]: value } : r)));
  }

  function addRow() {
    setRows((prev) => [...prev, newRow()]);
  }

  function removeRow(key: string) {
    setRows((prev) => prev.filter((r) => r.key !== key));
  }

  async function handleSave() {
    setLocalErr('');
    const filled = rows.filter((r) => r.employeeName.trim() || r.designation.trim() || r.amount.trim());
    if (!filled.length) return setLocalErr('Add at least one row.');

    for (const r of filled) {
      if (!r.employeeName.trim()) return setLocalErr('Every row needs an employee name.');
      if (!r.designation.trim()) return setLocalErr('Every row needs a role/designation.');
      const amt = parseFloat(r.amount);
      if (isNaN(amt) || amt <= 0) return setLocalErr(`Enter a valid amount for ${r.employeeName}.`);
      if (!r.dueDate) return setLocalErr(`Set a due date for ${r.employeeName}.`);
    }

    const payload: CreateSalaryRecordPayload[] = filled.map((r) => ({
      employeeName: r.employeeName.trim(),
      designation: r.designation.trim(),
      month: r.month,
      year: r.year,
      amount: Math.round(parseFloat(r.amount) * 100) / 100,
      dueDate: r.dueDate,
    }));

    await mutateAsync(payload);
    onClose();
  }

  const displayErr = localErr || (error instanceof Error ? error.message : null);

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-4xl rounded-t-2xl sm:rounded-2xl p-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-4 h-4 text-gray-400" /> Bulk Add Salary Records
          </h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100"><X className="w-4 h-4 text-gray-500" /></button>
        </div>
        <p className="text-xs text-gray-400 mb-4">Fill in as many rows as needed, then save them all in one click.</p>

        <div className="overflow-x-auto -mx-1 px-1">
          <table className="w-full min-w-[820px] text-xs">
            <thead>
              <tr className="text-[10px] text-gray-400 uppercase tracking-wide">
                <th className="text-left font-semibold px-2 py-1.5 min-w-[160px]">Employee Name</th>
                <th className="text-left font-semibold px-2 py-1.5 min-w-[150px]">Role / Designation</th>
                <th className="text-left font-semibold px-2 py-1.5 min-w-[110px]">Salary (₹)</th>
                <th className="text-left font-semibold px-2 py-1.5 min-w-[110px]">Month</th>
                <th className="text-left font-semibold px-2 py-1.5 min-w-[90px]">Year</th>
                <th className="text-left font-semibold px-2 py-1.5 min-w-[130px]">Due Date</th>
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.key}>
                  <td className="px-2 py-1"><input value={r.employeeName} onChange={(e) => updateRow(r.key, 'employeeName', e.target.value)} className={cellCls} placeholder="e.g. Priya Sharma" /></td>
                  <td className="px-2 py-1"><input value={r.designation} onChange={(e) => updateRow(r.key, 'designation', e.target.value)} className={cellCls} placeholder="e.g. Math Teacher" /></td>
                  <td className="px-2 py-1"><input type="number" min={0} step={0.01} value={r.amount} onChange={(e) => updateRow(r.key, 'amount', e.target.value)} className={cellCls} placeholder="0.00" /></td>
                  <td className="px-2 py-1">
                    <select value={r.month} onChange={(e) => updateRow(r.key, 'month', e.target.value)} className={cellCls}>
                      {MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </td>
                  <td className="px-2 py-1"><input type="number" value={r.year} onChange={(e) => updateRow(r.key, 'year', Number(e.target.value))} className={cellCls} /></td>
                  <td className="px-2 py-1"><input type="date" value={r.dueDate} onChange={(e) => updateRow(r.key, 'dueDate', e.target.value)} className={cellCls} /></td>
                  <td className="px-1 py-1">
                    <button type="button" onClick={() => removeRow(r.key)} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <button
          type="button"
          onClick={addRow}
          className="mt-2 h-9 px-3 rounded-lg border border-dashed border-gray-300 text-xs font-semibold text-gray-500 hover:border-gray-400 hover:text-gray-700 flex items-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" /> Add Row
        </button>

        {displayErr && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2 mt-4">
            <AlertCircle className="w-4 h-4 shrink-0" /> {displayErr}
          </div>
        )}

        <button
          type="button"
          disabled={isPending}
          onClick={handleSave}
          className="w-full h-11 mt-4 bg-[#5B21B6] hover:bg-[#4C1D95] disabled:opacity-60 text-white font-semibold rounded-xl text-sm flex items-center justify-center gap-2"
        >
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Save All Records
        </button>
      </div>
    </div>
  );
}
