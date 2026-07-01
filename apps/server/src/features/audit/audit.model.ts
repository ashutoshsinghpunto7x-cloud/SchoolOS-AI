import mongoose, { Document, Schema } from 'mongoose';

export type AuditAction =
  | 'auth.login'
  | 'auth.logout'
  | 'user.created'
  | 'user.updated'
  | 'user.status_changed'
  | 'user.deleted'
  | 'comm.created'
  | 'comm.updated'
  | 'comm.completed'
  | 'comm.failed'
  | 'comm.cancelled'
  | 'automation.job_created'
  | 'automation.job_started'
  | 'automation.job_completed'
  | 'automation.job_failed'
  | 'automation.job_cancelled'
  | 'automation.job_retried'
  | 'automation.webhook_received'
  | 'ai.call_initiated'
  | 'ai.call_completed'
  | 'ai.call_failed'
  | 'ai.webhook_received'
  | 'ai.transcript_processed'
  | 'ai.usage_logged'
  | 'student.created'
  | 'student.updated'
  | 'student.status_changed'
  | 'student.deleted'
  | 'student.note_added'
  | 'student.note_updated'
  | 'student.note_deleted'
  | 'student.tags_updated'
  | 'teacher.created'
  | 'teacher.updated'
  | 'teacher.status_changed'
  | 'teacher.deleted'
  | 'teacher.note_added'
  | 'teacher.note_updated'
  | 'teacher.note_deleted'
  | 'teacher.linked_user'
  | 'attendance.marked'
  | 'attendance.bulk_marked'
  | 'attendance.updated'
  | 'attendance.deleted'
  | 'fee.created'
  | 'fee.updated'
  | 'fee.deleted'
  | 'fee.payment_recorded'
  | 'fee.receipt_emailed'
  | 'fee.defaulters_emailed'
  | 'salary.created'
  | 'salary.updated'
  | 'salary.paid'
  | 'salary.deleted'
  | 'expense.created'
  | 'expense.updated'
  | 'expense.approved'
  | 'expense.deleted'
  | 'event.created'
  | 'event.updated'
  | 'event.status_changed'
  | 'event.deleted'
  | 'enquiry.created'
  | 'enquiry.updated'
  | 'enquiry.stage_changed'
  | 'enquiry.converted'
  | 'enquiry.deleted'
  | 'timetable.created'
  | 'timetable.updated'
  | 'timetable.published'
  | 'timetable.archived'
  | 'timetable.deleted'
  | 'timetable.entry_updated'
  | 'timetable.entries_bulk_updated'
  | 'timetable.substitute_assigned'
  | 'timetable.period_created'
  | 'timetable.period_updated'
  | 'timetable.period_deleted'
  | 'principal.dashboard.viewed'
  | 'report.generated'
  | 'report.saved'
  | 'report.exported'
  | 'report.deleted'
  | 'workflow.created'
  | 'workflow.updated'
  | 'workflow.enabled'
  | 'workflow.disabled'
  | 'workflow.triggered'
  | 'workflow.retried'
  | 'import.uploaded'
  | 'import.validated'
  | 'import.confirmed'
  | 'import.completed'
  | 'import.failed'
  | 'import.cancelled'
  | 'import.rolled_back'
  | 'integration.created'
  | 'integration.updated'
  | 'integration.deleted'
  | 'integration.enabled'
  | 'integration.disabled'
  | 'integration.sync_started'
  | 'integration.sync_completed'
  | 'integration.sync_failed'
  | 'integration.test_connection'
  | 'integration.credentials_updated'
  | 'integration.webhook_received'
  | 'apikey.created'
  | 'apikey.rotated'
  | 'apikey.revoked'
  | 'webhook.created'
  | 'webhook.updated'
  | 'webhook.deleted'
  | 'webhook.delivered'
  | 'webhook.failed';

export interface IAuditLog extends Document {
  userId: string;
  userDisplayName: string;
  action: AuditAction;
  resource: string;
  resourceId: string;
  details?: Record<string, unknown>;
  ip?: string;
  schoolId: string;
  createdAt: Date;
  updatedAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    userId: { type: String, required: true },
    userDisplayName: { type: String, required: true },
    action: { type: String, required: true },
    resource: { type: String, required: true },
    resourceId: { type: String, required: true },
    details: { type: Schema.Types.Mixed },
    ip: { type: String },
    schoolId: { type: String, required: true },
  },
  { timestamps: true, versionKey: false }
);

auditLogSchema.index({ schoolId: 1, createdAt: -1 });
auditLogSchema.index({ schoolId: 1, action: 1, createdAt: -1 });
auditLogSchema.index({ schoolId: 1, userId: 1, createdAt: -1 });
auditLogSchema.index({ resourceId: 1, createdAt: -1 });

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', auditLogSchema);
