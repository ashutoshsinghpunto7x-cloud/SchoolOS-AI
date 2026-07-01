import { ICommunicationProvider, TriggerPayload } from './provider.interface';
import { n8nService } from '../n8n.service';
import { logger } from '../../../lib/logger';

/**
 * Production provider: routes communications through n8n automation.
 * n8n selects the actual external provider (Vapi, Twilio, WhatsApp Cloud API)
 * based on the communication type and configured credentials.
 * Results arrive via POST /communications/webhook.
 */
export const n8nProvider: ICommunicationProvider = {
  name: 'mock', // overridden at runtime based on type; n8n decides the real provider

  supports(_type) {
    return true; // n8n handles all types via different workflows
  },

  trigger(payload: TriggerPayload): void {
    logger.info('[N8nProvider] Triggering workflow', {
      communicationId: payload.communicationId,
      type: payload.type,
    });

    n8nService.trigger({
      communicationId: payload.communicationId,
      studentId: payload.studentId,
      studentName: payload.studentName,
      parentName: payload.parentName,
      parentPhone: payload.parentPhone,
      schoolName: payload.schoolName,
      communicationType: payload.type,
    });
  },
};
