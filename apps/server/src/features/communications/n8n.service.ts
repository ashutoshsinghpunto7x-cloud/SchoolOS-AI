import axios from 'axios';
import { env } from '../../config/env';
import { logger } from '../../lib/logger';

export interface N8nCallPayload {
  communicationId: string;
  studentId: string;
  studentName: string;
  parentName: string;
  parentPhone: string;
  schoolName: string;
  communicationType: string;
}

/**
 * Fire-and-forget webhook trigger for n8n.
 * The caller must NOT await this — it returns immediately.
 *
 * Production: N8N_WEBHOOK_URL set in env → real HTTP call.
 * P0/dev:     URL not set → logs a warning, caller handles simulation.
 */
export const n8nService = {
  trigger(payload: N8nCallPayload): void {
    if (!env.N8N_WEBHOOK_URL) {
      logger.warn('N8N_WEBHOOK_URL not configured — skipping webhook trigger', {
        communicationId: payload.communicationId,
      });
      return;
    }

    void axios
      .post(env.N8N_WEBHOOK_URL, payload, { timeout: 8_000 })
      .then(() => {
        logger.info('n8n webhook triggered', { communicationId: payload.communicationId });
      })
      .catch((err: Error) => {
        logger.error('n8n webhook failed', {
          communicationId: payload.communicationId,
          error: err.message,
        });
      });
  },
};
