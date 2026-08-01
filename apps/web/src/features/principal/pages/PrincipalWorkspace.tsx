import { PageContainer } from '@/components/workspace/PageContainer';
import { WorkspaceSection } from '@/components/workspace/WorkspaceSection';
import { SectionHeader } from '@/components/workspace/SectionHeader';
import { AiHeroSection } from '../components/AiHeroSection';
import { RemindersStrip } from '../components/RemindersStrip';
import { PriorityCenter } from '../components/PriorityCenter';
import { SchoolHealthCard } from '../components/SchoolHealthCard';
import { StaffManagementCard } from '../components/StaffManagementCard';
import { LiveActivityCard } from '../components/LiveActivityCard';
import { DashboardQuickActions } from '../components/DashboardQuickActions';
import { DailyBriefingCard } from '../components/DailyBriefingCard';
import { AlertsPanel } from '../components/AlertsPanel';
import { AttendanceInsightsCard } from '../components/AttendanceInsightsCard';
import { AdmissionAssistantCard } from '../components/AdmissionAssistantCard';
import { usePrincipalDashboard, useTeachersSummary } from '../hooks/usePrincipal';
import { useLanguage } from '@/context/LanguageContext';

// ── PrincipalWorkspace — the Principal's Daily Command Center ────────────────
// AI Assistant collapses to a slim "Ask AI" bar by default (row 1) rather
// than sitting open — it expands in place on click. Reminders (row 2) and
// Today's Briefing (row 3) are full-width strips. Row 4 is the primary
// at-a-glance grid: Priority Center, School Health, and Recent Activity
// together. Everything else (Staff Management, Attendance Insights,
// Admission Assistant) is real but secondary, so it lives below the fold —
// "View All Insights" in the briefing scrolls straight to it. Financial
// records (fees, discounts, dues) are intentionally absent everywhere on
// this dashboard — that's the Accountant workspace's concern, not the
// Principal's. Anything the original brief asked for with no backing
// feature yet (Parent Complaints, Visitors, Buses, Power/CCTV,
// Purchase/Transport approvals, Reports, Circulars) was left out rather
// than faked — see each component's own comment for specifics.

export const PrincipalWorkspace = () => {
  const { data, isLoading, error, refetch } = usePrincipalDashboard();
  const { data: teachersSummary } = useTeachersSummary();
  const { t } = useLanguage();

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
              {t('workspace.retry')}
            </button>
          </div>
        )}

        {/* Row 1 — AI Assistant, collapsed bar by default */}
        <AiHeroSection />

        {/* Row 2 — Reminders (the principal's own meeting/task notes) */}
        <RemindersStrip />

        {/* Row 3 — Daily Briefing, morning summary strip */}
        <DailyBriefingCard data={data} teachersSummary={teachersSummary} isLoading={isLoading} />

        {/* Row 4 — Priority Center, School Health, Recent Activity */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          <PriorityCenter alerts={data?.alerts} isLoading={isLoading} />
          <SchoolHealthCard data={data} teachersSummary={teachersSummary} isLoading={isLoading} />
          <LiveActivityCard />
        </div>

        {/* Smart Alerts — only high-signal alerts, reusing the existing AlertsPanel */}
        {(data?.alerts?.length ?? 0) > 0 && (
          <WorkspaceSection className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <SectionHeader title={t('smartAlerts.title')} subtitle={t('smartAlerts.subtitle')} />
            <AlertsPanel alerts={data?.alerts ?? []} isLoading={isLoading} />
          </WorkspaceSection>
        )}

        {/* Below the fold — secondary detail, linked from "View All Insights" above */}
        <div id="more-insights-section" className="flex flex-col gap-5 scroll-mt-4">
          <StaffManagementCard />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 items-start">
            <AttendanceInsightsCard />
            <AdmissionAssistantCard data={data?.admissions} isLoading={isLoading} />
          </div>
        </div>

        {/* Row 5 — Quick Actions */}
        <DashboardQuickActions />
      </div>
    </PageContainer>
  );
};
