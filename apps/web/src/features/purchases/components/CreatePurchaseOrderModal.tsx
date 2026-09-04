import { useState, FormEvent, useMemo } from 'react';
import { X, Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useCreatePurchaseOrder, usePurchaseRequests } from '../hooks/usePurchases';
import { useVendorList } from '@/features/vendors/hooks/useVendors';

interface CreatePurchaseOrderModalProps {
  onClose: () => void;
}

interface DraftLine {
  itemName: string;
  quantity: number;
  unitPrice: number;
}

const emptyLine = (): DraftLine => ({ itemName: '', quantity: 1, unitPrice: 0 });

const fieldCls =
  'w-full h-12 px-4 rounded-xl border border-gray-200 bg-white text-base text-gray-900 placeholder:text-gray-400 ' +
  'focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors';
const labelCls = 'block text-sm font-semibold text-gray-700 mb-1.5';

export function CreatePurchaseOrderModal({ onClose }: CreatePurchaseOrderModalProps) {
  const { mutateAsync: createOrder, isPending } = useCreatePurchaseOrder();
  const { data: vendorData } = useVendorList({ status: 'active', limit: 100 });
  const { data: approvedRequests } = usePurchaseRequests({ status: 'approved', limit: 100 });

  const [vendorId, setVendorId] = useState('');
  const [requestIds, setRequestIds] = useState<string[]>([]);
  const [deliveryDate, setDeliveryDate] = useState('');
  const [lines, setLines] = useState<DraftLine[]>([emptyLine()]);
  const [error, setError] = useState('');

  const vendors = vendorData?.data ?? [];
  const requests = approvedRequests?.data ?? [];

  const total = useMemo(
    () => lines.reduce((sum, l) => sum + (l.quantity || 0) * (l.unitPrice || 0), 0),
    [lines],
  );

  function updateLine(idx: number, patch: Partial<DraftLine>) {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  }

  function toggleRequest(id: string) {
    setRequestIds((prev) => (prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!vendorId) return setError('Select a vendor');
    const cleanLines = lines.filter((l) => l.itemName.trim() && l.quantity > 0 && l.unitPrice >= 0);
    if (!cleanLines.length) return setError('Add at least one line item');

    try {
      await createOrder({
        vendorId,
        requestIds,
        lineItems: cleanLines,
        deliveryDate: deliveryDate || undefined,
      });
      toast.success('Purchase order issued');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create order');
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white">
          <h2 className="text-lg font-bold text-gray-900">Issue Purchase Order</h2>
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className={labelCls}>Vendor *</label>
            <select className={fieldCls} value={vendorId} onChange={(e) => setVendorId(e.target.value)}>
              <option value="">Select a vendor…</option>
              {vendors.map((v) => <option key={v._id} value={v._id}>{v.name}</option>)}
            </select>
          </div>

          {requests.length > 0 && (
            <div>
              <label className={labelCls}>Backed by approved requests (optional)</label>
              <div className="space-y-1.5 max-h-32 overflow-y-auto border border-gray-100 rounded-xl p-2">
                {requests.map((r) => (
                  <label key={r._id} className="flex items-center gap-2 text-sm px-2 py-1.5 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input type="checkbox" checked={requestIds.includes(r._id)} onChange={() => toggleRequest(r._id)} />
                    <span className="font-mono text-xs text-gray-500">{r.requestNo}</span>
                    <span className="text-gray-700">{r.raisedByName} · {r.category.replace(/_/g, ' ')}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className={labelCls}>Delivery date</label>
            <input type="date" className={fieldCls} value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} />
          </div>

          <div>
            <label className={labelCls}>Line items *</label>
            <div className="space-y-2">
              {lines.map((line, idx) => (
                <div key={idx} className="flex gap-2 items-start">
                  <input
                    className={`${fieldCls} flex-1`} placeholder="Item name"
                    value={line.itemName} onChange={(e) => updateLine(idx, { itemName: e.target.value })}
                  />
                  <input
                    type="number" min={1} className={`${fieldCls} w-20`} placeholder="Qty"
                    value={line.quantity} onChange={(e) => updateLine(idx, { quantity: Number(e.target.value) })}
                  />
                  <input
                    type="number" min={0} step="0.01" className={`${fieldCls} w-28`} placeholder="Unit ₹"
                    value={line.unitPrice} onChange={(e) => updateLine(idx, { unitPrice: Number(e.target.value) })}
                  />
                  <button
                    type="button" onClick={() => setLines((prev) => prev.filter((_, i) => i !== idx))}
                    disabled={lines.length === 1}
                    className="h-12 w-12 flex items-center justify-center rounded-xl border border-gray-200 text-gray-400 hover:text-rose-600 hover:border-rose-200 disabled:opacity-30"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button" onClick={() => setLines((prev) => [...prev, emptyLine()])}
              className="mt-2 h-9 px-3 rounded-xl border border-dashed border-gray-300 text-xs font-semibold text-gray-500 hover:border-blue-400 hover:text-blue-600 flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> Add line
            </button>
            <p className="text-right text-sm font-semibold text-gray-700 mt-2">Total: ₹{total.toLocaleString('en-IN')}</p>
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
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />} Issue Order
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
