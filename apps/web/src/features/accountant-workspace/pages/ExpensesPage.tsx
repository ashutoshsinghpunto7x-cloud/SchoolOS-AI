import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Plus, X, Loader2, AlertCircle, Receipt, CheckCircle2, Zap, Wrench, Fuel, Package, MoreHorizontal,
} from 'lucide-react';
import {
  useExpenseList, useExpenseSummary, useCreateExpenseRecord, useUpdateExpenseRecord,
} from '../hooks/useExpense';
import type { ExpenseRecord, ExpenseCategory } from '@schoolos/types';
import { cn } from '@/lib/utils';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

const inputCls = 'w-full h-11 px-3.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#A855F7]/30 focus:border-[#5B21B6]';
const labelCls = 'block text-xs font-semibold text-gray-600 mb-1';

const CATEGORIES: { value: ExpenseCategory; label: string; icon: React.ElementType }[] = [
  { value: 'electricity', label: 'Electricity', icon: Zap },
  { value: 'maintenance', label: 'Maintenance', icon: Wrench },
  { value: 'fuel',        label: 'Fuel',        icon: Fuel },
  { value: 'supplies',    label: 'Supplies',     icon: Package },
  { value: 'other',       label: 'Other',        icon: MoreHorizontal },
];

const categoryMeta = (c: ExpenseCategory) => CATEGORIES.find((x) => x.value === c) ?? CATEGORIES[4];

// ── Expense row ────────────────────────────────────────────────────────────────

