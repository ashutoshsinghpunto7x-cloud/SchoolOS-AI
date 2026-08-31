// ── API Response Envelope ─────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: ApiError;
}

export interface ApiError {
  message: string;
  code: string;
  statusCode: number;
}

export interface PaginatedResponse<T> {
  success: true;
  data: T[];
  meta: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// ── Base Entity Fields ────────────────────────────────────────────────────────

export interface BaseEntity {
  _id: string;
  schoolId: string;
  createdAt: string;
  updatedAt: string;
}

export interface SoftDeletableEntity extends BaseEntity {
  isDeleted: boolean;
  deletedAt: string | null;
  deletedBy: string | null;
}

// ── Audit ─────────────────────────────────────────────────────────────────────

export type AuditAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'restore'
  | 'login'
  | 'logout'
  | 'send'
  | 'approve'
  | 'reject';

export interface AuditLog extends BaseEntity {
  userId: string;
  action: AuditAction;
  resource: string;
  resourceId: string;
  changes?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

// ── Common Value Objects ──────────────────────────────────────────────────────

export interface Address {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
}

export type Status = 'active' | 'inactive' | 'deleted';

export type UserRole =
  | 'admin'
  | 'principal'
  // Mirrors 'principal' 1:1 today (same permissions/routes/dashboard) — kept
  // as its own role so it can diverge from principal later without a migration.
  | 'incharge'
  | 'reception'
  | 'teacher'
  | 'accountant'
  | 'parent'
  | 'driver'
  // Internal SchoolOS staff roles — Ops Center access only, not tied to a real school tenant.
  | 'owner'
  | 'super_admin'
  | 'devops'
  | 'developer'
  | 'support';

/** Internal SchoolOS staff roles — used to gate the Ops Center and bypass tenant scoping. */
export const OPS_ROLES: UserRole[] = ['owner', 'super_admin', 'devops', 'developer', 'support'];
export type UserStatus = 'active' | 'inactive' | 'suspended';

// ── Module Access Catalog ────────────────────────────────────────────────────
// The fixed list of top-level dashboard features Ops Center can temporarily
// restrict (see project_module_access memory / Ops Center > Module Access).
// `routePrefixes` are matched against the web app's route paths — a path is
// considered part of a module if it equals a prefix or starts with
// `${prefix}/`. Deliberately excludes each role's own home/dashboard route,
// Settings, Messages, and auth/recovery screens — those can never be
// restricted, so no module list mistake can lock a role out of the app.
export interface ModuleCatalogEntry {
  key: string;
  label: string;
  routePrefixes: string[];
}

export const MODULE_CATALOG: ModuleCatalogEntry[] = [
  { key: 'students', label: 'Students', routePrefixes: ['/students'] },
  { key: 'teachers', label: 'Teachers Directory', routePrefixes: ['/teachers'] },
  { key: 'teacher-logins', label: 'Teacher Logins', routePrefixes: ['/teacher-logins'] },
  { key: 'attendance', label: 'Attendance', routePrefixes: ['/attendance', '/teacher/attendance'] },
  { key: 'fees', label: 'Fees', routePrefixes: ['/fees', '/accountant/collect-fee', '/accountant/pending-fees', '/accountant/fee-records', '/accountant/fee-structure'] },
  { key: 'timetable', label: 'Timetable', routePrefixes: ['/timetable'] },
  { key: 'enquiries', label: 'Admissions / Enquiries', routePrefixes: ['/enquiries'] },
  { key: 'calendar', label: 'Calendar & Events', routePrefixes: ['/calendar'] },
  { key: 'communication', label: 'Communication', routePrefixes: ['/communication'] },
  { key: 'reports', label: 'Reports & Analytics', routePrefixes: ['/reports'] },
  { key: 'automation', label: 'Automation', routePrefixes: ['/automation'] },
  { key: 'import', label: 'Data Import', routePrefixes: ['/import'] },
  { key: 'integrations', label: 'Integrations', routePrefixes: ['/integrations'] },
  { key: 'administration', label: 'Administration', routePrefixes: ['/administration'] },
  { key: 'exams', label: 'Exam Configuration', routePrefixes: ['/exams'] },
  { key: 'report-card-templates', label: 'Report Card Templates', routePrefixes: ['/report-card-templates'] },
  { key: 'report-cards', label: 'Report Cards', routePrefixes: ['/term-report-cards', '/teacher/report-cards'] },
  { key: 'classes', label: 'Classes & Sections', routePrefixes: ['/classes'] },
  { key: 'reception', label: 'Reception Desk', routePrefixes: ['/reception'] },
  { key: 'employees-hr', label: 'Employees & ID Cards', routePrefixes: ['/admin/employees', '/admin/id-cards', '/admin/qr-management'] },
  { key: 'staff-attendance-qr', label: 'Staff Attendance (QR)', routePrefixes: ['/admin/attendance-qr'] },
  { key: 'payroll', label: 'Payroll & Salary', routePrefixes: ['/admin/payroll', '/accountant/salary'] },
  { key: 'expenses', label: 'Expenses', routePrefixes: ['/accountant/expenses'] },
  { key: 'accountant-reports', label: 'Accountant Reports', routePrefixes: ['/accountant/reports'] },
  { key: 'principal-approvals', label: 'Principal Approvals', routePrefixes: ['/principal/approvals', '/principal/leave-approvals', '/principal/discount-approvals'] },
  { key: 'principal-insights', label: 'Principal Insights', routePrefixes: ['/principal/insights'] },
  { key: 'marks', label: 'Marks Entry', routePrefixes: ['/teacher/marks'] },
  { key: 'question-bank', label: 'Question Bank', routePrefixes: ['/teacher/question-bank'] },
  { key: 'worksheet-generator', label: 'Worksheet Generator', routePrefixes: ['/teacher/worksheet-generator'] },
  { key: 'planner', label: 'Teacher Planner', routePrefixes: ['/teacher/planner'] },
  { key: 'principal-planner', label: 'Principal Planner', routePrefixes: ['/principal/planner'] },
  { key: 'syllabus-tracker', label: 'Syllabus Tracker', routePrefixes: ['/teacher/syllabus-tracker'] },
  { key: 'transport', label: 'Transport / Live Tracking', routePrefixes: ['/transport', '/driver', '/parent/transport', '/principal/transport'] },
];

// ── User ──────────────────────────────────────────────────────────────────────

export interface User extends BaseEntity {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: UserRole;
  status: UserStatus;
  avatarUrl?: string;
  lastLoginAt?: string;
  createdBy?: string;
  updatedBy?: string;
}

export interface AuthUser {
  userId: string;
  email: string;
  role: UserRole;
  schoolId: string;
  firstName: string;
  lastName: string;
  mustResetPassword?: boolean;
  mustResetPin?: boolean;
}

export interface LoginPayload {
  /** Email or admin-issued username. */
  identifier: string;
  password: string;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export interface TeacherLoginStatus {
  teacherId: string;
  fullName: string;
  employeeId: string;
  email?: string;
  hasLogin: boolean;
  /** Admin-generated school login address (e.g. jsmith@fnic.com) — separate
   *  from `email`, the teacher's own contact address from their documents. */
  loginEmail?: string;
  /** Legacy admin-issued username, from logins created before loginEmail existed. */
  username?: string;
}

export interface CreateTeacherLoginPayload {
  loginEmail: string;
  password: string;
}

export type RecoveryRequestStatus = 'pending' | 'approved' | 'rejected' | 'completed';

export interface RecoveryRequest extends BaseEntity {
  schoolId: string;
  employeeId: string;
  email: string;
  userId?: string;
  status: RecoveryRequestStatus;
  requestedAt: string;
  approvedAt?: string;
  approvedBy?: string;
  temporaryPasswordExpiresAt?: string;
  rejectionReason?: string;
  ipAddress?: string;
  browser?: string;
  device?: string;
  completedAt?: string;
  /** Present only when the request was matched to an existing account. */
  staffName?: string;
  role?: UserRole;
}

export interface SubmitRecoveryRequestPayload {
  schoolId: string;
  employeeId: string;
  email: string;
}

export interface RejectRecoveryRequestPayload {
  reason?: string;
}

export interface ApproveRecoveryResult {
  request: RecoveryRequest;
  temporaryPassword?: string;
  emailed: boolean;
}

export interface SetNewPasswordPayload {
  newPassword: string;
}

export interface SetPinPayload {
  pin: string;
}

export interface SetupPinPayload {
  pin: string;
  deviceLabel?: string;
}

export interface LoginWithPinPayload {
  deviceId: string;
  pin: string;
}

export interface LoginResponse {
  accessToken: string;
  // Tab-scoped session identifier — stored client-side alongside accessToken
  // and echoed back as the X-Session-Id header on refresh/logout so the
  // server can locate this session's refresh-token cookie instead of a
  // single fixed one shared (and clobberable) across every tab of the
  // browser. See apps/server/src/lib/auth-cookies.ts.
  sessionId: string;
  user: AuthUser;
  mustResetPassword?: boolean;
  mustResetPin?: boolean;
  // Present only when the request carried the `X-Client-Platform: mobile`
  // header. Web never gets this in the body — it relies solely on the
  // httpOnly refresh-token cookie (see auth-cookies.ts) so the token is
  // never reachable from browser JS. Mobile has no shared cookie jar to
  // lean on, so the server includes it here instead for SecureStore.
  refreshToken?: string;
}

export interface CreateUserPayload {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  password: string;
  role: UserRole;
}

export type UpdateUserPayload = Partial<Omit<CreateUserPayload, 'password'>> & {
  password?: string;
  status?: UserStatus;
};

// ── Bulk parent-login creation ───────────────────────────────────────────────

export interface BulkCreateParentsPayload {
  studentIds: string[];
  password: string;
}

export interface BulkCreateParentsResult {
  created: {
    studentId: string;
    studentName: string;
    email: string;
    username: string;
  }[];
  skipped: {
    studentId: string;
    studentName: string;
    reason: string;
  }[];
  password: string;
}

export interface ChangeStatusPayload {
  status: UserStatus;
}

// ── Permissions ───────────────────────────────────────────────────────────────

export type Permission =
  | 'users.view'
  | 'users.create'
  | 'users.update'
  | 'students.view'
  | 'students.create'
  | 'students.update'
  | 'communications.view'
  | 'communications.create'
  | 'administration.manage';

export interface RoleMeta {
  id: UserRole;
  label: string;
  description: string;
  permissions: Permission[];
}

export interface PermissionMeta {
  id: Permission;
  label: string;
  category: string;
}

// ── Users query options ───────────────────────────────────────────────────────

export interface UsersQueryOptions {
  page?: number;
  limit?: number;
  search?: string;
  role?: UserRole;
  status?: UserStatus;
}

// ── Student ───────────────────────────────────────────────────────────────────

export type AdmissionStatus =
  // current lifecycle statuses
  | 'enquiry'
  | 'application'
  | 'admission_pending'
  | 'active'
  | 'transferred'
  | 'graduated'
  | 'inactive'
  // legacy (backward compat with existing DB records)
  | 'inquiry'
  | 'enrolled'
  | 'withdrawn';

export type Gender = 'male' | 'female' | 'other';
export type StudentNoteType = 'general' | 'pinned' | 'private';

export interface StudentEmergencyContact {
  name: string;
  phone: string;
  relation: string;
}

export interface Student extends BaseEntity {
  fullName: string;
  admissionNumber: string;
  rollNumber?: string;
  /** 1-based position in the class register as provided by the class teacher —
   *  independent of rollNumber, used to preserve "as given" list order as the
   *  default attendance/roster display order until a roll-number sort is applied. */
  rosterOrder?: number;
  class: string;
  section: string;
  gender: Gender;
  dateOfBirth: string;
  fatherName: string;
  motherName: string;
  parentPhone: string;
  alternatePhone?: string;
  /** Parent/guardian's contact email despite the generic name — see Student
   *  model comment on the server side for why. */
  email?: string;
  address?: string;
  locality?: string;
  photoUrl?: string;
  admissionStatus: AdmissionStatus;
  admissionYear: number;
  tags: string[];
  emergencyContact?: StudentEmergencyContact;
  remarks?: string;
  /** Recurring monthly tuition fee amount set by admin — drives auto-generated tuition FeeRecords. */
  monthlyTuitionFee?: number;
  approvedDiscountAmount?: number;
  approvedDiscountReason?: string;
  /** Ad-hoc columns added from the accountant's Student Directory. */
  customFields?: Record<string, unknown>;
  createdBy?: string;
  updatedBy?: string;
  isDeleted: boolean;
  deletedAt?: string;
  deletedBy?: string;
}

export interface StudentNote extends BaseEntity {
  studentId: string;
  type: StudentNoteType;
  content: string;
  createdByName: string;
  createdById: string;
  isDeleted: boolean;
  deletedAt?: string;
}

export interface CreateStudentPayload {
  fullName: string;
  rollNumber?: string;
  class: string;
  section: string;
  gender?: Gender;
  dateOfBirth?: string;
  fatherName?: string;
  motherName?: string;
  parentPhone?: string;
  alternatePhone?: string;
  email?: string;
  address?: string;
  locality?: string;
  admissionStatus?: AdmissionStatus;
  tags?: string[];
  emergencyContact?: StudentEmergencyContact;
  remarks?: string;
  monthlyTuitionFee?: number;
  customFields?: Record<string, unknown>;
}

export type UpdateStudentPayload = Partial<CreateStudentPayload>;

export interface UpdateRollNumberPayload {
  rollNumber?: string;
}

export interface UpdateFeeProfilePayload {
  rollNumber?: string;
  class?: string;
  section?: string;
  monthlyTuitionFee?: number;
}

export interface StudentListOptions {
  page?: number;
  limit?: number;
  search?: string;
  class?: string;
  section?: string;
  status?: AdmissionStatus;
  gender?: Gender;
  admissionYear?: number;
  tags?: string;
}

export interface CreateStudentNotePayload {
  content: string;
  type?: StudentNoteType;
}

export interface UpdateStudentNotePayload {
  content?: string;
  type?: StudentNoteType;
}

// ── AI Platform ──────────────────────────────────────────────────────────────

export type AiProvider = 'vapi' | 'openai' | 'elevenlabs' | 'mock';
export type AiConversationStatus = 'pending' | 'active' | 'completed' | 'failed';

export interface AiConversation extends BaseEntity {
  conversationId?: string;
  provider: AiProvider;
  promptId: string;
  promptVersion: string;
  communicationId: string;
  studentId: string;
  status: AiConversationStatus;
  transcript?: string;
  summary?: string;
  durationSeconds?: number;
  createdBy: string;
  metadata?: Record<string, unknown>;
}

export interface AiProviderStatus {
  active: boolean;
  configured: boolean;
  model?: string;
  voiceId?: string;
}

export interface AiStatus {
  providers: {
    vapi: AiProviderStatus;
    openai: AiProviderStatus;
    elevenlabs: Omit<AiProviderStatus, 'active'> & { voiceId: string };
  };
  mode: 'direct-vapi' | 'n8n' | 'mock';
}

// ── Automation ────────────────────────────────────────────────────────────────

export type AutomationJobType =
  | 'VOICE_CALL'
  | 'WHATSAPP'
  | 'EMAIL'
  | 'SMS'
  | 'FEE_REMINDER'
  | 'PTM_REMINDER'
  | 'GENERAL_BROADCAST'
  | 'CUSTOM';

export type AutomationJobStatus =
  | 'QUEUED'
  | 'RUNNING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'
  | 'RETRYING';

export type AutomationProviderName = 'n8n' | 'bullmq' | 'temporal' | 'worker' | 'mock';

export interface AutomationJob extends BaseEntity {
  type: AutomationJobType;
  provider: AutomationProviderName;
  status: AutomationJobStatus;
  payload: Record<string, unknown>;
  referenceId?: string;
  referenceType?: 'communication' | 'student' | 'campaign' | 'custom';
  triggeredBy: string;
  startedAt?: string;
  completedAt?: string;
  failedAt?: string;
  errorMessage?: string;
  retryCount: number;
  result?: Record<string, unknown>;
}

export interface AutomationJobsQueryOptions {
  page?: number;
  limit?: number;
  search?: string;
  type?: AutomationJobType;
  status?: AutomationJobStatus;
  sortOrder?: 'asc' | 'desc';
}

// ── Workflow Library ──────────────────────────────────────────────────────────

export type WorkflowId =
  | 'WF-001'
  | 'WF-002'
  | 'WF-003'
  | 'WF-004'
  | 'WF-005'
  | 'WF-006'
  | 'WF-007'
  | 'WF-008';

export interface WorkflowConfig {
  enabled: boolean;
  delayMinutes: number;
  retryCount: number;
  retryIntervalMinutes: number;
  channels: string[];
}

export interface WorkflowDefinition {
  id: WorkflowId;
  name: string;
  description: string;
  jobType: AutomationJobType;
  defaultConfig: WorkflowConfig;
  configurable: Array<keyof WorkflowConfig>;
}

export interface Workflow {
  id: string;
  workflowId: WorkflowId;
  schoolId: string;
  config: WorkflowConfig;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateWorkflowConfigPayload {
  enabled?: boolean;
  delayMinutes?: number;
  retryCount?: number;
  retryIntervalMinutes?: number;
  channels?: string[];
}

export interface TriggerWorkflowPayload {
  workflowId: WorkflowId;
  payload: Record<string, unknown>;
}

export interface AutomationDashboardMetrics {
  totalExecutions: number;
  successCount: number;
  failureCount: number;
  runningCount: number;
  retryingCount: number;
  avgDurationMs: number;
  executionsByWorkflow: Array<{ workflowId: string; count: number; successCount: number }>;
  recentActivity: Array<{ date: string; count: number; successCount: number }>;
}

// ── Communication ─────────────────────────────────────────────────────────────

export type CommunicationType = 'call' | 'whatsapp' | 'note' | 'email' | 'sms' | 'broadcast';

export type CommStatus =
  | 'QUEUED'
  | 'PENDING'
  | 'RUNNING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'DELIVERED'
  | 'READ'
  | 'FAILED'
  | 'CANCELLED';

export type CommProvider = 'mock' | 'vapi' | 'twilio' | 'whatsapp-cloud' | 'email-smtp' | 'sms-gateway';
export type CommDirection = 'outbound' | 'inbound';

export interface Communication extends BaseEntity {
  studentId: string;
  parentId?: string;
  campaignId?: string;
  type: CommunicationType;
  status: CommStatus;
  provider: CommProvider;
  direction: CommDirection;
  title: string;
  message?: string;
  summary: string;
  recommendation?: string;
  nextFollowUp?: string;
  metadata?: Record<string, unknown>;
  createdBy: string;
}

export interface CommunicationsQueryOptions {
  page?: number;
  limit?: number;
  search?: string;
  type?: CommunicationType;
  status?: CommStatus;
  sortOrder?: 'asc' | 'desc';
}

export interface UpdateCommunicationPayload {
  status?: CommStatus;
  summary?: string;
  recommendation?: string;
  nextFollowUp?: string;
}

// ── Teacher ───────────────────────────────────────────────────────────────────

export type EmploymentStatus =
  | 'applicant'
  | 'active'
  | 'on_leave'
  | 'suspended'
  | 'resigned'
  | 'retired'
  | 'inactive';

export type TeacherNoteType = 'general' | 'pinned' | 'private';

export interface TeacherEmergencyContact {
  name: string;
  phone: string;
  relation: string;
}

export interface TeacherQualification {
  degree: string;
  institution: string;
  yearOfPassing?: number;
}

export interface Teacher extends BaseEntity {
  fullName: string;
  employeeId: string;
  /** Only present on /teachers/search results — whether a live HR Employee
   *  record exists for this employeeId (attendance-marking requires one). */
  hasEmployeeRecord?: boolean;
  photoUrl?: string;
  gender: Gender;
  dateOfBirth?: string;
  phone: string;
  alternatePhone?: string;
  email?: string;
  address?: string;
  emergencyContact?: TeacherEmergencyContact;
  department?: string;
  subjects: string[];
  assignedClasses: string[];
  qualification?: TeacherQualification;
  experienceYears?: number;
  joiningDate?: string;
  employmentStatus: EmploymentStatus;
  tags: string[];
  remarks?: string;
  /** Extra columns from an import file that don't map to a known field (Blood
   * Group, Previous School, Aadhar Number, etc.) — kept instead of dropped. */
  customFields?: Record<string, unknown>;
  createdBy?: string;
  updatedBy?: string;
  isDeleted: boolean;
  deletedAt?: string;
  deletedBy?: string;
}

export interface TeacherNote extends BaseEntity {
  teacherId: string;
  type: TeacherNoteType;
  content: string;
  createdByName: string;
  createdById: string;
  isDeleted: boolean;
  deletedAt?: string;
}

export interface CreateTeacherPayload {
  fullName: string;
  gender: Gender;
  dateOfBirth?: string;
  phone: string;
  alternatePhone?: string;
  email?: string;
  address?: string;
  emergencyContact?: TeacherEmergencyContact;
  department?: string;
  subjects?: string[];
  assignedClasses?: string[];
  qualification?: TeacherQualification;
  experienceYears?: number;
  joiningDate?: string;
  employmentStatus?: EmploymentStatus;
  tags?: string[];
  remarks?: string;
  customFields?: Record<string, unknown>;
}

export type UpdateTeacherPayload = Partial<CreateTeacherPayload>;

export interface TeacherListOptions {
  page?: number;
  limit?: number;
  search?: string;
  department?: string;
  status?: EmploymentStatus;
  subject?: string;
  class?: string;
  sortBy?: 'fullName' | 'createdAt' | 'joiningDate';
  sortOrder?: 'asc' | 'desc';
}

export interface CreateTeacherNotePayload {
  content: string;
  type?: TeacherNoteType;
}

export interface UpdateTeacherNotePayload {
  content?: string;
  type?: TeacherNoteType;
}

// ── Attendance ────────────────────────────────────────────────────────────────

export type AttendanceStatus =
  | 'present'
  | 'absent'
  | 'late'
  | 'half_day'
  | 'leave_approved';

export interface Attendance extends BaseEntity {
  studentId: string;
  class: string;
  section: string;
  date: string;                    // YYYY-MM-DD
  status: AttendanceStatus;
  note?: string;
  markedById: string;
  markedByName: string;
  markedAt: string;
  isDeleted: boolean;
  deletedAt?: string;
  deletedBy?: string;
}

export interface AttendanceSummary {
  total: number;
  present: number;
  absent: number;
  late: number;
  half_day: number;
  leave_approved: number;
  attendanceRate: number;          // 0–100
}

export interface MarkAttendancePayload {
  studentId: string;
  class: string;
  section: string;
  date: string;
  status: AttendanceStatus;
  note?: string;
}

export interface BulkAttendanceRecord {
  studentId: string;
  status: AttendanceStatus;
  note?: string;
}

export interface BulkAttendancePayload {
  class: string;
  section: string;
  date: string;
  records: BulkAttendanceRecord[];
}

export interface UpdateAttendancePayload {
  status?: AttendanceStatus;
  note?: string;
}

export interface AttendanceListOptions {
  page?: number;
  limit?: number;
  date?: string;
  dateFrom?: string;
  dateTo?: string;
  class?: string;
  section?: string;
  status?: AttendanceStatus;
  studentId?: string;
}

export interface StudentHistoryOptions {
  page?: number;
  limit?: number;
  dateFrom?: string;
  dateTo?: string;
  status?: AttendanceStatus;
}

export interface AttendanceSummaryOptions {
  studentId?: string;
  class?: string;
  section?: string;
  dateFrom?: string;
  dateTo?: string;
}

// ── Behaviour Marking ─────────────────────────────────────────────────────────

export type BehaviorCategory = 'positive' | 'negative' | 'neutral';

export interface BehaviorOption extends BaseEntity {
  label: string;
  category: BehaviorCategory;
  isDefault: boolean;
  createdByTeacherId?: string;
  isActive: boolean;
  createdBy?: string;
}

export interface BehaviorRecord extends BaseEntity {
  studentId: string;
  class: string;
  section: string;
  date: string;                    // YYYY-MM-DD
  optionId: string;
  optionLabel: string;
  category: BehaviorCategory;
  note?: string;
  markedById: string;
  markedByName: string;
  markedAt: string;
  isDeleted: boolean;
  deletedAt?: string;
  deletedBy?: string;
}

export interface BehaviorWindowStatus {
  isOpen: boolean;
  startTime: string;
  endTime: string;
  date: string;                    // today, YYYY-MM-DD
}

export interface CreateBehaviorOptionPayload {
  label: string;
  category?: BehaviorCategory;
}

export interface UpdateBehaviorOptionPayload {
  label?: string;
  category?: BehaviorCategory;
  isActive?: boolean;
}

export interface MarkBehaviorPayload {
  studentId: string;
  class: string;
  section: string;
  date: string;
  optionId: string;
  note?: string;
}

export interface BulkBehaviorRecordInput {
  studentId: string;
  optionId: string;
  note?: string;
}

export interface BulkBehaviorPayload {
  class: string;
  section: string;
  date: string;
  records: BulkBehaviorRecordInput[];
}

export interface BehaviorHistoryOptions {
  page?: number;
  limit?: number;
  dateFrom?: string;
  dateTo?: string;
}

// ── Fee Management ────────────────────────────────────────────────────────────

export type FeeHead =
  | 'tuition'
  | 'admission'
  | 'examination'
  | 'transport'
  | 'hostel'
  | 'miscellaneous';

export type FeeStatus =
  | 'pending'
  | 'partially_paid'
  | 'paid'
  | 'overdue'
  | 'waived';

export type PaymentMode =
  | 'cash'
  | 'upi'
  | 'sse_upi'
  | 'online'
  | 'sse_online'
  | 'challan'
  | 'cheque'
  | 'bank_transfer'
  | 'demand_draft'
  | 'card';

export interface FeeRecord extends BaseEntity {
  studentId: string;
  studentName: string;
  admissionNumber: string;
  class: string;
  section: string;
  feeHead: FeeHead;
  customHead?: string;
  description?: string;
  academicYear: string;
  month?: string;
  dueDate: string;
  totalAmount: number;
  discountAmount: number;
  discountReason?: string;
  waivedAmount: number;
  waivedReason?: string;
  fineAmount: number;
  fineReason?: string;
  paidAmount: number;
  balance: number;
  status: FeeStatus;
  notes?: string;
  isDeleted: boolean;
  deletedAt?: string;
  deletedBy?: string;
  createdBy: string;
  updatedBy?: string;
}

export interface FeePayment extends BaseEntity {
  feeRecordId: string;
  studentId: string;
  amount: number;
  paymentDate: string;
  paymentMode: PaymentMode;
  referenceNumber?: string;
  remarks?: string;
  recordedById: string;
  recordedByName: string;
  receiptNumber?: string;
  /** Shared bill number across all months paid together in one multi-month collection. */
  batchId?: string;
  isDeleted: boolean;
}

export interface FeeCollectionSummary {
  totalCharged: number;
  totalCollected: number;
  totalOutstanding: number;
  overdueCount: number;
  pendingCount: number;
}

export interface RecordPaymentResult {
  record: FeeRecord;
  payment: FeePayment;
}

export interface ReceiptLookupResult {
  record: FeeRecord;
  payment: FeePayment;
}

export interface CreateFeeRecordPayload {
  studentId: string;
  feeHead: FeeHead;
  customHead?: string;
  description?: string;
  academicYear: string;
  month?: string;
  dueDate: string;
  totalAmount: number;
  discountAmount?: number;
  discountReason?: string;
  fineAmount?: number;
  fineReason?: string;
  notes?: string;
}

export interface UpdateFeeRecordPayload {
  description?: string;
  dueDate?: string;
  totalAmount?: number;
  discountAmount?: number;
  discountReason?: string;
  status?: FeeStatus;
  waivedAmount?: number;
  waivedReason?: string;
  fineAmount?: number;
  fineReason?: string;
  notes?: string;
}

export interface RecordPaymentPayload {
  feeRecordId: string;
  amount: number;
  paymentDate: string;
  paymentMode: PaymentMode;
  referenceNumber?: string;
  remarks?: string;
  /** Client-generated key, minted once per form open — resubmitting with the same
   *  key (network retry, accidental double-click) replays the original payment
   *  instead of recording it twice. */
  idempotencyKey?: string;
}

/** One month's worth of tuition fee to pay as part of a multi-month collection (arrears, current, or advance). */
export interface BulkPaymentMonthInput {
  month: string;
  academicYear: string;
  /** Only needed when the FeeRecord for this month doesn't exist yet — used to auto-create it. */
  dueDate?: string;
  amount: number;
}

export interface RecordBulkPaymentPayload {
  studentId: string;
  months: BulkPaymentMonthInput[];
  paymentDate: string;
  paymentMode: PaymentMode;
  referenceNumber?: string;
  remarks?: string;
}

export interface RecordBulkPaymentResult {
  batchId: string;
  results: RecordPaymentResult[];
}

export interface FeeListOptions {
  page?: number;
  limit?: number;
  search?: string;
  studentId?: string;
  class?: string;
  section?: string;
  feeHead?: FeeHead;
  status?: FeeStatus;
  academicYear?: string;
  month?: string;
  dueBefore?: string;
  dueAfter?: string;
  sortBy?: 'dueDate' | 'createdAt' | 'totalAmount' | 'balance';
  sortOrder?: 'asc' | 'desc';
}

export interface OutstandingOptions {
  class?: string;
  section?: string;
  feeHead?: FeeHead;
  page?: number;
  limit?: number;
}

export interface FeeRecordWithPayments {
  record: FeeRecord;
  payments: FeePayment[];
}

// ── Accountant Workspace: Salary ─────────────────────────────────────────────

export type SalaryStatus = 'scheduled' | 'pending' | 'paid';

/** 'one_time' — the full deposit is collected in a single payment.
 *  'installments' — the deposit is collected gradually; `collectedAmount`
 *  tracks the running total against `totalAmount`. */
export type SecurityDepositMode = 'one_time' | 'installments';
export type SecurityDepositStatus = 'not_collected' | 'in_progress' | 'collected';

export interface SecurityDepositEntry {
  amount: number;
  date: string;
  note?: string;
  recordedBy: string;
}

export interface SecurityDepositInfo {
  totalAmount: number;
  mode: SecurityDepositMode;
  /** Target number of installments — informational only when mode is 'installments'. */
  installmentCount?: number;
  collectedAmount: number;
  status: SecurityDepositStatus;
  history: SecurityDepositEntry[];
}

export interface SalaryRecord extends BaseEntity {
  employeeName: string;
  designation: string;
  teacherId?: string;
  month: string;
  year: number;
  amount: number;
  /** Salary becomes 'pending' automatically once this date passes. */
  dueDate: string;
  status: SalaryStatus;
  paidDate?: string;
  paymentMode?: PaymentMode;
  notes?: string;

