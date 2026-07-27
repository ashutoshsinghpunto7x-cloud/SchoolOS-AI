import { useState } from 'react';
import { toast } from 'sonner';
import { Check, X, Loader2, ClipboardCheck, ArrowRight } from 'lucide-react';
import { PageContainer } from '@/components/workspace/PageContainer';
import { WorkspaceHeader } from '@/components/workspace/WorkspaceHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  usePendingChangeRequests,
  useApproveChangeRequest,
  useRejectChangeRequest,
} from '@/features/student-change-requests/hooks/useStudentChangeRequests';
import { useLanguage } from '@/context/LanguageContext';
import type { PrincipalTranslationKey } from '@/i18n/principalTranslations';
import type { StudentChangeRequest } from '@schoolos/types';

const FIELD_KEYS: Record<string, PrincipalTranslationKey> = {
  fullName: 'pendingApprovals.field.fullName',
  rollNumber: 'pendingApprovals.field.rollNumber',
  class: 'pendingApprovals.field.class',
  section: 'pendingApprovals.field.section',
  gender: 'pendingApprovals.field.gender',
  dateOfBirth: 'pendingApprovals.field.dateOfBirth',
  fatherName: 'pendingApprovals.field.fatherName',
  motherName: 'pendingApprovals.field.motherName',
  parentPhone: 'pendingApprovals.field.parentPhone',
  alternatePhone: 'pendingApprovals.field.alternatePhone',
  email: 'pendingApprovals.field.email',
  address: 'pendingApprovals.field.address',
  admissionStatus: 'pendingApprovals.field.admissionStatus',
  tags: 'pendingApprovals.field.tags',
  remarks: 'pendingApprovals.field.remarks',
  monthlyTuitionFee: 'pendingApprovals.field.monthlyTuitionFee',
};

const formatValue = (value: unknown): string => {
  if (value === undefined || value === null || value === '') return '—';
  if (Array.isArray(value)) return value.length ? value.join(', ') : '—';
  return String(value);
};

function RequestCard({ request }: { request: StudentChangeRequest }) {
  const { t } = useLanguage();
  const [showRejectNote, setShowRejectNote] = useState(false);
  const [reviewNote, setReviewNote] = useState('');
  const approve = useApproveChangeRequest();
  const reject = useRejectChangeRequest();

  const fields = Object.keys(request.changes ?? {});
  const isPending = approve.isPending || reject.isPending;

  async function handleApprove() {
    try {
      await approve.mutateAsync(request._id);
      toast.success(`Approved — ${request.studentName}'s record has been updated.`);
    } catch (err) {
      toast.error('Failed to approve', { description: err instanceof Error ? err.message : undefined });
    }
  }

  async function handleReject() {
    try {
      await reject.mutateAsync({ id: request._id, payload: { reviewNote: reviewNote.trim() || undefined } });
      toast.success('Change request rejected');
    } catch (err) {
      toast.error('Failed to reject', { description: err instanceof Error ? err.message : undefined });
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <p className="text-base font-bold text-gray-900">{request.studentName}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {t('pendingApprovals.requestedBy')} <span className="font-semibold text-gray-600">{request.requestedByName}</span>
            {' · '}
            {new Date(request.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      </div>

      <div className="space-y-2.5 mb-5">
        {fields.map((field) => (
          <div key={field} className="flex items-center gap-3 text-sm">
            <span className="w-36 shrink-0 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {FIELD_KEYS[field] ? t(FIELD_KEYS[field]) : field}
            </span>
            <span className="text-gray-400 line-through truncate">{formatValue(request.previousValues?.[field])}</span>
            <ArrowRight className="w-3.5 h-3.5 text-gray-300 shrink-0" />
            <span className="font-semibold text-gray-900 truncate">{formatValue(request.changes?.[field])}</span>
          </div>
        ))}
      </div>

      {showRejectNote && (
        <textarea
          value={reviewNote}
          onChange={(e) => setReviewNote(e.target.value)}
          placeholder={t('pendingApprovals.notePlaceholder')}
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
          {t('leaveApprovals.approve')}
        </button>
        <button
          type="button"
          onClick={() => (showRejectNote ? handleReject() : setShowRejectNote(true))}
          disabled={isPending}
          className="flex-1 h-10 rounded-xl bg-red-50 hover:bg-red-100 disabled:opacity-50 text-red-600 text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
        >
          {reject.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
          {showRejectNote ? t('leaveApprovals.confirmReject') : t('leaveApprovals.reject')}
        </button>
      </div>
    </div>
  );
}

export const PendingApprovalsPage = () => {
  const { t } = useLanguage();
  const { data: requests, isLoading, isError } = usePendingChangeRequests();

  return (
    <PageContainer>
      <WorkspaceHeader
        title={t('pendingApprovals.title')}
        subtitle={t('pendingApprovals.subtitle')}
        backTo="/principal"
        backLabel={t('leaveApprovals.backLabel')}
      />

      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm h-48 animate-pulse" />
          ))}
        </div>
      ) : isError ? (
        <EmptyState icon={ClipboardCheck} title={t('pendingApprovals.errorTitle')} description={t('pendingApprovals.errorDesc')} />
      ) : !requests?.length ? (
        <EmptyState icon={ClipboardCheck} title={t('pendingApprovals.emptyTitle')} description={t('pendingApprovals.emptyDesc')} />
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
