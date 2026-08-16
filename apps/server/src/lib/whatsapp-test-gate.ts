import { ForbiddenError } from '../middlewares/errorHandler';

/**
 * WhatsApp sending (Meta Cloud API) is still in testing — real message credits
 * and a real business number are on the line, so every send path in the app
 * is locked to the isolated DEMO_SCHOOL tenant (see
 * apps/server/src/scripts/seed-whatsapp-demo-class.ts) until the integration
 * is signed off. Every controller that can trigger a WhatsApp message
 * (attendance reminders, fee reminders, the legacy /communications/whatsapp
 * endpoint, and the accountant ledger reminder) calls this first.
 *
 * Flip WHATSAPP_LIVE_FOR_ALL_SCHOOLS=true in env once testing is done to lift
 * the restriction without touching call sites.
 */
const DEMO_SCHOOL_ID = 'DEMO_SCHOOL';

export function isWhatsAppSendAllowed(schoolId: string): boolean {
  if (process.env.WHATSAPP_LIVE_FOR_ALL_SCHOOLS === 'true') return true;
  return schoolId === DEMO_SCHOOL_ID;
}

export function assertWhatsAppSendAllowed(schoolId: string): void {
  if (isWhatsAppSendAllowed(schoolId)) return;
  throw new ForbiddenError(
    'WhatsApp sending is currently in testing and only available on the demo workspace.',
  );
}
