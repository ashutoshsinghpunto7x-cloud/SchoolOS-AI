import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { useCreateExam } from '../hooks/useExams';
import { ExamForm, ExamFormValues } from '../components/ExamForm';
import { PageContainer } from '@/components/workspace/PageContainer';
import { WorkspaceHeader } from '@/components/workspace/WorkspaceHeader';

export const NewExamPage = () => {
  const navigate = useNavigate();
  const { mutateAsync: createExam, isPending } = useCreateExam();

  const handleSubmit = async (values: ExamFormValues) => {
    try {
      const exam = await createExam({
        ...values,
        termLabel: values.termLabel || undefined,
      });
      toast.success('Exam created — status is Draft until you configure it as ready.');
      navigate(`/exams/${exam._id}/edit`);
    } catch (err) {
      toast.error('Failed to create exam', {
        description: err instanceof Error ? err.message : 'Please try again.',
      });
    }
  };

  return (
    <PageContainer>
      <button
        onClick={() => navigate('/exams')}
        className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors mb-6"
        type="button"
      >
        <ArrowLeft className="w-4 h-4" />
        All Exams
      </button>

      <WorkspaceHeader
        title="New Exam"
        subtitle="Set up the exam structure — teachers can enter marks once it's marked Configured"
      />

      <div className="mt-6">
        <ExamForm onSubmit={handleSubmit} isLoading={isPending} submitLabel="Create Exam" />
      </div>
    </PageContainer>
  );
};
