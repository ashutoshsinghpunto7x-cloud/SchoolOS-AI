import { NotificationType } from '../notification-types';

export interface MetaTemplateConfig {
  /** Exact template name as registered in Meta Business Manager. */
  templateName: string;
  /** Must exactly match the language the template was approved in (e.g. 'en_US', 'en'). */
  languageCode: string;
  /** Keys read from the recipient's rendered placeholder data, in the exact
   *  order the approved template's {{1}}, {{2}}, {{3}}... expect. */
  paramKeys: string[];
}

/** Maps a NotificationType to a Meta-approved template. Only types listed
 *  here send via Meta's `template` message type, which works outside the 24h
 *  customer-service window — every other type (and any ad-hoc overrideBody
 *  send) still sends as plain text via sendText, which Meta only delivers
 *  within 24h of the parent's last inbound message. */
export const META_TEMPLATE_MAP: Partial<Record<NotificationType, MetaTemplateConfig>> = {
  ATTENDANCE_ABSENT: {
    templateName: 'student_absent_alert',
    languageCode: 'en',
    paramKeys: ['student_name', 'class_section', 'date'],
  },
};
