import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getMessaging, isSupported, type Messaging } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

let app: FirebaseApp | null = null;

function getFirebaseApp(): FirebaseApp | null {
  if (!isFirebaseConfigured) return null;
  if (!app) app = initializeApp(firebaseConfig);
  return app;
}

/** Resolves to null when Firebase isn't configured, or the browser lacks push support (e.g. Safari < 16.4, or FCM's own env checks). */
export async function getFirebaseMessaging(): Promise<Messaging | null> {
  const firebaseApp = getFirebaseApp();
  if (!firebaseApp) return null;
  if (!(await isSupported())) return null;
  return getMessaging(firebaseApp);
}
