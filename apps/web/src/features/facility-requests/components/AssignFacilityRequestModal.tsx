import { useState, FormEvent } from 'react';
import { X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAssignFacilityRequest } from '../hooks/useFacilityRequests';
import { useEmployeeDirectory } from '@/features/employees/hooks/useEmployees';
import { useVendorList } from '@/features/vendors/hooks/useVendors';
import type { FacilityRequest, FacilityAssignedToType } from '@schoolos/types';

interface AssignFacilityRequestModalProps {
  request: FacilityRequest;
  onClose: () => void;
}

const fieldCls =
  'w-full h-12 px-4 rounded-xl border border-gray-200 bg-white text-base text-gray-900 placeholder:text-gray-400 ' +
  'focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors';
const labelCls = 'block text-sm font-semibold text-gray-700 mb-1.5';

export function AssignFacilityRequestModal({ request, onClose }: AssignFacilityRequestModalProps) {
  const { mutateAsync: assign, isPending } = useAssignFacilityRequest();
  const { data: vendorData } = useVendorList({ status: 'active', limit: 100 });

  const [assignedToType, setAssignedToType] = useState<FacilityAssignedToType>('employee');
  const [staffSearch, setStaffSearch] = useState('');
  const [picked, setPicked] = useState<{ id: string; label: string } | null>(null);
  const { data: staffMatches } = useEmployeeDirectory(staffSearch);
  const [vendorId, setVendorId] = useState('');
  const [error, setError] = useState('');

  const vendors = vendorData?.data ?? [];

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    let assignedToId = '';
    let assignedToName = '';
    if (assignedToType === 'employee') {
      if (!picked) return setError('Select a staff member');
      assignedToId = picked.id;
      assignedToName = picked.label;
    } else {
      const vendor = vendors.find((v) => v._id === vendorId);
      if (!vendor) return setError('Select a vendor');
      assignedToId = vendor._id;
      assignedToName = vendor.name;
    }

    try {
      await assign({ id: request._id, payload: { assignedToType, assignedToId, assignedToName } });
      toast.success('Ticket assigned');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign ticket');
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Assign Ticket</h2>
            <p className="text-xs text-gray-500 font-mono">{request.ticketNo}</p>
          </div>
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className={labelCls}>Assign to</label>
            <div className="flex gap-2">
              <button
                type="button" onClick={() => { setAssignedToType('employee'); setVendorId(''); }}
                className={`flex-1 h-10 rounded-xl text-sm font-semibold border ${assignedToType === 'employee' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-gray-200 text-gray-600'}`}
              >
                Internal Staff
              </button>
              <button
                type="button" onClick={() => { setAssignedToType('vendor'); setPicked(null); }}
                className={`flex-1 h-10 rounded-xl text-sm font-semibold border ${assignedToType === 'vendor' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-gray-200 text-gray-600'}`}
              >
                Vendor
              </button>
            </div>
          </div>

          {assignedToType === 'employee' ? (
            <div>
              <label className={labelCls}>Staff member *</label>
              <input
                className={fieldCls}
                placeholder="Search staff by name…"
                value={picked ? picked.label : staffSearch}
                onChange={(e) => { setPicked(null); setStaffSearch(e.target.value); }}
              />
              {!picked && staffMatches && staffMatches.length > 0 && (
                <div className="mt-1 border border-gray-100 rounded-xl overflow-hidden divide-y divide-gray-50">
                  {staffMatches.map((s) => (
                    <button
                      type="button" key={s._id}
                      onClick={() => { setPicked({ id: s._id, label: s.fullName }); setStaffSearch(''); }}
                      className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50"
                    >
                      <span className="font-medium text-gray-900">{s.fullName}</span>
                      <span className="text-gray-400"> · {s.designation}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div>
              <label className={labelCls}>Vendor *</label>
              <select className={fieldCls} value={vendorId} onChange={(e) => setVendorId(e.target.value)}>
                <option value="">Select a vendor…</option>
                {vendors.map((v) => <option key={v._id} value={v._id}>{v.name}</option>)}
              </select>
            </div>
          )}

          {error && <p className="text-sm text-rose-600">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 h-12 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50">
              Cancel
            </button>
            <button
              type="submit" disabled={isPending}
              className="flex-1 h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />} Assign
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
