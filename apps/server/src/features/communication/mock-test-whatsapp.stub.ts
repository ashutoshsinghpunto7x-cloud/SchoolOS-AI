import { logger } from '../../lib/logger';

// Log-only stub for the Mock Test Engine's WhatsApp delivery — wired into the
// open-window cron job (see ../mock-tests/mock-test-scheduler.job.ts) but does
// NOT call the real Meta Cloud API. The 'mock_test_link' template name is
// registered as a placeholder in providers/meta-template-map.ts, but nothing
// currently reads it — this stub never calls whatsAppCloudProvider/
// communication-core.ts, so it can't accidentally fire against Meta before
// the template is approved.
//
// TODO(whatsapp-template-approval): swap this for a real send (via
// communication-core.ts's sendTemplateMessage, using the 'mock_test_link'
// entry in meta-template-map.ts) once Meta approves the test-link template.

export interface TestLinkRecipient {
  studentName: string;
  parentPhone?: string;
}

export interface SendTestLinkResult {
  attempted: number;
  skippedNoPhone: number;
}

/** Would-be WhatsApp send of a live mock test's link to every parent of the class — logs only, see TODO above. */
export function sendTestLinkWhatsApp(testId: string, testTitle: string, recipients: TestLinkRecipient[]): SendTestLinkResult {
  let skippedNoPhone = 0;

  for (const recipient of recipients) {
    if (!recipient.parentPhone) {
      skippedNoPhone += 1;
      continue;
    }
    logger.info(`[WHATSAPP STUB] Would send test link to ${recipient.parentPhone} (parent of ${recipient.studentName}) for test ${testId} ("${testTitle}")`);
  }

  return { attempted: recipients.length - skippedNoPhone, skippedNoPhone };
}
