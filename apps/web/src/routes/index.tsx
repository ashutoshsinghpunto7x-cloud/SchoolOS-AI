import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { AuthProvider } from '@/features/auth/components/AuthProvider';
import { ProtectedRoute } from '@/features/auth/components/ProtectedRoute';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { getHomePathForRole } from '@/features/auth/utils/roleHome';

// Sends each role to the right home screen after login
function RoleBasedRedirect() {
  const { user } = useAuth();
  if (!user) return null;
  return <Navigate to={getHomePathForRole(user.role)} replace />;
}

// ── Lazy page imports (code-split by route) ───────────────────────────────────

// After a redeploy, a tab that's been open since before it can still be holding
// an old index.html referencing chunk hashes that no longer exist on the CDN —
// any lazy import then throws "Failed to fetch dynamically imported module".
// One silent full reload picks up the fresh index.html/manifest and clears it;
// the sessionStorage guard stops a genuinely broken chunk from reload-looping.
const CHUNK_RELOAD_KEY = 'schoolos-chunk-reload-attempted';

// `keyof T` alone collapses every export's props to `{}` once passed through
// React.lazy, silently dropping prop types (e.g. ClassTeachersPage's optional
// backTo/backLabel). Binding K lets the returned LazyExoticComponent keep the
// real prop type of whichever named export was picked.
const lazyPage = <T extends Record<string, React.ComponentType<any>>, K extends keyof T>(
  factory: () => Promise<T>,
  name: K,
): React.LazyExoticComponent<T[K]> =>
  lazy(async () => {
    try {
      const mod = await factory();
      sessionStorage.removeItem(CHUNK_RELOAD_KEY);
      return { default: mod[name] };
    } catch (err) {
      if (!sessionStorage.getItem(CHUNK_RELOAD_KEY)) {
        sessionStorage.setItem(CHUNK_RELOAD_KEY, '1');
        window.location.reload();
        // Suspend forever — the reload takes over before this would resolve.
        return new Promise<never>(() => {});
      }
      throw err;
    }
  }) as React.LazyExoticComponent<T[K]>;

