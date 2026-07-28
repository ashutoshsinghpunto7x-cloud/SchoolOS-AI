import { env } from '../../config/env';
import { logger } from '../../lib/logger';
import { notificationLogRepository } from './notification-log.repository';
import { auditService } from '../audit/audit.service';

interface MetaStatusEntry {
  id: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
  errors?: Array<{ title?: string; message?: string }>;
}

interface MetaWebhookPayload {
  entry?: Array<{
    changes?: Array<{
      value?: {
        statuses?: MetaStatusEntry[];
        messages?: Array<{ from: string; id: string; type: string }>;
      };
    }>;
  }>;
}

export const webhookService = {
  /** GET verification handshake Meta performs once when the webhook URL is registered. */
  verify(mode: string, token: string, challenge: string): string | null {
    if (mode === 'subscribe' && token === env.WHATSAPP_VERIFY_TOKEN) return challenge;
    return null;
  },

  /** POST — delivery/read status updates and (optionally) inbound messages. Always
   *  responds 200 quickly; Meta retries with backoff if it doesn't get one. */
  async handleIncoming(payload: MetaWebhookPayload): Promise<void> {
    const changes = payload.entry?.flatMap((e) => e.changes ?? []) ?? [];

    for (const change of changes) {
      for (const status of change.value?.statuses ?? []) {
        if (status.status === 'sent') continue; // already recorded as SENT at send time

        const mapped = status.status === 'delivered' ? 'DELIVERED' : status.status === 'read' ? 'READ' : 'FAILED';
        const errorMessage = status.errors?.[0]?.message;

        const updated = await notificationLogRepository.updateDeliveryStatus(status.id, mapped, errorMessage);
        if (!updated) {
          logger.warn('[WhatsAppWebhook] Status update for unknown message id', { metaMessageId: status.id, status: mapped });
          continue;
        }

        if (mapped === 'FAILED') {
          auditService.log({
            userId: 'system',
            userDisplayName: 'Meta WhatsApp Webhook',
            action: 'notification.webhook_received',
            resource: 'notification_log',
            resourceId: updated._id.toString(),
            details: { status: mapped, errorMessage },
            schoolId: updated.schoolId,
          });
        }
      }

      for (const message of change.value?.messages ?? []) {
        // Inbound parent replies aren't routed anywhere yet (no two-way conversation
        // feature exists) — logged so they're at least visible, never dropped silently.
        logger.info('[WhatsAppWebhook] Inbound message received', { from: message.from, type: message.type, id: message.id });
      }
    }
  },
};
