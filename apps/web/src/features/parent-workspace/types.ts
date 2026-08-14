// Parent Workspace — shared types.
//
// This feature is UI-first and currently backed by a mock data service
// (see api/parent-workspace.mock.ts). Shapes here are intentionally close
// to what a real `/parent-workspace/*` API would return so the hook layer
// can be repointed at real endpoints later without touching components.

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
  checkedInAt?: string; // e.g. "8:04 AM"
  attendancePercent: number; // this term
  academicAverage: number; // out of 10
  feeStatus: 'paid' | 'due' | 'overdue';
  feeDueAmount?: number;
  nextEvent?: {
    date: string; // "18 Aug"
    label: string; // "Parent-teacher meeting"
  };
}

export interface ScheduleEntry {
  _id: string;
  time: string; // "09:00"
  subject: string;
  detail: string; // "Algebra · Room 204"
  teacher?: string;
  isCurrent?: boolean;
  isDone?: boolean;
}

export interface SubjectSnapshot {
  _id: string;
  subject: string;
  note: string; // "Strong progress this month"
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

export interface AIChatMessage {
  _id: string;
  role: 'user' | 'assistant';
  text: string;
}
