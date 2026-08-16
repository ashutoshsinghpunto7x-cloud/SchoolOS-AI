import { useState } from 'react';
import { X, Loader2, AlertCircle, Package, Wrench, Zap, Briefcase, MoreHorizontal } from 'lucide-react';
import { useCreateVendor, useUpdateVendor } from '../hooks/useVendors';
import type { Vendor, VendorCategory } from '@schoolos/types';
import { cn } from '@/lib/utils';

const inputCls = 'w-full h-11 px-3.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#A855F7]/30 focus:border-[#5B21B6]';
const labelCls = 'block text-xs font-semibold text-gray-600 mb-1';

const CATEGORIES: { value: VendorCategory; label: string; icon: React.ElementType }[] = [
  { value: 'supplies',    label: 'Supplies',    icon: Package },
  { value: 'services',    label: 'Services',    icon: Briefcase },
  { value: 'maintenance', label: 'Maintenance', icon: Wrench },
  { value: 'utilities',   label: 'Utilities',   icon: Zap },
  { value: 'other',       label: 'Other',       icon: MoreHorizontal },
];

interface Props {
  existing?: Vendor;
  onClose: () => void;
  onSuccess?: (vendor: Vendor) => void;
}

export function VendorFormModal({ existing, onClose, onSuccess }: Props) {
  const { mutateAsync: create, isPending: creating, error: createErr } = useCreateVendor();
  const { mutateAsync: update, isPending: updating, error: updateErr } = useUpdateVendor(existing?._id ?? '');

  const [name, setName] = useState(existing?.name ?? '');
  const [category, setCategory] = useState<VendorCategory>(existing?.category ?? 'supplies');
  const [contactPerson, setContactPerson] = useState(existing?.contactPerson ?? '');
  const [phone, setPhone] = useState(existing?.phone ?? '');
  const [email, setEmail] = useState(existing?.email ?? '');
  const [gstNumber, setGstNumber] = useState(existing?.gstNumber ?? '');
  const [address, setAddress] = useState(existing?.address ?? '');
  const [localErr, setLocalErr] = useState('');

  const isPending = creating || updating;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLocalErr('');
    if (!name.trim()) return setLocalErr('Vendor name is required.');

    const payload = {
      name: name.trim(),
      category,
      contactPerson: contactPerson.trim() || undefined,
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      gstNumber: gstNumber.trim() || undefined,
      address: address.trim() || undefined,
    };

    const result = existing ? await update(payload) : await create(payload);
    onSuccess?.(result);
    onClose();
  }

  const displayErr = localErr || (createErr instanceof Error ? createErr.message : null) || (updateErr instanceof Error ? updateErr.message : null);

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-5 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-gray-900">{existing ? 'Edit Vendor' : 'Add Vendor'}</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100"><X className="w-4 h-4 text-gray-500" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className={labelCls}>Vendor Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="e.g. Sharma Stationers" autoFocus />
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
              <label className={labelCls}>Contact Person</label>
              <input type="text" value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} className={inputCls} placeholder="Optional" />
            </div>
            <div>
              <label className={labelCls}>Phone</label>
              <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} placeholder="Optional" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} placeholder="Optional" />
            </div>
            <div>
              <label className={labelCls}>GST Number</label>
              <input type="text" value={gstNumber} onChange={(e) => setGstNumber(e.target.value)} className={inputCls} placeholder="Optional" />
            </div>
          </div>
          <div>
            <label className={labelCls}>Address</label>
            <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} className={inputCls} placeholder="Optional" />
          </div>
          {displayErr && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">
              <AlertCircle className="w-4 h-4 shrink-0" /> {displayErr}
            </div>
          )}
          <button type="submit" disabled={isPending} className="w-full h-11 bg-[#5B21B6] hover:bg-[#4C1D95] disabled:opacity-60 text-white font-semibold rounded-xl text-sm flex items-center justify-center gap-2">
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null} {existing ? 'Save Changes' : 'Add Vendor'}
          </button>
        </form>
      </div>
    </div>
  );
}
