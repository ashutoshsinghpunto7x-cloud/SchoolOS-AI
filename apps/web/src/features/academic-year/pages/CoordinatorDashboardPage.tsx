import { useNavigate } from 'react-router-dom';
import { Sparkles, BookOpen, CalendarDays, ClipboardList, ChevronRight, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useAcademicYear } from '../hooks/useAcademicYear';
import { usePrincipalPlanOverview, usePlanAlerts } from '@/features/academic-plan/hooks/useAcademicPlan';
import { PlanAlertList } from '@/features/academic-plan/components/PlanAlertList';

const TILES = [
  {
    label: 'Academic Calendar', icon: CalendarDays, path: '/coordinator/calendar',
    description: 'Session dates, weekly-offs, terms, and holidays', bg: 'bg-[#EEF1F8]', text: 'text-[#254A9A]',
  },
  {
    label: 'Syllabus Setup', icon: BookOpen, path: '/coordinator/syllabus',
    description: 'Size chapters — periods, difficulty, priority, revision weight', bg: 'bg-emerald-50', text: 'text-[#20C997]',
  },
  {
    label: 'Exams', icon: ClipboardList, path: '/exams',
    description: 'Dates, revision lead, and submission deadlines', bg: 'bg-amber-50', text: 'text-[#D9822B]',
  },
  {
    label: 'Academic Plan', icon: Sparkles, path: '/coordinator/academic-plan',
    description: 'Every teacher\'s auto-generated plan, at a glance', bg: 'bg-[#EEF1F8]', text: 'text-[#1B2A4E]',
  },
] as const;

export function CoordinatorDashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: academicYear, isError: yearError } = useAcademicYear();
  const { data: overview } = usePrincipalPlanOverview();
  const { data: alerts } = usePlanAlerts();

  const withPlan = (overview ?? []).filter((e) => e.hasPlan && e.totalDays > 0);
  const totalDays = withPlan.reduce((sum, e) => sum + e.totalDays, 0);
  const completedDays = withPlan.reduce((sum, e) => sum + e.completedDays, 0);
  const schoolCompletion = totalDays === 0 ? null : Math.round((completedDays / totalDays) * 100);
  const criticalAlerts = (alerts ?? []).filter((a) => a.severity === 'critical').length;

  return (
    <div className="min-h-screen bg-[#FBF8F3] dark:bg-transparent font-['DM_Sans','Plus_Jakarta_Sans',sans-serif]">
      <div className="px-6 pt-8 pb-6 max-w-[1100px] mx-auto">
        <p className="text-sm font-medium text-[#55607A]">Welcome back{user?.firstName ? `, ${user.firstName}` : ''}</p>
        <h1 className="text-[28px] sm:text-[34px] font-medium text-[#1B2A4E] dark:text-white tracking-tight leading-tight mt-1">
          Academic Coordinator
        </h1>
        <p className="text-base text-[#55607A] dark:text-white/40 mt-2 max-w-xl">
          Set up the calendar and syllabus once — the Academic Planning Engine keeps every teacher's plan current from there.
        </p>

        {yearError && (
          <div className="mt-5 bg-amber-50 border border-amber-100 rounded-[18px] p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800">Academic year not set up yet</p>
              <p className="text-xs text-amber-700 mt-0.5">Start with the Academic Calendar tile below — nothing else can generate until it's set.</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          <div className="bg-white rounded-[18px] border border-[#E8E2D6] shadow-xs p-5">
            <p className="text-[13px] text-[#55607A]">Academic Year</p>
            <p className="text-[26px] font-medium text-[#1B2A4E] mt-1">{academicYear?.label ?? '—'}</p>
          </div>
          <div className="bg-white rounded-[18px] border border-[#E8E2D6] shadow-xs p-5">
            <p className="text-[13px] text-[#55607A]">School-wide completion</p>
            <p className="text-[26px] font-medium text-[#1B2A4E] mt-1">{schoolCompletion === null ? '—' : `${schoolCompletion}%`}</p>
          </div>
          <div className="bg-white rounded-[18px] border border-[#E8E2D6] shadow-xs p-5">
            <p className="text-[13px] text-[#55607A]">Critical alerts</p>
            <p className={`text-[26px] font-medium mt-1 ${criticalAlerts > 0 ? 'text-[#A6432E]' : 'text-[#1B2A4E]'}`}>{criticalAlerts}</p>
          </div>
          <div className="bg-white rounded-[18px] border border-[#E8E2D6] shadow-xs p-5">
            <p className="text-[13px] text-[#55607A]">Weekly-off days</p>
            <p className="text-[26px] font-medium text-[#1B2A4E] mt-1">{academicYear?.weeklyOffDays?.length ?? '—'}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
          {TILES.map((tile) => (
            <button
              key={tile.path}
              type="button"
              onClick={() => navigate(tile.path)}
              className="w-full text-left flex items-center gap-4 bg-white rounded-[18px] border border-[#E8E2D6] shadow-xs px-5 py-4 hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${tile.bg}`}>
                <tile.icon className={`w-5 h-5 ${tile.text}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-[#1B2A4E]">{tile.label}</p>
                <p className="text-xs text-[#55607A] mt-0.5">{tile.description}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-[#55607A] shrink-0" />
            </button>
          ))}
        </div>

        <div className="mt-8">
          <p className="text-sm font-bold text-gray-900 mb-3">Risk alerts</p>
          <PlanAlertList limit={8} />
        </div>
      </div>
    </div>
  );
}
