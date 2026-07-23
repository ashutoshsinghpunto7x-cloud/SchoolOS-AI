import { PageContainer } from '@/components/workspace/PageContainer';
import { AiHeroSection } from '../components/AiHeroSection';
import { PriorityCenter } from '../components/PriorityCenter';
import { SchoolHealthCard } from '../components/SchoolHealthCard';
import { TodaysScheduleCard } from '../components/TodaysScheduleCard';
import { FinancialSnapshotCard } from '../components/FinancialSnapshotCard';
import { StaffManagementCard } from '../components/StaffManagementCard';
import { LiveActivityCard } from '../components/LiveActivityCard';
import { DashboardQuickActions } from '../components/DashboardQuickActions';
import { usePrincipalDashboard, useTeachersSummary } from '../hooks/usePrincipal';

// ── PrincipalWorkspace — the Principal's Daily Command Center ────────────────
// AI Assistant is the hero (row 1, 70/30 with Priority Center — the single
// merged source of truth for pending decisions, replacing what used to be
// four overlapping cards). Everything below answers "is the school running
// smoothly" and "what should I do next" in as few clicks as possible.
// Anything the original brief asked for with no backing feature yet (Parent
// Complaints, Visitors, Buses, Power/CCTV, Purchase/Transport approvals,
// Reports, Circulars) was left out rather than faked — see each component's
// own comment for specifics. Deeper breakdowns still live on "More Insights".

export const PrincipalWorkspace = () => {
  const { data, isLoading, error, refetch } = usePrincipalDashboard();
  const { data: teachersSummary } = useTeachersSummary();

  return (
    <PageContainer>
      <div className="flex flex-col gap-5">

        {error && (
          <div className="px-4 py-3 bg-red-50 border border-red-100 rounded-xl flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-red-600">{error.message}</p>
            <button
              type="button"
              onClick={() => void refetch()}
              className="h-8 px-3 shrink-0 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold"
            >
              Retry
            </button>
          </div>
        )}

        {/* Row 1 — AI Assistant hero + Today's Schedule */}
        <div className="grid grid-cols-1 lg:grid-cols-[7fr_3fr] gap-5 items-stretch">
          <AiHeroSection />
          <TodaysScheduleCard upcomingEvents={data?.upcomingEvents} />
        </div>

        {/* Row 2 — School Health, Priority Center, Financial Snapshot */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <SchoolHealthCard data={data} teachersSummary={teachersSummary} isLoading={isLoading} />
          <PriorityCenter alerts={data?.alerts} overdueFeeCount={data?.fees.overdueCount} isLoading={isLoading} />
          <FinancialSnapshotCard data={data?.fees} isLoading={isLoading} />
        </div>

        {/* Row 3 — Staff Management, Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-5 items-start">
          <StaffManagementCard />
          <LiveActivityCard />
        </div>

        {/* Row 4 — Quick Actions */}
        <DashboardQuickActions />
      </div>
    </PageContainer>
  );
};
