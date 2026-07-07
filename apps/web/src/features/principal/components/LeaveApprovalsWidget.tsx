import { useState } from 'react';
import { Check, X, Loader2, CalendarClock } from 'lucide-react';
import { usePendingLeaveRequests, useApproveLeaveRequest, useRejectLeaveRequest } from '@/features/leave-requests/hooks/useLeaveRequests';
import type { LeaveRequest } from '@schoolos/types';

function LeaveRow({ request }: { request: LeaveRequest }) {
  const { mutateAsync: approve, isPending: approving } = useApproveLeaveRequest();
  const { mutateAsync: reject, isPending: rejecting } = useRejectLeaveRequest();
  const [rejecting_, setRejecting] = useState(false);
  const busy = approving || rejecting;

  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <div className="min-w-0">
        <p className="text-[13px] font-semibold text-gray-800 truncate">{request.teacherName}</p>
        <p className="text-[11px] text-gray-400">
          {request.leaveType === 'full_day' ? 'Full day' : 'Half day'}
          {' · '}
          {request.dateFrom === request.dateTo ? request.dateFrom : `${request.dateFrom} – ${request.dateTo}`}
        </p>
        <p className="text-[11px] text-gray-400 truncate">{request.reason}</p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          disabled={busy}
          onClick={() => void approve(request._id)}
          className="h-7 w-7 flex items-center justify-center rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-600 disabled:opacity-50"
          title="Approve"
        >
          {approving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => { setRejecting(true); void reject({ id: request._id, payload: {} }).finally(() => setRejecting(false)); }}
          className="h-7 w-7 flex items-center justify-center rounded-lg bg-red-50 hover:bg-red-100 text-red-500 disabled:opacity-50"
          title="Reject"
        >
          {rejecting_ ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );
}

export function LeaveApprovalsWidget() {
  const { data: requests, isLoading } = usePendingLeaveRequests();
  const pending = requests ?? [];

  return (
    <div className="bg-white rounded-[18px] border border-[#E8E8E8] shadow-[0_4px_24px_rgba(0,0,0,0.015)] p-6 h-[288px] flex flex-col">
      <div className="mb-1">
        <h3 className="text-[15px] font-semibold text-gray-900 tracking-tight">Leave Approvals</h3>
        <p className="text-[12px] text-gray-400 font-medium">Pending teacher leave requests</p>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-[#E8E8E8]/60">
        {isLoading ? (
          <div className="py-6 text-center text-sm text-gray-400">Loading…</div>
        ) : pending.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center gap-2 text-gray-400">
            <CalendarClock className="w-6 h-6" />
            <p className="text-sm">No pending leave requests</p>
          </div>
        ) : (
          pending.map((request) => <LeaveRow key={request._id} request={request} />)
        )}
      </div>
    </div>
  );
}
