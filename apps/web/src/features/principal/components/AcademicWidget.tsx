import { LayoutGrid, FileEdit } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { PrincipalTimetableStats, PrincipalTeacherStats } from '@schoolos/types';

interface Props {
  timetable?: PrincipalTimetableStats;
  teachers?: PrincipalTeacherStats;
  isLoading?: boolean;
}

export const AcademicWidget = ({ timetable, teachers, isLoading }: Props) => {
  const navigate = useNavigate();

  if (isLoading || !timetable || !teachers) {
    return (
      <div className="space-y-2 animate-pulse">
        {[1, 2, 3].map((i) => <div key={i} className="h-14 bg-gray-100 rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Timetable status */}
      <div
        className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50 cursor-pointer transition-colors"
        onClick={() => navigate('/timetable')}
      >
        <div className="w-9 h-9 bg-indigo-100 rounded-xl flex items-center justify-center flex-shrink-0">
          <LayoutGrid className="w-4 h-4 text-indigo-600" strokeWidth={2} />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-800">Timetables</p>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-xs text-green-600 font-medium">{timetable.published} published</span>
            {timetable.draft > 0 && (
              <span className="text-xs text-amber-600 font-medium">{timetable.draft} draft</span>
            )}
          </div>
        </div>
      </div>

      {/* Teacher strength */}
      <div
        className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50 cursor-pointer transition-colors"
        onClick={() => navigate('/teachers')}
      >
        <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
          <FileEdit className="w-4 h-4 text-blue-600" strokeWidth={2} />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-800">Teaching Staff</p>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-xs text-blue-600 font-medium">{teachers.active} active</span>
            <span className="text-xs text-gray-400">of {teachers.total} total</span>
          </div>
        </div>
      </div>

      {/* Draft timetable warning */}
      {timetable.draft > 0 && (
        <div className="px-3 py-2 bg-amber-50 rounded-xl border border-amber-100">
          <p className="text-xs font-medium text-amber-700">
            {timetable.draft} timetable{timetable.draft > 1 ? 's are' : ' is'} still in draft — review before publishing.
          </p>
        </div>
      )}
    </div>
  );
};
