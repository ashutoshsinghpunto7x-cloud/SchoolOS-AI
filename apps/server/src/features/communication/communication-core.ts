import { schoolSettingsService } from '../school-settings/school-settings.service';
import { notificationLogRepository } from './notification-log.repository';
import { messageTemplateRepository } from './message-template.repository';
import { getProvider } from './providers/provider-registry';
import { META_TEMPLATE_MAP } from './providers/meta-template-map';
import { renderTemplate } from './templates/template-engine';
import { INotificationLog } from './notification-log.model';
import { NotificationChannel, NotificationType, NOTIFICATION_TYPES } from './notification-types';
import { logger } from '../../lib/logger';

export interface SendRecipientInput {
  studentId?: string;
  recipientName?: string;
  parentName?: string;
  phone?: string;
  /** Placeholder values for this recipient — merged over school_name so callers never have to pass it themselves. */
  templateData?: Record<string, string | number | undefined>;
}

export interface SendOneInput {
  schoolId: string;
  notificationType: NotificationType;
  channel?: NotificationChannel;
  recipient: SendRecipientInput;
  createdBy: string;
  bulkJobId?: string;
  /** Skips the MessageTemplate lookup and sends this body verbatim (still run
   *  through renderTemplate for any placeholders it happens to contain) —
   *  used for ad-hoc broadcasts where the admin types the message per-send
   *  rather than editing a stored template. */
  overrideBody?: string;
  /** Ties this send to the business record that triggered it (e.g. a
   *  FeePayment id) — see NotificationLog#sourceId. Callers that pass this
   *  should check notificationLogRepository.findBySource first; sendOne itself
   *  doesn't dedupe, it only records the id so a duplicate insert 11000s. */
  sourceId?: string;
  /** A document to attach to a WhatsApp template send whose Meta template has
   *  a document header (see META_TEMPLATE_MAP#hasDocumentHeader) — e.g. the
   *  fee receipt PDF. Ignored for channels/templates that don't support it. */
  attachment?: { buffer: Buffer; mimeType: string; filename: string };
}

/** IST HH:mm "now", string-comparable against SchoolSettings' HH:mm fields —
 *  same convention as attendanceRules/behaviorWindow. */
function nowIstHHmm(): string {
  return new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Kolkata' });
}

export interface AttachmentTemplateResult {
  success: boolean;
  errorMessage?: string;
  providerMessageId?: string;
  mediaId?: string;
  templateName?: string;
}

/**
 * Sends a Meta-approved WhatsApp template that carries a document header
 * (uploads the attachment to Meta first, then references it by media id).
 * Shared by sendOne's first-attempt path and FeeReceiptNotificationService's
 * retry path (which regenerates the PDF rather than replaying a stale one —
 * Meta media ids aren't durable long-term, so a real retry needs a fresh
 * upload either way).
 */
export async function sendWhatsAppAttachmentTemplate(
  schoolId: string,
  notificationType: NotificationType,
  phone: string,
  templateData: Record<string, string | number | undefined>,
  attachment: { buffer: Buffer; mimeType: string; filename: string },
): Promise<AttachmentTemplateResult> {
  const metaTemplate = META_TEMPLATE_MAP[notificationType];
  if (!metaTemplate?.hasDocumentHeader) {
    return { success: false, errorMessage: `${notificationType} has no configured document-header WhatsApp template` };
  }

  const settings = await schoolSettingsService.getSettings(schoolId);
  const templateName = notificationType === 'FEE_PAYMENT_RECEIPT'
    ? (settings.communicationSettings.feeReceiptWhatsappTemplate || metaTemplate.templateName)
    : metaTemplate.templateName;

  const provider = getProvider('whatsapp');
  if (!provider.isConfigured()) {
    return { success: false, errorMessage: 'whatsapp is enabled but its provider is not configured — check environment variables' };
  }
  if (!provider.uploadMedia) {
    return { success: false, errorMessage: 'whatsapp provider does not support document attachments' };
  }

  const upload = await provider.uploadMedia(attachment.buffer, attachment.mimeType, attachment.filename);
  if (!upload.success || !upload.mediaId) {
    return { success: false, errorMessage: upload.errorMessage ?? 'Media upload failed' };
  }

  const result = await provider.sendTemplate({
    to: phone,
    templateName,
    languageCode: metaTemplate.languageCode,
    components: [
      { type: 'header', parameters: [{ type: 'document', document: { id: upload.mediaId, filename: attachment.filename } }] },
      {
        type: 'body',
        parameters: metaTemplate.paramKeys.map((key) => ({ type: 'text', text: String(templateData[key] ?? '') })),
      },
    ],
  });

  return { success: result.success, errorMessage: result.errorMessage, providerMessageId: result.providerMessageId, mediaId: upload.mediaId, templateName };
}

/**
 * Sends a single notification to a single recipient end-to-end: settings
 * checks → template render → provider send → NotificationLog write. This is
 * the unit both the ad-hoc "send one message" path and the bulk queue
 * processor (queue/bulk-processor.ts) build on — it never throws, it always
 * resolves to the log entry describing what happened.
 */
