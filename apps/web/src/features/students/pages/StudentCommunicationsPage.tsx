import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { useStudent } from '../hooks/useStudents';
import { CommunicationWorkspace } from '@/features/communication/pages/CommunicationWorkspace';

export const StudentCommunicationsPage = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const { data: student, isLoading, isError } = useStudent(id!);

  const action = searchParams.get('action') as 'call' | 'whatsapp' | 'note' | null;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-4 py-24">
        <Loader2 className="w-7 h-7 text-blue-600 animate-spin" />
        <p className="text-sm text-gray-500">Loading student…</p>
      </div>
    );
  }

  if (isError || !student) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-4 py-24 text-center px-8">
        <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center">
          <AlertCircle className="w-7 h-7 text-red-500" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900">Student not found</h2>
          <p className="text-sm text-gray-500 mt-1">Could not load the student profile.</p>
        </div>
        <button
          onClick={() => navigate('/students')}
          className="h-11 px-5 rounded-xl bg-gray-100 hover:bg-gray-200 text-sm font-semibold text-gray-700 transition-colors"
        >
          Back to Students
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Back navigation strip */}
      <div className="flex-shrink-0 bg-white border-b border-gray-100 px-6 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate(`/students/${id}`)}
          className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
          type="button"
        >
          <ArrowLeft className="w-4 h-4" />
          {student.fullName}
        </button>
        <span className="text-gray-300">/</span>
        <span className="text-sm font-semibold text-gray-900">Communications</span>
      </div>

      {/* Communication workspace fills remaining height */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <CommunicationWorkspace
          initialStudent={student}
          initialAction={action ?? undefined}
        />
      </div>
    </div>
  );
};
