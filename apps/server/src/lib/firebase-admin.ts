import { initializeApp, cert, type App } from 'firebase-admin/app';
import { getMessaging as getFirebaseMessaging, type Messaging } from 'firebase-admin/messaging';
import { logger } from './logger';

// Lazy singleton — mirrors image-upload.ts's "don't require credentials that
// aren't configured yet" approach. FIREBASE_SERVICE_ACCOUNT_JSON holds the
// full service-account JSON (from Firebase console → Project settings →
// Service accounts → Generate new private key) as a single-line string.
let app: App | null = null;
let initAttempted = false;

function getApp(): App | null {
  if (app) return app;
  if (initAttempted) return null;
  initAttempted = true;

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) {
    logger.warn('FIREBASE_SERVICE_ACCOUNT_JSON not set — push notifications are disabled.');
    return null;
  }

  try {
    const serviceAccount = JSON.parse(raw);
    app = initializeApp({ credential: cert(serviceAccount) });
    return app;
  } catch (err) {
    logger.error('Failed to initialize firebase-admin from FIREBASE_SERVICE_ACCOUNT_JSON', err);
    return null;
  }
}

/** Returns the Messaging client, or null when Firebase isn't configured (push sends become a no-op). */
export function getMessaging(): Messaging | null {
  const firebaseApp = getApp();
  return firebaseApp ? getFirebaseMessaging(firebaseApp) : null;
}