// LoginPage is imported eagerly (above), not via lazyPage: it's the page
// almost every fresh visit hits first, so bundling it into the main chunk
// avoids an extra dynamic-import round trip that would otherwise delay the
// login form's first paint. AppLayout — the authenticated app shell
// (sidebar/topbar/notifications) — is lazy instead, so none of that weight
// loads until a user is actually past login.
const AppLayout = lazyPage(
  () => import('@/layouts/AppLayout'),
  'AppLayout',
);
const RecoverAccountPage = lazyPage(
  () => import('@/features/auth/pages/RecoverAccountPage'),
  'RecoverAccountPage',
);
const RecoveryResetPage = lazyPage(
  () => import('@/features/auth/pages/RecoveryResetPage'),
  'RecoveryResetPage',
);
const RecoveryRequestsPage = lazyPage(
  () => import('@/features/auth/pages/RecoveryRequestsPage'),
  'RecoveryRequestsPage',
);
const MessagesPage = lazyPage(
  () => import('@/features/internal-messages/pages/MessagesPage'),
  'MessagesPage',
);
const NotificationDetailPage = lazyPage(
  () => import('@/features/notifications/pages/NotificationDetailPage'),
  'NotificationDetailPage',
);
const PushNotificationDesignPage = lazyPage(
  () => import('@/features/notifications/push-preview/pages/PushNotificationDesignPage'),
  'PushNotificationDesignPage',
);
const ReceptionWorkspace = lazyPage(
  () => import('@/features/reception/pages/ReceptionWorkspace'),
  'ReceptionWorkspace',
);
const VisitorLogPage = lazyPage(
  () => import('@/features/reception/pages/VisitorLogPage'),
  'VisitorLogPage',
);
const ReceptionAttendancePage = lazyPage(
  () => import('@/features/reception/pages/ReceptionAttendancePage'),
  'ReceptionAttendancePage',
);
const ReceptionTasksPage = lazyPage(
  () => import('@/features/reception/pages/ReceptionTasksPage'),
  'ReceptionTasksPage',
);
const FollowUpDashboardPage = lazyPage(
  () => import('@/features/reception/pages/FollowUpDashboardPage'),
  'FollowUpDashboardPage',
);
const CandidatesPage = lazyPage(
  () => import('@/features/reception/pages/CandidatesPage'),
  'CandidatesPage',
);
const CandidateDetailPage = lazyPage(
  () => import('@/features/reception/pages/CandidateDetailPage'),
  'CandidateDetailPage',
);
const FrontOfficeReportsPage = lazyPage(
  () => import('@/features/reception/pages/FrontOfficeReportsPage'),
  'FrontOfficeReportsPage',
);
const StudentListPage = lazyPage(
  () => import('@/features/students/pages/StudentListPage'),
  'StudentListPage',
);
const NewAdmissionPage = lazyPage(
  () => import('@/features/students/pages/NewAdmissionPage'),
  'NewAdmissionPage',
);
const StudentProfilePage = lazyPage(
  () => import('@/features/students/pages/StudentProfilePage'),
  'StudentProfilePage',
);
const EditStudentPage = lazyPage(
  () => import('@/features/students/pages/EditStudentPage'),
  'EditStudentPage',
);
const StudentCommunicationsPage = lazyPage(
  () => import('@/features/students/pages/StudentCommunicationsPage'),
  'StudentCommunicationsPage',
);
const CommunicationWorkspace = lazyPage(
  () => import('@/features/communication/pages/CommunicationWorkspace'),
  'CommunicationWorkspace',
);
const OpsLayout = lazyPage(
  () => import('@/features/ops-center/layouts/OpsLayout'),
  'OpsLayout',
);
const OpsDashboardPage = lazyPage(
  () => import('@/features/ops-center/pages/OpsDashboardPage'),
  'OpsDashboardPage',
);
const OpsSchoolsPage = lazyPage(
  () => import('@/features/ops-center/pages/OpsSchoolsPage'),
  'OpsSchoolsPage',
);
const OpsInfrastructurePage = lazyPage(
  () => import('@/features/ops-center/pages/OpsInfrastructurePage'),
  'OpsInfrastructurePage',
);
const OpsSecurityPage = lazyPage(
  () => import('@/features/ops-center/pages/OpsSecurityPage'),
  'OpsSecurityPage',
);
const OpsLogsPage = lazyPage(
  () => import('@/features/ops-center/pages/OpsLogsPage'),
  'OpsLogsPage',
);
const OpsAuditTrailPage = lazyPage(
  () => import('@/features/ops-center/pages/OpsAuditTrailPage'),
  'OpsAuditTrailPage',
);
const OpsApplicationsPage = lazyPage(
  () => import('@/features/ops-center/pages/OpsApplicationsPage'),
  'OpsApplicationsPage',
);
const OpsChapterCaptureUsagePage = lazyPage(
  () => import('@/features/ops-center/pages/OpsChapterCaptureUsagePage'),
  'OpsChapterCaptureUsagePage',
);
const OpsTestEnginePage = lazyPage(
  () => import('@/features/ops-center/pages/OpsTestEnginePage'),
  'OpsTestEnginePage',
);
const OpsSchoolDetailPage = lazyPage(
  () => import('@/features/ops-center/pages/OpsSchoolDetailPage'),
  'OpsSchoolDetailPage',
);
const OpsErrorsPage = lazyPage(
  () => import('@/features/ops-center/pages/OpsErrorsPage'),
  'OpsErrorsPage',
);
const OpsDatabasePage = lazyPage(
  () => import('@/features/ops-center/pages/OpsDatabasePage'),
  'OpsDatabasePage',
);
const OpsDeploymentsPage = lazyPage(
  () => import('@/features/ops-center/pages/OpsDeploymentsPage'),
  'OpsDeploymentsPage',
);
const OpsCommunicationsPage = lazyPage(
  () => import('@/features/ops-center/pages/OpsCommunicationsPage'),
  'OpsCommunicationsPage',
);
const OpsUsersPage = lazyPage(
  () => import('@/features/ops-center/pages/OpsUsersPage'),
  'OpsUsersPage',
);
const OpsFeatureFlagsPage = lazyPage(
  () => import('@/features/ops-center/pages/OpsFeatureFlagsPage'),
  'OpsFeatureFlagsPage',
);
const OpsFeatureFlagDetailPage = lazyPage(
  () => import('@/features/ops-center/pages/OpsFeatureFlagDetailPage'),
  'OpsFeatureFlagDetailPage',
);
const OpsMaintenancePage = lazyPage(
  () => import('@/features/ops-center/pages/OpsMaintenancePage'),
  'OpsMaintenancePage',
);
const OpsModuleAccessPage = lazyPage(
  () => import('@/features/ops-center/pages/OpsModuleAccessPage'),
  'OpsModuleAccessPage',
);
const OpsAlertsPage = lazyPage(
  () => import('@/features/ops-center/pages/OpsAlertsPage'),
  'OpsAlertsPage',
);
const OpsSettingsPage = lazyPage(
  () => import('@/features/ops-center/pages/OpsSettingsPage'),
  'OpsSettingsPage',
);
const OpsPerformancePage = lazyPage(
  () => import('@/features/ops-center/pages/OpsPerformancePage'),
  'OpsPerformancePage',
);
const AdministrationWorkspace = lazyPage(
  () => import('@/features/administration/pages/AdministrationWorkspace'),
  'AdministrationWorkspace',
);
const AdminDashboardPage = lazyPage(
  () => import('@/features/administration/pages/AdminDashboardPage'),
  'AdminDashboardPage',
);
const UserManagementPage = lazyPage(
  () => import('@/features/users/pages/UserManagementPage'),
  'UserManagementPage',
);
const CreateUserPage = lazyPage(
  () => import('@/features/users/pages/CreateUserPage'),
  'CreateUserPage',
);
const EditUserPage = lazyPage(
  () => import('@/features/users/pages/EditUserPage'),
  'EditUserPage',
);
const UserDetailPage = lazyPage(
  () => import('@/features/users/pages/UserDetailPage'),
  'UserDetailPage',
);
const RoleManagementPage = lazyPage(
  () => import('@/features/users/pages/RoleManagementPage'),
  'RoleManagementPage',
);
const ClassTeachersPage = lazyPage(
  () => import('@/features/administration/pages/ClassTeachersPage'),
  'ClassTeachersPage',
);
const AutomationJobsPage = lazyPage(
  () => import('@/features/automation/pages/AutomationJobsPage'),
  'AutomationJobsPage',
);
const AutomationJobDetailPage = lazyPage(
  () => import('@/features/automation/pages/AutomationJobDetailPage'),
  'AutomationJobDetailPage',
);
const TeacherListPage = lazyPage(
  () => import('@/features/teachers/pages/TeacherListPage'),
  'TeacherListPage',
);
const TeacherLoginsPage = lazyPage(
  () => import('@/features/teachers/pages/TeacherLoginsPage'),
  'TeacherLoginsPage',
);
const NewTeacherPage = lazyPage(
  () => import('@/features/teachers/pages/NewTeacherPage'),
  'NewTeacherPage',
);
const TeacherProfilePage = lazyPage(
  () => import('@/features/teachers/pages/TeacherProfilePage'),
  'TeacherProfilePage',
);
const EditTeacherPage = lazyPage(
  () => import('@/features/teachers/pages/EditTeacherPage'),
  'EditTeacherPage',
);
const ExamListPage = lazyPage(
  () => import('@/features/marks/pages/ExamListPage'),
  'ExamListPage',
);
const NewExamPage = lazyPage(
  () => import('@/features/marks/pages/NewExamPage'),
  'NewExamPage',
);
const EditExamPage = lazyPage(
  () => import('@/features/marks/pages/EditExamPage'),
  'EditExamPage',
);
const AttendanceWorkspace = lazyPage(
  () => import('@/features/attendance/pages/AttendanceWorkspace'),
  'AttendanceWorkspace',
);
const ClassAttendancePage = lazyPage(
  () => import('@/features/attendance/pages/ClassAttendancePage'),
  'ClassAttendancePage',
);
const FeeWorkspace = lazyPage(
  () => import('@/features/fees/pages/FeeWorkspace'),
  'FeeWorkspace',
);
const NewFeeRecordPage = lazyPage(
  () => import('@/features/fees/pages/NewFeeRecordPage'),
  'NewFeeRecordPage',
);
const FeeRecordDetailPage = lazyPage(
  () => import('@/features/fees/pages/FeeRecordDetailPage'),
  'FeeRecordDetailPage',
);
const StudentFeeProfilePage = lazyPage(
  () => import('@/features/fees/pages/StudentFeeProfilePage'),
  'StudentFeeProfilePage',
);
const TimetableWorkspace = lazyPage(
  () => import('@/features/timetable/pages/TimetableWorkspace'),
  'TimetableWorkspace',
);
const TimetableGridPage = lazyPage(
  () => import('@/features/timetable/pages/TimetableGridPage'),
  'TimetableGridPage',
);
const NewTimetablePage = lazyPage(
  () => import('@/features/timetable/pages/NewTimetablePage'),
  'NewTimetablePage',
);
const EditTimetablePage = lazyPage(
  () => import('@/features/timetable/pages/EditTimetablePage'),
  'EditTimetablePage',
);
const PeriodSetupPage = lazyPage(
  () => import('@/features/timetable/pages/PeriodSetupPage'),
  'PeriodSetupPage',
);
const TeacherTimetablePage = lazyPage(
  () => import('@/features/timetable/pages/TeacherTimetablePage'),
  'TeacherTimetablePage',
);
const SubstituteWorkspace = lazyPage(
  () => import('@/features/timetable/pages/SubstituteWorkspace'),
  'SubstituteWorkspace',
);
const TeacherTimetableBuilderPage = lazyPage(
  () => import('@/features/timetable/pages/TeacherTimetableBuilderPage'),
  'TeacherTimetableBuilderPage',
);
const SchoolTimetablePage = lazyPage(
  () => import('@/features/timetable/pages/SchoolTimetablePage'),
  'SchoolTimetablePage',
);
const EnquiryWorkspace = lazyPage(
  () => import('@/features/enquiries/pages/EnquiryWorkspace'),
  'EnquiryWorkspace',
);
const NewEnquiryPage = lazyPage(
  () => import('@/features/enquiries/pages/NewEnquiryPage'),
  'NewEnquiryPage',
);
const EnquiryProfilePage = lazyPage(
  () => import('@/features/enquiries/pages/EnquiryProfilePage'),
  'EnquiryProfilePage',
);
const EditEnquiryPage = lazyPage(
  () => import('@/features/enquiries/pages/EditEnquiryPage'),
  'EditEnquiryPage',
);
const CalendarWorkspace = lazyPage(
  () => import('@/features/events/pages/CalendarWorkspace'),
  'CalendarWorkspace',
);
const NewEventPage = lazyPage(
  () => import('@/features/events/pages/NewEventPage'),
  'NewEventPage',
);
const EventDetailPage = lazyPage(
  () => import('@/features/events/pages/EventDetailPage'),
  'EventDetailPage',
);
const EditEventPage = lazyPage(
  () => import('@/features/events/pages/EditEventPage'),
  'EditEventPage',
);
const PrincipalWorkspace = lazyPage(
  () => import('@/features/principal/pages/PrincipalWorkspace'),
  'PrincipalWorkspace',
);
const PendingApprovalsPage = lazyPage(
  () => import('@/features/principal/pages/PendingApprovalsPage'),
  'PendingApprovalsPage',
);
const LeaveApprovalsPage = lazyPage(
  () => import('@/features/principal/pages/LeaveApprovalsPage'),
  'LeaveApprovalsPage',
);
const RecruitmentDashboardPage = lazyPage(
  () => import('@/features/principal/pages/RecruitmentDashboardPage'),
  'RecruitmentDashboardPage',
);
const PrincipalInsightsPage = lazyPage(
  () => import('@/features/principal/pages/PrincipalInsightsPage'),
  'PrincipalInsightsPage',
);
const ClassSectionManagementPage = lazyPage(
  () => import('@/features/school-classes/pages/ClassSectionManagementPage'),
  'ClassSectionManagementPage',
);
const FeeStructureBuilderPage = lazyPage(
  () => import('@/features/fees/pages/FeeStructureBuilderPage'),
  'FeeStructureBuilderPage',
);
const SchoolSettingsPage = lazyPage(
  () => import('@/features/school-settings/pages/SchoolSettingsPage'),
  'SchoolSettingsPage',
);
const PrincipalChangePasswordPage = lazyPage(
  () => import('@/features/principal/pages/PrincipalChangePasswordPage'),
  'PrincipalChangePasswordPage',
);
const TeachersSummaryPage = lazyPage(
  () => import('@/features/principal/pages/TeachersSummaryPage'),
  'TeachersSummaryPage',
);
const PrincipalTeacherDirectoryPage = lazyPage(
  () => import('@/features/principal/pages/PrincipalTeacherDirectoryPage'),
  'PrincipalTeacherDirectoryPage',
);
const DiscountApprovalsPage = lazyPage(
  () => import('@/features/principal/pages/DiscountApprovalsPage'),
  'DiscountApprovalsPage',
);
const TestApprovalsPage = lazyPage(
  () => import('@/features/principal/pages/TestApprovalsPage'),
  'TestApprovalsPage',
);
const ReportsWorkspace = lazyPage(
  () => import('@/features/reports/pages/ReportsWorkspace'),
  'ReportsWorkspace',
);
const ReportBuilderPage = lazyPage(
  () => import('@/features/reports/pages/ReportBuilderPage'),
  'ReportBuilderPage',
);
const SavedReportsPage = lazyPage(
  () => import('@/features/reports/pages/SavedReportsPage'),
  'SavedReportsPage',
);
const AutomationWorkspace = lazyPage(
  () => import('@/features/automation/pages/AutomationWorkspace'),
  'AutomationWorkspace',
);
const WorkflowLibraryPage = lazyPage(
  () => import('@/features/automation/pages/WorkflowLibraryPage'),
  'WorkflowLibraryPage',
);
const WorkflowDetailPage = lazyPage(
  () => import('@/features/automation/pages/WorkflowDetailPage'),
  'WorkflowDetailPage',
);
const IntegrationDashboard = lazyPage(
  () => import('@/features/integrations/pages/IntegrationDashboard'),
  'IntegrationDashboard',
);
const ProviderMarketplace = lazyPage(
  () => import('@/features/integrations/pages/ProviderMarketplace'),
  'ProviderMarketplace',
);
const ConnectIntegrationPage = lazyPage(
  () => import('@/features/integrations/pages/ConnectIntegrationPage'),
  'ConnectIntegrationPage',
);
const ConnectedIntegrationsPage = lazyPage(
  () => import('@/features/integrations/pages/ConnectedIntegrationsPage'),
  'ConnectedIntegrationsPage',
);
const IntegrationDetailPage = lazyPage(
  () => import('@/features/integrations/pages/IntegrationDetailPage'),
  'IntegrationDetailPage',
);
const SyncHistoryPage = lazyPage(
  () => import('@/features/integrations/pages/SyncHistoryPage'),
  'SyncHistoryPage',
);
const ApiKeyManager = lazyPage(
  () => import('@/features/integrations/pages/ApiKeyManager'),
  'ApiKeyManager',
);
const WebhookManager = lazyPage(
  () => import('@/features/integrations/pages/WebhookManager'),
  'WebhookManager',
);
const ImportDashboard = lazyPage(
  () => import('@/features/import/pages/ImportDashboard'),
  'ImportDashboard',
);
const UploadCenter = lazyPage(
  () => import('@/features/import/pages/UploadCenter'),
  'UploadCenter',
);
const ImportSessionDetail = lazyPage(
  () => import('@/features/import/pages/ImportSessionDetail'),
  'ImportSessionDetail',
);
const ImportHistory = lazyPage(
  () => import('@/features/import/pages/ImportHistory'),
  'ImportHistory',
);
const TemplatesLibrary = lazyPage(
  () => import('@/features/import/pages/TemplatesLibrary'),
  'TemplatesLibrary',
);
const TeacherLayout = lazyPage(
  () => import('@/features/teacher-workspace/components/TeacherLayout'),
  'TeacherLayout',
);
const TeacherDashboard = lazyPage(
  () => import('@/features/teacher-workspace/pages/TeacherDashboard'),
  'TeacherDashboard',
);
const TeacherClassesPage = lazyPage(
  () => import('@/features/teacher-workspace/pages/TeacherClassesPage'),
  'TeacherClassesPage',
);
const ClassDetailPage = lazyPage(
  () => import('@/features/teacher-workspace/pages/ClassDetailPage'),
  'ClassDetailPage',
);
const TeacherStudentListPage = lazyPage(
  () => import('@/features/teacher-workspace/pages/TeacherStudentListPage'),
  'TeacherStudentListPage',
);
const TeacherAddStudentPage = lazyPage(
  () => import('@/features/teacher-workspace/pages/TeacherAddStudentPage'),
  'TeacherAddStudentPage',
);
const TeacherAttendancePage = lazyPage(
  () => import('@/features/teacher-workspace/pages/TeacherAttendancePage'),
  'TeacherAttendancePage',
);
const TeacherBehaviorPage = lazyPage(
  () => import('@/features/teacher-workspace/pages/TeacherBehaviorPage'),
  'TeacherBehaviorPage',
);
const TeacherHistoryPage = lazyPage(
  () => import('@/features/teacher-workspace/pages/TeacherHistoryPage'),
  'TeacherHistoryPage',
);
const MarksHubPage = lazyPage(
  () => import('@/features/marks/pages/MarksHubPage'),
  'MarksHubPage',
);
const ReportCardHubPage = lazyPage(
  () => import('@/features/report-cards/pages/ReportCardHubPage'),
  'ReportCardHubPage',
);
const ReportCardRosterPage = lazyPage(
  () => import('@/features/report-cards/pages/ReportCardRosterPage'),
  'ReportCardRosterPage',
);
const ReportCardPreviewPage = lazyPage(
  () => import('@/features/report-cards/pages/ReportCardPreviewPage'),
  'ReportCardPreviewPage',
);
const VerifyReportCardPage = lazyPage(
  () => import('@/features/report-cards/pages/VerifyReportCardPage'),
  'VerifyReportCardPage',
);
const TemplateListPage = lazyPage(
  () => import('@/features/report-card-templates/pages/TemplateListPage'),
  'TemplateListPage',
);
const TemplateBuilderPage = lazyPage(
  () => import('@/features/report-card-templates/pages/TemplateBuilderPage'),
  'TemplateBuilderPage',
);
const TermReportCardHubPage = lazyPage(
  () => import('@/features/term-report-cards/pages/TermReportCardHubPage'),
  'TermReportCardHubPage',
);
const TermReportCardRosterPage = lazyPage(
  () => import('@/features/term-report-cards/pages/TermReportCardRosterPage'),
  'TermReportCardRosterPage',
);
const TermReportCardPreviewPage = lazyPage(
  () => import('@/features/term-report-cards/pages/TermReportCardPreviewPage'),
  'TermReportCardPreviewPage',
);
const VerifyTermReportCardPage = lazyPage(
  () => import('@/features/term-report-cards/pages/VerifyTermReportCardPage'),
  'VerifyTermReportCardPage',
);
const QuestionBankPage = lazyPage(
  () => import('@/features/question-bank/pages/QuestionBankPage'),
  'QuestionBankPage',
);
const QuestionUploadPage = lazyPage(
  () => import('@/features/question-bank/pages/QuestionUploadPage'),
  'QuestionUploadPage',
);
const QuestionSourceDetailPage = lazyPage(
  () => import('@/features/question-bank/pages/QuestionSourceDetailPage'),
  'QuestionSourceDetailPage',
);
const ChapterCapturePage = lazyPage(
  () => import('@/features/question-bank/pages/ChapterCapturePage'),
  'ChapterCapturePage',
);
const ChapterReviewPage = lazyPage(
  () => import('@/features/question-bank/pages/ChapterReviewPage'),
  'ChapterReviewPage',
);
const QuestionChapterPage = lazyPage(
  () => import('@/features/question-bank/pages/QuestionChapterPage'),
  'QuestionChapterPage',
);
const PaperGeneratorPage = lazyPage(
  () => import('@/features/question-bank/pages/PaperGeneratorPage'),
  'PaperGeneratorPage',
);
const PaperPreviewPage = lazyPage(
  () => import('@/features/question-bank/pages/PaperPreviewPage'),
  'PaperPreviewPage',
);
const PaperListPage = lazyPage(
  () => import('@/features/question-bank/pages/PaperListPage'),
  'PaperListPage',
);
const SyllabusTrackerPage = lazyPage(
  () => import('@/features/syllabus-tracker/pages/SyllabusTrackerPage'),
  'SyllabusTrackerPage',
);
const WorksheetHubPage = lazyPage(
  () => import('@/features/worksheet-generator/pages/WorksheetHubPage'),
  'WorksheetHubPage',
);
const WorksheetGeneratePage = lazyPage(
  () => import('@/features/worksheet-generator/pages/WorksheetGeneratePage'),
  'WorksheetGeneratePage',
);
const WorksheetViewPage = lazyPage(
  () => import('@/features/worksheet-generator/pages/WorksheetViewPage'),
  'WorksheetViewPage',
);
const WorksheetListPage = lazyPage(
  () => import('@/features/worksheet-generator/pages/WorksheetListPage'),
  'WorksheetListPage',
);
const PlannerHubPage = lazyPage(
  () => import('@/features/teacher-planner/pages/PlannerHubPage'),
  'PlannerHubPage',
);
const PlannerBuildPage = lazyPage(
  () => import('@/features/teacher-planner/pages/PlannerBuildPage'),
  'PlannerBuildPage',
);
const PlannerDashboardPage = lazyPage(
  () => import('@/features/teacher-planner/pages/PlannerDashboardPage'),
  'PlannerDashboardPage',
);
const AcademicPlanHubPage = lazyPage(
  () => import('@/features/academic-plan/pages/AcademicPlanHubPage'),
  'AcademicPlanHubPage',
);
const AcademicPlanDashboardPage = lazyPage(
  () => import('@/features/academic-plan/pages/AcademicPlanDashboardPage'),
  'AcademicPlanDashboardPage',
);
const PrincipalAcademicPlanPage = lazyPage(
  () => import('@/features/academic-plan/pages/PrincipalAcademicPlanPage'),
  'PrincipalAcademicPlanPage',
);
const PrincipalAcademicPlanTeacherPage = lazyPage(
  () => import('@/features/academic-plan/pages/PrincipalAcademicPlanTeacherPage'),
  'PrincipalAcademicPlanTeacherPage',
);
const PrincipalAcademicPlanDetailPage = lazyPage(
  () => import('@/features/academic-plan/pages/PrincipalAcademicPlanDetailPage'),
  'PrincipalAcademicPlanDetailPage',
);
const CoordinatorDashboardPage = lazyPage(
  () => import('@/features/academic-year/pages/CoordinatorDashboardPage'),
  'CoordinatorDashboardPage',
);
const CoordinatorCalendarPage = lazyPage(
  () => import('@/features/academic-year/pages/CoordinatorCalendarPage'),
  'CoordinatorCalendarPage',
);
const CoordinatorSyllabusPage = lazyPage(
  () => import('@/features/academic-year/pages/CoordinatorSyllabusPage'),
  'CoordinatorSyllabusPage',
);
const PrincipalPlannerPage = lazyPage(
  () => import('@/features/principal/pages/PrincipalPlannerPage'),
  'PrincipalPlannerPage',
);
const PrincipalPlannerDetailPage = lazyPage(
  () => import('@/features/principal/pages/PrincipalPlannerDetailPage'),
  'PrincipalPlannerDetailPage',
);
const PrincipalPlannerTeacherPage = lazyPage(
  () => import('@/features/principal/pages/PrincipalPlannerTeacherPage'),
  'PrincipalPlannerTeacherPage',
);
const MarksEntryPage = lazyPage(
  () => import('@/features/marks/pages/MarksEntryPage'),
  'MarksEntryPage',
);
const TeacherWorkspaceTimetablePage = lazyPage(
  () => import('@/features/teacher-workspace/pages/TeacherTimetablePage'),
  'TeacherTimetablePage',
);
const TeacherWorkspaceProfilePage = lazyPage(
  () => import('@/features/teacher-workspace/pages/TeacherProfilePage'),
  'TeacherProfilePage',
);
const TeacherChangePasswordPage = lazyPage(
  () => import('@/features/teacher-workspace/pages/TeacherChangePasswordPage'),
  'TeacherChangePasswordPage',
);
const PasskeyManagePage = lazyPage(
  () => import('@/features/auth/pages/PasskeyManagePage'),
  'PasskeyManagePage',
);
const AccountantLayout = lazyPage(
  () => import('@/features/accountant-workspace/components/AccountantLayout'),
  'AccountantLayout',
);
const AccountantDashboard = lazyPage(
  () => import('@/features/accountant-workspace/pages/AccountantDashboard'),
  'AccountantDashboard',
);
const FeeCollectionPage = lazyPage(
  () => import('@/features/accountant-workspace/pages/FeeCollectionPage'),
  'FeeCollectionPage',
);
const PendingFeesPage = lazyPage(
  () => import('@/features/accountant-workspace/pages/PendingFeesPage'),
  'PendingFeesPage',
);
const FeeRecordsPage = lazyPage(
  () => import('@/features/accountant-workspace/pages/FeeRecordsPage'),
  'FeeRecordsPage',
);
const SalaryPage = lazyPage(
  () => import('@/features/accountant-workspace/pages/SalaryPage'),
  'SalaryPage',
);
const ExpensesPage = lazyPage(
  () => import('@/features/accountant-workspace/pages/ExpensesPage'),
  'ExpensesPage',
);
const AccountantReportsPage = lazyPage(
  () => import('@/features/accountant-workspace/pages/AccountantReportsPage'),
  'AccountantReportsPage',
);
const StudentDirectoryPage = lazyPage(
  () => import('@/features/accountant-workspace/pages/StudentDirectoryPage'),
  'StudentDirectoryPage',
);
const TeacherDirectoryPage = lazyPage(
  () => import('@/features/accountant-workspace/pages/TeacherDirectoryPage'),
  'TeacherDirectoryPage',
);
const VendorDirectoryPage = lazyPage(
  () => import('@/features/vendors/pages/VendorDirectoryPage'),
  'VendorDirectoryPage',
);
const VendorProfilePage = lazyPage(
  () => import('@/features/vendors/pages/VendorProfilePage'),
  'VendorProfilePage',
);
const AccountantTeacherSearchPage = lazyPage(
  () => import('@/features/accountant-workspace/pages/AccountantTeacherSearchPage'),
  'AccountantTeacherSearchPage',
);
const OperationsDashboard = lazyPage(
  () => import('@/features/operations/pages/OperationsDashboard'),
  'OperationsDashboard',
);
const PurchaseRequestsPage = lazyPage(
  () => import('@/features/purchases/pages/PurchaseRequestsPage'),
  'PurchaseRequestsPage',
);
const PurchaseOrdersPage = lazyPage(
  () => import('@/features/purchases/pages/PurchaseOrdersPage'),
  'PurchaseOrdersPage',
);
const InventoryPage = lazyPage(
  () => import('@/features/inventory/pages/InventoryPage'),
  'InventoryPage',
);
const AssetsPage = lazyPage(
  () => import('@/features/assets/pages/AssetsPage'),
  'AssetsPage',
);
const FacilityRequestsPage = lazyPage(
  () => import('@/features/facility-requests/pages/FacilityRequestsPage'),
  'FacilityRequestsPage',
);
const AccountantTeacherProfilePage = lazyPage(
  () => import('@/features/accountant-workspace/pages/AccountantTeacherProfilePage'),
  'AccountantTeacherProfilePage',
);
// Smart QR Attendance & Payroll — Phase 1 (employees, ID cards, QR management,
// principal's webcam scanner, teacher read-only views)
const EmployeesPage = lazyPage(
  () => import('@/features/employees/pages/EmployeesPage'),
  'EmployeesPage',
);
const EmployeeProfilePage = lazyPage(
  () => import('@/features/employees/pages/EmployeeProfilePage'),
  'EmployeeProfilePage',
);
const EmployeeDirectoryProfilePage = lazyPage(
  () => import('@/features/employees/pages/EmployeeDirectoryProfilePage'),
  'EmployeeDirectoryProfilePage',
);
const IdCardsPage = lazyPage(
  () => import('@/features/employees/pages/IdCardsPage'),
  'IdCardsPage',
);
const QrManagementPage = lazyPage(
  () => import('@/features/employees/pages/QrManagementPage'),
  'QrManagementPage',
);
const AttendanceOverviewPage = lazyPage(
  () => import('@/features/employees/pages/AttendanceOverviewPage'),
  'AttendanceOverviewPage',
);
// Smart QR Attendance & Payroll — Phase 2 (payroll UI, admin-only)
const PayrollPage = lazyPage(
  () => import('@/features/payroll/pages/PayrollPage'),
  'PayrollPage',
);
const PayrollDetailPage = lazyPage(
  () => import('@/features/payroll/pages/PayrollDetailPage'),
  'PayrollDetailPage',
);
const AttendanceScannerPage = lazyPage(
  () => import('@/features/principal/pages/AttendanceScannerPage'),
  'AttendanceScannerPage',
);
const TeacherIdCardPage = lazyPage(
  () => import('@/features/teacher-workspace/pages/TeacherIdCardPage'),
  'TeacherIdCardPage',
);
const TeacherMyAttendancePage = lazyPage(
  () => import('@/features/teacher-workspace/pages/TeacherMyAttendancePage'),
  'TeacherMyAttendancePage',
);
// Smart QR Attendance & Payroll — Phase 2 (teacher read-only payslip view)
const TeacherMyPayslipsPage = lazyPage(
  () => import('@/features/teacher-workspace/pages/TeacherMyPayslipsPage'),
  'TeacherMyPayslipsPage',
);

