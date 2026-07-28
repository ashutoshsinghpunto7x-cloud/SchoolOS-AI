import { attendanceRepository } from '../attendance/attendance.repository';
import { Student, IStudent } from '../students/student.model';
import { communicationEngineService } from './communication-engine.service';
import { sendAttendanceNotificationsSchema } from './communication-engine.validation';
import { SendRecipientInput } from './communication-core';
import { AuthContext } from '../../lib/auth-context';
import { auditService } from '../audit/audit.service';

export interface BulkSendSummary {
  jobId: string | null;
  totalStudents: number;
  sent: number;
  failed: number;
  skipped: number;
  /** PROCESSING means counts above are still filling in — poll GET /communication/jobs/:jobId. */
  status: 'PROCESSING' | 'COMPLETED';
}

async function buildAbsenteeRecipients(schoolId: string, date: string, cls?: string, section?: string): Promise<SendRecipientInput[]> {
  const absentees = await attendanceRepository.findAbsentees(schoolId, date, cls, section);
  if (absentees.length === 0) return [];

  const studentIds = absentees.map((a) => a.studentId);
  const students = await Student.find({ _id: { $in: studentIds }, schoolId }).lean<IStudent[]>();
  const studentById = new Map(students.map((s) => [String(s._id), s]));

  const recipients: SendRecipientInput[] = [];
  for (const record of absentees) {
    const student = studentById.get(record.studentId);
    if (!student) continue; // data integrity edge case — attendance row without a matching student

    recipients.push({
      studentId: record.studentId,
      recipientName: student.fullName,
      parentName: student.fatherName || student.motherName,
      phone: student.parentPhone || student.alternatePhone,
      templateData: {
        student_name: student.fullName,
        class: record.class,
        section: record.section,
        date: record.date,
      },
    });
  }
  return recipients;
}

export const attendanceNotificationService = {
  /**
   * Manual/auto entrypoint for "Send Absent Notifications" — finds every
   * student marked absent for the given date/class/section, then hands the
   * recipient list to CommunicationService.sendBulk(). Called directly from
   * POST /communication/attendance/send, and optionally auto-fired from
   * attendance.service.ts#bulkMark when communicationSettings.attendanceAutoNotify is on.
   */
  async sendAbsentNotifications(rawInput: unknown, ctx: AuthContext): Promise<BulkSendSummary> {
    const input = sendAttendanceNotificationsSchema.parse(rawInput);
    const date = input.date ?? attendanceRepository.todayString();

    const recipients = await buildAbsenteeRecipients(ctx.schoolId, date, input.class, input.section);

    if (recipients.length === 0) {
      return { jobId: null, totalStudents: 0, sent: 0, failed: 0, skipped: 0, status: 'COMPLETED' };
    }

    const { jobId, totalRecipients } = await communicationEngineService.sendBulk({
      schoolId: ctx.schoolId,
      notificationType: 'ATTENDANCE_ABSENT',
      recipients,
      createdBy: ctx.displayName,
      createdByUserId: ctx.userId,
      ip: ctx.ip,
    });

    auditService.log({
      userId: ctx.userId,
      userDisplayName: ctx.displayName,
      action: 'notification.bulk_sent',
      resource: 'notification_log',
      resourceId: jobId,
      details: { notificationType: 'ATTENDANCE_ABSENT', date, class: input.class, section: input.section, totalStudents: totalRecipients },
      ip: ctx.ip,
      schoolId: ctx.schoolId,
    });

    return { jobId, totalStudents: totalRecipients, sent: 0, failed: 0, skipped: 0, status: 'PROCESSING' };
  },
};
