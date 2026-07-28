import { env } from '../../config/env';
import { logger } from '../../lib/logger';
import { postWithRetry } from '../../lib/retry-post';

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

    void postWithRetry(env.N8N_WEBHOOK_URL, payload, { timeoutMs: 8_000, attempts: 3 })
      .then(() => {
        logger.info('n8n webhook triggered', { communicationId: payload.communicationId });
      })
      .catch((err: Error) => {
        logger.error('n8n webhook failed after retries', {
          communicationId: payload.communicationId,
          error: err.message,
        });
      });
  },
};
