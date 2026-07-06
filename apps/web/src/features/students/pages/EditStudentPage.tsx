import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { StudentForm, StudentFormValues } from '../components/StudentForm';
import { useStudent, useUpdateStudent } from '../hooks/useStudents';
import { PageContainer } from '@/components/workspace/PageContainer';

export const EditStudentPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: student, isLoading, isError } = useStudent(id!);
  const { mutateAsync: updateStudent, isPending } = useUpdateStudent(id!);

  const handleSubmit = async (values: StudentFormValues) => {
    try {
      const { monthlyTuitionFee, ...rest } = values;
      await updateStudent({
        ...rest,
        monthlyTuitionFee: monthlyTuitionFee ? Number(monthlyTuitionFee) : undefined,
      });
      toast.success('Student updated successfully!');
      navigate(`/students/${id}`);
    } catch (err) {
      toast.error('Failed to update student', {
        description: err instanceof Error ? err.message : 'Please try again.',
      });
    }
  };

  if (isLoading) {
    return (
      <PageContainer>
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          <p className="text-sm text-gray-500">Loading student details…</p>
        </div>
      </PageContainer>
    );
  }

  if (isError || !student) {
    return (
      <PageContainer>
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center">
            <AlertCircle className="w-7 h-7 text-red-500" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Student not found</h2>
            <p className="text-sm text-gray-500 mt-1">Could not load student data.</p>
          </div>
          <button
            onClick={() => navigate('/students')}
            className="h-11 px-5 rounded-xl bg-gray-100 hover:bg-gray-200
                       text-sm font-semibold text-gray-700 transition-colors"
          >
            Back to Students
          </button>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      {/* Back navigation */}
      <button
        onClick={() => navigate(`/students/${id}`)}
        className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900
                   transition-colors duration-150 mb-6"
        type="button"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Profile
      </button>

      {/* Page heading */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight leading-tight">
          Edit Student
        </h1>
        <p className="text-base text-gray-500 mt-2">
          Updating profile for{' '}
          <span className="font-semibold text-gray-700">{student.fullName}</span>
          {' '}·{' '}
          <span className="text-blue-600 font-semibold">{student.admissionNumber}</span>
        </p>
      </div>

      <StudentForm
        initialData={student}
        onSubmit={handleSubmit}
        isLoading={isPending}
        submitLabel="Save Changes"
      />
    </PageContainer>
  );
};