function ExpenseRow({ exp, onOpen }: { exp: ExpenseRecord; onOpen: () => void }) {
  const { mutate: approve, isPending } = useUpdateExpenseRecord(exp._id);
  const meta = categoryMeta(exp.category);
  const Icon = meta.icon;

  return (
    <div className="w-full bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3 hover:border-[#A855F7]/30 transition-colors">
      <button onClick={onOpen} className="flex items-center gap-3 flex-1 min-w-0 text-left">
        <div className="w-10 h-10 rounded-xl bg-[#A855F7]/10 flex items-center justify-center text-[#5B21B6] shrink-0">
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-900 truncate">{exp.title}</p>
          <p className="text-xs text-gray-400">{meta.label} · {new Date(exp.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
        </div>
      </button>
      <div className="text-right shrink-0">
        <p className="text-sm font-bold text-gray-800">{fmt(exp.amount)}</p>
        {exp.status === 'approved' ? (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 mt-1">
            <CheckCircle2 className="w-3 h-3" /> Approved
          </span>
        ) : (
          <button
            type="button"
            disabled={isPending}
            onClick={() => approve({ status: 'approved' })}
            className="mt-1.5 h-7 px-2.5 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-60 text-emerald-600 rounded-lg text-[11px] font-semibold"
          >
            {isPending ? 'Approving…' : 'Approve'}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Add / Edit Expense Modal ──────────────────────────────────────────────────

function ExpenseFormModal({ existing, onClose }: { existing?: ExpenseRecord; onClose: () => void }) {
  const { mutateAsync: create, isPending: creating, error: createErr } = useCreateExpenseRecord();
  const { mutateAsync: update, isPending: updating, error: updateErr } = useUpdateExpenseRecord(existing?._id ?? '');

  const [title, setTitle] = useState(existing?.title ?? '');
  const [category, setCategory] = useState<ExpenseCategory>(existing?.category ?? 'other');
  const [amount, setAmount] = useState(existing ? String(existing.amount) : '');
  const [date, setDate] = useState(existing?.date.slice(0, 10) ?? new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [localErr, setLocalErr] = useState('');

  const isPending = creating || updating;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLocalErr('');
    const amt = parseFloat(amount);
    if (!title.trim()) return setLocalErr('Expense name is required.');
    if (isNaN(amt) || amt <= 0) return setLocalErr('Enter a valid amount.');

    if (existing) {
      await update({ title: title.trim(), category, amount: Math.round(amt * 100) / 100, date, notes: notes.trim() || undefined });
    } else {
      await create({ title: title.trim(), category, amount: Math.round(amt * 100) / 100, date, notes: notes.trim() || undefined });
    }
    onClose();
  }

  const displayErr = localErr || (createErr instanceof Error ? createErr.message : null) || (updateErr instanceof Error ? updateErr.message : null);

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-5 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-gray-900">{existing ? 'Edit Expense' : 'Add Expense'}</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100"><X className="w-4 h-4 text-gray-500" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className={labelCls}>Expense Name</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} placeholder="e.g. Monthly Electricity Bill" />
          </div>
          <div>
            <label className={labelCls}>Category</label>
            <div className="grid grid-cols-3 gap-2">
              {CATEGORIES.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setCategory(value)}
                  className={cn(
                    'flex flex-col items-center gap-1 py-2.5 rounded-xl border text-xs font-semibold transition-colors',
                    category === value ? 'border-[#5B21B6] bg-[#A855F7]/5 text-[#5B21B6]' : 'border-gray-200 text-gray-500 hover:bg-gray-50',
                  )}
                >
                  <Icon className="w-4 h-4" /> {label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Amount (₹)</label>
              <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} min={1} step={0.01} className={inputCls} placeholder="0.00" />
            </div>
            <div>
              <label className={labelCls}>Date</label>
              <input type="date" value={date} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setDate(e.target.value)} className={inputCls} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Notes (Optional)</label>
            <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} className={inputCls} placeholder="Vendor, reference, etc." />
          </div>
          {displayErr && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">
              <AlertCircle className="w-4 h-4 shrink-0" /> {displayErr}
            </div>
          )}
          <button type="submit" disabled={isPending} className="w-full h-11 bg-[#5B21B6] hover:bg-[#4C1D95] disabled:opacity-60 text-white font-semibold rounded-xl text-sm flex items-center justify-center gap-2">
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null} {existing ? 'Save Changes' : 'Add Expense'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function ExpensesPage() {
  const navigate = useNavigate();
  const [category, setCategory] = useState<'all' | ExpenseCategory>('all');
  const [formTarget, setFormTarget] = useState<ExpenseRecord | 'new' | null>(null);

  const { data, isLoading } = useExpenseList({ category: category === 'all' ? undefined : category, limit: 100 });
  const { data: summary } = useExpenseSummary();

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="bg-white border-b border-gray-100 px-4 py-4 flex items-center gap-3">
        <button onClick={() => navigate('/accountant')} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors lg:hidden">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="flex-1">
          <h1 className="text-base font-bold text-gray-900">Expenses</h1>
        </div>
        <button
          onClick={() => setFormTarget('new')}
          className="h-9 px-3 bg-[#5B21B6] hover:bg-[#4C1D95] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" /> Add
        </button>
      </div>

      <div className="px-4 py-4 max-w-4xl mx-auto space-y-4">
        {/* Summary */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3">
            <p className="text-lg font-bold text-amber-600">{fmt(summary?.totalPending ?? 0)}</p>
            <p className="text-xs text-amber-500 font-medium">Pending ({summary?.pendingCount ?? 0})</p>
          </div>
          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl px-4 py-3">
            <p className="text-lg font-bold text-emerald-600">{fmt(summary?.totalApproved ?? 0)}</p>
            <p className="text-xs text-emerald-500 font-medium">Approved ({summary?.approvedCount ?? 0})</p>
          </div>
        </div>

        {/* Category filter */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setCategory('all')}
            className={cn('px-3.5 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-colors', category === 'all' ? 'bg-[#5B21B6] text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50')}
          >
            All
          </button>
          {CATEGORIES.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setCategory(value)}
              className={cn('px-3.5 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-colors', category === value ? 'bg-[#5B21B6] text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50')}
            >
              {label}
            </button>
          ))}
        </div>

        {/* List */}
        {isLoading ? (
          <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-16 bg-white rounded-2xl border border-gray-100 animate-pulse" />)}</div>
        ) : !data?.data.length ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
            <Receipt className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-gray-700">No expenses recorded yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {data.data.map((exp) => (
              <ExpenseRow key={exp._id} exp={exp} onOpen={() => setFormTarget(exp)} />
            ))}
          </div>
        )}
      </div>

      {formTarget && (
        <ExpenseFormModal
          existing={formTarget === 'new' ? undefined : formTarget}
          onClose={() => setFormTarget(null)}
        />
      )}
    </div>
  );
}
