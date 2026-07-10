import { PageContainer } from '@/components/workspace/PageContainer';
import { WorkspaceHeader } from '@/components/workspace/WorkspaceHeader';
import { WorkspaceSection } from '@/components/workspace/WorkspaceSection';
import { SectionHeader } from '@/components/workspace/SectionHeader';
import { AlertsPanel } from '../components/AlertsPanel';
import { QuickActions } from '../components/QuickActions';
import { AttendanceWidget } from '../components/AttendanceWidget';
import { FeeWidget } from '../components/FeeWidget';
import { ClassFeeOverviewWidget } from '../components/ClassFeeOverviewWidget';
import { AdmissionsWidget } from '../components/AdmissionsWidget';
import { CalendarWidget } from '../components/CalendarWidget';
import { AcademicWidget } from '../components/AcademicWidget';
import { usePrincipalDashboard } from '../hooks/usePrincipal';

// Deeper breakdowns that used to live on the main dashboard — moved here so
// the dashboard itself stays a fast daily-glance view, reachable instead from
// the sidebar for whenever the principal wants to dig into the detail.
export const PrincipalInsightsPage = () => {
  const { data, isLoading } = usePrincipalDashboard();

  return (
    <PageContainer>
      <div className="flex flex-col gap-6">
        <WorkspaceHeader
          title="More Insights"
          subtitle="Deeper breakdowns beyond the daily dashboard"
          backTo="/principal"
          backLabel="Principal Dashboard"
        />

        <div className="flex flex-col lg:flex-row gap-6 items-start">
          <div className="flex-1 min-w-0 flex flex-col gap-6">
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

            <WorkspaceSection className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <SectionHeader title="Fees by Class" subtitle="Collected vs. pending, per class & section" />
              <ClassFeeOverviewWidget />
            </WorkspaceSection>

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
