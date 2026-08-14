import { IFeeRecord } from '../fees/fee.model';
import { IFeePayment } from '../fees/fee.payment.model';
import { studentRepository } from '../students/student.repository';
import { schoolSettingsService } from '../school-settings/school-settings.service';
import { generateReceiptPdf } from '../fees/fee-receipt-pdf.service';
import { sendOne, sendWhatsAppAttachmentTemplate } from './communication-core';
import { notificationLogRepository } from './notification-log.repository';
import { INotificationLog } from './notification-log.model';
import { AuthContext } from '../../lib/auth-context';
import { auditService } from '../audit/audit.service';
import { logger } from '../../lib/logger';
import { NotFoundError, ValidationError } from '../../middlewares/errorHandler';

const NOTIFICATION_TYPE = 'FEE_PAYMENT_RECEIPT' as const;

function paymentDateLabel(payment: IFeePayment): string {
  return new Date(payment.paymentDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

/**
 * Orchestrates automatic WhatsApp delivery of a fee payment receipt —
 * FeeCollectionService (fee.service.ts) fires sendReceipt() fire-and-forget
 * right after a payment commits; this never touches the fee transaction
 * itself, it only ever writes a NotificationLog describing what happened to
 * the notification (see NOTIFICATION_TYPE's sourceId-based idempotency).
 */
export const feeReceiptNotificationService = {
  /**
   * Idempotent: a second call for the same payment (refresh, duplicate
   * trigger, worker retry) finds the existing log via sourceId and returns
   * it without sending a second WhatsApp message.
   */
  async sendReceipt(record: IFeeRecord, payment: IFeePayment, ctx: AuthContext): Promise<INotificationLog> {
    const paymentId = payment._id.toString();

    const existing = await notificationLogRepository.findBySource(ctx.schoolId, NOTIFICATION_TYPE, paymentId);
    if (existing) return existing;

    const student = await studentRepository.findById(record.studentId, ctx.schoolId);
    const phone = student?.parentPhone || student?.alternatePhone;

    const baseRecipient = {
      studentId: record.studentId,
      recipientName: record.studentName,
      parentName: student?.fatherName || student?.motherName,
      phone,
    };

    if (!phone?.trim()) {
      const log = await notificationLogRepository.create({
        schoolId: ctx.schoolId,
        notificationType: NOTIFICATION_TYPE,
        channel: 'whatsapp',
        ...baseRecipient,
        status: 'SKIPPED',
        errorMessage: 'No WhatsApp number registered for this parent',
        payload: {},
        sourceId: paymentId,
        createdBy: ctx.displayName,
      });
      return log;
    }

    const templateData = {
      student_name: record.studentName,
      amount: payment.amount.toFixed(2),
      receipt_number: payment.receiptNumber || '—',
      payment_date: paymentDateLabel(payment),
    };

    let pdfBuffer: Buffer;
    try {
      const settings = await schoolSettingsService.getSettings(ctx.schoolId);
      if (!student) throw new Error('Student record not found while generating receipt');
      pdfBuffer = await generateReceiptPdf(record, payment, student, settings);
    } catch (err) {
      logger.error('[FeeReceiptNotification] Receipt PDF generation failed', { paymentId, err });
      const log = await notificationLogRepository.create({
        schoolId: ctx.schoolId,
        notificationType: NOTIFICATION_TYPE,
        channel: 'whatsapp',
        ...baseRecipient,
        status: 'FAILED',
        errorMessage: 'Receipt PDF generation failed — the fee payment itself was not affected',
        payload: {},
        sourceId: paymentId,
        createdBy: ctx.displayName,
      });
      return log;
    }

    const log = await sendOne({
      schoolId: ctx.schoolId,
      notificationType: NOTIFICATION_TYPE,
      channel: 'whatsapp',
      recipient: { ...baseRecipient, templateData },
      createdBy: ctx.displayName,
      sourceId: paymentId,
      attachment: { buffer: pdfBuffer, mimeType: 'application/pdf', filename: `Receipt-${payment.receiptNumber || paymentId}.pdf` },
    });

    auditService.log({
      userId: ctx.userId,
      userDisplayName: ctx.displayName,
      action: 'notification.fee_receipt_sent',
      resource: 'notification_log',
      resourceId: log._id.toString(),
      details: { paymentId, feeRecordId: record._id.toString(), status: log.status, phone },
      ip: ctx.ip,
      schoolId: ctx.schoolId,
    });

    return log;
  },

  /** Poll target for the accountant UI right after collecting a payment. */
  async getStatus(paymentId: string, ctx: AuthContext): Promise<INotificationLog | null> {
    return notificationLogRepository.findBySource(ctx.schoolId, NOTIFICATION_TYPE, paymentId);
  },

  /**
   * Re-attempts a FAILED delivery. Regenerates the PDF and re-uploads to Meta
   * rather than replaying anything stored (Meta media ids aren't durable),
   * then updates the *same* NotificationLog row in place — the sourceId
   * unique index means there is never a second row for one payment, success
   * or failure. Bounded by communicationSettings.retryCount so this can't be
   * hammered indefinitely.
   */
  async retrySend(record: IFeeRecord, payment: IFeePayment, ctx: AuthContext): Promise<INotificationLog> {
    const paymentId = payment._id.toString();
    const log = await notificationLogRepository.findBySource(ctx.schoolId, NOTIFICATION_TYPE, paymentId);
    if (!log) throw new NotFoundError('WhatsApp receipt notification');
    if (log.status !== 'FAILED') throw new ValidationError('Only a failed WhatsApp delivery can be retried');

    const settings = await schoolSettingsService.getSettings(ctx.schoolId);
    if (log.retryCount >= settings.communicationSettings.retryCount) {
      throw new ValidationError(`Retry limit reached (${settings.communicationSettings.retryCount}) — check the WhatsApp number or provider configuration`);
    }
    if (!log.phoneNumber) {
      throw new ValidationError('No WhatsApp number registered for this parent — add one on the student record, then retry');
    }

    const student = await studentRepository.findById(record.studentId, ctx.schoolId);
    if (!student) throw new NotFoundError('Student');

    let pdfBuffer: Buffer;
    try {
      pdfBuffer = await generateReceiptPdf(record, payment, student, settings);
    } catch (err) {
      logger.error('[FeeReceiptNotification] Retry: PDF generation failed', { paymentId, err });
      const updated = await notificationLogRepository.recordRetryAttempt(log._id.toString(), {
        success: false,
        errorMessage: 'Receipt PDF generation failed',
      });
      return updated ?? log;
    }

    const templateData = {
      student_name: record.studentName,
      amount: payment.amount.toFixed(2),
      receipt_number: payment.receiptNumber || '—',
      payment_date: paymentDateLabel(payment),
    };

    const attempt = await sendWhatsAppAttachmentTemplate(
      ctx.schoolId,
      NOTIFICATION_TYPE,
      log.phoneNumber,
      templateData,
      { buffer: pdfBuffer, mimeType: 'application/pdf', filename: `Receipt-${payment.receiptNumber || paymentId}.pdf` },
    );

    const updated = await notificationLogRepository.recordRetryAttempt(log._id.toString(), {
      success: attempt.success,
      providerMessageId: attempt.providerMessageId,
      errorMessage: attempt.errorMessage,
      payload: { templateName: attempt.templateName, mediaId: attempt.mediaId, providerMessageId: attempt.providerMessageId },
    });

    auditService.log({
      userId: ctx.userId,
      userDisplayName: ctx.displayName,
      action: 'notification.fee_receipt_retried',
      resource: 'notification_log',
      resourceId: log._id.toString(),
      details: { paymentId, success: attempt.success, errorMessage: attempt.errorMessage },
      ip: ctx.ip,
      schoolId: ctx.schoolId,
    });

    return updated ?? log;
  },
};
