/**
 * WhatsApp sending is still in testing — matches the server-side guard at
 * apps/server/src/lib/whatsapp-test-gate.ts. Only the isolated DEMO_SCHOOL
 * tenant (see apps/server/src/scripts/seed-whatsapp-demo-class.ts) can
 * trigger a real send; every other school sees the button disabled instead
 * of tapping it and hitting a 403 from the server.
 *
 * Set VITE_WHATSAPP_LIVE_FOR_ALL_SCHOOLS=true (build-time env var, e.g. in
 * the Vercel project's Environment Variables) once testing is signed off, to
 * match the server's WHATSAPP_LIVE_FOR_ALL_SCHOOLS=true — flipping only one
 * of the two leaves the button either hidden when sends would actually work,
 * or visible when they'd 403, so keep them in sync.
 */
const DEMO_SCHOOL_ID = 'DEMO_SCHOOL';

export function isWhatsAppSendAllowed(schoolId: string | undefined | null): boolean {
  if (import.meta.env.VITE_WHATSAPP_LIVE_FOR_ALL_SCHOOLS === 'true') return true;
  return schoolId === DEMO_SCHOOL_ID;
}