const ParentLayout = lazyPage(
  () => import('@/features/parent-workspace/components/ParentLayout'),
  'ParentLayout',
);
const ParentDashboardPage = lazyPage(
  () => import('@/features/parent-workspace/pages/ParentDashboardPage'),
  'ParentDashboardPage',
);
const ParentAcademicsPage = lazyPage(
  () => import('@/features/parent-workspace/pages/AcademicsPage'),
  'AcademicsPage',
);
const ParentAttendancePage = lazyPage(
  () => import('@/features/parent-workspace/pages/AttendancePage'),
  'AttendancePage',
);
const ParentFeesPage = lazyPage(
  () => import('@/features/parent-workspace/pages/FeesPage'),
  'FeesPage',
);
const ParentMorePage = lazyPage(
  () => import('@/features/parent-workspace/pages/MorePage'),
  'MorePage',
);
const ParentReportCardPage = lazyPage(
  () => import('@/features/parent-workspace/pages/ReportCardPage'),
  'ReportCardPage',
);
const ParentTestsPage = lazyPage(
  () => import('@/features/parent-workspace/pages/TestsPage'),
  'TestsPage',
);
const ParentTakeTestPage = lazyPage(
  () => import('@/features/parent-workspace/pages/TakeTestPage'),
  'TakeTestPage',
);
const ParentTransportPage = lazyPage(
  () => import('@/features/parent-workspace/pages/ParentTransportPage'),
  'ParentTransportPage',
);

