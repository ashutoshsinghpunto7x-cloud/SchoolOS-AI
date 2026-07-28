import { useNavigate } from 'react-router-dom';
import { GraduationCap, UserCheck, UserX, TrendingUp, Users } from 'lucide-react';
import type { PrincipalDashboardData, TeachersSummaryData } from '@schoolos/types';
import { useLanguage } from '@/context/LanguageContext';

// Only the metrics with a real data source are shown — Classes Running,
// Buses Running, Power Status and CCTV Status all have no backing feature
// in this system (no live-timetable, transport, or facilities-monitoring
// module exists yet), so they're omitted rather than faked.
interface SchoolHealthCardProps {
  data?: PrincipalDashboardData;
  teachersSummary?: TeachersSummaryData;
  isLoading?: boolean;
}

export function SchoolHealthCard({ data, teachersSummary, isLoading }: SchoolHealthCardProps) {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const teachersPresent = teachersSummary?.presentCount;
  const teachersTotal = teachersSummary?.total ?? data?.teachers.active;
  const absentTeachers = teachersSummary ? teachersSummary.total - teachersSummary.presentCount : undefined;

  const tiles = [
    {
      label: t('health.studentsPresent'),
      value: data ? `${data.attendance.today.present}/${data.students.active}` : '—',
      icon: GraduationCap,
      onClick: () => navigate('/attendance'),
    },
    {
      label: t('health.teachersPresent'),
      value: teachersSummary ? `${teachersPresent}/${teachersTotal}` : data ? `${data.teachers.active}` : '—',
      icon: UserCheck,
      onClick: () => navigate('/principal/teachers-summary'),
    },
    {
      label: t('health.absentTeachers'),
      value: absentTeachers !== undefined ? String(absentTeachers) : '—',
      icon: UserX,
      danger: (absentTeachers ?? 0) > 0,
      onClick: () => navigate('/principal/teachers-summary'),
    },
    {
      label: t('health.weeklyAttendance'),
      value: data ? `${data.attendance.weeklyAvgRate}%` : '—',
      icon: TrendingUp,
      onClick: () => navigate('/attendance'),
    },
    {
      label: t('health.totalStrength'),
      value: data ? String(data.students.active + data.teachers.active) : '—',
      icon: Users,
      onClick: () => navigate('/attendance'),
    },
  ];

  return (
    <div className="bg-white rounded-[22px] border border-black/[0.06] shadow-[0_4px_24px_rgba(0,0,0,0.02)] p-6 h-[288px] flex flex-col">
      <h3 className="text-[15px] font-semibold text-[#111827] tracking-tight">{t('health.title')}</h3>
      <p className="text-[12px] text-[#6B7280] font-medium mb-3">{t('health.subtitle')}</p>

      <div className="flex-1 flex flex-col justify-start gap-1 overflow-y-auto overscroll-contain">
        {isLoading ? (
          [1, 2, 3, 4, 5].map((i) => <div key={i} className="h-9 bg-gray-50 rounded-xl animate-pulse" />)
        ) : (
          tiles.map((tile) => (
            <button
              key={tile.label}
              type="button"
              onClick={tile.onClick}
              className="flex items-center justify-between px-2 py-2 rounded-xl hover:bg-black/[0.02] transition-colors text-left"
            >
              <span className="flex items-center gap-2.5 min-w-0">
                <span
                  className={`flex items-center justify-center w-7 h-7 rounded-lg shrink-0 ${
                    tile.danger ? 'bg-[#EF4444]/10 text-[#EF4444]' : 'bg-[#111827]/[0.04] text-[#6B7280]'
                  }`}
                >
                  <tile.icon className="w-3.5 h-3.5" strokeWidth={2} />
                </span>
                <span className="text-sm font-medium text-[#6B7280] truncate">{tile.label}</span>
              </span>
              <span className={`text-lg font-semibold tabular-nums shrink-0 ${tile.danger ? 'text-[#EF4444]' : 'text-[#111827]'}`}>
                {tile.value}
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
