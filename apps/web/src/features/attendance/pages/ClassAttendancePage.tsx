import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useStudentsPaginated } from '@/features/students/hooks/useStudents';
import { BulkAttendanceForm } from '../components/BulkAttendanceForm';

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

export function ClassAttendancePage() {
  const { cls, section } = useParams<{ cls: string; section: string }>();
  const navigate          = useNavigate();
  const today             = todayStr();

  const { data, isLoading, isError } = useStudentsPaginated({
    class:  cls,
    section,
    limit:  200,    // load full class roster in one shot
    status: 'active',
  });

  const students = data?.data ?? [];

  return (
    <div className="min-h-screen bg-[#F5F5F7] p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/attendance')}
          className="p-2 rounded-lg hover:bg-white border border-transparent hover:border-gray-200 transition-colors"
          aria-label="Back"
        >
          <ArrowLeft className="w-4 h-4 text-gray-600" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            Attendance — Class {cls} / {section}
          </h1>
          <p className="text-sm text-gray-500">{today}</p>
        </div>
      </div>

      {/* Body */}
      <div className="bg-white rounded-xl border border-gray-200 p-5" style={{ minHeight: '60vh' }}>
        {isLoading ? (
          <div className="space-y-3 animate-pulse">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-12 bg-gray-100 rounded-lg" />
            ))}
          </div>
        ) : isError ? (
          <div className="text-center py-10 text-red-600 text-sm">
            Failed to load students. Please try again.
          </div>
        ) : (
          <BulkAttendanceForm
            students={students}
            cls={cls!}
            section={section!}
            date={today}
            onSuccess={() => navigate('/attendance')}
            onCancel={() => navigate('/attendance')}
          />
        )}
      </div>
    </div>
  );
}
