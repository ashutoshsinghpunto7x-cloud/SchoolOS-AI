import { useState, FormEvent } from 'react';
import { X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useCreateStockMovement } from '../hooks/useInventory';
import type { InventoryItem, StockMovementType } from '@schoolos/types';

interface StockMovementModalProps {
  item: InventoryItem;
  onClose: () => void;
}

const TYPES: { value: StockMovementType; label: string }[] = [
  { value: 'issued',   label: 'Issue (stock out)' },
  { value: 'returned', label: 'Return (stock in)' },
  { value: 'damaged',  label: 'Mark Damaged' },
  { value: 'lost',     label: 'Mark Lost' },
];

const fieldCls =
  'w-full h-12 px-4 rounded-xl border border-gray-200 bg-white text-base text-gray-900 placeholder:text-gray-400 ' +
  'focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors';
const labelCls = 'block text-sm font-semibold text-gray-700 mb-1.5';

export function StockMovementModal({ item, onClose }: StockMovementModalProps) {
  const { mutateAsync: createMovement, isPending } = useCreateStockMovement(item._id);

  const [type, setType] = useState<StockMovementType>('issued');
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (qty <= 0) return setError('Quantity must be positive');

    try {
      await createMovement({ type, qty, note: note.trim() || undefined });
      toast.success('Stock movement recorded');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record movement');
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Update Stock</h2>
            <p className="text-xs text-gray-500">{item.itemName} · {item.qtyAvailable} available</p>
          </div>
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className={labelCls}>Movement type *</label>
            <select className={fieldCls} value={type} onChange={(e) => setType(e.target.value as StockMovementType)}>
              {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          <div>
            <label className={labelCls}>Quantity *</label>
            <input type="number" min={1} className={fieldCls} value={qty} onChange={(e) => setQty(Number(e.target.value))} />
          </div>

          <div>
            <label className={labelCls}>Note</label>
            <input className={fieldCls} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional" />
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
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />} Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