// Transport / Live Van Tracking
const DriverDashboardPage = lazyPage(
  () => import('@/features/transport/pages/DriverDashboardPage'),
  'DriverDashboardPage',
);
const TransportManagementPage = lazyPage(
  () => import('@/features/transport/pages/TransportManagementPage'),
  'TransportManagementPage',
);

const ComingSoon = lazyPage(
  () => import('@/pages/ComingSoon'),
  'ComingSoon',
);
const SystemStatus = lazyPage(
  () => import('@/pages/SystemStatus'),
  'SystemStatus',
);
const UnderMaintenance = lazyPage(
  () => import('@/pages/UnderMaintenance'),
  'UnderMaintenance',
);
const NotFound = lazyPage(
  () => import('@/pages/NotFound'),
  'NotFound',
);
const Unauthorized = lazyPage(
  () => import('@/pages/Unauthorized'),
  'Unauthorized',
);
const Forbidden = lazyPage(
  () => import('@/pages/Forbidden'),
  'Forbidden',
);

// ── Router ────────────────────────────────────────────────────────────────────

export const router = createBrowserRouter([
  // ── Public routes ────────────────────────────────────────────────────────────
  {
    path: '/status',
    element: <SystemStatus />,
  },
  {
    path: '/unauthorized',
    element: <Unauthorized />,
  },
  {
    path: '/forbidden',
    element: <Forbidden />,
  },
  {
    path: '/under-maintenance',
    element: <UnderMaintenance />,
  },
  {
    path: '/verify/report-card/:token',
    element: <VerifyReportCardPage />,
  },
  {
    path: '/verify/term-report-card/:token',
    element: <VerifyTermReportCardPage />,
  },

  // ── Auth shell (provides AuthProvider for login + app) ────────────────────
  {
    element: (
      <AuthProvider>
        <Suspense
          fallback={
            <div className="flex h-screen items-center justify-center bg-[#F5F5F7]">
              <Loader2 className="w-7 h-7 text-blue-500 animate-spin" />
            </div>
          }
        >
          <Outlet />
        </Suspense>
      </AuthProvider>
    ),
    children: [
      {
        path: '/login',
        element: <LoginPage />,
      },
      {
        path: '/recover-account',
        element: <RecoverAccountPage />,
      },

      // ── Protected app shell ────────────────────────────────────────────────
      {
        element: <ProtectedRoute />,
        children: [
          {
            path: 'recovery/reset',
            element: <RecoveryResetPage />,
          },

          // Ops Center — internal SchoolOS staff only. Its own layout, kept
          // fully separate from the school-facing AppLayout/Sidebar/Topbar.
          {
            element: <ProtectedRoute allowedRoles={['owner', 'super_admin', 'devops', 'developer', 'support']} />,
            children: [
              {
                path: 'ops',
                element: <OpsLayout />,
                children: [
                  { index: true, element: <OpsDashboardPage /> },
                  { path: 'schools', element: <OpsSchoolsPage /> },
                  { path: 'schools/:schoolId', element: <OpsSchoolDetailPage /> },
                  { path: 'errors', element: <OpsErrorsPage /> },
                  { path: 'database', element: <OpsDatabasePage /> },
                  { path: 'deployments', element: <OpsDeploymentsPage /> },
                  { path: 'communications', element: <OpsCommunicationsPage /> },
                  { path: 'users', element: <OpsUsersPage /> },
                  { path: 'feature-flags', element: <OpsFeatureFlagsPage /> },
                  { path: 'feature-flags/:key', element: <OpsFeatureFlagDetailPage /> },
                  { path: 'maintenance', element: <OpsMaintenancePage /> },
                  { path: 'module-access', element: <OpsModuleAccessPage /> },
                  { path: 'alerts', element: <OpsAlertsPage /> },
                  { path: 'settings', element: <OpsSettingsPage /> },
                  { path: 'infrastructure', element: <OpsInfrastructurePage /> },
                  { path: 'security', element: <OpsSecurityPage /> },
                  { path: 'logs', element: <OpsLogsPage /> },
                  { path: 'audit-trail', element: <OpsAuditTrailPage /> },
                  { path: 'applications', element: <OpsApplicationsPage /> },
                  { path: 'chapter-capture-usage', element: <OpsChapterCaptureUsagePage /> },
                  { path: 'test-engine', element: <OpsTestEnginePage /> },
                  { path: 'performance', element: <OpsPerformancePage /> },
                ],
              },
            ],
          },

          {
            path: '/',
            element: <AppLayout />,
            children: [
              {
                index: true,
                element: <RoleBasedRedirect />,
              },

              // Teacher Workspace (teacher-role only, mobile-first with bottom nav)
              {
                element: <ProtectedRoute allowedRoles={['teacher']} />,
                children: [
                  {
                    element: <TeacherLayout />,
                    children: [
                      { path: 'teacher',                                              element: <TeacherDashboard /> },
                      { path: 'teacher/classes',                                      element: <TeacherClassesPage /> },
                      { path: 'teacher/classes/:cls/:section',                        element: <ClassDetailPage /> },
                      { path: 'teacher/classes/:cls/:section/students',               element: <TeacherStudentListPage /> },
                      { path: 'teacher/add-student',                                      element: <TeacherAddStudentPage /> },
                      { path: 'teacher/classes/:cls/:section/add-student',            element: <TeacherAddStudentPage /> },
                      { path: 'teacher/attendance/:cls/:section',                     element: <TeacherAttendancePage /> },
                      { path: 'teacher/behavior/:cls/:section',                       element: <TeacherBehaviorPage /> },
                      { path: 'teacher/marks',                                        element: <MarksHubPage /> },
                      { path: 'teacher/marks/:cls/:section/:subjectName/:examId',      element: <MarksEntryPage /> },
                      { path: 'teacher/question-bank',                                element: <QuestionBankPage /> },
                      { path: 'teacher/question-bank/upload',                         element: <QuestionUploadPage /> },
                      { path: 'teacher/question-bank/sources/:sourceId',               element: <QuestionSourceDetailPage /> },
                      { path: 'teacher/question-bank/capture',                        element: <ChapterCapturePage /> },
                      { path: 'teacher/question-bank/capture/:jobId/review',           element: <ChapterReviewPage /> },
                      { path: 'teacher/question-bank/chapters/:chapterId',             element: <QuestionChapterPage /> },
                      { path: 'teacher/question-bank/generate',                       element: <PaperGeneratorPage /> },
                      { path: 'teacher/question-bank/papers',                         element: <PaperListPage /> },
                      { path: 'teacher/question-bank/papers/:paperId',                element: <PaperPreviewPage /> },
                      { path: 'teacher/planner',                                      element: <PlannerHubPage /> },
                      { path: 'teacher/planner/:cls/:subject',                        element: <PlannerDashboardPage /> },
                      { path: 'teacher/planner/:cls/:subject/build',                  element: <PlannerBuildPage /> },
                      { path: 'teacher/academic-plan',                                element: <AcademicPlanHubPage /> },
                      { path: 'teacher/academic-plan/:cls/:section/:subject',         element: <AcademicPlanDashboardPage /> },
                      { path: 'teacher/syllabus-tracker',                             element: <SyllabusTrackerPage /> },
                      { path: 'teacher/worksheet-generator',                          element: <WorksheetHubPage /> },
                      { path: 'teacher/worksheet-generator/my',                       element: <WorksheetListPage /> },
                      { path: 'teacher/worksheet-generator/view/:id',                 element: <WorksheetViewPage /> },
                      { path: 'teacher/worksheet-generator/:cls/:subject',            element: <WorksheetGeneratePage /> },
                      { path: 'teacher/worksheet-generator/:cls/:subject/list',       element: <WorksheetListPage /> },
                      { path: 'teacher/report-cards',                                 element: <ReportCardHubPage /> },
                      { path: 'teacher/report-cards/:examId/:cls/:section',           element: <ReportCardRosterPage /> },
                      { path: 'teacher/report-cards/:examId/student/:studentId',      element: <ReportCardPreviewPage /> },
                      { path: 'teacher/history',                                      element: <TeacherHistoryPage /> },
                      { path: 'teacher/timetable',                                    element: <TeacherWorkspaceTimetablePage /> },
                      { path: 'teacher/profile',                                      element: <TeacherWorkspaceProfilePage /> },
                      { path: 'teacher/change-password',                              element: <TeacherChangePasswordPage /> },
                      { path: 'teacher/passkeys',                                     element: <PasskeyManagePage /> },
                      { path: 'teacher/id-card',                                      element: <TeacherIdCardPage /> },
                      { path: 'teacher/my-attendance',                                element: <TeacherMyAttendancePage /> },
                      { path: 'teacher/my-payslips',                                  element: <TeacherMyPayslipsPage /> },
                      { path: 'teacher/messages',                                     element: <MessagesPage /> },
                    ],
                  },
                ],
              },

              // Accountant Workspace (accountant-role only, mobile-first with bottom nav)
              {
                // 'operations_manager' also lands here for Vendors/Expenses —
                // those stay owned by Accountant (see project scoping notes),
                // Operations just gets a deep link into this workspace.
                element: <ProtectedRoute allowedRoles={['accountant', 'operations_manager']} />,
                children: [
                  {
                    element: <AccountantLayout />,
                    children: [
                      { path: 'accountant',               element: <AccountantDashboard /> },
                      { path: 'accountant/collect-fee',   element: <FeeCollectionPage /> },
                      { path: 'accountant/pending-fees',  element: <PendingFeesPage /> },
                      { path: 'accountant/fee-records',   element: <FeeRecordsPage /> },
                      { path: 'accountant/fee-structure', element: <FeeStructureBuilderPage /> },
                      { path: 'accountant/student-directory', element: <StudentDirectoryPage /> },
                      { path: 'accountant/teacher-directory', element: <TeacherDirectoryPage /> },
                      { path: 'accountant/teachers',       element: <AccountantTeacherSearchPage /> },
                      { path: 'accountant/teachers/:teacherId', element: <AccountantTeacherProfilePage /> },
                      { path: 'accountant/employees',      element: <EmployeesPage basePath="/accountant/employees" readOnly /> },
                      { path: 'accountant/employees/:id',  element: <EmployeeDirectoryProfilePage basePath="/accountant/employees" /> },
                      { path: 'accountant/salary',        element: <SalaryPage /> },
                      { path: 'accountant/expenses',      element: <ExpensesPage /> },
                      { path: 'accountant/vendors',       element: <VendorDirectoryPage /> },
                      { path: 'accountant/vendors/:vendorId', element: <VendorProfilePage /> },
                      { path: 'accountant/facility-requests', element: <FacilityRequestsPage /> },
                      { path: 'accountant/reports',       element: <AccountantReportsPage /> },
                    ],
                  },
                ],
              },

              // Principal (principal-only executive dashboard — not reachable by admin)
              {
                element: <ProtectedRoute allowedRoles={['principal']} />,
                children: [
                  { path: 'principal', element: <PrincipalWorkspace /> },
                  { path: 'principal/attendance-scanner', element: <AttendanceScannerPage /> },
                  { path: 'principal/insights', element: <PrincipalInsightsPage /> },
                  { path: 'principal/approvals', element: <PendingApprovalsPage /> },
                  { path: 'principal/leave-approvals', element: <LeaveApprovalsPage /> },
                  { path: 'principal/recruitment', element: <RecruitmentDashboardPage /> },
                  { path: 'principal/discount-approvals', element: <DiscountApprovalsPage /> },
                  { path: 'principal/test-approvals', element: <TestApprovalsPage /> },
                  { path: 'principal/class-teachers', element: <ClassTeachersPage backTo="/principal" backLabel="Principal Dashboard" /> },
                  { path: 'principal/change-password', element: <PrincipalChangePasswordPage /> },
                  { path: 'principal/teachers-summary', element: <TeachersSummaryPage /> },
                  { path: 'principal/teachers', element: <PrincipalTeacherDirectoryPage /> },
                  { path: 'principal/planner', element: <PrincipalPlannerPage /> },
                  { path: 'principal/planner/teacher/:teacherId', element: <PrincipalPlannerTeacherPage /> },
                  { path: 'principal/planner/:teacherId/:cls/:subject', element: <PrincipalPlannerDetailPage /> },
                  { path: 'principal/academic-plan', element: <PrincipalAcademicPlanPage /> },
                  { path: 'principal/academic-plan/teacher/:teacherId', element: <PrincipalAcademicPlanTeacherPage /> },
                  { path: 'principal/academic-plan/:teacherId/:cls/:section/:subject', element: <PrincipalAcademicPlanDetailPage /> },
                  { path: 'principal/employees', element: <EmployeesPage basePath="/principal/employees" readOnly /> },
                  { path: 'principal/employees/:id', element: <EmployeeDirectoryProfilePage basePath="/principal/employees" /> },
                  { path: 'principal/push-notification-design', element: <PushNotificationDesignPage /> },
                ],
              },

              // Parent Workspace (parent-role only, mobile-first with bottom
              // nav). Dashboard content is still mock-data-backed pending a
              // real parent-workspace aggregation API; login/routing/role
              // gating is real.
              {
                element: <ProtectedRoute allowedRoles={['parent']} />,
                children: [
                  {
                    element: <ParentLayout />,
                    children: [
                      { path: 'parent', element: <ParentDashboardPage /> },
                      { path: 'parent/academics', element: <ParentAcademicsPage /> },
                      { path: 'parent/academics/report-card', element: <ParentReportCardPage /> },
                      { path: 'parent/attendance', element: <ParentAttendancePage /> },
                      { path: 'parent/fees', element: <ParentFeesPage /> },
                      { path: 'parent/tests', element: <ParentTestsPage /> },
                      { path: 'parent/tests/:id/take', element: <ParentTakeTestPage /> },
                      { path: 'parent/more', element: <ParentMorePage /> },
                      { path: 'parent/transport', element: <ParentTransportPage /> },
                    ],
                  },
                ],
              },

              // Driver Dashboard (driver-role only, single mobile-first page —
              // no sidebar/topbar chrome, see AppLayout's isDriver branch)
              {
                element: <ProtectedRoute allowedRoles={['driver']} />,
                children: [
                  { path: 'driver', element: <DriverDashboardPage /> },
                ],
              },

              // Reports & Analytics (admin-only)
              { path: 'reports',         element: <ReportsWorkspace /> },
              { path: 'reports/builder', element: <ReportBuilderPage /> },
              { path: 'reports/saved',   element: <SavedReportsPage /> },

              // Automation Workspace (admin-only)
              { path: 'automation',                      element: <AutomationWorkspace /> },
              { path: 'automation/library',              element: <WorkflowLibraryPage /> },
              { path: 'automation/library/:workflowId',  element: <WorkflowDetailPage /> },
              { path: 'automation/jobs',                 element: <AutomationJobsPage /> },
              { path: 'automation/jobs/:id',             element: <AutomationJobDetailPage /> },

              // Reception
              { path: 'reception', element: <ReceptionWorkspace /> },
              { path: 'reception/visitors', element: <VisitorLogPage /> },
              { path: 'reception/attendance', element: <ReceptionAttendancePage /> },
              { path: 'reception/tasks', element: <ReceptionTasksPage /> },
              { path: 'reception/follow-ups', element: <FollowUpDashboardPage /> },
              { path: 'reception/candidates', element: <CandidatesPage /> },
              { path: 'reception/candidates/:id', element: <CandidateDetailPage /> },
              { path: 'reception/reports', element: <FrontOfficeReportsPage /> },

              // Students
              { path: 'students', element: <StudentListPage /> },
              { path: 'students/new', element: <NewAdmissionPage /> },
              { path: 'students/:id', element: <StudentProfilePage /> },
              { path: 'students/:id/edit', element: <EditStudentPage /> },
              { path: 'students/:id/communications', element: <StudentCommunicationsPage /> },

              // Attendance
              { path: 'attendance', element: <AttendanceWorkspace /> },
              { path: 'attendance/class/:cls/:section', element: <ClassAttendancePage /> },
              { path: 'attendance/take/:cls/:section', element: <TeacherAttendancePage /> },

              // Fees
              { path: 'fees', element: <FeeWorkspace /> },
              { path: 'fees/new', element: <NewFeeRecordPage /> },
              { path: 'fees/student/:studentId', element: <StudentFeeProfilePage /> },
              { path: 'fees/:id', element: <FeeRecordDetailPage /> },

              // Timetable (static routes before /:id)
              { path: 'timetable/school',                element: <SchoolTimetablePage /> },
              { path: 'timetable',                       element: <TimetableWorkspace /> },
              { path: 'timetable/new',                   element: <NewTimetablePage /> },
              { path: 'timetable/periods',               element: <PeriodSetupPage /> },
              { path: 'timetable/substitutes',           element: <SubstituteWorkspace /> },
              { path: 'timetable/teacher/:teacherId',    element: <TeacherTimetablePage /> },
              { path: 'timetable/:id',                   element: <TimetableGridPage /> },
              { path: 'timetable/:id/edit',              element: <EditTimetablePage /> },

              // Teacher Timetable builder — Principal (and Admin) assign an
              // individual teacher's whole-week schedule directly.
              {
                element: <ProtectedRoute allowedRoles={['admin', 'principal']} />,
                children: [
                  { path: 'timetable/teacher-builder', element: <TeacherTimetableBuilderPage /> },
                ],
              },

              // Enquiries / Admissions CRM (static /new before /:id)
              { path: 'enquiries',          element: <EnquiryWorkspace /> },
              { path: 'enquiries/new',      element: <NewEnquiryPage /> },
              { path: 'enquiries/:id',      element: <EnquiryProfilePage /> },
              { path: 'enquiries/:id/edit', element: <EditEnquiryPage /> },

              // Calendar & Events (static /new before /:id) — anyone can view,
              // creating/editing events is admin + principal only.
              { path: 'calendar',            element: <CalendarWorkspace /> },
              { path: 'calendar/:id',        element: <EventDetailPage /> },
              {
                element: <ProtectedRoute allowedRoles={['admin', 'principal']} />,
                children: [
                  { path: 'calendar/new',      element: <NewEventPage /> },
                  { path: 'calendar/:id/edit', element: <EditEventPage /> },
                ],
              },

              // Teachers — anyone can view; creating/editing is admin + principal
              // + reception only, matching the server-side route restriction.
              { path: 'teachers', element: <TeacherListPage /> },
              { path: 'teachers/:id', element: <TeacherProfilePage /> },
              {
                element: <ProtectedRoute allowedRoles={['admin', 'principal', 'reception']} />,
                children: [
                  { path: 'teachers/new', element: <NewTeacherPage /> },
                  { path: 'teachers/:id/edit', element: <EditTeacherPage /> },
                ],
              },

              // Teacher Logins — admin issues a username/password for teachers
              // who were imported and have no self-signup flow.
              {
                element: <ProtectedRoute allowedRoles={['admin']} />,
                children: [
                  { path: 'teacher-logins', element: <TeacherLoginsPage /> },
                ],
              },

              // Exam Configuration — admin/principal/academic_coordinator, matching
              // the server-side route restriction on exam mutations (static /new
              // before /:id).
              {
                element: <ProtectedRoute allowedRoles={['admin', 'principal', 'academic_coordinator']} />,
                children: [
                  { path: 'exams', element: <ExamListPage /> },
                  { path: 'exams/new', element: <NewExamPage /> },
                  { path: 'exams/:id/edit', element: <EditExamPage /> },
                ],
              },

              // Academic Coordinator Workspace — its own role, reuses the
              // Principal's read-only Academic Plan drill-down screens via
              // basePath (same convention as EmployeesPage's readOnly/basePath).
              {
                element: <ProtectedRoute allowedRoles={['academic_coordinator']} />,
                children: [
                  { path: 'coordinator', element: <CoordinatorDashboardPage /> },
                  { path: 'coordinator/calendar', element: <CoordinatorCalendarPage /> },
                  { path: 'coordinator/syllabus', element: <CoordinatorSyllabusPage /> },
                  { path: 'coordinator/academic-plan', element: <PrincipalAcademicPlanPage basePath="/coordinator/academic-plan" homePath="/coordinator" /> },
                  { path: 'coordinator/academic-plan/teacher/:teacherId', element: <PrincipalAcademicPlanTeacherPage basePath="/coordinator/academic-plan" /> },
                  { path: 'coordinator/academic-plan/:teacherId/:cls/:section/:subject', element: <PrincipalAcademicPlanDetailPage /> },
                ],
              },

              // Operations & Administration Dashboard — Phase 1 (Procurement
              // core). Vendors stays a deep link into the Accountant workspace
              // (see accountant/vendors below, whose ProtectedRoute now also
              // admits this role) rather than a page of its own here.
              {
                element: <ProtectedRoute allowedRoles={['operations_manager', 'admin']} />,
                children: [
                  { path: 'operations', element: <OperationsDashboard /> },
                  { path: 'operations/purchase-requests', element: <PurchaseRequestsPage /> },
                  { path: 'operations/purchase-orders', element: <PurchaseOrdersPage /> },
                  { path: 'operations/inventory', element: <InventoryPage /> },
                  { path: 'operations/assets', element: <AssetsPage /> },
                  { path: 'operations/facility-requests', element: <FacilityRequestsPage /> },
                ],
              },

              // Report Card Templates — admin/principal configure the per-class,
              // per-year layout (subjects, skill sections, grading key, exam mapping).
              {
                element: <ProtectedRoute allowedRoles={['admin', 'principal']} />,
                children: [
                  { path: 'report-card-templates', element: <TemplateListPage /> },
                  { path: 'report-card-templates/new', element: <TemplateBuilderPage /> },
                  { path: 'report-card-templates/:id/edit', element: <TemplateBuilderPage /> },
                ],
              },

              // Term Report Cards — the generated two-term CBSE-style cards, same
              // access bar as the existing single-exam report-cards module.
              {
                element: <ProtectedRoute allowedRoles={['admin', 'principal', 'teacher']} />,
                children: [
                  { path: 'term-report-cards', element: <TermReportCardHubPage /> },
                  { path: 'term-report-cards/:cls/:section/:academicYear', element: <TermReportCardRosterPage /> },
                  { path: 'term-report-cards/:cls/:section/:academicYear/student/:studentId', element: <TermReportCardPreviewPage /> },
                ],
              },

              // Transport Management — Admin and Principal both manage vehicles,
              // drivers, and student assignments (per user decision).
              {
                element: <ProtectedRoute allowedRoles={['admin', 'principal']} />,
                children: [
                  { path: 'transport', element: <TransportManagementPage /> },
                  { path: 'principal/transport', element: <TransportManagementPage /> },
                ],
              },

              // Communication
              { path: 'communication', element: <CommunicationWorkspace /> },

              // Internal Messages (all authenticated roles)
              { path: 'messages', element: <MessagesPage /> },

              // Notification full-page detail (all authenticated roles)
              { path: 'notifications/:id', element: <NotificationDetailPage /> },

              // Smart QR Attendance & Payroll — Phase 1 HR admin tools (admin-only;
              // payroll UI is out of scope for this phase)
              {
                element: <ProtectedRoute allowedRoles={['admin']} />,
                children: [
                  { path: 'admin/employees', element: <EmployeesPage /> },
                  { path: 'admin/employees/:id', element: <EmployeeProfilePage /> },
                  { path: 'admin/attendance-qr', element: <AttendanceOverviewPage /> },
                  { path: 'admin/id-cards', element: <IdCardsPage /> },
                  { path: 'admin/qr-management', element: <QrManagementPage /> },
                  { path: 'admin/payroll', element: <PayrollPage /> },
                  { path: 'admin/payroll/:id', element: <PayrollDetailPage /> },
                ],
              },

              // Administration (admin-only)
              {
                element: <ProtectedRoute allowedRoles={['admin']} />,
                children: [
                  {
                    path: 'administration',
                    element: <AdministrationWorkspace />,
                    children: [
                      { index: true, element: <AdminDashboardPage /> },
                      { path: 'users', element: <UserManagementPage /> },
                      { path: 'users/new', element: <CreateUserPage /> },
                      { path: 'users/:id', element: <UserDetailPage /> },
                      { path: 'users/:id/edit', element: <EditUserPage /> },
                      { path: 'roles', element: <RoleManagementPage /> },
                      { path: 'classes', element: <ClassTeachersPage /> },
                      { path: 'automation', element: <AutomationJobsPage /> },
                      { path: 'automation/:id', element: <AutomationJobDetailPage /> },
                      { path: 'recovery-requests', element: <RecoveryRequestsPage /> },
                    ],
                  },
                ],
              },

              // Integrations Platform (admin-only)
              { path: 'integrations',                    element: <IntegrationDashboard /> },
              { path: 'integrations/marketplace',        element: <ProviderMarketplace /> },
              { path: 'integrations/connect',            element: <ConnectIntegrationPage /> },
              { path: 'integrations/connected',          element: <ConnectedIntegrationsPage /> },
              { path: 'integrations/sync-history',       element: <SyncHistoryPage /> },
              { path: 'integrations/apikeys',            element: <ApiKeyManager /> },
              { path: 'integrations/webhooks',           element: <WebhookManager /> },
              { path: 'integrations/:id',                element: <IntegrationDetailPage /> },

              // Data Import (admin-only)
              { path: 'classes',                 element: <ClassSectionManagementPage /> },
              { path: 'import',                  element: <ImportDashboard /> },
              { path: 'import/upload',            element: <UploadCenter /> },
              { path: 'import/history',           element: <ImportHistory /> },
              { path: 'import/templates',         element: <TemplatesLibrary /> },
              { path: 'import/sessions/:id',      element: <ImportSessionDetail /> },

              // Placeholder routes
              { path: 'ai-assistant', element: <ComingSoon /> },
              { path: 'settings', element: <SchoolSettingsPage /> },
            ],
          },
        ],
      },
    ],
  },

  // ── 404 ─────────────────────────────────────────────────────────────────────
  {
    path: '*',
    element: <NotFound />,
  },
]);
