import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { StudentForm, StudentFormValues } from '../components/StudentForm';
import { useCreateStudent } from '../hooks/useStudents';
import { PageContainer } from '@/components/workspace/PageContainer';

export const NewAdmissionPage = () => {
  const navigate = useNavigate();
  const { mutateAsync: createStudent, isPending } = useCreateStudent();

  const handleSubmit = async (values: StudentFormValues) => {
    try {
      const student = await createStudent(values);
      toast.success('Student admitted successfully!', {
        description: `${student.fullName} has been enrolled. Admission No: ${student.admissionNumber}`,
      });
      navigate(`/students/${student._id}`);
    } catch (err) {
      toast.error('Failed to create admission', {
        description: err instanceof Error ? err.message : 'Please check your inputs and try again.',
      });
    }
  };

  return (
    <PageContainer>
      {/* Back navigation */}
      <button
        onClick={() => navigate('/students')}
        className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900
                   transition-colors duration-150 mb-6"
        type="button"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Students
      </button>

      {/* Page heading */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight leading-tight">New Admission</h1>
        <p className="text-base text-gray-500 mt-2 leading-relaxed">
          Fill in the details below to register a new student.
          The admission number will be generated automatically.
        </p>
      </div>

      <StudentForm
        onSubmit={handleSubmit}
        isLoading={isPending}
        submitLabel="Create Student"
      />
    </PageContainer>
  );
};
