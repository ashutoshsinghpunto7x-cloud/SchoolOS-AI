import { useState } from 'react';
import { toast } from 'sonner';
import { Check, X, Loader2, CalendarClock } from 'lucide-react';
import { PageContainer } from '@/components/workspace/PageContainer';
import { WorkspaceHeader } from '@/components/workspace/WorkspaceHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  usePendingLeaveRequests,
  useApproveLeaveRequest,
  useRejectLeaveRequest,
} from '@/features/leave-requests/hooks/useLeaveRequests';
import type { LeaveRequest } from '@schoolos/types';

function RequestCard({ request }: { request: LeaveRequest }) {
  const [showRejectNote, setShowRejectNote] = useState(false);
  const [reviewNote, setReviewNote] = useState('');
  const approve = useApproveLeaveRequest();
  const reject = useRejectLeaveRequest();
  const isPending = approve.isPending || reject.isPending;

  async function handleApprove() {
    try {
      await approve.mutateAsync(request._id);
      toast.success(`Approved — ${request.teacherName}'s leave request.`);
    } catch (err) {
      toast.error('Failed to approve', { description: err instanceof Error ? err.message : undefined });
    }
  }

  async function handleReject() {
    try {
      await reject.mutateAsync({ id: request._id, payload: { reviewNote: reviewNote.trim() || undefined } });
      toast.success('Leave request rejected');
    } catch (err) {
      toast.error('Failed to reject', { description: err instanceof Error ? err.message : undefined });
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <p className="text-base font-bold text-gray-900">{request.teacherName}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {request.leaveType === 'full_day' ? 'Full day' : 'Half day'}
            {' · '}
            {request.dateFrom === request.dateTo ? request.dateFrom : `${request.dateFrom} – ${request.dateTo}`}
          </p>
        </div>
      </div>

      <p className="text-sm text-gray-600 mb-5">{request.reason}</p>

      {showRejectNote && (
        <textarea
          value={reviewNote}
          onChange={(e) => setReviewNote(e.target.value)}
          placeholder="Optional note for the teacher…"
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

export const LeaveApprovalsPage = () => {
  const { data: requests, isLoading, isError } = usePendingLeaveRequests();

  return (
    <PageContainer>
      <WorkspaceHeader
        title="Leave Approvals"
        subtitle="Teacher leave requests awaiting your decision"
        backTo="/principal"
        backLabel="Principal Dashboard"
      />

      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm h-40 animate-pulse" />
          ))}
        </div>
      ) : isError ? (
        <EmptyState icon={CalendarClock} title="Could not load leave requests" description="Check your connection and try refreshing." />
      ) : !requests?.length ? (
        <EmptyState icon={CalendarClock} title="No pending leave requests" description="Teacher leave requests will show up here for review." />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {requests.map((r) => (
            <RequestCard key={r._id} request={r} />
          ))}
        </div>
      )}
    </PageContainer>
  );
};
