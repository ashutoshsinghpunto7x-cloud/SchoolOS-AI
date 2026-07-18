import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, AlertCircle, Lock, Unlock, CheckCircle2, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { useExam, useUpdateExam, useUpdateExamStatus } from '../hooks/useExams';
import { ExamForm, ExamFormValues } from '../components/ExamForm';
import { ExamStatusBadge } from '../components/ExamStatusBadge';
import { PageContainer } from '@/components/workspace/PageContainer';
import { WorkspaceHeader } from '@/components/workspace/WorkspaceHeader';
import type { ExamStatus } from '@schoolos/types';

// Mirrors ALLOWED_STATUS_TRANSITIONS in apps/server/src/features/exams/exam.service.ts —
// only forward transitions, locked requires an explicit reopen back to configured.
const NEXT_STATUS: Record<ExamStatus, { status: ExamStatus; label: string; icon: typeof Lock }[]> = {
  draft:      [{ status: 'configured', label: 'Mark as Configured', icon: CheckCircle2 }],
  configured: [
    { status: 'locked', label: 'Lock Exam', icon: Lock },
    { status: 'draft', label: 'Revert to Draft', icon: RotateCcw },
  ],
  locked:     [{ status: 'configured', label: 'Reopen (Unlock)', icon: Unlock }],
};

function StatusPanel({ examId, status }: { examId: string; status: ExamStatus }) {
  const { mutateAsync: updateStatus, isPending } = useUpdateExamStatus(examId);

  async function transition(next: ExamStatus) {
    try {
      await updateStatus(next);
      toast.success(`Exam ${next === 'configured' ? 'configured' : next === 'locked' ? 'locked' : 'reverted to draft'}`);
    } catch (err) {
      toast.error('Could not change status', { description: err instanceof Error ? err.message : 'Please try again.' });
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-5 flex items-center justify-between gap-4 mb-6">
      <div className="flex items-center gap-3">
        <p className="text-sm font-bold text-gray-700">Status</p>
        <ExamStatusBadge status={status} />
        {status === 'draft' && <p className="text-xs text-gray-400">Teachers can't enter marks until this is Configured.</p>}
        {status === 'locked' && <p className="text-xs text-gray-400">Configuration is frozen — reopen to make changes.</p>}
      </div>
      <div className="flex items-center gap-2">
        {NEXT_STATUS[status].map(({ status: next, label, icon: Icon }) => (
          <button
            key={next}
            type="button"
            onClick={() => void transition(next)}
            disabled={isPending}
            className="h-10 px-4 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 flex items-center gap-1.5 transition-colors"
          >
            {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Icon className="w-3.5 h-3.5" />}
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

export const EditExamPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: exam, isLoading, isError } = useExam(id);
  const { mutateAsync: updateExam, isPending } = useUpdateExam(id!);

  const handleSubmit = async (values: ExamFormValues) => {
    try {
      await updateExam({ ...values, termLabel: values.termLabel || undefined });
      toast.success('Exam updated');
    } catch (err) {
      toast.error('Failed to update exam', {
        description: err instanceof Error ? err.message : 'Please try again.',
      });
    }
  };

  if (isLoading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center py-24 gap-4">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        </div>
      </PageContainer>
    );
  }

  if (isError || !exam) {
    return (
      <PageContainer>
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
          <AlertCircle className="w-10 h-10 text-red-400" />
          <p className="text-sm text-gray-600">Exam not found.</p>
          <button onClick={() => navigate('/exams')}
            className="h-10 px-5 rounded-xl bg-gray-100 hover:bg-gray-200 text-sm font-semibold text-gray-700 transition-colors">
            Back to Exams
          </button>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <button onClick={() => navigate('/exams')}
        className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors mb-6"
        type="button">
        <ArrowLeft className="w-4 h-4" />
        All Exams
      </button>

      <WorkspaceHeader title={`Edit — ${exam.name}`} subtitle={exam.termLabel} />

      <StatusPanel examId={exam._id} status={exam.status} />

      <ExamForm
        key={exam._id + exam.status}
        initialData={exam}
        onSubmit={handleSubmit}
        isLoading={isPending}
        submitLabel="Save Changes"
        disabled={exam.status === 'locked'}
      />
    </PageContainer>
  );
};
