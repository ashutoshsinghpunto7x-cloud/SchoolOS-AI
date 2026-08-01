import { PageContainer } from '@/components/workspace/PageContainer';
import { WorkspaceHeader } from '@/components/workspace/WorkspaceHeader';
import { WorkspaceSection } from '@/components/workspace/WorkspaceSection';
import { SectionHeader } from '@/components/workspace/SectionHeader';
import { AlertsPanel } from '../components/AlertsPanel';
import { QuickActions } from '../components/QuickActions';
import { AttendanceWidget } from '../components/AttendanceWidget';
import { AdmissionsWidget } from '../components/AdmissionsWidget';
import { CalendarWidget } from '../components/CalendarWidget';
import { AcademicWidget } from '../components/AcademicWidget';
import { usePrincipalDashboard } from '../hooks/usePrincipal';
import { useLanguage } from '@/context/LanguageContext';

// Deeper breakdowns that used to live on the main dashboard — moved here so
// the dashboard itself stays a fast daily-glance view, reachable instead from
// the sidebar for whenever the principal wants to dig into the detail.
export const PrincipalInsightsPage = () => {
  const { data, isLoading } = usePrincipalDashboard();
  const { t } = useLanguage();

  return (
    <PageContainer>
      <div className="flex flex-col gap-6">
        <WorkspaceHeader
          title={t('insights.title')}
          subtitle={t('insights.subtitle')}
          backTo="/principal"
          backLabel={t('leaveApprovals.backLabel')}
        />

        <div className="flex flex-col lg:flex-row gap-6 items-start">
          <div className="flex-1 min-w-0 flex flex-col gap-6">
            <WorkspaceSection className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <SectionHeader title={t('insights.attendanceOverview')} subtitle={t('insights.attendanceOverviewSub')} />
              <AttendanceWidget data={data?.attendance} isLoading={isLoading} />
            </WorkspaceSection>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <WorkspaceSection className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <SectionHeader title={t('insights.admissionsPipeline')} subtitle={t('insights.admissionsPipelineSub')} />
                <AdmissionsWidget data={data?.admissions} isLoading={isLoading} />
              </WorkspaceSection>

              <WorkspaceSection className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <SectionHeader title={t('insights.academicOverview')} subtitle={t('insights.academicOverviewSub')} />
                <AcademicWidget
                  timetable={data?.timetable}
                  teachers={data?.teachers}
                  isLoading={isLoading}
                />
              </WorkspaceSection>

              <WorkspaceSection className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <SectionHeader title={t('insights.calendar')} subtitle={t('insights.calendarSub')} />
                <CalendarWidget events={data?.upcomingEvents ?? []} isLoading={isLoading} />
              </WorkspaceSection>
            </div>
          </div>

          <div className="w-full lg:w-72 flex-shrink-0 flex flex-col gap-4">
            <WorkspaceSection className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <SectionHeader title={t('insights.alerts')} subtitle={t('insights.alertsSub')} />
              <AlertsPanel alerts={data?.alerts ?? []} isLoading={isLoading} />
            </WorkspaceSection>

            <WorkspaceSection className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <SectionHeader title={t('insights.quickActions')} subtitle={t('insights.quickActionsSub')} />
              <QuickActions />
            </WorkspaceSection>
          </div>
        </div>
      </div>
    </PageContainer>
  );
};
