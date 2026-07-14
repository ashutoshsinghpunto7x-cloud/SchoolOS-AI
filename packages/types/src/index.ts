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

export type UserRole = 'admin' | 'principal' | 'reception' | 'teacher' | 'accountant';
export type UserStatus = 'active' | 'inactive' | 'suspended';

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
  username?: string;
}

export interface CreateTeacherLoginPayload {
  username: string;
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
  refreshToken: string;
  user: AuthUser;
  mustResetPassword?: boolean;
  mustResetPin?: boolean;
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
  class: string;
  section: string;
  gender: Gender;
  dateOfBirth: string;
  fatherName: string;
  motherName: string;
  parentPhone: string;
  alternatePhone?: string;
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
  | 'cheque'
  | 'bank_transfer'
  | 'online'
  | 'demand_draft';

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
}

export interface UpdateSalaryRecordPayload {
  employeeName?: string;
  designation?: string;
  month?: string;
  year?: number;
  amount?: number;
  dueDate?: string;
  notes?: string;
}

export interface MarkSalaryPaidPayload {
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
  notes?: string;
}

export interface UpdateExpenseRecordPayload {
  title?: string;
  category?: ExpenseCategory;
  amount?: number;
  date?: string;
  status?: ExpenseStatus;
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

// ── Student Fee Ledger ────────────────────────────────────────────────────────

export interface StudentLedgerSummary {
  totalFees: number;
  totalPaid: number;
  totalDiscount: number;
  totalFine: number;
  totalWaived: number;
  remainingBalance: number;
  netAmount: number;
  lastPaymentDate?: string;
}

export interface StudentLedgerData {
  student: Student;
  feeRecords: FeeRecord[];
  payments: FeePayment[];
  summary: StudentLedgerSummary;
}

// ── Notifications ─────────────────────────────────────────────────────────────

export type NotificationType = 'defaulters_list' | 'message' | 'change_request' | 'leave_request' | 'substitution';
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

export interface SchoolSettings extends BaseEntity {
  schoolId: string;
  schoolName: string;
  logoUrl?: string;
  updatedBy?: string;
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
