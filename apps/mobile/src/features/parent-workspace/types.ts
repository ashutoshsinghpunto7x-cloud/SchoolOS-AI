// Parent Workspace — mobile types.
//
// Mirrors apps/web/src/features/parent-workspace/types.ts field-for-field so
// the two clients stay interchangeable against the same `/parent-workspace/*`
// endpoints. Report Card / Tests / Transport are out of scope for the mobile
// MVP (home, academics, attendance, fees) — see project_parent_dashboard_screens memory.

export interface ParentProfile {
  _id: string;
  name: string;
}

export interface ChildSummary {
  _id: string;
  name: string;
  grade: string;
  section: string;
  photoUrl?: string;
  status: 'present' | 'absent' | 'late' | 'holiday';
  checkedInAt?: string;
  attendancePercent: number;
  academicAverage: number;
  feeStatus: 'paid' | 'due' | 'overdue';
  feeDueAmount?: number;
  nextEvent?: {
    date: string;
    label: string;
  };
}

export interface ScheduleEntry {
  _id: string;
  time: string;
  subject: string;
  detail: string;
  teacher?: string;
  isCurrent?: boolean;
  isDone?: boolean;
}

export interface SubjectSnapshot {
  _id: string;
  subject: string;
  note: string;
  percent: number;
  trend: 'up' | 'steady' | 'down';
}

export interface AttentionItem {
  _id: string;
  title: string;
  detail: string;
  actionLabel: string;
  actionHref?: string;
  kind: 'fee' | 'event' | 'academic' | 'document';
}

export interface SchoolUpdate {
  _id: string;
  title: string;
  when: string;
  location?: string;
}

export interface AIInsight {
  headline: string;
  recommendation: string;
}

export interface NotificationItem {
  _id: string;
  category: 'important' | 'school' | 'academic' | 'fees' | 'events';
  title: string;
  detail: string;
  when: string;
  read: boolean;
}

export interface ParentWorkspaceBundle {
  parent: ParentProfile;
  children: ChildSummary[];
  schedule: ScheduleEntry[];
  subjects: SubjectSnapshot[];
  attention: AttentionItem[];
  updates: SchoolUpdate[];
  insight: AIInsight;
  notifications: NotificationItem[];
}

// ── Academics ────────────────────────────────────────────────────────────────

export interface ExamSubjectResult {
  subject: string;
  total?: number;
  percentage?: number;
  grade?: string;
  result: 'pass' | 'fail' | 'na';
  remark?: string;
}

export interface ExamResult {
  examId: string;
  examName: string;
  examType: string;
  termLabel?: string;
  subjects: ExamSubjectResult[];
  overallPercentage?: number;
}

export interface AcademicsBundle {
  child: { _id: string; name: string; grade: string; section: string };
  exams: ExamResult[];
  subjectTrend: SubjectSnapshot[];
}

// ── Attendance ───────────────────────────────────────────────────────────────

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'half_day' | 'leave_approved';

export interface AttendanceRecordView {
  date: string;
  status: AttendanceStatus;
  note?: string;
}

export interface AttendanceSummaryView {
  total: number;
  present: number;
  absent: number;
  late: number;
  attendanceRate: number;
}

export interface AttendanceBundle {
  child: { _id: string; name: string; grade: string; section: string };
  month: string;
  records: AttendanceRecordView[];
  monthSummary: AttendanceSummaryView;
  yearSummary: AttendanceSummaryView;
}

// ── Fees ─────────────────────────────────────────────────────────────────────

export type FeeHead = 'tuition' | 'admission' | 'examination' | 'transport' | 'hostel' | 'miscellaneous';
export type FeeStatus = 'pending' | 'partially_paid' | 'paid' | 'overdue' | 'waived';

export interface FeeRecordView {
  _id: string;
  feeHead: FeeHead;
  customHead?: string;
  description?: string;
  academicYear: string;
  month?: string;
  totalAmount: number;
  discountAmount: number;
  waivedAmount: number;
  fineAmount: number;
  paidAmount: number;
  balance: number;
  status: FeeStatus;
  dueDate: string;
}

export interface FeesBundle {
  child: { _id: string; name: string; grade: string; section: string };
  totalCharged: number;
  totalPaid: number;
  totalOutstanding: number;
  records: FeeRecordView[];
}
