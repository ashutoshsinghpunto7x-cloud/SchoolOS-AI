import { ICommunicationProvider, TriggerPayload } from './provider.interface';
import { Communication } from '../communication.model';
import { logger } from '../../../lib/logger';
import { whatsAppCloudProvider, isWhatsAppCloudConfigured } from '../../communication/providers/whatsapp-cloud.provider';

/** Thin adapter over the real Meta WhatsApp Cloud API client that the
 *  Communication & Notification Engine already implements — reused here so
 *  legacy `/communications/whatsapp` sends (reception, student profile) also
 *  go out over Meta instead of Twilio, without duplicating the Graph API
 *  request/retry logic. */
export const whatsAppCloudLegacyProvider: ICommunicationProvider = {
  name: 'whatsapp-cloud',

  supports(type) {
    return type === 'whatsapp';
  },

  trigger(payload: TriggerPayload): void {
    whatsAppCloudProvider
      .sendText({ to: payload.parentPhone, body: payload.message ?? '' })
      .then((result) => {
        if (!result.success) {
          logger.error('[WhatsAppCloudLegacy] Send failed', {
            communicationId: payload.communicationId,
            errorMessage: result.errorMessage,
          });
          return Communication.findByIdAndUpdate(payload.communicationId, { $set: { status: 'FAILED' } });
        }
        logger.info('[WhatsAppCloudLegacy] Message sent', { communicationId: payload.communicationId });
        return Communication.findByIdAndUpdate(payload.communicationId, {
          $set: { status: 'COMPLETED', metadata: { metaMessageId: result.providerMessageId } },
        });
      })
      .catch((err: unknown) => {
        logger.error('[WhatsAppCloudLegacy] Unexpected error', {
          communicationId: payload.communicationId,
          err: err instanceof Error ? err.message : err,
        });
        Communication.findByIdAndUpdate(payload.communicationId, { $set: { status: 'FAILED' } }).catch(() => {});
      });
  },
};

export { isWhatsAppCloudConfigured };
