import { NotificationType } from '../notification-types';

export interface MetaTemplateConfig {
  /** Exact template name as registered in Meta Business Manager. */
  templateName: string;
  /** Must exactly match the language the template was approved in (e.g. 'en_US', 'en'). */
  languageCode: string;
  /** Keys read from the recipient's rendered placeholder data, in the exact
   *  order the approved template's {{1}}, {{2}}, {{3}}... expect. */
  paramKeys: string[];
  /** True when the approved template's header is a document attachment (e.g.
   *  the fee receipt PDF) — communication-core.ts uploads the caller's
   *  attachment to Meta and adds a `header` component referencing it. */
  hasDocumentHeader?: boolean;
}

/** Maps a NotificationType to a Meta-approved template. Only types listed
 *  here send via Meta's `template` message type, which works outside the 24h
 *  customer-service window — every other type (and any ad-hoc overrideBody
 *  send) still sends as plain text via sendText, which Meta only delivers
 *  within 24h of the parent's last inbound message.
 *
 *  FEE_PAYMENT_RECEIPT's `templateName` here is only the fallback default —
 *  communication-core.ts overrides it per-school from
 *  communicationSettings.feeReceiptWhatsappTemplate (see school-settings). */
export const META_TEMPLATE_MAP: Partial<Record<NotificationType, MetaTemplateConfig>> = {
  ATTENDANCE_ABSENT: {
    templateName: 'student_absent_alert',
    languageCode: 'en',
    paramKeys: ['student_name', 'class_section', 'date'],
  },
  FEE_PAYMENT_RECEIPT: {
    templateName: 'fee_payment_receipt',
    languageCode: 'en',
    // Matches the Meta-approved body exactly: {{1}} student_name, {{2}} amount,
    // {{3}} receipt_number, {{4}} payment_date. The school name ("FNIC Inter
    // College") is hardcoded text in the approved template, not a variable —
    // do not add school_name here or Meta rejects the send with error 132000.
    paramKeys: ['student_name', 'amount', 'receipt_number', 'payment_date'],
    hasDocumentHeader: true,
  },
};
