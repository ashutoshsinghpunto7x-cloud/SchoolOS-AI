import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useTeacher, useUpdateTeacher } from '../hooks/useTeachers';
import { TeacherForm, TeacherFormValues } from '../components/TeacherForm';
import { PageContainer } from '@/components/workspace/PageContainer';
import { WorkspaceHeader } from '@/components/workspace/WorkspaceHeader';

export const EditTeacherPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: teacher, isLoading, isError } = useTeacher(id!);
  const { mutateAsync: updateTeacher, isPending } = useUpdateTeacher(id!);

  const handleSubmit = async (values: TeacherFormValues) => {
    try {
      await updateTeacher(values);
      toast.success('Teacher updated successfully');
      navigate(`/teachers/${id}`);
    } catch (err) {
      toast.error('Failed to update teacher', {
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

  if (isError || !teacher) {
    return (
      <PageContainer>
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
          <AlertCircle className="w-10 h-10 text-red-400" />
          <p className="text-sm text-gray-600">Teacher not found.</p>
          <button onClick={() => navigate('/teachers')}
            className="h-10 px-5 rounded-xl bg-gray-100 hover:bg-gray-200 text-sm font-semibold text-gray-700 transition-colors">
            Back to Teachers
          </button>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <button onClick={() => navigate(`/teachers/${id}`)}
        className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors mb-6"
        type="button">
        <ArrowLeft className="w-4 h-4" />
        Back to Profile
      </button>

      <WorkspaceHeader title={`Edit — ${teacher.fullName}`} subtitle={teacher.employeeId} />

      <div className="mt-6">
        <TeacherForm
          initialData={teacher}
          onSubmit={handleSubmit}
          isLoading={isPending}
          submitLabel="Save Changes"
        />
      </div>
    </PageContainer>
  );
};
