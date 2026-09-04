import { useState, FormEvent } from 'react';
import { X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useCreateAsset } from '../hooks/useAssets';
import { useEmployeeDirectory } from '@/features/employees/hooks/useEmployees';
import { useVendorList } from '@/features/vendors/hooks/useVendors';
import type { AssetCategory } from '@schoolos/types';

interface AddAssetModalProps {
  onClose: () => void;
}

const CATEGORIES: { value: AssetCategory; label: string }[] = [
  { value: 'computers',    label: 'Computers' },
  { value: 'printers',     label: 'Printers' },
  { value: 'projectors',   label: 'Projectors' },
  { value: 'ac_units',     label: 'AC Units' },
  { value: 'desks',        label: 'Desks' },
  { value: 'smart_boards', label: 'Smart Boards' },
  { value: 'vehicles',     label: 'Vehicles' },
  { value: 'other',        label: 'Other' },
];

const fieldCls =
  'w-full h-12 px-4 rounded-xl border border-gray-200 bg-white text-base text-gray-900 placeholder:text-gray-400 ' +
  'focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors';
const labelCls = 'block text-sm font-semibold text-gray-700 mb-1.5';

export function AddAssetModal({ onClose }: AddAssetModalProps) {
  const { mutateAsync: createAsset, isPending } = useCreateAsset();
  const { data: vendorData } = useVendorList({ status: 'active', limit: 100 });

  const [name, setName] = useState('');
  const [category, setCategory] = useState<AssetCategory>('computers');
  const [location, setLocation] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [purchaseCost, setPurchaseCost] = useState<number | ''>('');
  const [vendorId, setVendorId] = useState('');
  const [warrantyExpiry, setWarrantyExpiry] = useState('');
  const [amcExpiry, setAmcExpiry] = useState('');

  const [staffSearch, setStaffSearch] = useState('');
  const [assignedTo, setAssignedTo] = useState<{ id: string; label: string } | null>(null);
  const { data: staffMatches } = useEmployeeDirectory(staffSearch);

  const [error, setError] = useState('');

  const vendors = vendorData?.data ?? [];

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!name.trim()) return setError('Asset name is required');
    if (!location.trim()) return setError('Location is required');

    try {
      await createAsset({
        name: name.trim(),
        category,
        location: location.trim(),
        purchaseDate: purchaseDate || undefined,
        purchaseCost: purchaseCost === '' ? undefined : purchaseCost,
        vendorId: vendorId || undefined,
        warrantyExpiry: warrantyExpiry || undefined,
        amcExpiry: amcExpiry || undefined,
        assignedTo: assignedTo?.id,
      });
      toast.success('Asset added');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add asset');
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white">
          <h2 className="text-lg font-bold text-gray-900">Add Asset</h2>
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className={labelCls}>Asset name *</label>
            <input className={fieldCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Epson Projector" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Category *</label>
              <select className={fieldCls} value={category} onChange={(e) => setCategory(e.target.value as AssetCategory)}>
                {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Location *</label>
              <input className={fieldCls} value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Room 4B" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Purchase date</label>
              <input type="date" className={fieldCls} value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Purchase cost (₹)</label>
              <input
                type="number" min={0} step="0.01" className={fieldCls} value={purchaseCost}
                onChange={(e) => setPurchaseCost(e.target.value === '' ? '' : Number(e.target.value))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Warranty expiry</label>
              <input type="date" className={fieldCls} value={warrantyExpiry} onChange={(e) => setWarrantyExpiry(e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>AMC expiry</label>
              <input type="date" className={fieldCls} value={amcExpiry} onChange={(e) => setAmcExpiry(e.target.value)} />
            </div>
          </div>

          <div>
            <label className={labelCls}>Vendor</label>
            <select className={fieldCls} value={vendorId} onChange={(e) => setVendorId(e.target.value)}>
              <option value="">None</option>
              {vendors.map((v) => <option key={v._id} value={v._id}>{v.name}</option>)}
            </select>
          </div>

          <div>
            <label className={labelCls}>Assigned to (optional)</label>
            <input
              className={fieldCls}
              placeholder="Search staff by name…"
              value={assignedTo ? assignedTo.label : staffSearch}
              onChange={(e) => { setAssignedTo(null); setStaffSearch(e.target.value); }}
            />
            {!assignedTo && staffMatches && staffMatches.length > 0 && (
              <div className="mt-1 border border-gray-100 rounded-xl overflow-hidden divide-y divide-gray-50">
                {staffMatches.map((s) => (
                  <button
                    type="button" key={s._id}
                    onClick={() => { setAssignedTo({ id: s._id, label: s.fullName }); setStaffSearch(''); }}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50"
                  >
                    <span className="font-medium text-gray-900">{s.fullName}</span>
                    <span className="text-gray-400"> · {s.designation}</span>
                  </button>
                ))}
              </div>
            )}
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
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />} Add Asset
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
