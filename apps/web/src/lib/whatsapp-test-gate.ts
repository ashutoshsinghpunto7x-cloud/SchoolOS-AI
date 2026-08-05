/**
 * WhatsApp sending is still in testing — matches the server-side guard at
 * apps/server/src/lib/whatsapp-test-gate.ts. Only the isolated DEMO_SCHOOL
 * tenant (see apps/server/src/scripts/seed-whatsapp-demo-class.ts) can
 * trigger a real send; every other school sees the button disabled instead
 * of tapping it and hitting a 403 from the server.
 */
const DEMO_SCHOOL_ID = 'DEMO_SCHOOL';

export function isWhatsAppSendAllowed(schoolId: string | undefined | null): boolean {
  return schoolId === DEMO_SCHOOL_ID;
}
