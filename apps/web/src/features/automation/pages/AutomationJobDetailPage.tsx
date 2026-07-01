import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, AlertCircle, RefreshCw, XCircle, Clock, CheckCircle, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { useAutomationJob, useCancelJob, useRetryJob } from '../hooks/useAutomation';
import { AutomationStatusBadge } from '../components/AutomationStatusBadge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { PageContainer } from '@/components/workspace/PageContainer';
import type { AutomationJobStatus } from '@schoolos/types';

const CANCELLABLE: AutomationJobStatus[] = ['QUEUED', 'RUNNING', 'RETRYING'];
const RETRYABLE: AutomationJobStatus[] = ['FAILED', 'CANCELLED'];

const formatDate = (dateStr?: string): string => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
};

const durationMs = (start?: string, end?: string): string => {
  if (!start || !end) return '—';
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  return `${Math.round(ms / 60_000)}m ${Math.round((ms % 60_000) / 1000)}s`;
};

export const AutomationJobDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: job, isLoading, isError } = useAutomationJob(id ?? null);
  const { mutateAsync: cancelJob, isPending: isCancelling } = useCancelJob();
  const { mutateAsync: retryJob, isPending: isRetrying } = useRetryJob();

  const [confirmCancel, setConfirmCancel] = useState(false);

  const handleCancel = async () => {
    try {
      await cancelJob(id!);
      toast.success('Job cancelled');
    } catch (err) {
      toast.error('Failed to cancel job', {
        description: err instanceof Error ? err.message : 'Please try again.',
      });
    } finally {
      setConfirmCancel(false);
    }
  };

  const handleRetry = async () => {
    try {
      await retryJob(id!);
      toast.success('Job retry dispatched');
    } catch (err) {
      toast.error('Failed to retry job', {
        description: err instanceof Error ? err.message : 'Please try again.',
      });
    }
  };

  if (isLoading) {
    return (
      <PageContainer narrow>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      </PageContainer>
    );
  }

  if (isError || !job) {
    return (
      <PageContainer narrow>
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center">
            <AlertCircle className="w-7 h-7 text-red-500" />
          </div>
          <p className="text-base font-medium text-gray-700">Job not found</p>
          <button
            onClick={() => navigate('/administration/automation')}
            className="text-sm text-blue-600 hover:underline"
            type="button"
          >
            Back to Automation Jobs
          </button>
        </div>
      </PageContainer>
    );
  }

  const canCancel = CANCELLABLE.includes(job.status);
  const canRetry = RETRYABLE.includes(job.status);
  const endDate = job.completedAt ?? job.failedAt;

  return (
    <PageContainer narrow>
      {/* Back */}
      <button
        onClick={() => navigate('/administration/automation')}
        className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-700 mb-6 transition-colors"
        type="button"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Automation Jobs
      </button>

      {/* Status header */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-gray-900">{job.type.replace(/_/g, ' ')}</h1>
              <AutomationStatusBadge status={job.status} />
              {job.retryCount > 0 && (
                <span className="text-xs font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                  Retry #{job.retryCount}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 font-mono">{job._id}</p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {canRetry && (
              <button
                onClick={() => void handleRetry()}
                disabled={isRetrying}
                className="h-10 px-4 rounded-xl border border-blue-200 bg-blue-50 text-sm font-semibold text-blue-700
                           hover:bg-blue-100 flex items-center gap-2 transition-colors disabled:opacity-50"
                type="button"
              >
                <RefreshCw className="w-4 h-4" />
                {isRetrying ? 'Retrying…' : 'Retry'}
              </button>
            )}
            {canCancel && (
              <button
                onClick={() => setConfirmCancel(true)}
                disabled={isCancelling}
                className="h-10 px-4 rounded-xl border border-red-200 bg-red-50 text-sm font-semibold text-red-600
                           hover:bg-red-100 flex items-center gap-2 transition-colors disabled:opacity-50"
                type="button"
              >
                <XCircle className="w-4 h-4" />
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Details grid */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-5">
        <h2 className="text-base font-bold text-gray-800 mb-4">Job Details</h2>
        <div className="grid grid-cols-2 gap-y-4 gap-x-6">
          {[
            { label: 'Provider', value: job.provider.toUpperCase() },
            { label: 'Triggered By', value: job.triggeredBy },
            { label: 'Created', value: formatDate(job.createdAt) },
            { label: 'Started', value: formatDate(job.startedAt) },
            { label: 'Completed', value: formatDate(job.completedAt) },
            { label: 'Failed', value: formatDate(job.failedAt) },
            { label: 'Duration', value: durationMs(job.startedAt, endDate) },
            { label: 'Retry Count', value: String(job.retryCount) },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-0.5">{label}</p>
              <p className="text-sm font-medium text-gray-800">{value}</p>
            </div>
          ))}
        </div>

        {job.referenceId && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-0.5">Reference</p>
            <div className="flex items-center gap-2">
              <p className="text-sm font-mono text-gray-700">{job.referenceId}</p>
              <span className="text-xs text-gray-400">({job.referenceType})</span>
            </div>
          </div>
        )}
      </div>

      {/* Error */}
      {job.errorMessage && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5 mb-5">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <p className="text-sm font-bold text-red-700">Error</p>
          </div>
          <p className="text-sm text-red-600 leading-relaxed">{job.errorMessage}</p>
        </div>
      )}

      {/* Result */}
      {job.result && Object.keys(job.result).length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-5">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <h2 className="text-base font-bold text-gray-800">Result</h2>
          </div>
          <div className="space-y-3">
            {job.result.summary != null && (
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Summary</p>
                <p className="text-sm text-gray-700 leading-relaxed">{String(job.result.summary)}</p>
              </div>
            )}
            {job.result.recommendation != null && (
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Recommendation</p>
                <p className="text-sm font-semibold text-gray-900">{String(job.result.recommendation)}</p>
              </div>
            )}
            {job.result.nextFollowUp != null && (
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-gray-400" />
                <p className="text-xs text-gray-400 font-medium">Next follow-up:</p>
                <p className="text-sm font-semibold text-gray-800">{String(job.result.nextFollowUp)}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Raw payload (collapsed, dev reference) */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <details>
          <summary className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-gray-600 select-none">
            <ExternalLink className="w-4 h-4" />
            Raw Payload
          </summary>
          <pre className="mt-4 text-xs text-gray-600 bg-gray-50 rounded-xl p-4 overflow-x-auto leading-relaxed">
            {JSON.stringify(job.payload, null, 2)}
          </pre>
        </details>
      </div>

      {confirmCancel && (
        <ConfirmDialog
          title="Cancel Job"
          description="Are you sure you want to cancel this automation job? This cannot be undone."
          confirmLabel="Cancel Job"
          variant="danger"
          isLoading={isCancelling}
          onConfirm={() => void handleCancel()}
          onCancel={() => setConfirmCancel(false)}
        />
      )}
    </PageContainer>
  );
};
