import { useState } from 'react';
import { Loader2, Eye, Check, X, ShieldAlert, Copy, CheckCircle2 } from 'lucide-react';
import type { RecoveryRequest, RecoveryRequestStatus } from '@schoolos/types';
import {
  useRecoveryRequests,
  useApproveRecoveryRequest,
  useRejectRecoveryRequest,
} from '../hooks/useRecovery';

const STATUS_STYLES: Record<RecoveryRequestStatus, string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  approved: 'bg-blue-50 text-blue-700 border-blue-200',
  rejected: 'bg-red-50 text-red-700 border-red-200',
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

const STATUS_FILTERS: Array<{ label: string; value: RecoveryRequestStatus | 'all' }> = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
  { label: 'Completed', value: 'completed' },
];

export const RecoveryRequestsPage = () => {
  const [statusFilter, setStatusFilter] = useState<RecoveryRequestStatus | 'all'>('pending');
  const { data: requests, isLoading } = useRecoveryRequests(statusFilter === 'all' ? undefined : statusFilter);
  const approveMutation = useApproveRecoveryRequest();
  const rejectMutation = useRejectRecoveryRequest();

  const [viewing, setViewing] = useState<RecoveryRequest | null>(null);
  const [rejecting, setRejecting] = useState<RecoveryRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [tempPasswordResult, setTempPasswordResult] = useState<{ password: string; emailed: boolean } | null>(null);
  const [actionError, setActionError] = useState('');
  const [copied, setCopied] = useState(false);

  async function handleApprove(req: RecoveryRequest) {
    setActionError('');
    try {
      const result = await approveMutation.mutateAsync(req._id);
      setViewing(null);
      if (!result.emailed && result.temporaryPassword) {
        setTempPasswordResult({ password: result.temporaryPassword, emailed: false });
      } else {
        setTempPasswordResult({ password: '', emailed: true });
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to approve request.');
    }
  }

  async function handleReject() {
    if (!rejecting) return;
    setActionError('');
    try {
      await rejectMutation.mutateAsync({ id: rejecting._id, payload: { reason: rejectReason.trim() || undefined } });
      setRejecting(null);
      setViewing(null);
      setRejectReason('');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to reject request.');
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-1">
        <ShieldAlert className="w-6 h-6 text-[#5B21B6]" />
        <h1 className="text-2xl font-bold text-gray-900">Recovery Requests</h1>
      </div>
      <p className="text-sm text-gray-500 mb-6">Review and act on account recovery requests submitted by staff.</p>

      <div className="flex items-center gap-2 mb-4">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setStatusFilter(f.value)}
            className={`px-3.5 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
              statusFilter === f.value
                ? 'bg-[#5B21B6] text-white border-blue-600'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {actionError && (
        <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 mb-4">
          <p className="text-sm font-medium text-red-600">{actionError}</p>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
          </div>
        ) : !requests || requests.length === 0 ? (
          <div className="py-16 text-center text-sm text-gray-400">No recovery requests found.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">
                <th className="px-5 py-3">Staff Name</th>
                <th className="px-5 py-3">Employee ID</th>
                <th className="px-5 py-3">Role</th>
                <th className="px-5 py-3">Email</th>
                <th className="px-5 py-3">Requested</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((req) => (
                <tr key={req._id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60">
                  <td className="px-5 py-3.5 font-semibold text-gray-800">{req.staffName ?? <span className="text-gray-300 font-normal italic">Unmatched</span>}</td>
                  <td className="px-5 py-3.5 text-gray-600">{req.employeeId}</td>
                  <td className="px-5 py-3.5 text-gray-600 capitalize">{req.role ?? '—'}</td>
                  <td className="px-5 py-3.5 text-gray-600">{req.email}</td>
                  <td className="px-5 py-3.5 text-gray-500">{new Date(req.requestedAt).toLocaleString()}</td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold border capitalize ${STATUS_STYLES[req.status]}`}>
                      {req.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => setViewing(req)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                        title="View details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {req.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleApprove(req)}
                            disabled={approveMutation.isPending}
                            className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 disabled:opacity-50"
                            title="Approve"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setRejecting(req)}
                            className="p-1.5 rounded-lg text-red-500 hover:bg-red-50"
                            title="Reject"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* View details modal */}
      {viewing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4" onClick={() => setViewing(null)}>
          <div className="bg-white rounded-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-gray-900 mb-4">Recovery Request Details</h2>
            <dl className="space-y-2.5 text-sm">
              {viewing.staffName && <div className="flex justify-between"><dt className="text-gray-500">Staff Name</dt><dd className="font-semibold text-gray-800">{viewing.staffName}</dd></div>}
              {viewing.role && <div className="flex justify-between"><dt className="text-gray-500">Role</dt><dd className="font-semibold text-gray-800 capitalize">{viewing.role}</dd></div>}
              <div className="flex justify-between"><dt className="text-gray-500">Employee ID</dt><dd className="font-semibold text-gray-800">{viewing.employeeId}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500">School ID</dt><dd className="font-semibold text-gray-800">{viewing.schoolId}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500">Email</dt><dd className="font-semibold text-gray-800">{viewing.email}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500">Requested At</dt><dd className="font-semibold text-gray-800">{new Date(viewing.requestedAt).toLocaleString()}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500">Status</dt><dd><span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold border capitalize ${STATUS_STYLES[viewing.status]}`}>{viewing.status}</span></dd></div>
              {viewing.browser && <div className="flex justify-between"><dt className="text-gray-500">Browser</dt><dd className="font-semibold text-gray-800">{viewing.browser}</dd></div>}
              {viewing.ipAddress && <div className="flex justify-between"><dt className="text-gray-500">IP Address</dt><dd className="font-semibold text-gray-800">{viewing.ipAddress}</dd></div>}
              {viewing.rejectionReason && <div className="flex justify-between"><dt className="text-gray-500">Rejection Reason</dt><dd className="font-semibold text-gray-800">{viewing.rejectionReason}</dd></div>}
            </dl>
            <div className="flex items-center justify-end gap-2 mt-6">
              {viewing.status === 'pending' && (
                <>
                  <button
                    onClick={() => { setRejecting(viewing); }}
                    className="px-4 py-2 rounded-xl text-sm font-semibold text-red-600 border border-red-200 hover:bg-red-50"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => handleApprove(viewing)}
                    disabled={approveMutation.isPending}
                    className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {approveMutation.isPending ? 'Approving…' : 'Approve'}
                  </button>
                </>
              )}
              <button onClick={() => setViewing(null)} className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject modal */}
      {rejecting && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4" onClick={() => setRejecting(null)}>
          <div className="bg-white rounded-2xl max-w-sm w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-gray-900 mb-3">Reject Request</h2>
            <p className="text-sm text-gray-500 mb-3">Optionally provide a reason for {rejecting.email}.</p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#A855F7]"
              placeholder="Reason (optional)"
            />
            <div className="flex items-center justify-end gap-2 mt-4">
              <button onClick={() => { setRejecting(null); setRejectReason(''); }} className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100">
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={rejectMutation.isPending}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
              >
                {rejectMutation.isPending ? 'Rejecting…' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Temp password one-time reveal modal */}
      {tempPasswordResult && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4" onClick={() => setTempPasswordResult(null)}>
          <div className="bg-white rounded-2xl max-w-sm w-full p-6" onClick={(e) => e.stopPropagation()}>
            {tempPasswordResult.emailed ? (
              <div className="text-center py-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
                <h2 className="text-lg font-bold text-gray-900 mb-1">Request Approved</h2>
                <p className="text-sm text-gray-500">The temporary password has been emailed to the user.</p>
              </div>
            ) : (
              <>
                <h2 className="text-lg font-bold text-gray-900 mb-1">Temporary Password</h2>
                <p className="text-xs text-red-600 font-semibold mb-3">
                  No email provider is configured. Share this password securely — it will not be shown again.
                </p>
                <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5">
                  <code className="flex-1 text-sm font-mono font-bold text-gray-900 tracking-wide">{tempPasswordResult.password}</code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(tempPasswordResult.password);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-200"
                    title="Copy"
                  >
                    {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </>
            )}
            <button
              onClick={() => setTempPasswordResult(null)}
              className="w-full mt-5 h-11 rounded-xl bg-[#5B21B6] hover:bg-[#4C1D95] text-sm font-bold text-white"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
