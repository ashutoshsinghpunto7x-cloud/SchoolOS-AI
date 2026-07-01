import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { useCreateTeacher } from '../hooks/useTeachers';
import { TeacherForm, TeacherFormValues } from '../components/TeacherForm';
import { PageContainer } from '@/components/workspace/PageContainer';
import { WorkspaceHeader } from '@/components/workspace/WorkspaceHeader';

export const NewTeacherPage = () => {
  const navigate = useNavigate();
  const { mutateAsync: createTeacher, isPending } = useCreateTeacher();

  const handleSubmit = async (values: TeacherFormValues) => {
    try {
      const teacher = await createTeacher(values);
      toast.success('Teacher added successfully');
      navigate(`/teachers/${teacher._id}`);
    } catch (err) {
      toast.error('Failed to add teacher', {
        description: err instanceof Error ? err.message : 'Please try again.',
      });
    }
  };

  return (
    <PageContainer>
      <button
        onClick={() => navigate('/teachers')}
        className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors mb-6"
        type="button"
      >
        <ArrowLeft className="w-4 h-4" />
        All Teachers
      </button>

      <WorkspaceHeader
        title="Add Teacher"
        subtitle="Fill in the teacher details to create a new record"
      />

      <div className="mt-6">
        <TeacherForm onSubmit={handleSubmit} isLoading={isPending} submitLabel="Add Teacher" />
      </div>
    </PageContainer>
  );
};