export async function sendOne(input: SendOneInput): Promise<INotificationLog> {
  const { schoolId, notificationType, recipient, createdBy, bulkJobId } = input;
  const channel = input.channel ?? NOTIFICATION_TYPES[notificationType].defaultChannel;

  const settings = await schoolSettingsService.getSettings(schoolId);
  const cs = settings.communicationSettings;

  const channelEnabled: Record<NotificationChannel, boolean> = {
    whatsapp: cs.whatsappEnabled,
    email: cs.emailEnabled,
    sms: cs.smsEnabled,
    push: cs.pushEnabled,
    voice: false,
  };

  const baseLog = {
    schoolId,
    notificationType,
    channel,
    recipientName: recipient.recipientName,
    studentId: recipient.studentId,
    parentName: recipient.parentName,
    phoneNumber: recipient.phone,
    createdBy,
    bulkJobId,
    sourceId: input.sourceId,
  };

  if (!channelEnabled[channel]) {
    return notificationLogRepository.create({
      ...baseLog,
      status: 'SKIPPED',
      errorMessage: `${channel} channel is disabled in Communication Settings`,
      payload: {},
    });
  }

  if (!recipient.phone?.trim()) {
    return notificationLogRepository.create({
      ...baseLog,
      status: 'SKIPPED',
      errorMessage: 'No phone number on file for this recipient',
      payload: {},
    });
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const sentToday = await notificationLogRepository.countTotalSince(schoolId, todayStart);
  if (sentToday >= cs.dailyLimit) {
    return notificationLogRepository.create({
      ...baseLog,
      status: 'SKIPPED',
      errorMessage: `Daily notification limit reached (${cs.dailyLimit})`,
      payload: {},
    });
  }

  const nowHHmm = nowIstHHmm();
  if (nowHHmm < cs.workingHoursStart || nowHHmm > cs.workingHoursEnd) {
    return notificationLogRepository.create({
      ...baseLog,
      status: 'SKIPPED',
      errorMessage: `Outside configured working hours (${cs.workingHoursStart}–${cs.workingHoursEnd} IST)`,
      payload: {},
    });
  }

  const templateData: Record<string, string | number | undefined> = { school_name: settings.schoolName, ...recipient.templateData };

  let templateId: string | undefined;
  let rawBody: string;
  if (input.overrideBody) {
    rawBody = input.overrideBody;
  } else {
    const template = await messageTemplateRepository.getActiveOrSeedDefault(schoolId, notificationType, channel, createdBy);
    templateId = template._id.toString();
    rawBody = template.body;
  }
  const body = renderTemplate(rawBody, templateData);

  const provider = getProvider(channel);
  if (!provider.isConfigured()) {
    logger.error('[CommunicationEngine] Channel enabled in settings but provider is not configured', { channel, schoolId });
    return notificationLogRepository.create({
      ...baseLog,
      status: 'FAILED',
      errorMessage: `${channel} is enabled but its provider is not configured — check environment variables`,
      payload: { body },
    });
  }

  // Ad-hoc overrides (broadcasts where the admin typed custom text) always send
  // as plain text — a Meta-approved template's wording can't be swapped per-send.
  const metaTemplate = channel === 'whatsapp' && !input.overrideBody ? META_TEMPLATE_MAP[notificationType] : undefined;

  let result: { success: boolean; errorMessage?: string; providerMessageId?: string };
  let mediaId: string | undefined;
  let templateName: string | undefined;

  if (metaTemplate?.hasDocumentHeader && input.attachment) {
    const attempt = await sendWhatsAppAttachmentTemplate(schoolId, notificationType, recipient.phone, templateData, input.attachment);
    result = attempt;
    mediaId = attempt.mediaId;
    templateName = attempt.templateName;
  } else if (metaTemplate) {
    templateName = metaTemplate.templateName;
    result = await provider.sendTemplate({
      to: recipient.phone,
      templateName: metaTemplate.templateName,
      languageCode: metaTemplate.languageCode,
      components: [{
        type: 'body',
        parameters: metaTemplate.paramKeys.map((key) => ({ type: 'text', text: String(templateData[key] ?? '') })),
      }],
    });
  } else {
    result = await provider.sendText({ to: recipient.phone, body });
  }

  return notificationLogRepository.create({
    ...baseLog,
    status: result.success ? 'SENT' : 'FAILED',
    sentAt: result.success ? new Date() : undefined,
    errorMessage: result.errorMessage,
    payload: { body, templateId, templateName, mediaId, providerMessageId: result.providerMessageId },
  });
}

/** Re-attempts a FAILED log entry using the same rendered body it already sent (no re-render, no template drift). */
export async function retryOne(log: INotificationLog): Promise<INotificationLog> {
  // Attachment-carrying sends (currently only FEE_PAYMENT_RECEIPT) can't be
  // replayed generically — a plain-text resend would silently drop the
  // receipt PDF the parent is expecting. Those go through
  // FeeReceiptNotificationService.retrySend (POST /fees/payments/:id/whatsapp-receipt/retry),
  // which regenerates the PDF and re-uploads it, instead of this generic path.
  if (META_TEMPLATE_MAP[log.notificationType]?.hasDocumentHeader) {
    const updated = await notificationLogRepository.markFailed(
      log._id.toString(),
      'This notification carries a document attachment — use the fee receipt retry action instead of the generic retry.',
    );
    return updated ?? log;
  }

  const provider = getProvider(log.channel);
  if (!provider.isConfigured()) {
    const updated = await notificationLogRepository.markFailed(log._id.toString(), `${log.channel} provider is still not configured`);
    return updated ?? log;
  }
  if (!log.phoneNumber) {
    const updated = await notificationLogRepository.markFailed(log._id.toString(), 'No phone number on file for this recipient');
    return updated ?? log;
  }

  const body = typeof log.payload?.body === 'string' ? log.payload.body : '';
  const result = await provider.sendText({ to: log.phoneNumber, body });

  const updated = result.success
    ? await notificationLogRepository.markSent(log._id.toString(), result.providerMessageId)
    : await notificationLogRepository.markFailed(log._id.toString(), result.errorMessage ?? 'Retry failed');

  return updated ?? log;
}
