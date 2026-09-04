import { useState, FormEvent } from 'react';
import { X, Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useCreatePurchaseRequest } from '../hooks/usePurchases';
import { useEmployeeDirectory } from '@/features/employees/hooks/useEmployees';
import type { PurchaseCategory, PurchaseRequestItem } from '@schoolos/types';

interface CreatePurchaseRequestModalProps {
  onClose: () => void;
}

const CATEGORIES: { value: PurchaseCategory; label: string }[] = [
  { value: 'stationery',             label: 'Stationery' },
  { value: 'furniture',              label: 'Furniture' },
  { value: 'it_equipment',           label: 'IT Equipment' },
  { value: 'lab_equipment',          label: 'Lab Equipment' },
  { value: 'cleaning_supplies',      label: 'Cleaning Supplies' },
  { value: 'maintenance_materials',  label: 'Maintenance Materials' },
  { value: 'other',                  label: 'Other' },
];

const emptyItem = (): PurchaseRequestItem => ({ name: '', quantity: 1, unit: 'pcs', estimatedCost: undefined });

const fieldCls =
  'w-full h-12 px-4 rounded-xl border border-gray-200 bg-white text-base text-gray-900 placeholder:text-gray-400 ' +
  'focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors';
const labelCls = 'block text-sm font-semibold text-gray-700 mb-1.5';

export function CreatePurchaseRequestModal({ onClose }: CreatePurchaseRequestModalProps) {
  const { mutateAsync: createRequest, isPending } = useCreatePurchaseRequest();

  const [staffSearch, setStaffSearch] = useState('');
  const [raisedBy, setRaisedBy] = useState<{ id: string; label: string } | null>(null);
  const { data: staffMatches } = useEmployeeDirectory(staffSearch);

  const [department, setDepartment] = useState('');
  const [category, setCategory] = useState<PurchaseCategory>('stationery');
  const [items, setItems] = useState<PurchaseRequestItem[]>([emptyItem()]);
  const [justification, setJustification] = useState('');
  const [error, setError] = useState('');

  function updateItem(idx: number, patch: Partial<PurchaseRequestItem>) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!raisedBy) return setError('Select who is raising this request');
    const cleanItems = items.filter((it) => it.name.trim() && it.quantity > 0);
    if (!cleanItems.length) return setError('Add at least one item');

    try {
      await createRequest({
        raisedBy: raisedBy.id,
        department: department.trim() || undefined,
        category,
        items: cleanItems,
        justification: justification.trim() || undefined,
      });
      toast.success('Purchase request raised');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to raise request');
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white">
          <h2 className="text-lg font-bold text-gray-900">Raise Purchase Request</h2>
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className={labelCls}>Raised by *</label>
            <input
              className={fieldCls}
              placeholder="Search staff by name…"
              value={raisedBy ? raisedBy.label : staffSearch}
              onChange={(e) => { setRaisedBy(null); setStaffSearch(e.target.value); }}
            />
            {!raisedBy && staffMatches && staffMatches.length > 0 && (
              <div className="mt-1 border border-gray-100 rounded-xl overflow-hidden divide-y divide-gray-50">
                {staffMatches.map((s) => (
                  <button
                    type="button"
                    key={s._id}
                    onClick={() => { setRaisedBy({ id: s._id, label: s.fullName }); setStaffSearch(''); }}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50"
                  >
                    <span className="font-medium text-gray-900">{s.fullName}</span>
                    <span className="text-gray-400"> · {s.designation}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Department</label>
              <input className={fieldCls} value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="e.g. Physics" />
            </div>
            <div>
              <label className={labelCls}>Category *</label>
              <select className={fieldCls} value={category} onChange={(e) => setCategory(e.target.value as PurchaseCategory)}>
                {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className={labelCls}>Items *</label>
            <div className="space-y-2">
              {items.map((item, idx) => (
                <div key={idx} className="flex gap-2 items-start">
                  <input
                    className={`${fieldCls} flex-1`} placeholder="Item name"
                    value={item.name} onChange={(e) => updateItem(idx, { name: e.target.value })}
                  />
                  <input
                    type="number" min={1} className={`${fieldCls} w-20`} placeholder="Qty"
                    value={item.quantity} onChange={(e) => updateItem(idx, { quantity: Number(e.target.value) })}
                  />
                  <input
                    className={`${fieldCls} w-20`} placeholder="Unit"
                    value={item.unit} onChange={(e) => updateItem(idx, { unit: e.target.value })}
                  />
                  <button
                    type="button" onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))}
                    disabled={items.length === 1}
                    className="h-12 w-12 flex items-center justify-center rounded-xl border border-gray-200 text-gray-400 hover:text-rose-600 hover:border-rose-200 disabled:opacity-30"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button" onClick={() => setItems((prev) => [...prev, emptyItem()])}
              className="mt-2 h-9 px-3 rounded-xl border border-dashed border-gray-300 text-xs font-semibold text-gray-500 hover:border-blue-400 hover:text-blue-600 flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> Add item
            </button>
          </div>

          <div>
            <label className={labelCls}>Justification</label>
            <textarea
              className={`${fieldCls} h-24 py-3`} value={justification}
              onChange={(e) => setJustification(e.target.value)} placeholder="Why is this needed?"
            />
          </div>

          {error && <p className="text-sm text-rose-600">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 h-12 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50">
              Cancel
            </button>
            <button
              type="submit" disabled={isPending}
              className="flex-1 h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />} Raise Request
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
