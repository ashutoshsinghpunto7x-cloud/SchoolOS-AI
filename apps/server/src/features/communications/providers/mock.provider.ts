import { ICommunicationProvider, TriggerPayload } from './provider.interface';
import { Communication } from '../communication.model';
import { logger } from '../../../lib/logger';

// ── Simulated call results ────────────────────────────────────────────────────

interface MockResult {
  summary: string;
  recommendation: string;
  nextFollowUp: string;
}

const makeVariants = (
  parentName: string,
  studentName: string,
  schoolName: string
): MockResult[] => [
  {
    summary: `Connected with ${parentName}. Strong interest in admission for ${studentName}. Requested a campus tour and asked about transport availability.`,
    recommendation: 'Schedule Campus Visit — this Saturday',
    nextFollowUp: 'Saturday, 10:00 AM',
  },
  {
    summary: `Spoke with ${parentName}. Comparing schools. Asked about fee structure and teaching methodology. Reputation of ${schoolName} came up positively. Wants a brochure.`,
    recommendation: 'Send fee structure + brochure via WhatsApp',
    nextFollowUp: 'Tomorrow, 11:00 AM',
  },
  {
    summary: `${parentName} is currently traveling and asked for a callback next week. Genuine interest confirmed. Requested WhatsApp message with school highlights for ${studentName}.`,
    recommendation: 'Send WhatsApp with school highlights',
    nextFollowUp: 'Monday, 10:00 AM',
  },
];

// ── Mock Provider ─────────────────────────────────────────────────────────────

/**
 * Development-only provider.
 * Simulates a completed AI call after a short delay by writing directly to MongoDB.
 * In production, n8n handles the actual call and posts back via the webhook.
 */
export const mockProvider: ICommunicationProvider = {
  name: 'mock',

  supports(type) {
    return type === 'call'; // mock only simulates voice calls
  },

  trigger(payload: TriggerPayload): void {
    const delay = 3_500 + Math.random() * 1_500;
    const variants = makeVariants(payload.parentName, payload.studentName, payload.schoolName);
    const result = variants[Math.floor(Math.random() * variants.length)];

    setTimeout(() => {
      Communication.findByIdAndUpdate(
        payload.communicationId,
        {
          $set: {
            status: 'COMPLETED',
            summary: result.summary,
            recommendation: result.recommendation,
            nextFollowUp: result.nextFollowUp,
          },
        },
        { new: true }
      )
        .then(() => {
          logger.info('[MockProvider] Simulated call completed', {
            communicationId: payload.communicationId,
          });
        })
        .catch((err: unknown) => {
          logger.error('[MockProvider] Simulation failed', {
            communicationId: payload.communicationId,
            err,
          });
        });
    }, delay);
  },
};
