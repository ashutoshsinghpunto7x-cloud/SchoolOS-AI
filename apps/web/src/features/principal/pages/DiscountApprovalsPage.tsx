import { useState } from 'react';
import { toast } from 'sonner';
import { Check, X, Loader2, BadgePercent } from 'lucide-react';
import { PageContainer } from '@/components/workspace/PageContainer';
import { WorkspaceHeader } from '@/components/workspace/WorkspaceHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { usePendingDiscounts, useApproveDiscountRequest, useRejectDiscountRequest } from '@/features/fees/hooks/useFeeStructure';
import type { FeeDiscountRequest } from '@schoolos/types';

const fmt = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

function DiscountCard({ request }: { request: FeeDiscountRequest }) {
  const [showRejectNote, setShowRejectNote] = useState(false);
  const [reviewNote, setReviewNote] = useState('');
  const approve = useApproveDiscountRequest();
  const reject = useRejectDiscountRequest();
  const isPending = approve.isPending || reject.isPending;

  async function handleApprove() {
    try {
      await approve.mutateAsync({ id: request._id });
      toast.success(`Approved — ${request.studentName}'s discount has been applied.`);
    } catch (err) {
      toast.error('Failed to approve', { description: err instanceof Error ? err.message : undefined });
    }
  }

  async function handleReject() {
    try {
      await reject.mutateAsync({ id: request._id, payload: { reviewNote: reviewNote.trim() || undefined } });
      toast.success('Discount request rejected');
    } catch (err) {
      toast.error('Failed to reject', { description: err instanceof Error ? err.message : undefined });
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <p className="text-base font-bold text-gray-900 truncate">{request.studentName}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            Class {request.class}-{request.section} · Requested by{' '}
            <span className="font-semibold text-gray-600">{request.requestedByName}</span>
          </p>
        </div>
        <p className="text-lg font-bold text-emerald-600 shrink-0">{fmt(request.requestedAmount)}</p>
      </div>

      <p className="text-sm text-gray-600 mb-4">{request.reason}</p>

      {showRejectNote && (
        <textarea
          value={reviewNote}
          onChange={(e) => setReviewNote(e.target.value)}
          placeholder="Optional note for the requester…"
          rows={2}
          className="w-full mb-3 px-3 py-2 rounded-xl border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-500/20"
        />
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleApprove}
          disabled={isPending}
          className="flex-1 h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
        >
          {approve.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          Approve
        </button>
        <button
          type="button"
          onClick={() => (showRejectNote ? handleReject() : setShowRejectNote(true))}
          disabled={isPending}
          className="flex-1 h-10 rounded-xl bg-red-50 hover:bg-red-100 disabled:opacity-50 text-red-600 text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
        >
          {reject.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
          {showRejectNote ? 'Confirm Reject' : 'Reject'}
        </button>
      </div>
    </div>
  );
}

export const DiscountApprovalsPage = () => {
  const { data: requests, isLoading } = usePendingDiscounts();

  return (
    <PageContainer>
      <WorkspaceHeader
        title="Discount Approvals"
        subtitle="Fee discount requests submitted by staff, awaiting your review"
        backTo="/principal"
        backLabel="Principal Dashboard"
      />

      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm h-40 animate-pulse" />
          ))}
        </div>
      ) : !requests?.length ? (
        <EmptyState icon={BadgePercent} title="No pending discount requests" description="Fee discount requests will show up here for your review." />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {requests.map((r) => (
            <DiscountCard key={r._id} request={r} />
          ))}
        </div>
      )}
    </PageContainer>
  );
};