  /** Leave-without-pay days for this month, entered manually by the accountant. */
  lwpDays?: number;
  /** Rupee amount to deduct for those LWP days — a per-day suggestion is offered
   *  on entry (amount ÷ days in month × lwpDays) but the accountant can override it. */
  lwpAmount?: number;

  securityDeposit?: SecurityDepositInfo;

  isDeleted: boolean;
  createdBy: string;
  updatedBy?: string;
}

export interface CreateSalaryRecordPayload {
  employeeName: string;
  designation: string;
  teacherId?: string;
  month: string;
  year: number;
  amount: number;
  dueDate: string;
  notes?: string;
  lwpDays?: number;
  lwpAmount?: number;
  securityDeposit?: {
    totalAmount: number;
    mode: SecurityDepositMode;
    installmentCount?: number;
  };
}

export interface UpdateSalaryRecordPayload {
  employeeName?: string;
  designation?: string;
  month?: string;
  year?: number;
  amount?: number;
  dueDate?: string;
  notes?: string;
  lwpDays?: number;
  lwpAmount?: number;
  securityDeposit?: {
    totalAmount: number;
    mode: SecurityDepositMode;
    installmentCount?: number;
  };
}

export interface RecordSecurityDepositPayload {
  amount: number;
  date: string;
  note?: string;
}

export interface MarkSalaryPaidPayload {
  paidDate: string;
  paymentMode: PaymentMode;
  notes?: string;
}

export interface BulkMarkSalaryPaidPayload {
  ids: string[];
  paidDate: string;
  paymentMode: PaymentMode;
  notes?: string;
}

export interface SalaryListOptions {
  page?: number;
  limit?: number;
  search?: string;
  status?: SalaryStatus;
  month?: string;
  year?: number;
}

export interface SalarySummary {
  totalScheduled: number;
  totalPending: number;
  totalPaid: number;
  scheduledCount: number;
  pendingCount: number;
  paidCount: number;
}

// ── Accountant Workspace: Expenses ───────────────────────────────────────────

export type ExpenseCategory =
  | 'electricity'
  | 'maintenance'
  | 'fuel'
  | 'supplies'
  | 'other';

export type ExpenseStatus = 'pending' | 'approved';

export interface ExpenseRecord extends BaseEntity {
  title: string;
  category: ExpenseCategory;
  amount: number;
  date: string;
  status: ExpenseStatus;
  paymentMode?: PaymentMode;
  notes?: string;
  isDeleted: boolean;
  createdBy: string;
  updatedBy?: string;
}

export interface CreateExpenseRecordPayload {
  title: string;
  category: ExpenseCategory;
  amount: number;
  date: string;
  paymentMode?: PaymentMode;
  notes?: string;
}

export interface UpdateExpenseRecordPayload {
  title?: string;
  category?: ExpenseCategory;
  amount?: number;
  date?: string;
  status?: ExpenseStatus;
  paymentMode?: PaymentMode;
  notes?: string;
}

export interface ExpenseListOptions {
  page?: number;
  limit?: number;
  search?: string;
  category?: ExpenseCategory;
  status?: ExpenseStatus;
  dateFrom?: string;
  dateTo?: string;
}

export interface ExpenseSummary {
  totalPending: number;
  totalApproved: number;
  pendingCount: number;
  approvedCount: number;
}

// ── Vendors ───────────────────────────────────────────────────────────────────

export type VendorCategory = 'supplies' | 'services' | 'maintenance' | 'utilities' | 'other';
export type VendorStatus = 'active' | 'inactive';
export type VendorBillStatus = 'unpaid' | 'partially_paid' | 'paid';

export interface Vendor extends BaseEntity {
  name: string;
  category: VendorCategory;
  status: VendorStatus;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  gstNumber?: string;
  notes?: string;
  isDeleted: boolean;
  createdBy: string;
  updatedBy?: string;
}

export interface CreateVendorPayload {
  name: string;
  category: VendorCategory;
  status?: VendorStatus;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  gstNumber?: string;
  notes?: string;
}

export interface UpdateVendorPayload {
  name?: string;
  category?: VendorCategory;
  status?: VendorStatus;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  gstNumber?: string;
  notes?: string;
}

export interface VendorListOptions {
  page?: number;
  limit?: number;
  search?: string;
  category?: VendorCategory;
  status?: VendorStatus;
}

export interface VendorBill extends BaseEntity {
  vendorId: string;
  vendorName: string;
  billNumber?: string;
  description: string;
  category: VendorCategory;
  amount: number;
  paidAmount: number;
  balance: number;
  billDate: string;
  dueDate?: string;
  status: VendorBillStatus;
  notes?: string;
  isDeleted: boolean;
  createdBy: string;
  updatedBy?: string;
}

export interface CreateVendorBillPayload {
  billNumber?: string;
  description: string;
  category: VendorCategory;
  amount: number;
  billDate: string;
  dueDate?: string;
  notes?: string;
}

export interface VendorPayment extends BaseEntity {
  vendorId: string;
  billId?: string;
  amount: number;
  paymentDate: string;
  paymentMode: PaymentMode;
  referenceNumber?: string;
  remarks?: string;
  recordedById: string;
  recordedByName: string;
  receiptNumber?: string;
  idempotencyKey?: string;
}

export interface RecordVendorPaymentPayload {
  billId?: string;
  amount: number;
  paymentDate: string;
  paymentMode: PaymentMode;
  referenceNumber?: string;
  remarks?: string;
  idempotencyKey?: string;
}

export interface VendorFinancialSummary {
  totalBilled: number;
  totalPaid: number;
  outstandingBalance: number;
  lastPaymentDate?: string;
}

export interface VendorProfile {
  vendor: Vendor;
  summary: VendorFinancialSummary;
}

export interface VendorLedgerEntry {
  _id: string;
  type: 'bill' | 'payment';
  date: string;
  description: string;
  debit: number;
  credit: number;
  runningBalance: number;
  reference?: string;
}

export interface VendorLedgerData {
  vendor: Vendor;
  entries: VendorLedgerEntry[];
  summary: VendorFinancialSummary;
}

/** Net cash/bank position by payment mode — fee collections in, minus expenses and vendor
 *  payments out, all within the same window. 'online' covers UPI/online transfers. */
export interface CashBankSplit {
  cash: number;
  online: number;
  bankTransfer: number;
  cheque: number;
  demandDraft: number;
  total: number;
}

// ── Accountant Workspace: Dashboard ──────────────────────────────────────────

export interface AccountingActivityEntry {
  _id: string;
  action: string;
  description: string;
  amount?: number;
  performedBy: string;
  createdAt: string;
}

export interface RecentFeeCollection {
  feeRecordId: string;
  paymentId: string;
  studentName: string;
  class: string;
  section: string;
  amount: number;
  paymentMode: PaymentMode;
  paymentDate: string;
  createdAt: string;
}

export interface FeeDefaulter {
  feeRecordId: string;
  studentId: string;
  studentName: string;
  class: string;
  section: string;
  /** Which fee this balance is for (tuition, transport, examination, etc.) — so a
   * defaulters list never lumps unrelated fee heads into one ambiguous "pending". */
  feeHead: FeeHead;
  description?: string;
  balance: number;
  dueDate: string;
  daysOverdue: number;
}

export interface AccountantDashboardData {
  feesCollectedToday: number;
  feeSummary: FeeCollectionSummary;
  salarySummary: SalarySummary;
  expenseSummary: ExpenseSummary;
  recentCollections: RecentFeeCollection[];
  defaulters: FeeDefaulter[];
  recentActivity: AccountingActivityEntry[];
  vendorOutstandingTotal: number;
  overdueVendorBills: VendorBill[];
  todayCashBankSplit: CashBankSplit;
  /** Money in today, by mode — fee collections only. Same shape as todayCashBankSplit
   *  but unnetted, so the dashboard can show "collected" and "paid out" side by side. */
  todayCollected: CashBankSplit;
  /** Money out today, by mode — expenses plus vendor payments. */
  todayPaidOut: CashBankSplit;
  generatedAt: string;
}

export interface ClassDefaulterGroup {
  class: string;
  section: string;
  totalBalance: number;
  students: FeeDefaulter[];
  classTeacherId?: string;
  classTeacherName?: string;
}

/** One row of the school-wide class-wise fee overview shown to Principal/Admin. */
export interface ClassFeeOverviewRow {
  class: string;
  section: string;
  studentCount: number;
  collected: number;
  pending: number;
}

export interface ClassFeeStudentRow {
  studentId: string;
  fullName: string;
  admissionNumber: string;
  rollNumber?: string;
  /** Overall totals across every fee head (tuition, transport, exam, etc.) — not just this month's tuition. */
  totalCharged: number;
  totalPaid: number;
  balance: number;
  status: 'paid' | 'due' | 'no_records';
}

export interface ClassFeeSummary {
  class: string;
  section: string;
  students: ClassFeeStudentRow[];
}

export interface SendDefaultersToTeacherPayload {
  class: string;
  section: string;
  teacherId: string;
}

// ── Class Teacher Assignment ─────────────────────────────────────────────────

export interface ClassTeacherAssignment extends BaseEntity {
  class: string;
  section: string;
  teacherId: string;
  teacherName: string;
  updatedBy?: string;
}

export interface ClassSectionSummary {
  class: string;
  section: string;
  studentCount: number;
  teacherId?: string;
  teacherName?: string;
}

/** One row of the Principal's Attendance → Classes tab table. */
export interface ClassAttendanceOverviewRow {
  class: string;
  section: string;
  classTeacherName?: string;
  totalStudents: number;
  present: number;
  absent: number;
}

export interface ClassAttendanceOverview {
  date: string;
  classes: ClassAttendanceOverviewRow[];
  totals: {
    totalClasses: number;
    totalStudents: number;
    totalPresent: number;
    totalAbsent: number;
  };
}

/** One row of the Principal's Attendance → Teachers tab table. */
export interface TeacherAttendanceOverviewRow {
  teacherId: string;
  employeeId: string;
  fullName: string;
  department?: string;
  status: 'present' | 'late' | 'half_day' | 'absent';
}

export interface TeacherAttendanceOverview {
  date: string;
  teachers: TeacherAttendanceOverviewRow[];
  totals: {
    totalTeachers: number;
    present: number;
    absent: number;
  };
}

export interface UpsertClassTeacherPayload {
  class: string;
  section: string;
  teacherId: string;
}

export interface RemoveClassTeacherPayload {
  class: string;
  section: string;
}

export interface SendReceiptEmailPayload {
  toEmail: string;
  studentName: string;
  class: string;
  section: string;
  feeDescription: string;
  amount: number;
  paymentDate: string;
}

// ── Notifications ─────────────────────────────────────────────────────────────

export type NotificationType = 'defaulters_list' | 'message' | 'change_request' | 'leave_request' | 'substitution' | 'planner_reminder' | 'maintenance_scheduled' | 'maintenance_toggled';
export type NotificationPriority = 'normal' | 'high';

export interface AppNotification {
  _id: string;
  type: NotificationType;
  title: string;
  body: string;
  payload?: {
    class?: string;
    section?: string;
    students?: FeeDefaulter[];
    /** studentId -> call outcome, set from the notification's full-page view. */
    callStatus?: Record<string, 'will_pay' | 'no_answer' | 'not_reached'>;
    studentChangeRequestId?: string;
    [key: string]: unknown;
  };
  priority: NotificationPriority;
  senderName: string;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationListResult {
  notifications: AppNotification[];
  unreadCount: number;
}

export interface SendMessageToTeachersPayload {
  teacherIds: string[];
  title: string;
  message: string;
}

export interface SendMessageToTeachersResult {
  sent: number;
  skipped: string[];
}

// ── Push notifications (FCM) ──────────────────────────────────────────────────

export interface RegisterDeviceTokenPayload {
  token: string;
  platform: 'ios' | 'android';
}

// ── Student Change Requests ───────────────────────────────────────────────────

export type StudentChangeRequestStatus = 'pending' | 'approved' | 'rejected';

export interface StudentChangeRequest extends BaseEntity {
  studentId: string;
  studentName: string;
  requestedByUserId: string;
  requestedByName: string;
  changes: Record<string, unknown>;
  previousValues: Record<string, unknown>;
  status: StudentChangeRequestStatus;
  reviewedByName?: string;
  reviewNote?: string;
  reviewedAt?: string;
}

export interface CreateChangeRequestPayload {
  studentId: string;
  changes: Record<string, unknown>;
}

export interface RejectChangeRequestPayload {
  reviewNote?: string;
}

// ── Leave Requests ────────────────────────────────────────────────────────────

export type LeaveRequestStatus = 'pending' | 'approved' | 'rejected';
export type LeaveType = 'full_day' | 'half_day';

export interface LeaveRequest extends BaseEntity {
  schoolId: string;
  teacherId: string;
  teacherName: string;
  requestedByUserId: string;
  leaveType: LeaveType;
  dateFrom: string;
  dateTo: string;
  reason: string;
  status: LeaveRequestStatus;
  reviewedByName?: string;
  reviewNote?: string;
  reviewedAt?: string;
}

export interface CreateLeaveRequestPayload {
  leaveType: LeaveType;
  dateFrom: string;
  dateTo: string;
  reason: string;
}

export interface RejectLeaveRequestPayload {
  reviewNote?: string;
}

// ── Events ────────────────────────────────────────────────────────────────────

export type EventType =
  | 'holiday'
  | 'ptm'
  | 'examination'
  | 'school_event'
  | 'staff_meeting'
  | 'fee_due_date'
  | 'admission_event'
  | 'general';

export type EventStatus = 'draft' | 'scheduled' | 'published' | 'completed' | 'cancelled';

export type EventAudience = 'all' | 'students' | 'teachers' | 'parents' | 'staff';

export interface SchoolEvent extends BaseEntity {
  title: string;
  description?: string;
  eventType: EventType;
  status: EventStatus;
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  isAllDay: boolean;
  location?: string;
  audience: EventAudience[];
  organizer?: string;
  notes?: string;
  tags: string[];
  attachmentUrl?: string;
  attachmentName?: string;
  isDeleted: boolean;
  deletedAt?: string;
  deletedBy?: string;
  createdBy: string;
  updatedBy?: string;
  metadata?: Record<string, unknown>;
}

export interface CreateEventPayload {
  title: string;
  description?: string;
  eventType: EventType;
  status?: EventStatus;
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  isAllDay?: boolean;
  location?: string;
  audience?: EventAudience[];
  organizer?: string;
  notes?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export type UpdateEventPayload = Partial<Omit<CreateEventPayload, 'status'>>;

export interface UpdateEventStatusPayload {
  status: EventStatus;
}

export interface EventListOptions {
  page?: number;
  limit?: number;
  search?: string;
  eventType?: EventType;
  status?: EventStatus;
  audience?: EventAudience;
  startFrom?: string;
  startTo?: string;
  month?: number;
  year?: number;
  sortBy?: 'startDate' | 'createdAt' | 'title';
  sortOrder?: 'asc' | 'desc';
}

export interface UpcomingEventsOptions {
  limit?: number;
  days?: number;
}

export interface EventReadReceiptEntry {
  userId: string;
  userDisplayName: string;
  readAt?: string;
}

export interface EventReadReceipts {
  totalTeachers: number;
  readCount: number;
  readBy: EventReadReceiptEntry[];
  notReadBy: EventReadReceiptEntry[];
}

// ── Admissions CRM ────────────────────────────────────────────────────────────

export type EnquiryStage =
  | 'new_enquiry'
  | 'contacted'
  | 'follow_up_scheduled'
  | 'campus_visit'
  | 'application_submitted'
  | 'documents_pending'
  | 'admission_approved'
  | 'converted'
  | 'lost';

export type EnquirySource =
  | 'walk_in'
  | 'website'
  | 'referral'
  | 'social_media'
  | 'phone'
  | 'email'
  | 'other';

export interface StageHistoryEntry {
  stage: EnquiryStage;
  changedAt: string;
  changedBy: string;
  remarks?: string;
}

export interface EnquiryConversionData {
  studentId: string;
  convertedAt: string;
  convertedBy: string;
}

export interface Enquiry extends BaseEntity {
  studentName: string;
  studentDateOfBirth?: string;
  interestedClass: string;
  gender?: Gender;
  currentSchool?: string;
  currentClass?: string;
  parentName: string;
  parentPhone: string;
  alternatePhone?: string;
  parentEmail?: string;
  stage: EnquiryStage;
  source: EnquirySource;
  referredBy?: string;
  assignedCounsellor?: string;
  followUpDate?: string;
  lastContactedAt?: string;
  stageHistory: StageHistoryEntry[];
  conversionData?: EnquiryConversionData;
  tags: string[];
  remarks?: string;
  metadata?: Record<string, unknown>;
  isDeleted: boolean;
  deletedAt?: string;
  deletedBy?: string;
  createdBy: string;
  updatedBy?: string;
}

export interface EnquiryNote extends BaseEntity {
  enquiryId: string;
  type: 'general' | 'pinned' | 'private';
  content: string;
  createdByName: string;
  createdById: string;
  isDeleted: boolean;
  deletedAt?: string;
}

export interface StageCounts {
  stage: EnquiryStage;
  count: number;
}

export interface CreateEnquiryPayload {
  studentName: string;
  studentDateOfBirth?: string;
  interestedClass: string;
  gender?: Gender;
  currentSchool?: string;
  currentClass?: string;
  parentName: string;
  parentPhone: string;
  alternatePhone?: string;
  parentEmail?: string;
  stage?: EnquiryStage;
  source: EnquirySource;
  referredBy?: string;
  assignedCounsellor?: string;
  followUpDate?: string;
  tags?: string[];
  remarks?: string;
}

export type UpdateEnquiryPayload = Partial<Omit<CreateEnquiryPayload, 'stage'>>;

export interface UpdateEnquiryStagePayload {
  stage: EnquiryStage;
  remarks?: string;
}

export interface ConvertToStudentPayload {
  class: string;
  section: string;
  gender: Gender;
  dateOfBirth: string;
  fatherName: string;
  motherName: string;
  address?: string;
  admissionStatus?: AdmissionStatus;
}

export interface ConvertToStudentResult {
  enquiry: Enquiry;
  student: Student;
}

export interface EnquiryListOptions {
  page?: number;
  limit?: number;
  search?: string;
  stage?: EnquiryStage;
  source?: EnquirySource;
  interestedClass?: string;
  assignedCounsellor?: string;
  followUpBefore?: string;
  followUpAfter?: string;
  createdAfter?: string;
  createdBefore?: string;
  sortBy?: 'createdAt' | 'followUpDate' | 'studentName';
  sortOrder?: 'asc' | 'desc';
}

export interface CreateEnquiryNotePayload {
  content: string;
  type?: 'general' | 'pinned' | 'private';
}

export interface UpdateEnquiryNotePayload {
  content?: string;
  type?: 'general' | 'pinned' | 'private';
}

// ── Front Desk / Visitor Log ──────────────────────────────────────────────────

export type VisitorPurpose =
  | 'meet_student'
  | 'meet_staff'
  | 'admission_enquiry'
  | 'fee_payment'
  | 'delivery'
  | 'vendor'
  | 'interview'
  | 'other';

export interface Visitor extends BaseEntity {
  name: string;
  contactNumber: string;
  purpose: VisitorPurpose;
  purposeNote?: string;
  personToVisit: string;
  checkInTime: string;
  checkOutTime?: string;
  recordedById: string;
  recordedByName: string;
  isDeleted: boolean;
  deletedAt?: string;
  deletedBy?: string;
}

export interface CreateVisitorPayload {
  name: string;
  contactNumber: string;
  purpose: VisitorPurpose;
  purposeNote?: string;
  personToVisit: string;
  checkInTime?: string;
}

export interface CheckOutVisitorPayload {
  checkOutTime?: string;
}

export interface VisitorListOptions {
  page?: number;
  limit?: number;
  search?: string;
  purpose?: VisitorPurpose;
  onlyOnSite?: boolean;
  date?: string;
  dateFrom?: string;
  dateTo?: string;
}

// ── Timetable & Academic Scheduling ──────────────────────────────────────────

export type TimetableStatus = 'draft' | 'published' | 'archived';

export interface PeriodSlot extends BaseEntity {
  name: string;
  orderIndex: number;
  startTime: string;
  endTime: string;
  isBreak: boolean;
  daysApplicable: number[];
  isDeleted: boolean;
  createdBy: string;
  updatedBy?: string;
}

export interface TimetableEntry {
  _id?: string;
  dayOfWeek: number;
  slotId: string;
  subjectName: string;
  teacherId?: string;
  teacherName?: string;
  roomNumber?: string;
}

export interface Timetable extends BaseEntity {
  class: string;
  section: string;
  academicYear: string;
  term?: string;
  status: TimetableStatus;
  entries: TimetableEntry[];
  notes?: string;
  isDeleted: boolean;
  deletedAt?: string;
  deletedBy?: string;
  createdBy: string;
  updatedBy?: string;
  publishedAt?: string;
  publishedBy?: string;
  archivedAt?: string;
  archivedBy?: string;
  metadata?: Record<string, unknown>;
}

export interface TimetableSubstitute extends BaseEntity {
  timetableId: string;
  class: string;
  section: string;
  date: string;
  dayOfWeek: number;
  slotId: string;
  subjectName: string;
  originalTeacherId?: string;
  originalTeacherName?: string;
  substituteTeacherName: string;
  substituteTeacherId?: string;
  reason?: string;
  notes?: string;
  status: 'active' | 'cancelled';
  isDeleted: boolean;
  createdBy: string;
  updatedBy?: string;
}

export interface ConflictInfo {
  timetableId: string;
  class: string;
  section: string;
  dayOfWeek: number;
  slotId: string;
  conflictType: 'teacher' | 'room';
  conflictValue: string;
}

// ── Teacher Timetable (Principal-built, independent of class Timetable) ───────

export type TeacherTimetableStatus = 'draft' | 'published';

export interface TeacherTimetableEntry {
  _id?: string;
  dayOfWeek: number;
  slotId: string;
  subjectName: string;
  class?: string;
  section?: string;
  roomNumber?: string;
}

export interface TeacherTimetable extends BaseEntity {
  teacherId: string;
  teacherName: string;
  academicYear: string;
  status: TeacherTimetableStatus;
  entries: TeacherTimetableEntry[];
  notes?: string;
  isDeleted: boolean;
  deletedAt?: string;
  deletedBy?: string;
  createdBy: string;
  updatedBy?: string;
  publishedAt?: string;
  publishedBy?: string;
}

export interface GetOrCreateTeacherTimetablePayload {
  teacherId: string;
  teacherName: string;
  academicYear: string;
}

export interface BulkUpdateTeacherTimetableEntriesPayload {
  entries: TeacherTimetableEntry[];
}

export interface UpdateTeacherTimetableStatusPayload {
  status: TeacherTimetableStatus;
}

export interface BulkUpdateTeacherTimetableEntriesResult {
  timetable: TeacherTimetable;
  conflicts: string[];
}

export interface CreatePeriodSlotPayload {
  name: string;
  orderIndex: number;
  startTime: string;
  endTime: string;
  isBreak?: boolean;
  daysApplicable?: number[];
}

export type UpdatePeriodSlotPayload = Partial<CreatePeriodSlotPayload>;

export interface CreateTimetablePayload {
  class: string;
  section: string;
  academicYear: string;
  term?: string;
  notes?: string;
}

export type UpdateTimetablePayload = Partial<CreateTimetablePayload>;

export interface UpsertEntryPayload {
  dayOfWeek: number;
  slotId: string;
  subjectName: string;
  teacherId?: string;
  teacherName?: string;
  roomNumber?: string;
}

export interface BulkUpdateEntriesPayload {
  entries: UpsertEntryPayload[];
}

export interface UpdateTimetableStatusPayload {
  status: TimetableStatus;
}

export interface CreateSubstitutePayload {
  timetableId: string;
  class: string;
  section: string;
  date: string;
  dayOfWeek: number;
  slotId: string;
  subjectName: string;
  originalTeacherId?: string;
  originalTeacherName?: string;
  substituteTeacherName: string;
  substituteTeacherId?: string;
  reason?: string;
  notes?: string;
}

export interface UpdateSubstitutePayload {
  substituteTeacherName?: string;
  substituteTeacherId?: string;
  reason?: string;
  notes?: string;
  status?: 'active' | 'cancelled';
}

export interface TimetableListOptions {
  page?: number;
  limit?: number;
  class?: string;
  section?: string;
  academicYear?: string;
  status?: TimetableStatus;
}

export interface SubstituteListOptions {
  page?: number;
  limit?: number;
  dateFrom?: string;
  dateTo?: string;
  class?: string;
  section?: string;
  timetableId?: string;
}

// ── Principal Dashboard ───────────────────────────────────────────────────────

export type PrincipalAlertType =
  | 'low_attendance'
  | 'overdue_fees'
  | 'upcoming_event'
  | 'pending_followup';

export type AlertSeverity = 'info' | 'warning' | 'critical';

export interface PrincipalAlert {
  id: string;
  type: PrincipalAlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  actionUrl?: string;
}

export interface PrincipalUpcomingEvent {
  id: string;
  title: string;
  eventType: string;
  startDate: string;
  isAllDay: boolean;
  startTime?: string;
}

export interface PrincipalStudentStats {
  total: number;
  active: number;
  newThisMonth: number;
}

export interface PrincipalTeacherStats {
  total: number;
  active: number;
}

export interface PrincipalAdmissionStats {
  total: number;
  byStage: Record<string, number>;
  pendingFollowUp: number;
  newThisMonth: number;
  convertedThisMonth: number;
}

export interface PrincipalTimetableStats {
  published: number;
  draft: number;
}

export interface PrincipalAttendanceStats {
  today: AttendanceSummary;
  weeklyAvgRate: number;
}

export interface FeeStructureEntry extends BaseEntity {
  schoolId: string;
  class: string;
  feeHead: FeeHead;
  academicYear: string;
  /** Academic month this fee head applies to (e.g. "April"). Null/undefined means
   *  the head applies year-round regardless of month (e.g. Transport). */
  month?: string | null;
  amount: number;
  updatedBy: string;
}

export interface UpsertFeeStructurePayload {
  class: string;
  feeHead: FeeHead;
  academicYear: string;
  month?: string | null;
  amount: number;
}

/** Define an amount once and apply it to every class in the school — the
 *  "global fee structure template" builder, as opposed to `UpsertFeeStructurePayload`
 *  which edits a single class at a time. */
export interface ApplyAllClassesFeeStructurePayload {
  feeHead: FeeHead;
  academicYear: string;
  month?: string | null;
  amount: number;
}

export interface CollectionScheduleItem {
  /** Academic month the fee component belongs to (from the Fee Components tab), e.g. "April". */
  academicMonth: string;
  feeHead: FeeHead;
}

export interface CollectionScheduleEntry extends BaseEntity {
  schoolId: string;
  academicYear: string;
  depositMonth: string;
  items: CollectionScheduleItem[];
  updatedBy: string;
}

export interface UpsertCollectionSchedulePayload {
  academicYear: string;
  depositMonth: string;
  items: CollectionScheduleItem[];
}

export type FeeDiscountStatus = 'pending' | 'approved' | 'rejected';

export interface FeeDiscountRequest extends BaseEntity {
  schoolId: string;
  studentId: string;
  studentName: string;
  class: string;
  section: string;
  requestedAmount: number;
  reason: string;
  status: FeeDiscountStatus;
  requestedByName: string;
  reviewedByName?: string;
  reviewNote?: string;
  reviewedAt?: string;
}

export interface CreateDiscountRequestPayload {
  studentId: string;
  requestedAmount: number;
  reason: string;
}

export interface ReviewDiscountRequestPayload {
  reviewNote?: string;
}

export interface SchoolClass extends BaseEntity {
  schoolId: string;
  name: string;
  sections: string[];
  createdBy: string;
  updatedBy?: string;
}

export interface AttendanceRules {
  startTime: string;
  lateAfter: string;
  halfDayAfter: string;
  schoolEndTime: string;
}

export interface PayrollConfig {
  workingDaysPerMonth: number;
}

export interface BehaviorWindow {
  startTime: string;
  endTime: string;
}

/** Daily cutoff (HH:mm, IST) after which teachers can no longer edit today's
 *  attendance — undefined `cutoffTime` means no time restriction. Past dates
 *  are always view-only for teachers regardless of this setting. */
export interface AttendanceEditPolicy {
  cutoffTime?: string;
}

export interface ReportCardBranding {
  motto?: string;
  address?: string;
  phone?: string;
  website?: string;
  email?: string;
  principalName?: string;
  principalSignatureUrl?: string;
  schoolSealUrl?: string;
}

export interface SchoolSettings extends BaseEntity {
  schoolId: string;
  schoolName: string;
  logoUrl?: string;
  academicYearStart?: string;
  academicYearEnd?: string;
  attendanceRules: AttendanceRules;
  payrollConfig: PayrollConfig;
  behaviorWindow: BehaviorWindow;
  attendanceEditPolicy: AttendanceEditPolicy;
  reportCardBranding: ReportCardBranding;
  updatedBy?: string;
}

export interface UpdateAcademicYearPayload {
  academicYearStart: string;
  academicYearEnd: string;
}

export interface UpdateReportCardBrandingPayload {
  motto?: string;
  address?: string;
  phone?: string;
  website?: string;
  email?: string;
  principalName?: string;
}

export interface NeedsSubstituteEntry {
  class: string;
  section: string;
  slotId: string;
  subjectName: string;
  timetableId: string;
  dayOfWeek: number;
  date: string;
  originalTeacherId: string;
  originalTeacherName: string;
  leaveRequestId: string;
}

export interface SubstituteSuggestion {
  teacherId: string;
  teacherName: string;
  teachesThisClass: boolean;
  freePeriodsToday: number;
}

export interface TeacherOnLeave {
  leaveRequestId: string;
  teacherId: string;
  teacherName: string;
  leaveType: LeaveType;
  dateFrom: string;
  dateTo: string;
}

export interface TeachersSummaryData {
  date: string;
  total: number;
  active: number;
  onLeave: TeacherOnLeave[];
  presentCount: number;
}

export interface PrincipalDashboardData {
  students: PrincipalStudentStats;
  teachers: PrincipalTeacherStats;
  attendance: PrincipalAttendanceStats;
  fees: FeeCollectionSummary;
  admissions: PrincipalAdmissionStats;
  timetable: PrincipalTimetableStats;
  upcomingEvents: PrincipalUpcomingEvent[];
  alerts: PrincipalAlert[];
  generatedAt: string;
}

export interface PrincipalBriefingSummary {
  summary: string;
  generatedAt: string;
}

// ── Reports & Analytics ───────────────────────────────────────────────────────

export type ReportCategory =
  | 'students'
  | 'attendance'
  | 'fees'
  | 'admissions'
  | 'timetable'
  | 'calendar';

export interface ReportFilters {
  dateFrom?: string;
  dateTo?: string;
  class?: string;
  section?: string;
  academicYear?: string;
}

export interface SavedReport {
  id: string;
  schoolId: string;
  name: string;
  description?: string;
  category: ReportCategory;
  filters: ReportFilters;
  isPublic: boolean;
  createdBy: string;
  createdByName: string;
  lastRunAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSavedReportPayload {
  name: string;
  description?: string;
  category: ReportCategory;
  filters: ReportFilters;
  isPublic?: boolean;
}

// ── Analytics shapes per category ────────────────────────────────────────────

export interface LabelCount { label: string; count: number }

export interface StudentAnalytics {
  summary: { total: number; active: number; newThisMonth: number };
  byGender: LabelCount[];
  byClass: LabelCount[];
  byStatus: LabelCount[];
  monthlyTrend: Array<{ month: string; count: number }>;
}

export interface AttendanceClassRow {
  class: string;
  section: string;
  present: number;
  absent: number;
  late: number;
  total: number;
  rate: number;
}

export interface AttendanceAnalytics {
  summary: AttendanceSummary;
  byClass: AttendanceClassRow[];
  dailyTrend: Array<{ date: string; present: number; absent: number; total: number; rate: number }>;
}

export interface FeeAnalytics {
  summary: FeeCollectionSummary;
  monthlyTrend: Array<{ month: string; collected: number; charged: number }>;
  byHead: Array<{ label: string; collected: number; total: number; count: number }>;
  byStatus: LabelCount[];
}

export interface AdmissionsAnalytics {
  summary: {
    total: number;
    active: number;
    convertedThisMonth: number;
    newThisMonth: number;
    pendingFollowUp: number;
    conversionRate: number;
  };
  byStage: LabelCount[];
  bySource: LabelCount[];
  monthlyTrend: Array<{ month: string; count: number; converted: number }>;
}

export interface TimetableAnalytics {
  summary: { published: number; draft: number; archived: number; total: number };
  teacherWorkload: Array<{ teacherName: string; entriesCount: number }>;
  subjectDistribution: LabelCount[];
}

export interface CalendarAnalytics {
  summary: { thisMonthCount: number; upcomingCount: number; totalPublished: number };
  byType: LabelCount[];
  upcoming: PrincipalUpcomingEvent[];
}

export type ReportAnalyticsData =
  | { category: 'students';   data: StudentAnalytics }
  | { category: 'attendance'; data: AttendanceAnalytics }
  | { category: 'fees';       data: FeeAnalytics }
  | { category: 'admissions'; data: AdmissionsAnalytics }
  | { category: 'timetable';  data: TimetableAnalytics }
  | { category: 'calendar';   data: CalendarAnalytics };

// ── Data Import Platform ──────────────────────────────────────────────────────

export type ImportType = 'students' | 'teachers' | 'fees' | 'admissions' | 'attendance';

export type ImportStatus =
  | 'uploading'
  | 'parsing'
  | 'validating'
  | 'preview'
  | 'confirmed'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'rolled_back';

export type ImportRowStatus = 'pending' | 'valid' | 'warning' | 'error' | 'imported' | 'skipped';

export interface ImportRowError {
  field: string;
  message: string;
  code: string;
}

export interface ImportTimelineEvent {
  event: 'uploaded' | 'validated' | 'confirmed' | 'processing_started' | 'completed' | 'failed' | 'cancelled' | 'rolled_back';
  at: string;
  note?: string;
}

export interface ImportSession extends BaseEntity {
  createdBy: string;
  createdByName: string;
  importType: ImportType;
  status: ImportStatus;
  originalFileName: string;
  fileSize: number;
  mimeType: string;
  mapping: Record<string, string>;
  totalRows: number;
  validRows: number;
  warningRows: number;
  failedRows: number;
  importedRows: number;
  skippedRows: number;
  /** Rows (within validRows/warningRows) that matched an existing record. */
  duplicateRows: number;
  /** Last strategy applied via the preview screen's Skip/Update/Import Anyway selector. */
  duplicateStrategy?: 'skip' | 'update' | 'create';
  importedIds: string[];
  /** 'students' imports only — new class/section combos not yet in the school's
   * Classes & Sections catalog, detected during validation for review before confirming. */
  detectedNewClasses: DetectedClass[];
  timeline: ImportTimelineEvent[];
  errorSummary?: string;
  startedAt?: string;
  completedAt?: string;
  rolledBackAt?: string;
}

export interface DetectedClass {
  class: string;
  section: string;
  classExists: boolean;
}

export interface ImportRow {
  _id: string;
  sessionId: string;
  schoolId: string;
  rowNumber: number;
  rawData: Record<string, unknown>;
  mappedData: Record<string, unknown>;
  status: ImportRowStatus;
  errors: ImportRowError[];
  warnings: ImportRowError[];
  /** _id of an existing record this row matched during validation, if any. */
  duplicateOf?: string;
  /** How to handle that match at processing time — defaults to 'update'. */
  duplicateAction?: 'skip' | 'update' | 'create';
  importedId?: string;
  createdAt: string;
}

export interface ImportTemplate {
  importType: ImportType;
  name: string;
  description: string;
  headers: string[];
}

export interface ImportStats {
  totalSessions: number;
  totalImported: number;
  recentSessions: ImportSession[];
}

// ── Integration Platform Types ─────────────────────────────────────────────────

export type IntegrationProviderType =
  | 'attendance'
  | 'payment'
  | 'communication'
  | 'erp'
  | 'calendar'
  | 'lms'
  | 'custom';

export type IntegrationStatus =
  | 'connected'
  | 'disconnected'
  | 'error'
  | 'syncing'
  | 'pending';

export type SyncStatus = 'running' | 'completed' | 'failed' | 'partial';
export type SyncType   = 'manual' | 'scheduled' | 'webhook' | 'initial';

export type ApiKeyScope =
  | 'read:students'
  | 'read:teachers'
  | 'read:attendance'
  | 'read:fees'
  | 'write:attendance'
  | 'write:fees'
  | 'read:integrations'
  | 'write:integrations';

export interface IntegrationConfig {
  syncInterval: number;
  timeout:      number;
  retryCount:   number;
  customFields?: Record<string, unknown>;
}

export interface IntegrationTimelineEvent {
  event:     string;
  at:        string;
  note?:     string;
  actorId?:  string;
  actorName?: string;
}

export interface Integration extends BaseEntity {
  providerType:    IntegrationProviderType;
  providerKey:     string;
  name:            string;
  status:          IntegrationStatus;
  enabled:         boolean;
  environment:     'production' | 'sandbox';
  config:          IntegrationConfig;
  lastSyncAt?:     string;
  lastSyncStatus?: 'success' | 'failure' | 'partial';
  lastSyncError?:  string;
  nextSyncAt?:     string;
  timeline:        IntegrationTimelineEvent[];
  createdBy:       string;
  createdByName:   string;
}

export interface SyncLog {
  _id:           string;
  integrationId: string;
  schoolId:      string;
  providerKey:   string;
  syncType:      SyncType;
  status:        SyncStatus;
  startedAt:     string;
  completedAt?:  string;
  recordsSynced: number;
  recordsFailed: number;
  errors:        string[];
  metadata?:     Record<string, unknown>;
  createdAt:     string;
}

export interface ApiKey {
  _id:           string;
  schoolId:      string;
  name:          string;
  keyPrefix:     string;
  scopes:        ApiKeyScope[];
  enabled:       boolean;
  lastUsedAt?:   string;
  expiresAt?:    string;
  createdByName: string;
  createdAt:     string;
}

export interface WebhookEndpoint extends BaseEntity {
  schoolId:      string;
  integrationId?: string;
  name:          string;
  url:           string;
  events:        string[];
  enabled:       boolean;
  retryCount:    number;
  timeoutMs:     number;
  headers?:      Record<string, string>;
  createdByName: string;
}

export interface WebhookAttempt {
  attemptedAt:  string;
  statusCode?:  number;
  responseBody?: string;
  error?:       string;
  durationMs?:  number;
}

export interface WebhookDelivery {
  _id:         string;
  webhookId:   string;
  schoolId:    string;
  event:       string;
  payload:     Record<string, unknown>;
  status:      'pending' | 'delivered' | 'failed' | 'retrying';
  attempts:    WebhookAttempt[];
  nextRetryAt?: string;
  createdAt:   string;
}

export interface CredentialField {
  key:          string;
  label:        string;
  type:         'text' | 'password' | 'url' | 'number' | 'select';
  required:     boolean;
  placeholder?: string;
  options?:     { label: string; value: string }[];
  helpText?:    string;
}

export type ProviderCapability =
  | 'sync_pull'
  | 'sync_push'
  | 'webhook_inbound'
  | 'webhook_outbound'
  | 'test_connection'
  | 'health_check'
  | 'incremental_sync'
  | 'manual_sync';

export interface ProviderDefinition {
  providerKey:      string;
  providerType:     IntegrationProviderType;
  name:             string;
  description:      string;
  logoUrl?:         string;
  credentialFields: CredentialField[];
  configDefaults:   { syncInterval: number; timeout: number; retryCount: number };
  capabilities:     ProviderCapability[];
  documentationUrl?: string;
  comingSoon?:      boolean;
}

export interface IntegrationDashboardStats {
  total:       number;
  connected:   number;
  error:       number;
  recentSyncs: SyncLog[];
  integrations: Integration[];
}

export interface TestConnectionResult {
  success:    boolean;
  message:    string;
  latencyMs?: number;
  details?:   Record<string, unknown>;
}

export interface HealthStatus {
  healthy:    boolean;
  latencyMs?: number;
  message?:   string;
  checkedAt:  string;
}

// ── Teacher Workspace ─────────────────────────────────────────────────────────

export interface TeacherWorkspaceSelf {
  _id: string;
  schoolId: string;
  fullName: string;
  employeeId: string;
  email?: string;
  phone: string;
  department?: string;
  subjects: string[];
  assignedClasses: string[];
  employmentStatus: EmploymentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface TodayClass {
  timetableId: string;
  class: string;
  section: string;
  slotId: string;
  slotName: string;
  startTime: string;
  endTime: string;
  subjectName: string;
  attendanceMarked: boolean;
  attendanceCount: number;
  totalStudents: number;
  /** True only if this teacher is the assigned class teacher for this section,
   *  or an active substitute today — matches attendance.service.ts's
   *  assertTeacherCanMarkClass exactly. False for a subject-only period. */
  canMarkAttendance: boolean;
}

export interface TeacherWeekEntry {
  dayOfWeek: number;
  slotId: string;
  slotName: string;
  startTime: string;
  endTime: string;
  subjectName: string;
  class: string;
  section: string;
  roomNumber?: string;
  timetableId: string;
}

export interface TeacherWorkspaceData {
  teacher: TeacherWorkspaceSelf;
  todayClasses: TodayClass[];
  todayDayOfWeek: number;      // 1=Mon … 6=Sat, 7=Sun
  weekSchedule: Array<{ dayOfWeek: number; entries: TeacherWeekEntry[] }>;
  attendanceSummary: {
    classesMarkedToday: number;
    totalClassesToday: number;
  };
  /** Classes this teacher is the CLASS TEACHER of — assigned by admin/principal
   *  only, never self-service. Classes not in this list are "record only": the
   *  teacher may teach a subject there, but shouldn't get attendance-taking or
   *  add-student actions for them. */
  classTeacherOf: Array<{ class: string; section: string }>;
  generatedAt: string;
}

// ── Internal Messaging ──────────────────────────────────────────────────────

export type InternalMessagePriority = 'normal' | 'high';

export interface InternalMessage {
  _id: string;
  senderName: string;
  recipientUserId: string;
  subject: string;
  body: string;
  priority: InternalMessagePriority;
  isRead: boolean;
  acknowledgedAt?: string;
  createdAt: string;
}

export interface InternalMessageListResult {
  messages: InternalMessage[];
  unreadCount: number;
}

export interface MessageTemplate {
  _id: string;
  title: string;
  subject: string;
  body: string;
  priority: InternalMessagePriority;
  createdByName: string;
  createdAt: string;
}

export interface StaffDirectoryEntry {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface SendInternalMessagePayload {
  recipientUserIds?: string[];
  recipientRole?: UserRole;
  subject: string;
  body: string;
  priority: InternalMessagePriority;
  templateId?: string;
}

export interface SendInternalMessageResult {
  sent: number;
}

export interface CreateMessageTemplatePayload {
  title: string;
  subject: string;
  body: string;
  priority: InternalMessagePriority;
}

// ── Device Push Tokens ────────────────────────────────────────────────────────

export type DevicePlatform = 'ios' | 'android';

export interface RegisterDeviceTokenPayload {
  token: string;
  platform: DevicePlatform;
}

// ── Employee (Smart QR Attendance & Payroll — Phase 1) ─────────────────────────

export type EmployeeRole =
  | 'teacher'
  | 'principal'
  | 'vice_principal'
  | 'receptionist'
  | 'accountant'
  | 'librarian'
  | 'driver'
  | 'peon'
  | 'other';

export type EmploymentType = 'full_time' | 'part_time' | 'contract';

export type EmployeeStatus = 'active' | 'inactive';

export type QrStatus = 'active' | 'expired' | 'disabled';

export interface EmployeeQr {
  token: string;
  issuedAt: string;
  status: QrStatus;
}

export interface Employee extends BaseEntity {
  fullName: string;
  gender: Gender;
  dateOfBirth?: string;
  employeeId: string;
  photoUrl?: string;
  signatureUrl?: string;
  phone: string;
  alternatePhone?: string;
  email?: string;
  address?: string;
  designation: string;
  department?: string;
  joiningDate?: string;
  monthlySalary?: number;
  employmentType?: EmploymentType;
  /** HR job-role classification — distinct from the auth UserRole enum. */
  role: EmployeeRole;
  teacherId?: string;
  userId?: string;
  qr?: EmployeeQr;
  status: EmployeeStatus;
  createdBy?: string;
  updatedBy?: string;
  isDeleted: boolean;
  deletedAt?: string;
  deletedBy?: string;
}

export interface CreateEmployeePayload {
  fullName: string;
  gender: Gender;
  dateOfBirth?: string;
  phone: string;
  alternatePhone?: string;
  email?: string;
  address?: string;
  designation: string;
  department?: string;
  joiningDate?: string;
  monthlySalary?: number;
  employmentType?: EmploymentType;
  role: EmployeeRole;
  status?: EmployeeStatus;
}

export type UpdateEmployeePayload = Partial<CreateEmployeePayload>;

export interface EmployeeListOptions {
  page?: number;
  limit?: number;
  search?: string;
  department?: string;
  role?: EmployeeRole;
  status?: EmployeeStatus;
  sortBy?: 'fullName' | 'createdAt' | 'joiningDate';
  sortOrder?: 'asc' | 'desc';
}

export interface CreateEmployeeLoginPayload {
  username: string;
  password: string;
}

export interface EmployeeQrImage {
  dataUri: string;
  status: QrStatus;
  issuedAt: string;
}

// ── Staff Attendance (QR check-in/check-out) ────────────────────────────────────

export type StaffAttendanceStatus = 'present' | 'late' | 'half_day' | 'absent';

export interface StaffAttendancePunch {
  time: string;
  recordedBy: string;
  device?: string;
}

export interface StaffAttendanceRecord extends BaseEntity {
  employeeId: string;
  employeeObjectId: string;
  date: string;
  checkIn?: StaffAttendancePunch;
  checkOut?: StaffAttendancePunch;
  workingMinutes?: number;
  status: StaffAttendanceStatus;
}

export type StaffAttendanceScanAction = 'check_in' | 'check_out' | 'already_marked';

export interface StaffAttendanceScanSummary {
  photoUrl?: string;
  fullName: string;
  department?: string;
  designation: string;
}

export interface StaffAttendanceScanResult {
  action: StaffAttendanceScanAction;
  record: StaffAttendanceRecord;
  employee: StaffAttendanceScanSummary;
}

export interface ScanQrPayload {
  token: string;
  device?: string;
}

export interface ManualMarkPayload {
  employeeId: string;
  status: StaffAttendanceStatus;
}

// ── Payroll (Smart QR Attendance & Payroll — Phase 2) ───────────────────────────

export type PayrollStatus = 'draft' | 'generated' | 'paid';

export interface PayrollRecord extends BaseEntity {
  employeeObjectId: string;
  employeeId: string;
  employeeName: string;
  designation: string;
  department?: string;

