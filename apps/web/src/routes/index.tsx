import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { AppLayout } from '@/layouts/AppLayout';
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

// `keyof T` alone collapses every export's props to `{}` once passed through
// React.lazy, silently dropping prop types (e.g. ClassTeachersPage's optional
// backTo/backLabel). Binding K lets the returned LazyExoticComponent keep the
// real prop type of whichever named export was picked.
const lazyPage = <T extends Record<string, React.ComponentType<any>>, K extends keyof T>(
  factory: () => Promise<T>,
  name: K,
): React.LazyExoticComponent<T[K]> =>
  lazy(async () => {
    const mod = await factory();
    return { default: mod[name] };
  }) as React.LazyExoticComponent<T[K]>;

const LoginPage = lazyPage(
  () => import('@/features/auth/pages/LoginPage'),
  'LoginPage',
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
const ReceptionWorkspace = lazyPage(
  () => import('@/features/reception/pages/ReceptionWorkspace'),
  'ReceptionWorkspace',
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
const AdministrationWorkspace = lazyPage(
  () => import('@/features/administration/pages/AdministrationWorkspace'),
  'AdministrationWorkspace',
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
const PrincipalInsightsPage = lazyPage(
  () => import('@/features/principal/pages/PrincipalInsightsPage'),
  'PrincipalInsightsPage',
);
const ClassSectionManagementPage = lazyPage(
  () => import('@/features/school-classes/pages/ClassSectionManagementPage'),
  'ClassSectionManagementPage',
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
const DiscountApprovalsPage = lazyPage(
  () => import('@/features/principal/pages/DiscountApprovalsPage'),
  'DiscountApprovalsPage',
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
const TeacherHistoryPage = lazyPage(
  () => import('@/features/teacher-workspace/pages/TeacherHistoryPage'),
  'TeacherHistoryPage',
);
const TeacherWorkspaceTimetablePage = lazyPage(
  () => import('@/features/teacher-workspace/pages/TeacherTimetablePage'),
  'TeacherTimetablePage',
);
const TeacherWorkspaceProfilePage = lazyPage(
  () => import('@/features/teacher-workspace/pages/TeacherProfilePage'),
  'TeacherProfilePage',
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
const StudentLedgerSearchPage = lazyPage(
  () => import('@/features/accountant-workspace/pages/StudentLedgerSearchPage'),
  'StudentLedgerSearchPage',
);
const StudentLedgerPage = lazyPage(
  () => import('@/features/accountant-workspace/pages/StudentLedgerPage'),
  'StudentLedgerPage',
);
const StudentDirectoryPage = lazyPage(
  () => import('@/features/accountant-workspace/pages/StudentDirectoryPage'),
  'StudentDirectoryPage',
);
const TeacherDirectoryPage = lazyPage(
  () => import('@/features/accountant-workspace/pages/TeacherDirectoryPage'),
  'TeacherDirectoryPage',
);
const AccountantTeacherSearchPage = lazyPage(
  () => import('@/features/accountant-workspace/pages/AccountantTeacherSearchPage'),
  'AccountantTeacherSearchPage',
);
const AccountantTeacherProfilePage = lazyPage(
  () => import('@/features/accountant-workspace/pages/AccountantTeacherProfilePage'),
  'AccountantTeacherProfilePage',
);
const ComingSoon = lazyPage(
  () => import('@/pages/ComingSoon'),
  'ComingSoon',
);
const SystemStatus = lazyPage(
  () => import('@/pages/SystemStatus'),
  'SystemStatus',
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
                      { path: 'teacher/history',                                      element: <TeacherHistoryPage /> },
                      { path: 'teacher/timetable',                                    element: <TeacherWorkspaceTimetablePage /> },
                      { path: 'teacher/profile',                                      element: <TeacherWorkspaceProfilePage /> },
                    ],
                  },
                ],
              },

              // Accountant Workspace (accountant-role only, mobile-first with bottom nav)
              {
                element: <ProtectedRoute allowedRoles={['accountant']} />,
                children: [
                  {
                    element: <AccountantLayout />,
                    children: [
                      { path: 'accountant',               element: <AccountantDashboard /> },
                      { path: 'accountant/collect-fee',   element: <FeeCollectionPage /> },
                      { path: 'accountant/pending-fees',  element: <PendingFeesPage /> },
                      { path: 'accountant/fee-records',   element: <FeeRecordsPage /> },
                      { path: 'accountant/fee-structure', element: <Navigate to="/classes" replace /> },
                      { path: 'accountant/student-ledger', element: <StudentLedgerSearchPage /> },
                      { path: 'accountant/student-ledger/:studentId', element: <StudentLedgerPage /> },
                      { path: 'accountant/student-directory', element: <StudentDirectoryPage /> },
                      { path: 'accountant/teacher-directory', element: <TeacherDirectoryPage /> },
                      { path: 'accountant/teachers',       element: <AccountantTeacherSearchPage /> },
                      { path: 'accountant/teachers/:teacherId', element: <AccountantTeacherProfilePage /> },
                      { path: 'accountant/salary',        element: <SalaryPage /> },
                      { path: 'accountant/expenses',      element: <ExpensesPage /> },
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
                  { path: 'principal/insights', element: <PrincipalInsightsPage /> },
                  { path: 'principal/approvals', element: <PendingApprovalsPage /> },
                  { path: 'principal/discount-approvals', element: <DiscountApprovalsPage /> },
                  { path: 'principal/class-teachers', element: <ClassTeachersPage backTo="/principal" backLabel="Principal Dashboard" /> },
                  { path: 'principal/change-password', element: <PrincipalChangePasswordPage /> },
                  { path: 'principal/teachers-summary', element: <TeachersSummaryPage /> },
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

              // Students
              { path: 'students', element: <StudentListPage /> },
              { path: 'students/new', element: <NewAdmissionPage /> },
              { path: 'students/:id', element: <StudentProfilePage /> },
              { path: 'students/:id/edit', element: <EditStudentPage /> },
              { path: 'students/:id/communications', element: <StudentCommunicationsPage /> },

              // Attendance
              { path: 'attendance', element: <AttendanceWorkspace /> },
              { path: 'attendance/class/:cls/:section', element: <ClassAttendancePage /> },

              // Fees
              { path: 'fees', element: <FeeWorkspace /> },
              { path: 'fees/new', element: <NewFeeRecordPage /> },
              { path: 'fees/student/:studentId', element: <StudentFeeProfilePage /> },
              { path: 'fees/:id', element: <FeeRecordDetailPage /> },

              // Timetable (static routes before /:id)
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

              // Communication
              { path: 'communication', element: <CommunicationWorkspace /> },

              // Internal Messages (all authenticated roles)
              { path: 'messages', element: <MessagesPage /> },

              // Notification full-page detail (all authenticated roles)
              { path: 'notifications/:id', element: <NotificationDetailPage /> },

              // Administration (admin-only)
              {
                element: <ProtectedRoute allowedRoles={['admin']} />,
                children: [
                  {
                    path: 'administration',
                    element: <AdministrationWorkspace />,
                    children: [
                      { index: true, element: <Navigate to="/administration/users" replace /> },
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
