import { useState, FormEvent } from 'react';
import { X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useCreateInventoryItem } from '../hooks/useInventory';
import type { InventoryCategory } from '@schoolos/types';

interface AddInventoryItemModalProps {
  onClose: () => void;
}

const CATEGORIES: { value: InventoryCategory; label: string }[] = [
  { value: 'stationery',          label: 'Stationery' },
  { value: 'furniture',           label: 'Furniture' },
  { value: 'it_equipment',        label: 'IT Equipment' },
  { value: 'sports_equipment',    label: 'Sports Equipment' },
  { value: 'electrical',          label: 'Electrical' },
  { value: 'lab_equipment',       label: 'Lab Equipment' },
  { value: 'cleaning_materials',  label: 'Cleaning Materials' },
  { value: 'consumables',         label: 'Consumables' },
  { value: 'other',               label: 'Other' },
];

const fieldCls =
  'w-full h-12 px-4 rounded-xl border border-gray-200 bg-white text-base text-gray-900 placeholder:text-gray-400 ' +
  'focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors';
const labelCls = 'block text-sm font-semibold text-gray-700 mb-1.5';

export function AddInventoryItemModal({ onClose }: AddInventoryItemModalProps) {
  const { mutateAsync: createItem, isPending } = useCreateInventoryItem();

  const [itemName, setItemName] = useState('');
  const [category, setCategory] = useState<InventoryCategory>('stationery');
  const [qtyAvailable, setQtyAvailable] = useState(0);
  const [minStockLevel, setMinStockLevel] = useState(0);
  const [unitPrice, setUnitPrice] = useState<number | ''>('');
  const [storageLocation, setStorageLocation] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!itemName.trim()) return setError('Item name is required');

    try {
      await createItem({
        itemName: itemName.trim(),
        category,
        qtyAvailable,
        minStockLevel,
        unitPrice: unitPrice === '' ? undefined : unitPrice,
        storageLocation: storageLocation.trim() || undefined,
      });
      toast.success('Item added to inventory');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add item');
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white">
          <h2 className="text-lg font-bold text-gray-900">Add Inventory Item</h2>
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className={labelCls}>Item name *</label>
            <input className={fieldCls} value={itemName} onChange={(e) => setItemName(e.target.value)} placeholder="e.g. A4 Paper Ream" />
          </div>

          <div>
            <label className={labelCls}>Category *</label>
            <select className={fieldCls} value={category} onChange={(e) => setCategory(e.target.value as InventoryCategory)}>
              {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Opening quantity</label>
              <input type="number" min={0} className={fieldCls} value={qtyAvailable} onChange={(e) => setQtyAvailable(Number(e.target.value))} />
            </div>
            <div>
              <label className={labelCls}>Minimum stock level</label>
              <input type="number" min={0} className={fieldCls} value={minStockLevel} onChange={(e) => setMinStockLevel(Number(e.target.value))} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Unit price (₹)</label>
              <input
                type="number" min={0} step="0.01" className={fieldCls} value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value === '' ? '' : Number(e.target.value))}
              />
            </div>
            <div>
              <label className={labelCls}>Storage location</label>
              <input className={fieldCls} value={storageLocation} onChange={(e) => setStorageLocation(e.target.value)} placeholder="e.g. Store Room B" />
            </div>
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
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />} Add Item
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