  month: number; // 1-12
  year: number;

  workingDaysPerMonth: number;
  dailyRate: number;

  presentDays: number;
  lateDays: number;
  halfDays: number;
  absentDays: number;

  grossSalary: number;
  deductions: number;
  netSalary: number;

  status: PayrollStatus;
  generatedAt: string;
  paidAt?: string;
  paidBy?: string;
  paymentMode?: PaymentMode;
  notes?: string;

  isDeleted: boolean;
  deletedAt?: string;
  deletedBy?: string;

  createdBy: string;
  updatedBy?: string;
}

export interface GeneratePayrollPayload {
  employeeObjectId: string;
  month: number;
  year: number;
}

export interface GenerateAllPayrollPayload {
  month: number;
  year: number;
}

export interface GenerateAllPayrollResult {
  succeeded: string[];
  failed: { employeeId: string; error: string }[];
}

export interface MarkPayrollPaidPayload {
  paidDate: string;
  paymentMode?: PaymentMode;
  notes?: string;
}

export interface PayrollListOptions {
  page?: number;
  limit?: number;
  month?: number;
  year?: number;
  department?: string;
  status?: PayrollStatus;
}

// ── Exams ─────────────────────────────────────────────────────────────────────

export type ExamType =
  | 'unit_test'
  | 'monthly_test'
  | 'half_yearly'
  | 'annual'
  | 'practical'
  | 'internal_assessment'
  | 'other';

export type ExamStatus = 'draft' | 'configured' | 'locked';

export interface ExamComponent {
  name: string;
  maxMarks: number;
  passMarks?: number;
  weight?: number;
}

export interface GradeBand {
  label: string;
  minPercent: number;
  maxPercent: number;
}

export type SubjectEvaluationType = 'marks' | 'grade' | 'both';

export interface SubjectConfig {
  name: string;
  evaluationType: SubjectEvaluationType;
}

export interface Exam extends BaseEntity {
  name: string;
  examType: ExamType;
  termLabel?: string;
  classesApplicable: string[];
  subjects: string[];
  subjectConfigs?: SubjectConfig[];
  components: ExamComponent[];
  gradingBands: GradeBand[];
  passPercent: number;
  subjectWiseMinPercent?: number;
  status: ExamStatus;
  createdBy?: string;
  updatedBy?: string;
}

export interface CreateExamPayload {
  name: string;
  examType: ExamType;
  termLabel?: string;
  classesApplicable: string[];
  subjects: string[];
  subjectConfigs?: SubjectConfig[];
  components: ExamComponent[];
  gradingBands?: GradeBand[];
  passPercent?: number;
  subjectWiseMinPercent?: number;
}

export type UpdateExamPayload = Partial<CreateExamPayload>;

export interface ExamListOptions {
  page?: number;
  limit?: number;
  class?: string;
  examType?: ExamType;
  status?: ExamStatus;
  search?: string;
}

// ── Marks ─────────────────────────────────────────────────────────────────────

export type ComponentStatus = 'present' | 'absent' | 'exempt' | 'medical' | 'not_assessed';

export type MarksWorkflowStatus =
  | 'draft'
  | 'submitted'
  | 'needs_correction'
  | 'approved'
  | 'published'
  | 'locked'
  | 'reopened';

export type MarksResultStatus = 'pass' | 'fail' | 'na';

export interface ComponentScore {
  componentName: string;
  score?: number;
  status: ComponentStatus;
}

export interface MarksAuditEntry {
  action: string;
  byUserId: string;
  byName: string;
  reason?: string;
  fromValue?: string;
  toValue?: string;
  at: string;
}

export interface Marks extends BaseEntity {
  examId: string;
  studentId: string;
  class: string;
  section: string;
  subjectName: string;
  componentScores: ComponentScore[];
  total?: number;
  percentage?: number;
  grade?: string;
  result: MarksResultStatus;
  remark?: string;
  workflowStatus: MarksWorkflowStatus;
  enteredById: string;
  enteredByName: string;
  enteredAt: string;
  lastEditedById?: string;
  lastEditedByName?: string;
  lastEditedAt?: string;
  approvedById?: string;
  approvedByName?: string;
  approvedAt?: string;
  publishedById?: string;
  publishedByName?: string;
  publishedAt?: string;
  auditTrail: MarksAuditEntry[];
}

export interface UpsertMarksPayload {
  examId: string;
  studentId: string;
  class: string;
  section: string;
  subjectName: string;
  componentScores: ComponentScore[];
  remark?: string;
}

export interface BulkUpsertMarksRecord {
  studentId: string;
  componentScores: ComponentScore[];
  remark?: string;
}

export interface BulkUpsertMarksPayload {
  examId: string;
  class: string;
  section: string;
  subjectName: string;
  records: BulkUpsertMarksRecord[];
}

export interface MarksBatchTarget {
  examId: string;
  class: string;
  section: string;
  subjectName: string;
}

export interface MarksReviewActionPayload extends MarksBatchTarget {
  studentIds?: string[];
  reason?: string;
}

export interface MarksReopenPayload extends MarksBatchTarget {
  reason: string;
}

export interface MarksEntryRow {
  studentId: string;
  fullName: string;
  rollNumber?: string;
  marks: Marks | null;
}

export interface MarksEntryTable {
  exam: Exam;
  rows: MarksEntryRow[];
}

export interface MarksSummary {
  totalStudents: number;
  completed: number;
  pending: number;
  draft: number;
  submitted: number;
  needsCorrection: number;
  approved: number;
  published: number;
  locked: number;
}

export interface MarksListOptions {
  examId?: string;
  class?: string;
  section?: string;
  subjectName?: string;
  studentId?: string;
  workflowStatus?: MarksWorkflowStatus;
  search?: string;
  page?: number;
  limit?: number;
}

// ── Marks AI extraction (photo / voice → pre-filled entry table) ──────────────

export interface ExtractedMarksRow {
  studentId: string;
  fullName: string;
  rollNumber?: string;
  componentScores: ComponentScore[];
}

export interface UnmatchedExtraction {
  rawName?: string;
  rawRollNumber?: string;
  scores: Record<string, number>;
}

export interface MarksExtractionResult {
  source: 'image' | 'voice';
  extracted: ExtractedMarksRow[];
  unmatched: UnmatchedExtraction[];
  warnings: string[];
  transcript?: string;
}

export interface PayrollSummary {
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
  draftCount: number;
  generatedCount: number;
  paidCount: number;
}

// ── Report Cards ──────────────────────────────────────────────────────────────

export type PromotionStatus = 'promoted' | 'not_promoted' | 'pending';
export type ReportCardStatus = 'draft' | 'published';

export interface ReportCardSubjectRow {
  subjectName: string;
  evaluationType: SubjectEvaluationType;
  maxMarks?: number;
  marksObtained?: number;
  percentage?: number;
  grade?: string;
  result: MarksResultStatus;
  teacherRemark?: string;
}

export interface CoScholasticEntry {
  activity: string;
  grade: string;
}

export interface ReportCardSummary {
  totalMaxMarks: number;
  totalObtained: number;
  percentage: number;
  overallGrade?: string;
  rank?: number;
  classSize?: number;
  promotionStatus: PromotionStatus;
  highestMarksPercent?: number;
  classAveragePercent?: number;
}

export interface ReportCardAttendance {
  workingDays: number;
  present: number;
  absent: number;
  late: number;
  halfDay: number;
  leaveApproved: number;
  percent: number;
}

export interface ReportCardAiRemark {
  text: string;
  generatedAt?: string;
  model?: string;
  edited: boolean;
}

export interface ReportCard extends BaseEntity {
  examId: string;
  studentId: string;
  class: string;
  section: string;
  subjects: ReportCardSubjectRow[];
  coScholastic: CoScholasticEntry[];
  summary: ReportCardSummary;
  attendance: ReportCardAttendance;
  aiRemark?: ReportCardAiRemark;
  teacherRemark?: string;
  principalRemark?: string;
  parentFeedback?: string;
  warnings: string[];
  verificationToken: string;
  status: ReportCardStatus;
  generatedById: string;
  generatedByName: string;
  generatedAt: string;
}

export interface GenerateReportCardPayload {
  examId: string;
  studentId: string;
}

/** A direct correction to one subject's marks/grade on an already-generated card. */
export interface SubjectMarkCorrection {
  subjectName: string;
  marksObtained?: number;
  grade?: string;
}

export interface UpdateReportCardPayload {
  aiRemarkText?: string;
  teacherRemark?: string;
  principalRemark?: string;
  parentFeedback?: string;
  coScholastic?: CoScholasticEntry[];
  subjectMarks?: SubjectMarkCorrection[];
}

export interface ReportCardRosterRow {
  studentId: string;
  fullName: string;
  rollNumber?: string;
  photoUrl?: string;
  hasReportCard: boolean;
  missingSubjects: number;
}

export interface ReportCardRoster {
  exam: Exam;
  rows: ReportCardRosterRow[];
}

export interface ReportCardVerification {
  studentName: string;
  class: string;
  section: string;
  examName: string;
  overallGrade?: string;
  promotionStatus: PromotionStatus;
  issuedAt: string;
  schoolId: string;
}

// ── Report Card Templates (per-class, per-year configurable CBSE-style layout) ─

export type ReportCardTemplateStatus = 'draft' | 'published';
export type SkillGrade = 'A' | 'B' | 'C' | 'D';

export interface TemplateSubjectRow {
  /** Absent for a row not yet saved to the server — set once persisted, and
   *  stable across renames (survives regenerating a subject's name). */
  _id?: string;
  name: string;
  evaluationType: SubjectEvaluationType;
  order: number;
  unitTestMaxMarks: number;
  mainExamMaxMarks: number;
}

export interface TemplateSkillRow {
  _id?: string;
  label: string;
  order: number;
}

export interface TemplateSkillSection {
  _id?: string;
  name: string;
  order: number;
  rows: TemplateSkillRow[];
}

export interface TemplateGradingKeyEntry {
  label: string;
  description: string;
  order: number;
}

export interface TemplateExamSlot {
  unitTest1ExamId?: string;
  unitTest2ExamId?: string;
  mainExamId?: string;
  startDate?: string;
  endDate?: string;
}

export interface TemplateExamSlots {
  firstTerm: TemplateExamSlot;
  finalTerm: TemplateExamSlot;
}

export interface ReportCardTemplate extends BaseEntity {
  class: string;
  academicYear: string;
  status: ReportCardTemplateStatus;
  subjects: TemplateSubjectRow[];
  skillSections: TemplateSkillSection[];
  gradingKey: TemplateGradingKeyEntry[];
  examSlots: TemplateExamSlots;
  createdBy?: string;
  updatedBy?: string;
}

export interface CreateReportCardTemplatePayload {
  class: string;
  academicYear: string;
  subjects?: TemplateSubjectRow[];
  skillSections?: TemplateSkillSection[];
  gradingKey?: TemplateGradingKeyEntry[];
  examSlots?: TemplateExamSlots;
}

export type UpdateReportCardTemplatePayload = Partial<Omit<CreateReportCardTemplatePayload, 'class' | 'academicYear'>>;

export interface CloneReportCardTemplatePayload {
  fromAcademicYear: string;
  toAcademicYear: string;
}

export interface ReportCardTemplateListOptions {
  class?: string;
  academicYear?: string;
}

// ── Term Report Cards (two-term CBSE-style generated card) ─────────────────────

export interface TermReportCardSubjectRow {
  subjectId: string;
  subjectName: string;
  evaluationType: SubjectEvaluationType;
  unitTestMaxMarks: number;
  mainExamMaxMarks: number;
  unitTest1Score?: number;
  unitTest2Score?: number;
  bestUnitTestScore?: number;
  mainExamScore?: number;
  termTotal?: number;
  termMaxMarks: number;
  grade?: string;
  result: MarksResultStatus;
}

export interface TermReportCardTermBlock {
  unitTest1ExamId?: string;
  unitTest2ExamId?: string;
  mainExamId?: string;
  subjectRows: TermReportCardSubjectRow[];
  attendance: ReportCardAttendance;
  termTotalObtained: number;
  termTotalMax: number;
  termPercentage: number;
  /** This term's own class rank/size — computed from classmates' totals for
   *  just this term, distinct from the overall `summary.rank` across both terms. */
  rank?: number;
  classSize?: number;
}

export interface TermReportCardSkillEntry {
  sectionId: string;
  sectionName: string;
  rowId: string;
  rowLabel: string;
  firstTermGrade?: SkillGrade;
  finalTermGrade?: SkillGrade;
}

export interface TermReportCardSummary {
  rank?: number;
  classSize?: number;
  promotionStatus: PromotionStatus;
}

export interface TermReportCard extends BaseEntity {
  studentId: string;
  class: string;
  section: string;
  academicYear: string;
  templateId: string;
  firstTerm: TermReportCardTermBlock;
  finalTerm: TermReportCardTermBlock;
  grandTotalObtained: number;
  grandTotalMax: number;
  grandAveragePercent: number;
  overallGrade?: string;
  skills: TermReportCardSkillEntry[];
  summary: TermReportCardSummary;
  teacherRemark?: string;
  principalRemark?: string;
  parentFeedback?: string;
  warnings: string[];
  verificationToken: string;
  status: ReportCardStatus;
  generatedById: string;
  generatedByName: string;
  generatedAt: string;
}

export interface GenerateTermReportCardPayload {
  studentId: string;
  academicYear: string;
}

/** A direct correction to one subject's scores for a given term on an already-generated card. */
export interface TermSubjectMarkCorrection {
  term: 'firstTerm' | 'finalTerm';
  subjectName: string;
  unitTest1Score?: number;
  unitTest2Score?: number;
  mainExamScore?: number;
  grade?: string;
  /** Per-student override of the subject's evaluation type on this one card — e.g. a subject the
   *  template scores by marks for the class, but this teacher wants graded only for this student. */
  evaluationType?: SubjectEvaluationType;
}

export interface UpdateTermReportCardPayload {
  teacherRemark?: string;
  principalRemark?: string;
  parentFeedback?: string;
  subjectMarks?: TermSubjectMarkCorrection[];
}

export interface UpdateTermReportCardSkillsPayload {
  skills: { rowId: string; firstTermGrade?: SkillGrade; finalTermGrade?: SkillGrade }[];
}

export interface TermReportCardRosterRow {
  studentId: string;
  fullName: string;
  rollNumber?: string;
  photoUrl?: string;
  hasReportCard: boolean;
  warningsCount: number;
}

export interface TermReportCardRoster {
  template: ReportCardTemplate;
  rows: TermReportCardRosterRow[];
}

export interface TermReportCardVerification {
  studentName: string;
  class: string;
  section: string;
  academicYear: string;
  overallGrade?: string;
  promotionStatus: PromotionStatus;
  issuedAt: string;
  schoolId: string;
}

// ── Question Bank ─────────────────────────────────────────────────────────────

export type QuestionType =
  | 'mcq'
  | 'fill_blank'
  | 'true_false'
  | 'assertion_reason'
  | 'very_short'
  | 'short'
  | 'long'
  | 'hots'
  | 'case_study';

export type QuestionDifficulty = 'easy' | 'medium' | 'hard';

export type BloomsLevel = 'remember' | 'understand' | 'apply' | 'analyze' | 'evaluate' | 'create';

export interface SyllabusChapter extends BaseEntity {
  class: string;
  subject: string;
  chapterName: string;
  topics: string[];
  order?: number;
}

export interface QuestionUsageEntry {
  examId?: string;
  usedAt: string;
}

export interface Question extends BaseEntity {
  class: string;
  subject: string;
  chapterId: string;
  chapterName: string; // denormalized for display without an extra lookup
  topic?: string;
  questionText: string;
  questionType: QuestionType;
  options?: string[];
  correctAnswer?: string;
  difficulty: QuestionDifficulty;
  marks: number;
  estimatedTimeMinutes: number;
  bloomsLevel: BloomsLevel;
  keywords: string[];
  source?: string;
  usageHistory: QuestionUsageEntry[];
  createdBy: string;
  isDeleted: boolean;
  /** Traceability back to the structured chapter capture this question was drafted from, if any — powers "Show source". */
  sourceRef?: QuestionSourceRef;
  imageRef?: QuestionImageRef;
  imageRequirement?: QuestionImageRequirement;
}

export interface QuestionSourceRef {
  sourceId: string;
  pageNumber?: number;
  blockIndex?: number;
}

/** Points a picture-based question at an actual figure detected in an upload — never a
 * standalone image, always traceable back to the source/page it came from (spec: "do not invent
 * an image"). */
export interface QuestionImageRef {
  sourceId: string;
  figureId: string;
}

/** Set instead of imageRef when a question genuinely calls for a picture but none of the
 * uploaded content's detected figures fit — flags that a picture still needs to be supplied
 * (teacher upload or a future AI-image-generation step) rather than silently generating a
 * text-only question and calling it "picture-based". */
export interface QuestionImageRequirement {
  imageRequired: true;
  imageSource: 'generated' | 'teacher_upload';
  /** Only set when imageSource is 'generated' — a plain description of what the (not yet created) image should show. */
  imagePrompt?: string;
}

export interface CreateQuestionPayload {
  class: string;
  subject: string;
  chapterName: string;
  topic?: string;
  questionText: string;
  questionType: QuestionType;
  options?: string[];
  correctAnswer?: string;
  difficulty: QuestionDifficulty;
  marks: number;
  estimatedTimeMinutes: number;
  bloomsLevel: BloomsLevel;
  keywords?: string[];
  source?: string;
  imageRef?: QuestionImageRef;
  imageRequirement?: QuestionImageRequirement;
}

export type UpdateQuestionPayload = Partial<CreateQuestionPayload>;

export interface QuestionListOptions {
  page?: number;
  limit?: number;
  class?: string;
  subject?: string;
  chapterId?: string;
  topic?: string;
  difficulty?: QuestionDifficulty;
  questionType?: QuestionType;
  search?: string;
}

/** One row per class/subject/chapter — backs the Question Bank landing view. */
export interface QuestionGroup {
  class: string;
  subject: string;
  chapterId: string;
  chapterName: string;
  count: number;
}

export interface QuestionGroupListOptions {
  class?: string;
  subject?: string;
  search?: string;
}

// ── Question extraction (AI upload → draft → review → confirm) ───────────────

export interface ExtractedQuestionDraft {
  questionText: string;
  questionType: QuestionType;
  options?: string[];
  correctAnswer?: string;
  difficulty: QuestionDifficulty;
  marks: number;
  estimatedTimeMinutes: number;
  bloomsLevel: BloomsLevel;
  keywords: string[];
  chapterName: string;
  topic?: string;
  source?: string;
  sourceRef?: QuestionSourceRef;
  imageRef?: QuestionImageRef;
  imageRequirement?: QuestionImageRequirement;
}

export interface QuestionExtractionResult {
  sourceType: 'image' | 'pdf_text';
  extracted: ExtractedQuestionDraft[];
  warnings: string[];
  sourceId?: string;
}

/** Teacher-selected controls for a (re-)generation run — how many questions to draft and at what difficulty, asked up front instead of the AI silently pulling every question it can find at max verbosity. */
export interface QuestionGenerationOptions {
  count: number;
  difficulty: QuestionDifficulty | 'mixed';
  /** Overrides the class-inferred wording level for this run ('auto' = infer from class, the default). */
  languageComplexity?: LanguageComplexity;
  /** When true and the source has detected figures, generation may write picture-based questions referencing them. Ignored (no picture questions) when false/omitted, regardless of what figures exist. */
  includeImages?: boolean;
}

/** How plain/advanced the generated question wording should be. 'auto' infers purely from the
 * class (the default everywhere); the others let a teacher explicitly simplify or stretch wording
 * for a particular batch/section without changing the class itself. */
export type LanguageComplexity = 'auto' | 'simple' | 'standard' | 'advanced';

/** Result of an upload that only transcribes/stores text — no question drafts yet. Generating drafts is a separate, repeatable step (see QuestionSource re-extract). */
export interface TextExtractionResult {
  sourceId: string;
  sourceType: 'image' | 'pdf_text';
  fileName?: string;
  extractedText: string;
  warnings: string[];
}

export interface ConfirmExtractedQuestionsPayload {
  class: string;
  subject: string;
  questions: ExtractedQuestionDraft[];
}

/** A previously-uploaded photo/PDF whose converted text was saved so it can be re-extracted without re-uploading. */
export interface QuestionSource extends BaseEntity {
  class: string;
  subject: string;
  kind: 'image' | 'pdf_text';
  fileName?: string;
  extractedText: string;
  /** Teacher-assigned chapter for this upload — pre-fills every question drafted from it, overriding the AI's per-question guess. */
  chapterName?: string;
  /** Layout-aware chapter capture (multi-page). Absent on older flat-text sources and on plain PDF/single-image uploads — UI falls back to `extractedText`. */
  documentTitle?: string;
  language?: string;
  pages?: ChapterPage[];
  reviewStatus?: 'ready_for_review' | 'saved';
  /** Set only for a single-image upload (kind: 'image') where the teacher opted into image detection — chapter-capture sources carry the equivalent per-page instead (see `pages[].pageImageFileId`/`figures`). */
  pageImageFileId?: string;
  figures?: PageFigure[];
}

export interface UpdateQuestionSourcePayload {
  chapterName?: string;
  documentTitle?: string;
  pages?: ChapterPage[];
  reviewStatus?: 'ready_for_review' | 'saved';
}

// ── Structured chapter capture (layout-aware OCR) ─────────────────────────────
// OCR layer only: "what is present on the page?" — never invents content, always
// preserves source ordering/hierarchy. Question generation (above) is a separate,
// later AI step that reads this structure but never feeds back into it.

export type BlockConfidence = 'high' | 'review' | 'low';

export interface HeadingBlock {
  type: 'heading';
  level: 1 | 2 | 3;
  text: string;
  confidence?: BlockConfidence;
}

export interface ParagraphBlock {
  type: 'paragraph';
  /** Markdown-lite inline formatting only (**bold**, *italic*) — no span-offset model. */
  text: string;
  confidence?: BlockConfidence;
}

export interface ListBlockItem {
  text: string;
  items?: ListBlockItem[];
}

export interface ListBlock {
  type: 'list';
  ordered: boolean;
  items: ListBlockItem[];
  confidence?: BlockConfidence;
}

export interface TableBlock {
  type: 'table';
  caption?: string;
  headers: string[];
  rows: string[][];
  confidence?: BlockConfidence;
}

export interface EquationBlock {
  type: 'equation';
  latex: string;
  /** Plain-text fallback for when LaTeX rendering isn't available/desired. */
  displayText?: string;
  confidence?: BlockConfidence;
}

export interface FigureBlock {
  type: 'figure';
  figureNumber?: string;
  caption?: string;
  labels?: string[];
  confidence?: BlockConfidence;
}

export interface NoteBlock {
  type: 'note' | 'quote';
  text: string;
  confidence?: BlockConfidence;
}

export type ContentBlock = HeadingBlock | ParagraphBlock | ListBlock | TableBlock | EquationBlock | FigureBlock | NoteBlock;

// ── Picture-based questions (image-aware generation) ──────────────────────────
// A page's figures/illustrations, detected only when a teacher opts in ("Include images") —
// keeps the default upload flow exactly as cheap/fast as before this existed. See
// question-extraction.service.ts's figure-detection prompt and lib/image-store.ts (GridFS).

/** Fractional (0-1) crop region within the full page image — resolution-independent, so the
 * frontend can crop via CSS at whatever size the page image was actually stored/rendered at. */
export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type FigureType = 'decorative' | 'content_supporting' | 'diagram' | 'chart_table' | 'map' | 'illustration';

export interface PageFigure {
  /** Stable id for this figure, unique within its owning source/page (e.g. "p2_fig1") — referenced by a question's imageRef so a generated question can point back to the exact textbook illustration it depends on. */
  figureId: string;
  pageNumber: number;
  boundingBox: BoundingBox;
  figureType: FigureType;
  caption?: string;
  /** Short factual description of what the image visually shows — how a picture-based question's answer gets grounded without re-looking at the image. */
  description: string;
  /** The model's own judgment of whether this figure is substantial/clear enough to build a question around (vs. a small decorative icon). */
  usableForQuestion: boolean;
}

export interface ChapterPage {
  pageNumber: number;
  blocks: ContentBlock[];
  confidence?: BlockConfidence;
  /** Set when this page's OCR failed and was skipped rather than blocking the whole batch — see "Continue Without This Page". */
  pageError?: string;
  /** GridFS file id for this page's full image — set only when the teacher opted into image detection for this capture. */
  pageImageFileId?: string;
  figures?: PageFigure[];
}

/** Async batch job covering every page of a chapter capture — see ExtractionJob on the server (kind: 'chapter_capture'). */
export interface ChapterCaptureJobResult {
  documentTitle?: string;
  language?: string;
  pages: ChapterPage[];
  totalPages: number;
  completedPages: number;
}

// ── Server-side usage accounting (never trusts client-reported counts) ───────

export type UsageEventFeature = 'chapter-capture';
export type UsageEventAction = 'capture_started' | 'page_processed' | 'chapter_saved' | 'question_generated' | 'paper_generated';
export type UsageEventStatus = 'success' | 'failed';

export interface UsageEvent {
  _id: string;
  userId: string;
  schoolId: string;
  feature: UsageEventFeature;
  action: UsageEventAction;
  documentId?: string;
  pagesProcessed?: number;
  wordsGenerated?: number;
  processingTimeMs?: number;
  status: UsageEventStatus;
  createdAt: string;
}

/** Ops Center — Chapter Capture usage overview + per-user breakdown. */
export interface ChapterCaptureUsageOverview {
  totalUsers: number;
  totalDocuments: number;
  totalPages: number;
  totalWords: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  avgProcessingTimeMs: number;
  avgWordsPerDocument: number;
}

export interface ChapterCaptureUserUsage {
  userId: string;
  userName?: string;
  documents: number;
  pages: number;
  wordsGenerated: number;
  processingRequests: number;
}

export interface ChapterCaptureUsageReport {
  overview: ChapterCaptureUsageOverview;
  byUser: ChapterCaptureUserUsage[];
}

// ── Paper generation ───────────────────────────────────────────────────────────

export interface PaperMarksBreakdownEntry {
  marks: number;
  count: number;
}

export interface PaperDifficultyMix {
  easy: number;
  medium: number;
  hard: number;
}

/** A named section (Section A/B/C…) — replaces the flat difficultyMix/marksBreakdown pair when
 * present: each section is its own self-contained ask (how many questions, of what type(s)/
 * difficulty, worth how many marks each), assembled and printed in the order given here. */
export interface PaperSectionConfig {
  name: string;
  questionTypes: QuestionType[];
  difficulty?: QuestionDifficulty;
  count: number;
  marksEach: number;
}

export interface PaperGenerationConfig {
  class: string;
  subject: string;
  examType: string;
  chapterIds: string[];
  totalMarks: number;
  /** @deprecated superseded by `sections` — kept only so already-generated papers still render/validate. New papers should set `sections` instead. */
  difficultyMix: PaperDifficultyMix;
  /** @deprecated superseded by `sections` — kept only so already-generated papers still render/validate. New papers should set `sections` instead. */
  marksBreakdown: PaperMarksBreakdownEntry[];
  /** Named sections (Section A/B/C…), each with its own type/difficulty/count/marks. When present, this drives assembly instead of `difficultyMix`/`marksBreakdown`. */
  sections?: PaperSectionConfig[];
  questionTypes: QuestionType[];
  durationMinutes?: number;
  /** Overrides the class-inferred wording level for questions synthesized to fill this paper ('auto' = infer from class). */
  languageComplexity?: LanguageComplexity;
  /** When true, the rendered paper includes a separate answer-key section. */
  includeAnswerKey?: boolean;
  /** When true, newly-synthesized questions may be picture-based (referencing a detected textbook figure). Existing bank questions with an imageRef are still shown regardless — this only gates new picture-based questions written to fill a gap. */
  includeImages?: boolean;
  /** Renders images with a grayscale filter, for print-friendly black & white copies. */
  blackAndWhite?: boolean;
}

export interface PaperValidationResult {
  warnings: string[];
  suggestions: string[];
  coveragePercent: number;
  totalEstimatedTimeMinutes: number;
}

export interface GeneratedPaperSection {
  marks: number;
  /** Section name (e.g. "Section A") when the paper was built from `PaperGenerationConfig.sections` — absent for older marks-value-grouped papers. */
  name?: string;
  questions: Question[];
}

/** A question's image, resolved to an actual displayable payload at generation time — the full
 * source page image plus the fractional crop for this specific figure. Embedded directly on the
 * paper (keyed by `${sourceId}:${figureId}`) instead of fetched at print/PDF time, so
 * window.print() never depends on a live authenticated image request. */
export interface ResolvedQuestionImage {
  /** Full page image as a data URI — the frontend crops to `boundingBox` via CSS rather than the server pre-cropping (no image-processing library involved, see lib/image-store.ts). */
  pageImageDataUri: string;
  boundingBox: BoundingBox;
}

export interface GeneratedPaper extends BaseEntity {
  config: PaperGenerationConfig;
  sections: GeneratedPaperSection[];
  totalMarksAssembled: number;
  validation: PaperValidationResult;
  createdBy: string;
  resolvedImages?: Record<string, ResolvedQuestionImage>;
}

// ── Teacher Planner ─────────────────────────────────────────────────────────

export type PlannerTaskType =
  | 'explain'
  | 'activity'
  | 'worksheet'
  | 'homework'
  | 'doubt_session'
  | 'revision'
  | 'unit_test'
  | 'other';

export type PlannerTaskStatus = 'pending' | 'completed';

export interface PlannerTask {
  taskId: string;
  title: string;
  type: PlannerTaskType;
  dueDate: string;
  status: PlannerTaskStatus;
  completedAt?: string;
}

export interface PlannerWeek {
  weekNumber: number;
  startDate: string;
  endDate: string;
  chapterId: string;
  chapterName: string;
  topic?: string;
  tasks: PlannerTask[];
}

export interface TeacherPlanner extends BaseEntity {
  teacherId: string;
  class: string;
  subject: string;
  academicYearStart: string;
  academicYearEnd: string;
  weeks: PlannerWeek[];
}

export interface PlannerTodayTask {
  weekNumber: number;
  task: PlannerTask;
}

export interface PlannerProgress {
  yearPercent: number;
  monthPercent: number;
  weekPercent: number;
  halfYearPercent: number;
  todayTasks: PlannerTodayTask[];
}

export interface PacePosition {
  expectedWeekNumber: number;
  actualWeekNumber: number;
  teachingDaysBehind: number;
  suggestions: string[];
}

// ── Planner generation (saved chapters + duration → draft → review → confirm) ─

export interface PlannerDraftTask {
  title: string;
  type: PlannerTaskType;
}

export interface PlannerDraftWeek {
  weekNumber: number;
  chapterName: string;
  topic?: string;
  tasks: PlannerDraftTask[];
}

export interface PlannerExtractionResult {
  sourceType: 'manual';
  totalTeachingWeeks: number;
  weeks: PlannerDraftWeek[];
  warnings: string[];
}

export interface ConfirmPlannerPayload {
  class: string;
  subject: string;
  weeks: PlannerDraftWeek[];
}

export interface SavedChapterOption {
  _id: string;
  chapterName: string;
  topics: string[];
}

export interface TeachingWeeksInfo {
  totalTeachingWeeks: number;
  academicYearStart: string;
  academicYearEnd: string;
}

export interface ChapterPlanInput {
  chapterId: string;
  weeks: number;
}

export interface GeneratePlannerPayload {
  class: string;
  subject: string;
  chapterPlans: ChapterPlanInput[];
  startFromWeek?: number;
}

// ── Principal Planner (read-only) ─────────────────────────────────────────────

export interface PrincipalPlannerOverviewEntry {
  teacherId: string;
  teacherName: string;
  class: string;
  subject: string;
  plannerId: string | null;
  hasPlanner: boolean;
  yearPercent: number;
  teachingDaysBehind: number;
}

export interface PrincipalPlannerDetail {
  planner: TeacherPlanner;
  progress: PlannerProgress;
  pace: PacePosition;
}

/** Principal/incharge inserting a task into a teacher's existing planner week. */
export interface AddPlannerTaskPayload {
  weekNumber: number;
  title: string;
  type: PlannerTaskType;
  dueDate: string;
}

// ── Worksheet Generator ────────────────────────────────────────────────────────

export type WorksheetType = 'practice' | 'homework' | 'revision' | 'hots' | 'olympiad' | 'remedial';

export interface WorksheetQuestion {
  questionId?: string;
  questionText: string;
  questionType: QuestionType;
  options?: string[];
  difficulty: QuestionDifficulty;
  estimatedTimeMinutes: number;
  keywords: string[];
  /** Draft-only client flag — set when this item was AI-authored rather than
   *  pulled from the bank; stripped (or resolved into a real Question) on save. */
  isNew?: boolean;
  imageRef?: QuestionImageRef;
  imageRequirement?: QuestionImageRequirement;
}

export interface Worksheet extends BaseEntity {
  teacherId: string;
  class: string;
  subject: string;
  chapterIds: string[];
  chapterNames: string[];
  worksheetType: WorksheetType;
  title: string;
  questions: WorksheetQuestion[];
  createdBy: string;
  /** Resolved image payload for questions with an imageRef, keyed by `${sourceId}:${figureId}` — same embedding rationale as GeneratedPaper.resolvedImages. */
  resolvedImages?: Record<string, ResolvedQuestionImage>;
}

export interface GenerateWorksheetPayload {
  class: string;
  subject: string;
  chapterIds: string[];
  worksheetType: WorksheetType;
  questionCount: number;
  /** Overrides the class-inferred wording level for this worksheet ('auto' = infer from class). */
  languageComplexity?: LanguageComplexity;
  /** When true, newly-authored questions may be picture-based (referencing a detected textbook figure). */
  includeImages?: boolean;
}

export interface WorksheetDraft {
  config: GenerateWorksheetPayload;
  questions: WorksheetQuestion[];
  resolvedImages?: Record<string, ResolvedQuestionImage>;
}

export interface SaveWorksheetPayload {
  class: string;
  subject: string;
  chapterIds: string[];
  worksheetType: WorksheetType;
  title: string;
  questions: WorksheetQuestion[];
  addNewToBank: boolean;
}

export interface WorksheetListOptions {
  page?: number;
  limit?: number;
  class?: string;
  subject?: string;
  chapterId?: string;
  worksheetType?: WorksheetType;
}

// ── Syllabus Tracker ────────────────────────────────────────────────────────────

export interface SyllabusCoverage {
  plannerId: string;
  class: string;
  subject: string;
  totalChapters: number;
  chaptersCompleted: number;
  percentComplete: number;
}

export interface SyllabusActivityDay {
  date: string;
  count: number;
}

// ── Mock Test Engine (Ops-authored MCQ tests, principal-approval-gated) ──────
// Authored entirely by the internal ops team in Ops Center from already-captured
// Question Bank chapter text — never by school teachers. v1 is MCQ-only,
// auto-graded. See apps/server/src/features/mock-tests/ for the server side.

export type MockTestStatus = 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'live' | 'closed';

export type MockTestMode = 'anonymous' | 'ranked';

export interface MockTestQuestion {
  _id: string;
  questionText: string;
  options: string[];
  /** Index into `options` — never sent to the parent/student client. */
  correctOptionIndex: number;
  marks: number;
}

/** Shape returned to a parent/student taking the test — correctOptionIndex stripped server-side. */
export type MockTestQuestionForTaking = Omit<MockTestQuestion, 'correctOptionIndex'>;

export interface MockTest extends BaseEntity {
  class: string;
  subject: string;
  chapterIds: string[];
  chapterNames: string[];
  title: string;
  questions: MockTestQuestion[];
  durationMinutes: number;
  scheduledStart: string;
  /** Explicit close time. Independent of the taking window (start + duration) — the link stays valid
   *  until this time even if a student starts late; a student who starts within the taking window
   *  still gets their full duration to finish, capped at scheduledEnd. */
  scheduledEnd: string;
  mode: MockTestMode;
  status: MockTestStatus;
  createdBy: string;
  submittedForApprovalAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  /** Anonymous-mode participation stats — no per-student record kept, just a running count/average. */
  anonymousSubmissionCount: number;
  anonymousAverageScorePercent?: number;
}

export interface GenerateMockTestPayload {
  /** Ops Center is cross-tenant (internal staff accounts have no real schoolId of their own —
   *  see INTERNAL_SCHOOL_ID) — the target school is picked explicitly, not inferred from the caller. */
  schoolId: string;
  class: string;
  subject: string;
  chapterIds: string[];
  questionCount: number;
  difficulty: QuestionDifficulty | 'mixed';
}

/** Draft MCQ set returned by AI generation, before it's saved as a MockTest — ops reviews/edits these first. */
export interface GeneratedMockTestQuestion {
  questionText: string;
  options: string[];
  correctOptionIndex: number;
  marks: number;
}

export interface GenerateMockTestResult {
  class: string;
  subject: string;
  chapterIds: string[];
  chapterNames: string[];
  questions: GeneratedMockTestQuestion[];
  warnings: string[];
}

export interface CreateMockTestPayload {
  schoolId: string;
  class: string;
  subject: string;
  chapterIds: string[];
  chapterNames: string[];
  title: string;
  questions: GeneratedMockTestQuestion[];
  durationMinutes: number;
  scheduledStart: string;
  scheduledEnd: string;
  mode: MockTestMode;
}

export type UpdateMockTestPayload = Partial<Omit<CreateMockTestPayload, 'chapterIds' | 'chapterNames' | 'schoolId'>>;

export interface RejectMockTestPayload {
  reason?: string;
}

export interface MockTestListOptions {
  schoolId?: string;
  status?: MockTestStatus;
  class?: string;
  subject?: string;
}

// ── Test attempts (ranked mode only — anonymous mode never persists a per-student record) ──

export interface TestAttemptAnswer {
  questionId: string;
  selectedOptionIndex: number;
}

export interface TestAttempt extends BaseEntity {
  testId: string;
  studentId: string;
  studentName: string;
  class: string;
  section: string;
  answers: TestAttemptAnswer[];
  score: number;
  totalMarks: number;
  correctCount: number;
  totalQuestions: number;
  submittedAt: string;
}

export interface SubmitMockTestPayload {
  childId: string;
  answers: TestAttemptAnswer[];
}

export interface SubmitMockTestResult {
  mode: MockTestMode;
  score: number;
  totalMarks: number;
  correctCount: number;
  totalQuestions: number;
  scorePercent: number;
  /** Only present for ranked mode, once the attempt is persisted. */
  rank?: number;
}

export interface MockTestLeaderboardEntry {
  studentId: string;
  studentName: string;
  score: number;
  totalMarks: number;
  rank: number;
  submittedAt: string;
}

/** Test list item as seen by a parent — no correct answers, no other students' data. */
export interface ParentMockTestSummary {
  _id: string;
  title: string;
  subject: string;
  class: string;
  durationMinutes: number;
  scheduledStart: string;
  scheduledEnd: string;
  mode: MockTestMode;
  status: MockTestStatus;
  questionCount: number;
  totalMarks: number;
  /** Whether this parent's linked child already has a ranked attempt on record. */
  alreadyAttempted?: boolean;
}
