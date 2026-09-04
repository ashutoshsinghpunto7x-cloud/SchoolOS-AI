import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader2, Plus, ClipboardList, Check, X as XIcon } from 'lucide-react';
import { toast } from 'sonner';
import { usePurchaseRequests, useApprovePurchaseRequest, useRejectPurchaseRequest } from '../hooks/usePurchases';
import { CreatePurchaseRequestModal } from '../components/CreatePurchaseRequestModal';
import type { PurchaseRequestStatus } from '@schoolos/types';
import { cn } from '@/lib/utils';

const STATUS_TABS: { value: PurchaseRequestStatus | 'all'; label: string }[] = [
  { value: 'pending',   label: 'Pending' },
  { value: 'approved',  label: 'Approved' },
  { value: 'converted', label: 'Converted to PO' },
  { value: 'rejected',  label: 'Rejected' },
  { value: 'all',       label: 'All' },
];

const STATUS_BADGE: Record<PurchaseRequestStatus, string> = {
  pending:   'bg-amber-100 text-amber-800',
  approved:  'bg-emerald-100 text-emerald-800',
  rejected:  'bg-rose-100 text-rose-800',
  converted: 'bg-blue-100 text-blue-800',
};

export function PurchaseRequestsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [status, setStatus] = useState<PurchaseRequestStatus | 'all'>('pending');
  const [showForm, setShowForm] = useState(searchParams.get('new') === '1');

  const { data, isLoading } = usePurchaseRequests({ status: status === 'all' ? undefined : status, limit: 100 });
  const { mutateAsync: approve } = useApprovePurchaseRequest();
  const { mutateAsync: reject } = useRejectPurchaseRequest();

  const requests = data?.data ?? [];

  function openForm() {
    setShowForm(true);
  }
  function closeForm() {
    setShowForm(false);
    if (searchParams.get('new')) setSearchParams({}, { replace: true });
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7] p-3 sm:p-6">
      <div className="w-full max-w-[1600px] mx-auto space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Purchase Requests</h1>
            <p className="text-sm sm:text-base text-gray-500 mt-1">What departments are asking to buy</p>
          </div>
          <button
            onClick={openForm}
            className="h-12 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold flex items-center justify-center gap-2 w-full sm:w-auto"
          >
            <Plus className="w-4 h-4" /> Raise Request
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {STATUS_TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => setStatus(t.value)}
              className={cn(
                'px-3.5 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-colors',
                status === t.value ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="h-64 bg-white rounded-2xl border border-gray-100 animate-pulse flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : !requests.length ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
            <ClipboardList className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-base font-semibold text-gray-700">No requests here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((r) => (
              <div key={r._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-sm font-semibold text-gray-900">{r.requestNo}</span>
                      <span className={cn('inline-flex items-center rounded-full font-medium text-xs px-2.5 py-0.5 capitalize', STATUS_BADGE[r.status])}>
                        {r.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {r.raisedByName}{r.department ? ` · ${r.department}` : ''} · <span className="capitalize">{r.category.replace(/_/g, ' ')}</span>
                    </p>
                  </div>
                  {r.status === 'pending' && (
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => approve(r._id).then(() => toast.success('Request approved')).catch((e) => toast.error(e.message))}
                        className="h-9 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5"
                      >
                        <Check className="w-3.5 h-3.5" /> Approve
                      </button>
                      <button
                        onClick={() => reject({ id: r._id }).then(() => toast.success('Request rejected')).catch((e) => toast.error(e.message))}
                        className="h-9 px-3 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 text-xs font-semibold flex items-center gap-1.5"
                      >
                        <XIcon className="w-3.5 h-3.5" /> Reject
                      </button>
                    </div>
                  )}
                </div>
                <div className="mt-3 divide-y divide-gray-50 border-t border-gray-50 pt-2">
                  {r.items.map((it, idx) => (
                    <div key={idx} className="flex justify-between py-1.5 text-sm">
                      <span className="text-gray-700">{it.name}</span>
                      <span className="text-gray-400">{it.quantity} {it.unit}{it.estimatedCost ? ` · est. ₹${it.estimatedCost}` : ''}</span>
                    </div>
                  ))}
                </div>
                {r.justification && <p className="text-xs text-gray-400 mt-2 italic">"{r.justification}"</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && <CreatePurchaseRequestModal onClose={closeForm} />}
    </div>
  );
}
