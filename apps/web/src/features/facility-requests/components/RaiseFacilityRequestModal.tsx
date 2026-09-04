import { useState, FormEvent } from 'react';
import { X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useCreateFacilityRequest } from '../hooks/useFacilityRequests';
import { useAssets } from '@/features/assets/hooks/useAssets';
import type { FacilityIssueType, FacilityRequestPriority } from '@schoolos/types';

interface RaiseFacilityRequestModalProps {
  onClose: () => void;
}

const ISSUE_TYPES: { value: FacilityIssueType; label: string }[] = [
  { value: 'electrical', label: 'Electrical Issue' },
  { value: 'plumbing',   label: 'Plumbing Issue' },
  { value: 'furniture',  label: 'Furniture Repair' },
  { value: 'computer',   label: 'Computer Repair' },
  { value: 'ac',         label: 'AC Repair' },
  { value: 'other',      label: 'Other' },
];

const PRIORITIES: { value: FacilityRequestPriority; label: string }[] = [
  { value: 'low',    label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high',   label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

const fieldCls =
  'w-full h-12 px-4 rounded-xl border border-gray-200 bg-white text-base text-gray-900 placeholder:text-gray-400 ' +
  'focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors';
const labelCls = 'block text-sm font-semibold text-gray-700 mb-1.5';

export function RaiseFacilityRequestModal({ onClose }: RaiseFacilityRequestModalProps) {
  const { mutateAsync: createRequest, isPending } = useCreateFacilityRequest();
  const { data: assetData } = useAssets({ limit: 100 });

  const [issueType, setIssueType] = useState<FacilityIssueType>('electrical');
  const [priority, setPriority] = useState<FacilityRequestPriority>('medium');
  const [location, setLocation] = useState('');
  const [assetId, setAssetId] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  const assets = assetData?.data ?? [];

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!location.trim()) return setError('Location is required');

    try {
      await createRequest({
        issueType, priority, location: location.trim(),
        assetId: assetId || undefined,
        description: description.trim() || undefined,
      });
      toast.success('Facility request raised');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to raise request');
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white">
          <h2 className="text-lg font-bold text-gray-900">Raise Facility Request</h2>
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Issue type *</label>
              <select className={fieldCls} value={issueType} onChange={(e) => setIssueType(e.target.value as FacilityIssueType)}>
                {ISSUE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Priority</label>
              <select className={fieldCls} value={priority} onChange={(e) => setPriority(e.target.value as FacilityRequestPriority)}>
                {PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className={labelCls}>Location *</label>
            <input className={fieldCls} value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Room 2A" />
          </div>

          {assets.length > 0 && (
            <div>
              <label className={labelCls}>Related asset (optional)</label>
              <select className={fieldCls} value={assetId} onChange={(e) => setAssetId(e.target.value)}>
                <option value="">None</option>
                {assets.map((a) => <option key={a._id} value={a._id}>{a.name} ({a.assetId})</option>)}
              </select>
            </div>
          )}

          <div>
            <label className={labelCls}>Description</label>
            <textarea
              className={`${fieldCls} h-24 py-3`} value={description}
              onChange={(e) => setDescription(e.target.value)} placeholder="What's wrong?"
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
