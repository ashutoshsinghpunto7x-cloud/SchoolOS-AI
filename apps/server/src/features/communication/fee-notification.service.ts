import { FeeRecord } from '../fees/fee.model';
import { Student, IStudent } from '../students/student.model';
import { communicationEngineService } from './communication-engine.service';
import { sendFeeReminderSchema } from './communication-engine.validation';
import { SendRecipientInput } from './communication-core';
import { AuthContext } from '../../lib/auth-context';
import { auditService } from '../audit/audit.service';
import { BulkSendSummary } from './attendance-notification.service';

interface DefaulterAggregate {
  _id: string; // studentId
  studentName: string;
  class: string;
  section: string;
  totalBalance: number;
  earliestDueDate: Date;
}

async function findFeeDefaulters(
  schoolId: string,
  opts: { month?: string; class?: string; section?: string; studentIds?: string[] },
): Promise<DefaulterAggregate[]> {
  const match: Record<string, unknown> = {
    schoolId,
    isDeleted: false,
    balance: { $gt: 0 },
    status: { $in: ['pending', 'overdue', 'partially_paid'] },
  };
  if (opts.month) match.month = opts.month;
  if (opts.class) match.class = opts.class;
  if (opts.section) match.section = opts.section;
  if (opts.studentIds?.length) match.studentId = { $in: opts.studentIds };

  return FeeRecord.aggregate<DefaulterAggregate>([
    { $match: match },
    { $sort: { dueDate: 1 } },
    {
      $group: {
        _id: '$studentId',
        studentName: { $first: '$studentName' },
        class: { $first: '$class' },
        section: { $first: '$section' },
        totalBalance: { $sum: '$balance' },
        earliestDueDate: { $first: '$dueDate' },
      },
    },
  ]);
}

export const feeNotificationService = {
  /**
   * Manual entrypoint for POST /communication/fees/send — aggregates every
   * unpaid FeeRecord per student into one reminder (multiple fee heads for
   * the same student become a single "outstanding amount", not one message
   * per fee head), then hands the recipient list to CommunicationService.sendBulk().
   */
  async sendFeeReminders(rawInput: unknown, ctx: AuthContext): Promise<BulkSendSummary> {
    const input = sendFeeReminderSchema.parse(rawInput);

    const defaulters = await findFeeDefaulters(ctx.schoolId, input);
    if (defaulters.length === 0) {
      return { jobId: null, totalStudents: 0, sent: 0, failed: 0, skipped: 0, status: 'COMPLETED' };
    }

    const students = await Student.find({ _id: { $in: defaulters.map((d) => d._id) }, schoolId: ctx.schoolId }).lean<IStudent[]>();
    const studentById = new Map(students.map((s) => [String(s._id), s]));

    const recipients: SendRecipientInput[] = [];
    for (const defaulter of defaulters) {
      const student = studentById.get(defaulter._id);
      if (!student) continue; // data integrity edge case — fee record without a matching student

      recipients.push({
        studentId: defaulter._id,
        recipientName: defaulter.studentName,
        parentName: student.fatherName || student.motherName,
        phone: student.parentPhone || student.alternatePhone,
        templateData: {
          student_name: defaulter.studentName,
          class: defaulter.class,
          section: defaulter.section,
          amount: defaulter.totalBalance.toFixed(2),
          due_date: new Date(defaulter.earliestDueDate).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }),
        },
      });
    }

    const { jobId, totalRecipients } = await communicationEngineService.sendBulk({
      schoolId: ctx.schoolId,
      notificationType: 'FEE_REMINDER',
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
      details: { notificationType: 'FEE_REMINDER', ...input, totalStudents: totalRecipients },
      ip: ctx.ip,
      schoolId: ctx.schoolId,
    });

    return { jobId, totalStudents: totalRecipients, sent: 0, failed: 0, skipped: 0, status: 'PROCESSING' };
  },
};
