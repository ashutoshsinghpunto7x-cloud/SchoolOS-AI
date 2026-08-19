import { useState } from 'react';
import { toast } from 'sonner';
import { Check, X, Loader2, FileCheck2 } from 'lucide-react';
import { PageContainer } from '@/components/workspace/PageContainer';
import { WorkspaceHeader } from '@/components/workspace/WorkspaceHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { usePendingTestApprovals, useApproveMockTest, useRejectMockTest } from '@/features/mock-tests/hooks/useMockTests';
import type { MockTest } from '@schoolos/types';

function TestCard({ test }: { test: MockTest }) {
  const [showRejectNote, setShowRejectNote] = useState(false);
  const [reason, setReason] = useState('');
  const approve = useApproveMockTest();
  const reject = useRejectMockTest();
  const isPending = approve.isPending || reject.isPending;
  const totalMarks = test.questions.reduce((sum, q) => sum + q.marks, 0);

  async function handleApprove() {
    try {
      await approve.mutateAsync(test._id);
      toast.success(`Approved — "${test.title}" will go live at its scheduled start time.`);
    } catch (err) {
      toast.error('Failed to approve', { description: err instanceof Error ? err.message : undefined });
    }
  }

  async function handleReject() {
    try {
      await reject.mutateAsync({ id: test._id, payload: { reason: reason.trim() || undefined } });
      toast.success('Mock test rejected');
    } catch (err) {
      toast.error('Failed to reject', { description: err instanceof Error ? err.message : undefined });
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <p className="text-base font-bold text-gray-900 truncate">{test.title}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            Class {test.class} · {test.subject} · {test.questions.length} questions · {totalMarks} marks
          </p>
        </div>
        <span className="text-xs font-semibold px-2 py-1 rounded-full bg-purple-50 text-purple-700 shrink-0">
          {test.mode === 'ranked' ? 'Ranked' : 'Anonymous'}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs text-gray-500 mb-4">
        <div>
          <p className="font-semibold text-gray-700 uppercase tracking-wide">Scheduled start</p>
          <p>{new Date(test.scheduledStart).toLocaleString()}</p>
        </div>
        <div>
          <p className="font-semibold text-gray-700 uppercase tracking-wide">Scheduled close</p>
          <p>{new Date(test.scheduledEnd).toLocaleString()}</p>
        </div>
        <div>
          <p className="font-semibold text-gray-700 uppercase tracking-wide">Duration</p>
          <p>{test.durationMinutes} min</p>
        </div>
        <div>
          <p className="font-semibold text-gray-700 uppercase tracking-wide">Chapters</p>
          <p className="truncate">{test.chapterNames.join(', ') || '—'}</p>
        </div>
      </div>

      <details className="mb-4">
        <summary className="cursor-pointer text-sm font-semibold text-gray-700">Preview questions</summary>
        <div className="mt-2 space-y-2 max-h-64 overflow-y-auto pr-1">
          {test.questions.map((q, i) => (
            <div key={q._id} className="text-sm border border-gray-100 rounded-xl p-3">
              <p className="font-medium text-gray-900">{i + 1}. {q.questionText}</p>
              <ul className="mt-1 space-y-0.5">
                {q.options.map((opt, oi) => (
                  <li key={oi} className={oi === q.correctOptionIndex ? 'text-emerald-600 font-semibold' : 'text-gray-500'}>
                    {String.fromCharCode(65 + oi)}. {opt}{oi === q.correctOptionIndex ? ' ✓' : ''}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </details>

      {showRejectNote && (
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason for rejection (optional)"
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
          {showRejectNote ? 'Confirm reject' : 'Reject'}
        </button>
      </div>
    </div>
  );
}

export const TestApprovalsPage = () => {
  const { data: tests, isLoading } = usePendingTestApprovals();

  return (
    <PageContainer>
      <WorkspaceHeader
        title="Test Approvals"
        subtitle="Mock tests authored by the ops team, awaiting your approval before parents are notified"
        backTo="/principal"
        backLabel="Principal Dashboard"
      />

      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm h-64 animate-pulse" />
          ))}
        </div>
      ) : !tests?.length ? (
        <EmptyState icon={FileCheck2} title="No mock tests pending approval" description="Tests submitted from Ops Center's Test Engine will show up here." />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {tests.map((t) => (
            <TestCard key={t._id} test={t} />
          ))}
        </div>
      )}
    </PageContainer>
  );
};

export default TestApprovalsPage;
