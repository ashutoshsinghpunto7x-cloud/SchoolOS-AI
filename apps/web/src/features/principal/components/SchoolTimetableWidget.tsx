import { useNavigate } from 'react-router-dom';
import { LayoutGrid } from 'lucide-react';
import type { PrincipalDashboardData } from '@schoolos/types';

interface Props {
  timetable?: PrincipalDashboardData['timetable'];
  isLoading?: boolean;
}

export function SchoolTimetableWidget({ timetable, isLoading }: Props) {
  const navigate = useNavigate();

  return (
    <div className="bg-white rounded-[18px] border border-[#E8E8E8] shadow-[0_4px_24px_rgba(0,0,0,0.015)] p-6 h-[288px] flex flex-col">
      <div className="mb-1">
        <h3 className="text-[15px] font-semibold text-gray-900 tracking-tight">School Timetable</h3>
        <p className="text-[12px] text-gray-400 font-medium">Timetables by class</p>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-[#10B981]/10 flex items-center justify-center">
          <LayoutGrid className="w-6 h-6 text-[#0B3D2E]" />
        </div>
        {isLoading ? (
          <div className="h-8 w-24 bg-gray-100 rounded animate-pulse" />
        ) : (
          <div className="flex gap-6 text-center">
            <div>
              <p className="text-2xl font-semibold text-gray-900">{timetable?.published ?? 0}</p>
              <p className="text-[11px] text-gray-400 font-medium">Published</p>
            </div>
            <div>
              <p className="text-2xl font-semibold text-gray-900">{timetable?.draft ?? 0}</p>
              <p className="text-[11px] text-gray-400 font-medium">Draft</p>
            </div>
          </div>
        )}
        <button
          type="button"
          onClick={() => navigate('/timetable')}
          className="h-9 px-4 rounded-xl bg-[#0B3D2E] hover:bg-[#08251B] text-white text-[13px] font-semibold transition-colors"
        >
          View School Timetable
        </button>
      </div>
    </div>
  );
}
