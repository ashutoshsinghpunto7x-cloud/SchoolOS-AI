import { useNavigate } from 'react-router-dom';
import { Repeat } from 'lucide-react';
import { useSubstitutes } from '@/features/timetable/hooks/useTimetable';

const todayStr = () => new Date().toISOString().split('T')[0];

export function SubstitutionsTodayWidget() {
  const today = todayStr();
  const { data, isLoading } = useSubstitutes({ dateFrom: today, dateTo: today, limit: 50 });
  const navigate = useNavigate();
  const substitutes = data?.data ?? [];

  return (
    <div className="bg-white rounded-[18px] border border-[#E8E8E8] shadow-[0_4px_24px_rgba(0,0,0,0.015)] p-6 h-[288px] flex flex-col">
      <div className="flex items-start justify-between mb-1">
        <div>
          <h3 className="text-[15px] font-semibold text-gray-900 tracking-tight">Daily Substitutions</h3>
          <p className="text-[12px] text-gray-400 font-medium">Today's teacher cover</p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/timetable/substitutes')}
          className="h-7 px-2.5 rounded-lg bg-white border border-[#E8E8E8] text-[11px] font-semibold text-gray-500 hover:bg-[#10B981]/5 hover:border-[#10B981]/25 hover:text-[#0B3D2E] shrink-0"
        >
          Manage
        </button>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-[#E8E8E8]/60">
        {isLoading ? (
          <div className="py-6 text-center text-sm text-gray-400">Loading…</div>
        ) : substitutes.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center gap-2 text-gray-400">
            <Repeat className="w-6 h-6" />
            <p className="text-sm">No substitutions assigned today</p>
          </div>
        ) : (
          substitutes.map((sub) => (
            <div key={sub._id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-gray-800 truncate">
                  Class {sub.class}{sub.section ? ` – ${sub.section}` : ''} · {sub.subjectName}
                </p>
                <p className="text-[11px] text-gray-400 truncate">
                  {sub.originalTeacherName ?? 'Unassigned'} → {sub.substituteTeacherName}
                </p>
              </div>
              <span className="text-[11px] text-gray-400 shrink-0 capitalize">{sub.status}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
