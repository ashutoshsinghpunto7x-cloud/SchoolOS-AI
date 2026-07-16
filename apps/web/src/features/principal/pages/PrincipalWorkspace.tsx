import { useNavigate } from 'react-router-dom';
import { PageContainer } from '@/components/workspace/PageContainer';
import { PrincipalHeaderWidget } from '../components/PrincipalHeaderWidget';
import { KPICard, KPICardSkeleton } from '../components/KPICard';
import { LeaveApprovalsWidget } from '../components/LeaveApprovalsWidget';
import { SubstitutionsTodayWidget } from '../components/SubstitutionsTodayWidget';
import { usePrincipalDashboard, useTeachersSummary } from '../hooks/usePrincipal';
import { AssistantPanel } from '@/features/principal-assistant/components/AssistantPanel';

// ── PrincipalWorkspace ────────────────────────────────────────────────────────
// Deliberately just a fast daily glance: the Command Centre, a scrollable row
// of the numbers that matter every day, and the four things a principal is
// most likely to act on right now. Deeper breakdowns live one tap away on the
// "More Insights" sidebar page instead of crowding this view.

export const PrincipalWorkspace = () => {
  const navigate = useNavigate();
  const { data, isLoading, error, refetch } = usePrincipalDashboard();
  const { data: teachersSummary } = useTeachersSummary();

  return (
    <PageContainer>
      <div className="flex flex-col gap-6">

        {/* Header — clock, greeting, weather, scheduled events */}
        <PrincipalHeaderWidget upcomingEvents={data?.upcomingEvents} />

        {/* Error */}
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

        {/* ── KPI cards — horizontal scroll, no page-dot indicators ──────────── */}
        <div className="flex gap-3 overflow-x-auto pb-1 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => <KPICardSkeleton key={i} compact />)
          ) : data ? (
            <>
              <KPICard
                compact
                title="Total Students"
                value={data.students.total}
                subtitle={`${data.students.active} active`}
                onClick={() => navigate('/students')}
                delay={0}
              />
              <KPICard
                compact
                title="Fee Collection"
                value={data.fees.totalCharged > 0 ? `${Math.round((data.fees.totalCollected / data.fees.totalCharged) * 100)}%` : '—'}
                subtitle={data.fees.overdueCount > 0 ? `${data.fees.overdueCount} overdue` : 'All current'}
                onClick={() => navigate('/fees')}
                delay={0.05}
              />
              <KPICard
                compact
                title="Admissions"
                value={data.admissions.total}
                subtitle={`${data.admissions.newThisMonth} new this month`}
                onClick={() => navigate('/enquiries')}
                delay={0.1}
              />
              <KPICard
                compact
                title="This Month's Events"
                value={data.upcomingEvents.length}
                subtitle="On the school calendar"
                onClick={() => navigate('/calendar')}
                delay={0.15}
              />
              <KPICard
                compact
                title="Teachers Present"
                value={teachersSummary?.presentCount ?? data.teachers.active}
                subtitle={`of ${teachersSummary?.total ?? data.teachers.total} teachers`}
                onClick={() => navigate('/principal/teachers-summary')}
                delay={0.2}
              />
              <KPICard
                compact
                title="Attendance Today"
                value={data.attendance.today.total > 0 ? `${data.attendance.today.attendanceRate}%` : '—'}
                subtitle={`${data.attendance.today.present} present`}
                onClick={() => navigate('/attendance')}
                delay={0.25}
              />
            </>
          ) : null}
        </div>

        {/* ── Daily Substitutions, Leave Approvals ── */}
        {/* School Timetable and Discount Approvals moved to the sidebar. */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SubstitutionsTodayWidget />
          <LeaveApprovalsWidget />
        </div>

        {/* ── AI Attendance Assistant (Milestone 1) ── */}
        <AssistantPanel />
      </div>
    </PageContainer>
  );
};
