import { PageContainer } from '@/components/workspace/PageContainer';
import { AiHeroSection } from '../components/AiHeroSection';
import { RemindersStrip } from '../components/RemindersStrip';
import { StaffManagementCard } from '../components/StaffManagementCard';
import { DashboardQuickActions } from '../components/DashboardQuickActions';
import { DailyBriefingCard } from '../components/DailyBriefingCard';
import { AttendanceInsightsCard } from '../components/AttendanceInsightsCard';
import { AdmissionAssistantCard } from '../components/AdmissionAssistantCard';
import { usePrincipalDashboard } from '../hooks/usePrincipal';
import { useLanguage } from '@/context/LanguageContext';

// ── PrincipalWorkspace — the Principal's Daily Command Center ────────────────
// AI Assistant collapses to a slim "Ask AI" bar by default (row 1) rather
// than sitting open — it expands in place on click. Reminders (row 2) and
// Today's Briefing (row 3) are full-width strips. Row 4 is Staff Management,
// followed by Attendance Insights and Admission Assistant. Financial
// records (fees, discounts, dues) are intentionally absent everywhere on
// this dashboard — that's the Accountant workspace's concern, not the
// Principal's. Anything the original brief asked for with no backing
// feature yet (Parent Complaints, Visitors, Buses, Power/CCTV,
// Purchase/Transport approvals, Reports, Circulars) was left out rather
// than faked — see each component's own comment for specifics.

export const PrincipalWorkspace = () => {
  const { data, isLoading, error, refetch } = usePrincipalDashboard();
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
        <DailyBriefingCard data={data} isLoading={isLoading} />

        {/* Row 4 — Staff Management, and everything else linked from "View All Insights" above */}
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
