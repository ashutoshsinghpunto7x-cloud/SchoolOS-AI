import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2, AlertCircle, CalendarClock, Check } from 'lucide-react';
import { useLeaveRequest, useApproveLeaveRequest, useRejectLeaveRequest } from '../hooks/useLeaveRequests';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { cn } from '@/lib/utils';

interface Props {
  leaveRequestId: string;
  onClose: () => void;
}

const STATUS_STYLE: Record<string, string> = {
  pending: 'bg-amber-100 dark:bg-amber-400/15 text-amber-700 dark:text-amber-300',
  approved: 'bg-emerald-100 dark:bg-emerald-400/15 text-emerald-700 dark:text-emerald-300',
  rejected: 'bg-red-100 dark:bg-red-400/15 text-red-700 dark:text-red-300',
};

export function LeaveRequestReviewModal({ leaveRequestId, onClose }: Props) {
  const { user } = useAuth();
  const canReview = user?.role === 'admin' || user?.role === 'principal';

  const { data: request, isLoading, isError } = useLeaveRequest(leaveRequestId);
  const { mutateAsync: approve, isPending: approving } = useApproveLeaveRequest();
  const { mutateAsync: reject, isPending: rejecting } = useRejectLeaveRequest();
  const [rejectNote, setRejectNote] = useState('');
  const [showRejectNote, setShowRejectNote] = useState(false);
  const [error, setError] = useState('');

  const busy = approving || rejecting;

  async function handleApprove() {
    setError('');
    try {
      await approve(leaveRequestId);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve request');
    }
  }

  async function handleReject() {
    setError('');
    try {
      await reject({ id: leaveRequestId, payload: rejectNote.trim() ? { reviewNote: rejectNote.trim() } : {} });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject request');
    }
  }

  // Portal out of the header — this modal is opened from NotificationBell,
  // which lives inside the topbar <header>. That header has a backdrop-filter
  // for its glass effect, and per spec, backdrop-filter creates a new
  // containing block for `position: fixed` descendants. Without the portal,
  // this "fullscreen" backdrop was actually being clipped to the header's own
  // ~60px height instead of the real viewport — so it visually looked full
  // screen (the card overflowed past its shrunken container) but clicking
  // anywhere below the header hit the page underneath instead of the
  // backdrop, making the modal impossible to dismiss by tapping outside it.
  //
  // Target `.teacher-theme-root` (not document.body) when present — the
  // teacher workspace scopes its `dark` class to that wrapper div rather than
  // <html>, so portaling straight to body would silently drop dark styling.
  const portalTarget = document.querySelector('.teacher-theme-root') ?? document.body;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white dark:bg-[#150C29] rounded-2xl shadow-2xl w-full max-w-md dark:border dark:border-white/10">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100 dark:border-white/10">
          <div className="flex items-center gap-2">
            <CalendarClock className="w-5 h-5 text-gray-400 dark:text-white/40" />
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Leave Request</h2>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 dark:text-white/40 hover:text-gray-700 dark:hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-gray-400 dark:text-white/30 animate-spin" />
          </div>
        ) : isError || !request ? (
          <div className="flex flex-col items-center py-12 gap-2 text-center px-6">
            <AlertCircle className="w-8 h-8 text-red-400" />
            <p className="text-sm text-gray-600 dark:text-white/60">Could not load this request.</p>
          </div>
        ) : (
          <>
            <div className="px-6 py-5 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-base font-bold text-gray-900 dark:text-white">{request.teacherName}</p>
                <span className={cn('text-xs font-bold px-2.5 py-1 rounded-full capitalize', STATUS_STYLE[request.status])}>
                  {request.status}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-gray-400 dark:text-white/40">Leave Type</p>
                  <p className="font-semibold text-gray-800 dark:text-white/90">{request.leaveType === 'full_day' ? 'Full day' : 'Half day'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 dark:text-white/40">Dates</p>
                  <p className="font-semibold text-gray-800 dark:text-white/90">
                    {request.dateFrom === request.dateTo ? request.dateFrom : `${request.dateFrom} – ${request.dateTo}`}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-400 dark:text-white/40">Reason</p>
                <p className="text-sm text-gray-700 dark:text-white/70 mt-0.5">{request.reason}</p>
              </div>
              {request.status !== 'pending' && (
                <div className="rounded-xl bg-gray-50 dark:bg-white/5 px-3.5 py-2.5 text-xs text-gray-500 dark:text-white/50">
                  Reviewed by {request.reviewedByName}
                  {request.reviewNote && <> — "{request.reviewNote}"</>}
                </div>
              )}
            </div>

            {canReview && request.status === 'pending' && (
              <div className="px-6 pb-6 space-y-3">
                {showRejectNote && (
                  <input
                    autoFocus
                    value={rejectNote}
                    onChange={(e) => setRejectNote(e.target.value)}
                    placeholder="Reason for rejection (optional)"
                    className="w-full h-10 px-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-200"
                  />
                )}

                {error && (
                  <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">
                    <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => (showRejectNote ? void handleReject() : setShowRejectNote(true))}
                    className="flex-1 h-11 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50 text-sm font-bold transition-colors flex items-center justify-center gap-2"
                  >
                    {rejecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                    {showRejectNote ? 'Confirm Reject' : 'Not Approved'}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={handleApprove}
                    className="flex-1 h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-bold transition-colors flex items-center justify-center gap-2"
                  >
                    {approving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    Approved
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>,
    portalTarget,
  );
}
