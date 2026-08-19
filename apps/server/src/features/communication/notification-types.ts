// ── Channels ──────────────────────────────────────────────────────────────────
// Only 'whatsapp' actually sends today. The others are registered so business
// code, settings and logs never need to change shape when a real provider is
// plugged in later — see providers/provider-registry.ts.

export type NotificationChannel = 'whatsapp' | 'email' | 'sms' | 'push' | 'voice';

export const NOTIFICATION_CHANNELS: NotificationChannel[] = ['whatsapp', 'email', 'sms', 'push', 'voice'];

// ── Notification types ───────────────────────────────────────────────────────
// Adding a new type only requires: one entry here (with its placeholders) and
// one default template in templates/default-templates.ts. No provider,
// controller, or queue code needs to change.

export type NotificationType =
  | 'ATTENDANCE_ABSENT'
  | 'FEE_REMINDER'
  | 'FEE_DEFAULTER'
  | 'FEE_PAYMENT_RECEIPT'
  | 'BIRTHDAY'
  | 'PTM_REMINDER'
  | 'HOMEWORK'
  | 'EXAM_REMINDER'
  | 'HOLIDAY_ANNOUNCEMENT'
  | 'ADMISSION_FOLLOWUP'
  | 'EMERGENCY_ALERT'
  | 'GENERAL_BROADCAST'
  // Mock Test Engine — not yet sent for real, see providers/meta-template-map.ts
  // and mock-test-whatsapp.stub.ts (log-only stub pending Meta template approval).
  | 'MOCK_TEST_LINK';

interface NotificationTypeMeta {
  label: string;
  /** Placeholder keys this type's template is expected to use. Informational —
   *  the template engine renders whatever placeholders are present in the body
   *  and leaves unknown ones blank, so adding a field here is never a breaking change. */
  placeholders: string[];
  /** Default channel a notification of this type is sent on when the caller doesn't specify one. */
  defaultChannel: NotificationChannel;
}

export const NOTIFICATION_TYPES: Record<NotificationType, NotificationTypeMeta> = {
  ATTENDANCE_ABSENT: {
    label: 'Attendance — Absent',
    placeholders: ['student_name', 'class', 'section', 'date', 'school_name'],
    defaultChannel: 'whatsapp',
  },
  FEE_REMINDER: {
    label: 'Fee Reminder',
    placeholders: ['student_name', 'class', 'section', 'amount', 'due_date', 'school_name'],
    defaultChannel: 'whatsapp',
  },
  FEE_DEFAULTER: {
    label: 'Fee Defaulter',
    placeholders: ['student_name', 'class', 'section', 'amount', 'due_date', 'school_name'],
    defaultChannel: 'whatsapp',
  },
  FEE_PAYMENT_RECEIPT: {
    label: 'Fee Payment Receipt',
    placeholders: ['student_name', 'amount', 'receipt_number', 'payment_date', 'school_name'],
    defaultChannel: 'whatsapp',
  },
  BIRTHDAY: {
    label: 'Birthday Wishes',
    placeholders: ['student_name', 'class', 'section', 'school_name'],
    defaultChannel: 'whatsapp',
  },
  PTM_REMINDER: {
    label: 'PTM Reminder',
    placeholders: ['student_name', 'class', 'section', 'date', 'school_name'],
    defaultChannel: 'whatsapp',
  },
  HOMEWORK: {
    label: 'Homework',
    placeholders: ['student_name', 'class', 'section', 'date', 'school_name'],
    defaultChannel: 'whatsapp',
  },
  EXAM_REMINDER: {
    label: 'Exam Reminder',
    placeholders: ['student_name', 'class', 'section', 'date', 'school_name'],
    defaultChannel: 'whatsapp',
  },
  HOLIDAY_ANNOUNCEMENT: {
    label: 'Holiday Announcement',
    placeholders: ['date', 'school_name'],
    defaultChannel: 'whatsapp',
  },
  ADMISSION_FOLLOWUP: {
    label: 'Admission Follow-up',
    placeholders: ['student_name', 'school_name'],
    defaultChannel: 'whatsapp',
  },
  EMERGENCY_ALERT: {
    label: 'Emergency Alert',
    placeholders: ['school_name'],
    defaultChannel: 'whatsapp',
  },
  GENERAL_BROADCAST: {
    label: 'General Broadcast',
    placeholders: ['school_name'],
    defaultChannel: 'whatsapp',
  },
  // Not sent through this general engine today — see mock-test-whatsapp.stub.ts.
  MOCK_TEST_LINK: {
    label: 'Mock Test Link',
    placeholders: ['student_name', 'test_title', 'test_link'],
    defaultChannel: 'whatsapp',
  },
};

export const NOTIFICATION_TYPE_KEYS = Object.keys(NOTIFICATION_TYPES) as NotificationType[];
