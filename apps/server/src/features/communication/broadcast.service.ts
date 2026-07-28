import { Student, IStudent } from '../students/student.model';
import { Teacher, ITeacher } from '../teachers/teacher.model';
import { communicationEngineService } from './communication-engine.service';
import {
  broadcastSchoolSchema,
  broadcastClassSchema,
  broadcastSectionSchema,
  broadcastStudentsSchema,
  broadcastParentsSchema,
  broadcastTeachersSchema,
} from './communication-engine.validation';
import { SendRecipientInput } from './communication-core';
import { AuthContext } from '../../lib/auth-context';
import { auditService } from '../audit/audit.service';
import { BulkSendSummary } from './attendance-notification.service';
import { NotificationChannel, NotificationType } from './notification-types';

function studentsToRecipients(students: IStudent[]): SendRecipientInput[] {
  return students
    .filter((s) => s.parentPhone || s.alternatePhone)
    .map((s) => ({
      studentId: String(s._id),
      recipientName: s.fullName,
      parentName: s.fatherName || s.motherName,
      phone: s.parentPhone || s.alternatePhone,
      templateData: { student_name: s.fullName, class: s.class, section: s.section },
    }));
}

function teachersToRecipients(teachers: ITeacher[]): SendRecipientInput[] {
  return teachers
    .filter((t) => t.phone)
    .map((t) => ({
      recipientName: t.fullName,
      phone: t.phone,
      templateData: {},
    }));
}

async function dispatch(
  ctx: AuthContext,
  recipients: SendRecipientInput[],
  notificationType: NotificationType,
  channel: NotificationChannel | undefined,
  message: string | undefined,
  auditDetails: Record<string, unknown>,
): Promise<BulkSendSummary> {
  if (recipients.length === 0) {
    return { jobId: null, totalStudents: 0, sent: 0, failed: 0, skipped: 0, status: 'COMPLETED' };
  }

  const { jobId, totalRecipients } = await communicationEngineService.sendBulk({
    schoolId: ctx.schoolId,
    notificationType,
    channel,
    recipients,
    createdBy: ctx.displayName,
    createdByUserId: ctx.userId,
    ip: ctx.ip,
    overrideBody: message,
  });

  auditService.log({
    userId: ctx.userId,
    userDisplayName: ctx.displayName,
    action: 'notification.bulk_sent',
    resource: 'notification_log',
    resourceId: jobId,
    details: { notificationType, ...auditDetails, totalRecipients },
    ip: ctx.ip,
    schoolId: ctx.schoolId,
  });

  return { jobId, totalStudents: totalRecipients, sent: 0, failed: 0, skipped: 0, status: 'PROCESSING' };
}

const ACTIVE_STATUSES = ['active', 'enrolled'];

export const broadcastService = {
  async toSchool(rawInput: unknown, ctx: AuthContext): Promise<BulkSendSummary> {
    const input = broadcastSchoolSchema.parse(rawInput);
    const students = await Student.find({ schoolId: ctx.schoolId, isDeleted: false, admissionStatus: { $in: ACTIVE_STATUSES } }).lean<IStudent[]>();
    return dispatch(ctx, studentsToRecipients(students), input.notificationType, input.channel, input.message, { scope: 'school' });
  },

  async toClass(rawInput: unknown, ctx: AuthContext): Promise<BulkSendSummary> {
    const input = broadcastClassSchema.parse(rawInput);
    const students = await Student.find({
      schoolId: ctx.schoolId, isDeleted: false, admissionStatus: { $in: ACTIVE_STATUSES }, class: input.class,
    }).lean<IStudent[]>();
    return dispatch(ctx, studentsToRecipients(students), input.notificationType, input.channel, input.message, { scope: 'class', class: input.class });
  },

  async toSection(rawInput: unknown, ctx: AuthContext): Promise<BulkSendSummary> {
    const input = broadcastSectionSchema.parse(rawInput);
    const students = await Student.find({
      schoolId: ctx.schoolId, isDeleted: false, admissionStatus: { $in: ACTIVE_STATUSES }, class: input.class, section: input.section,
    }).lean<IStudent[]>();
    return dispatch(ctx, studentsToRecipients(students), input.notificationType, input.channel, input.message, { scope: 'section', class: input.class, section: input.section });
  },

  async toStudents(rawInput: unknown, ctx: AuthContext): Promise<BulkSendSummary> {
    const input = broadcastStudentsSchema.parse(rawInput);
    const students = await Student.find({ _id: { $in: input.studentIds }, schoolId: ctx.schoolId, isDeleted: false }).lean<IStudent[]>();
    return dispatch(ctx, studentsToRecipients(students), input.notificationType, input.channel, input.message, { scope: 'students', studentIds: input.studentIds });
  },

  /** Same recipient resolution as toStudents — the only parent contact channel
   *  in this schema is the student record's parentPhone (no separate Parent/Guardian
   *  entity), so "selected parents" and "selected students" address the same phone numbers. */
  async toParents(rawInput: unknown, ctx: AuthContext): Promise<BulkSendSummary> {
    const input = broadcastParentsSchema.parse(rawInput);
    const students = await Student.find({ _id: { $in: input.studentIds }, schoolId: ctx.schoolId, isDeleted: false }).lean<IStudent[]>();
    return dispatch(ctx, studentsToRecipients(students), input.notificationType, input.channel, input.message, { scope: 'parents', studentIds: input.studentIds });
  },

  async toTeachers(rawInput: unknown, ctx: AuthContext): Promise<BulkSendSummary> {
    const input = broadcastTeachersSchema.parse(rawInput);
    const teachers = await Teacher.find({ _id: { $in: input.teacherIds }, schoolId: ctx.schoolId, isDeleted: false }).lean<ITeacher[]>();
    return dispatch(ctx, teachersToRecipients(teachers), input.notificationType, input.channel, input.message, { scope: 'teachers', teacherIds: input.teacherIds });
  },
};
