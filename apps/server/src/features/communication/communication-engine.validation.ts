import { z } from 'zod';
import { NOTIFICATION_TYPE_KEYS, NotificationType } from './notification-types';

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD');
const channel = z.enum(['whatsapp', 'email', 'sms', 'push', 'voice']);
const notificationType = z.enum(NOTIFICATION_TYPE_KEYS as [NotificationType, ...NotificationType[]]);

export const sendAttendanceNotificationsSchema = z.object({
  date: dateString.optional(),
  class: z.string().trim().optional(),
  section: z.string().trim().optional(),
});

export const sendFeeReminderSchema = z.object({
  month: z.string().trim().optional(),
  class: z.string().trim().optional(),
  section: z.string().trim().optional(),
  studentIds: z.array(z.string()).optional(),
});

const broadcastMessage = z.object({
  notificationType: notificationType.default('GENERAL_BROADCAST'),
  channel: channel.optional(),
  message: z.string().trim().min(1).max(4096).optional(),
});

export const broadcastSchoolSchema = broadcastMessage;
export const broadcastClassSchema = broadcastMessage.extend({ class: z.string().trim().min(1) });
export const broadcastSectionSchema = broadcastMessage.extend({ class: z.string().trim().min(1), section: z.string().trim().min(1) });
export const broadcastStudentsSchema = broadcastMessage.extend({ studentIds: z.array(z.string()).min(1) });
export const broadcastParentsSchema = broadcastMessage.extend({ studentIds: z.array(z.string()).min(1) });
export const broadcastTeachersSchema = broadcastMessage.extend({ teacherIds: z.array(z.string()).min(1) });

export const listLogsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(20),
  notificationType: notificationType.optional(),
  channel: channel.optional(),
  status: z.enum(['QUEUED', 'SENT', 'DELIVERED', 'READ', 'FAILED', 'SKIPPED']).optional(),
  search: z.string().trim().optional(),
});

export const createTemplateSchema = z.object({
  notificationType,
  channel,
  name: z.string().trim().min(1).max(120),
  body: z.string().trim().min(1).max(4096),
});

export const updateTemplateSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  body: z.string().trim().min(1).max(4096).optional(),
  isActive: z.boolean().optional(),
});

export const metaWebhookVerifySchema = z.object({
  'hub.mode': z.string(),
  'hub.verify_token': z.string(),
  'hub.challenge': z.string(),
});

export type SendAttendanceNotificationsInput = z.infer<typeof sendAttendanceNotificationsSchema>;
export type SendFeeReminderInput = z.infer<typeof sendFeeReminderSchema>;
export type BroadcastClassInput = z.infer<typeof broadcastClassSchema>;
export type BroadcastSectionInput = z.infer<typeof broadcastSectionSchema>;
export type BroadcastStudentsInput = z.infer<typeof broadcastStudentsSchema>;
export type BroadcastTeachersInput = z.infer<typeof broadcastTeachersSchema>;
export type ListLogsQuery = z.infer<typeof listLogsQuerySchema>;
export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;
export type UpdateTemplateInput = z.infer<typeof updateTemplateSchema>;
