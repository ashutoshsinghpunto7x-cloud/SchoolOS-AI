import axios from 'axios';
import { IAutomationProvider, AutomationDispatchPayload } from './automation-provider.interface';
import { IAutomationJob } from '../automation.model';
import { env } from '../../../config/env';
import { logger } from '../../../lib/logger';

/**
 * Production automation provider.
 * Dispatches jobs to n8n via a single inbound webhook URL.
 * n8n routes to the appropriate workflow (Vapi, Twilio, WhatsApp Cloud, etc.)
 * based on the job type in the payload.
 *
 * Results arrive via POST /automation/webhook.
 * Changing to a different automation engine only requires adding a new provider here.
 */
export const n8nAutomationProvider: IAutomationProvider = {
  name: 'n8n',

  supports(_type): boolean {
    return true; // n8n handles all job types via workflow routing
  },

  dispatch(data: AutomationDispatchPayload, _job: IAutomationJob): void {
    if (!env.N8N_WEBHOOK_URL) {
      logger.warn('[N8nAutomationProvider] N8N_WEBHOOK_URL not configured — dispatch skipped', {
        jobId: data.jobId,
        type: data.type,
      });
      return;
    }

    const outbound = {
      jobId: data.jobId,
      type: data.type,
      schoolName: data.schoolName,
      ...data.payload,
    };

    void axios
      .post(env.N8N_WEBHOOK_URL, outbound, { timeout: 8_000 })
      .then(() => {
        logger.info('[N8nAutomationProvider] Job dispatched', {
          jobId: data.jobId,
          type: data.type,
        });
      })
      .catch((err: Error) => {
        logger.error('[N8nAutomationProvider] Dispatch failed', {
          jobId: data.jobId,
          type: data.type,
          error: err.message,
        });
      });
  },
};
