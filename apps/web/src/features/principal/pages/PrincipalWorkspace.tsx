import { RefreshCw, Users, GraduationCap, CalendarCheck, IndianRupee, ClipboardList, CalendarDays } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PageContainer } from '@/components/workspace/PageContainer';
import { WorkspaceSection } from '@/components/workspace/WorkspaceSection';
import { SectionHeader } from '@/components/workspace/SectionHeader';
import { GreetingBanner } from '@/features/reception/components/GreetingBanner';
import { KPICard, KPICardSkeleton } from '../components/KPICard';
import { AlertsPanel } from '../components/AlertsPanel';
import { QuickActions } from '../components/QuickActions';
import { AttendanceWidget } from '../components/AttendanceWidget';
import { FeeWidget } from '../components/FeeWidget';
import { AdmissionsWidget } from '../components/AdmissionsWidget';
import { CalendarWidget } from '../components/CalendarWidget';
import { AcademicWidget } from '../components/AcademicWidget';
import { usePrincipalDashboard } from '../hooks/usePrincipal';

// ── PrincipalWorkspace ────────────────────────────────────────────────────────

export const PrincipalWorkspace = () => {
  const navigate = useNavigate();
  const { data, isLoading, error, refetch, isFetching } = usePrincipalDashboard();

  return (
    <PageContainer>
      <div className="flex flex-col gap-6">

        {/* Greeting */}
        <GreetingBanner />

        {/* Header row */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Principal Dashboard</h2>
            {data?.generatedAt && (
              <p className="text-xs text-gray-400 mt-0.5">
                Updated {new Date(data.generatedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
          </div>
          <button
            onClick={() => void refetch()}
            disabled={isFetching}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
            type="button"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} strokeWidth={2} />
            Refresh
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm font-medium text-red-600">
            {error.message}
          </div>
        )}

        {/* ── KPI Cards ────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => <KPICardSkeleton key={i} />)
          ) : data ? (
            <>
              <KPICard
                title="Total Students"
                value={data.students.total}
                subtitle={`${data.students.active} active`}
                icon={GraduationCap}
                color="blue"
                onClick={() => navigate('/students')}
              />
              <KPICard
                title="Teachers"
                value={data.teachers.active}
                subtitle={`of ${data.teachers.total} total`}
                icon={Users}
                color="indigo"
                onClick={() => navigate('/teachers')}
              />
              <KPICard
                title="Attendance Today"
                value={data.attendance.today.total > 0 ? `${data.attendance.today.attendanceRate}%` : '—'}
                subtitle={`${data.attendance.today.present} present`}
                icon={CalendarCheck}
                color={data.attendance.today.attendanceRate >= 85 ? 'green' : data.attendance.today.attendanceRate >= 75 ? 'amber' : 'red'}
                onClick={() => navigate('/attendance')}
              />
              <KPICard
                title="Fee Collection"
                value={data.fees.totalCharged > 0 ? `${Math.round((data.fees.totalCollected / data.fees.totalCharged) * 100)}%` : '—'}
                subtitle={data.fees.overdueCount > 0 ? `${data.fees.overdueCount} overdue` : 'All current'}
                icon={IndianRupee}
                color={data.fees.overdueCount > 0 ? 'amber' : 'green'}
                onClick={() => navigate('/fees')}
              />
              <KPICard
                title="Admissions"
                value={data.admissions.total}
                subtitle={`${data.admissions.newThisMonth} new this month`}
                icon={ClipboardList}
                color="emerald"
                onClick={() => navigate('/enquiries')}
              />
              <KPICard
                title="Upcoming Events"
                value={data.upcomingEvents.length}
                subtitle="Next 14 days"
                icon={CalendarDays}
                color="rose"
                onClick={() => navigate('/calendar')}
              />
            </>
          ) : null}
        </div>

        {/* ── Main content: 2-column layout ────────────────────────────────── */}
        <div className="flex flex-col lg:flex-row gap-6 items-start">

          {/* Left column — data widgets */}
          <div className="flex-1 min-w-0 flex flex-col gap-6">

            {/* Attendance & Fees row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <WorkspaceSection className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <SectionHeader title="Attendance Overview" subtitle="Today's attendance breakdown" />
                <AttendanceWidget data={data?.attendance} isLoading={isLoading} />
              </WorkspaceSection>

              <WorkspaceSection className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <SectionHeader title="Fee Collection" subtitle="Current collection status" />
                <FeeWidget data={data?.fees} isLoading={isLoading} />
              </WorkspaceSection>
            </div>

            {/* Admissions, Academic, Calendar row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <WorkspaceSection className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <SectionHeader title="Admissions Pipeline" subtitle="Enquiry funnel overview" />
                <AdmissionsWidget data={data?.admissions} isLoading={isLoading} />
              </WorkspaceSection>

              <WorkspaceSection className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <SectionHeader title="Academic Overview" subtitle="Timetable & staff status" />
                <AcademicWidget
                  timetable={data?.timetable}
                  teachers={data?.teachers}
                  isLoading={isLoading}
                />
              </WorkspaceSection>

              <WorkspaceSection className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <SectionHeader title="Calendar" subtitle="Upcoming events (14 days)" />
                <CalendarWidget events={data?.upcomingEvents ?? []} isLoading={isLoading} />
              </WorkspaceSection>
            </div>
          </div>

          {/* Right column — alerts + quick actions */}
          <div className="w-full lg:w-72 flex-shrink-0 flex flex-col gap-4">
            <WorkspaceSection className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <SectionHeader title="Alerts" subtitle="Requires your attention" />
              <AlertsPanel alerts={data?.alerts ?? []} isLoading={isLoading} />
            </WorkspaceSection>

            <WorkspaceSection className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <SectionHeader title="Quick Actions" subtitle="Common tasks" />
              <QuickActions />
            </WorkspaceSection>
          </div>
        </div>
      </div>
    </PageContainer>
  );
};
