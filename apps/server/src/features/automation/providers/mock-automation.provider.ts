import { IAutomationProvider, AutomationDispatchPayload } from './automation-provider.interface';
import { AutomationJob, IAutomationJob } from '../automation.model';
import { Communication } from '../../communications/communication.model';
import { logger } from '../../../lib/logger';

// ── Simulated call results ────────────────────────────────────────────────────

interface MockCallResult {
  summary: string;
  recommendation: string;
  nextFollowUp: string;
}

const makeCallResults = (
  parentName: string,
  studentName: string,
  schoolName: string
): MockCallResult[] => [
  {
    summary: `Connected with ${parentName}. Confirmed strong interest in admission for ${studentName}. Requested a campus tour this Saturday. Asked about transport availability.`,
    recommendation: 'Schedule Campus Visit — this Saturday',
    nextFollowUp: 'Saturday, 10:00 AM',
  },
  {
    summary: `Spoke with ${parentName}. Comparing schools. Asked about fee structure and teaching methodology. ${schoolName}'s reputation was mentioned positively. Wants a brochure.`,
    recommendation: 'Send fee structure + brochure via WhatsApp',
    nextFollowUp: 'Tomorrow, 11:00 AM',
  },
  {
    summary: `${parentName} is traveling and asked for a callback next week. Genuine interest in admission for ${studentName}. Requested WhatsApp highlights.`,
    recommendation: 'Send WhatsApp with school highlights',
    nextFollowUp: 'Monday, 10:00 AM',
  },
];

// ── Mock Provider ─────────────────────────────────────────────────────────────

/**
 * Development-only automation provider.
 * Simulates job completion after a short delay by writing directly to MongoDB.
 * In production, n8nAutomationProvider is used instead.
 */
export const mockAutomationProvider: IAutomationProvider = {
  name: 'mock',

  supports(type): boolean {
    return type === 'VOICE_CALL';
  },

  dispatch(data: AutomationDispatchPayload, _job: IAutomationJob): void {
    const delay = 3_500 + Math.random() * 1_500;

    setTimeout(() => {
      void (async () => {
        try {
          const parentName = String(data.payload.parentName ?? 'Parent');
          const studentName = String(data.payload.studentName ?? 'Student');
          const results = makeCallResults(parentName, studentName, data.schoolName);
          const result = results[Math.floor(Math.random() * results.length)];

          const now = new Date();

          // Update the AutomationJob
          await AutomationJob.findByIdAndUpdate(data.jobId, {
            $set: {
              status: 'COMPLETED',
              completedAt: now,
              result: {
                summary: result.summary,
                recommendation: result.recommendation,
                nextFollowUp: result.nextFollowUp,
              },
            },
          });

          // Update the linked Communication record if present
          const jobDoc = await AutomationJob.findById(data.jobId).lean();
          if (jobDoc?.referenceType === 'communication' && jobDoc.referenceId) {
            await Communication.findByIdAndUpdate(jobDoc.referenceId, {
              $set: {
                status: 'COMPLETED',
                summary: result.summary,
                recommendation: result.recommendation,
                nextFollowUp: result.nextFollowUp,
              },
            });
          }

          logger.info('[MockAutomationProvider] Simulated job completed', { jobId: data.jobId });
        } catch (err) {
          logger.error('[MockAutomationProvider] Simulation failed', { jobId: data.jobId, err });
        }
      })();
    }, delay);
  },
};
