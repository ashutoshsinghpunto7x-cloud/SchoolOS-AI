import { env } from './env';

// Reuses the same allowed-origins source as CORS (app.ts) rather than
// duplicating a second list that could drift out of sync with it.
const baselineOrigins = [
  'https://fnicschool.com',
  'https://www.fnicschool.com',
  'https://fnic.vercel.app',
];
const envOrigins = env.FRONTEND_URL.split(',').map((origin) => origin.trim()).filter(Boolean);
export const webauthnExpectedOrigins = Array.from(new Set([...baselineOrigins, ...envOrigins]));

// rpID must be a registrable domain (no scheme/port) that matches the page
// origin the browser is actually on — derived from the first configured
// frontend origin so dev (localhost) and prod (fnicschool.com) both work
// without needing a separate env var in the common case.
function deriveRpId(): string {
  try {
    return new URL(envOrigins[0] ?? baselineOrigins[0]).hostname;
  } catch {
    return 'localhost';
  }
}

export const webauthnRpId = process.env.WEBAUTHN_RP_ID?.trim() || deriveRpId();
export const webauthnRpName = process.env.WEBAUTHN_RP_NAME?.trim() || 'SchoolOS';
