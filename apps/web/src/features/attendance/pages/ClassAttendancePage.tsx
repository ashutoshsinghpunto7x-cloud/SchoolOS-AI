import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useStudentsPaginated } from '@/features/students/hooks/useStudents';
import { BulkAttendanceForm } from '../components/BulkAttendanceForm';

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

export function ClassAttendancePage() {
  const { cls, section } = useParams<{ cls: string; section: string }>();
  const navigate          = useNavigate();
  const [searchParams]    = useSearchParams();
  const today             = todayStr();
  const date              = searchParams.get('date') || today;

  const { data, isLoading, isError } = useStudentsPaginated({
    class:  cls,
    section,
    limit:  200,    // load full class roster in one shot
    status: 'active',
  });

  const students = data?.data ?? [];

  return (
    <div className="min-h-screen bg-[#FBF8F3] p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5 max-w-5xl mx-auto">
        <button
          onClick={() => navigate('/attendance')}
          className="p-2 rounded-full hover:bg-white border border-[#E8E2D6] transition-colors bg-white/70 shadow-xs text-[#1B2A4E]"
          aria-label="Back"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-[#1B2A4E]">
            Attendance — Class {cls} / {section}
          </h1>
          <p className="text-xs text-[#55607A]">{date}</p>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-5xl mx-auto">
        {isLoading ? (
          <div className="space-y-3 animate-pulse bg-white p-6 rounded-[20px] border border-[#E8E2D6]">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-12 bg-gray-100 rounded-xl" />
            ))}
          </div>
        ) : isError ? (
          <div className="text-center py-10 text-red-600 text-sm bg-white p-6 rounded-[20px] border border-[#E8E2D6]">
            Failed to load students. Please try again.
          </div>
        ) : (
          <BulkAttendanceForm
            students={students}
            cls={cls!}
            section={section!}
            date={date}
            onSuccess={() => navigate('/attendance')}
            onCancel={() => navigate('/attendance')}
          />
        )}
      </div>
    </div>
  );
}
