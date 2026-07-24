import { useCallback, useEffect, useState } from 'react';
import { getToken } from 'firebase/messaging';
import { getFirebaseMessaging, isFirebaseConfigured } from '@/lib/firebase';
import { pushTokenApi } from './pushToken.api';

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

export type PushPermissionState = 'unsupported' | 'default' | 'granted' | 'denied';

// Drives the "Enable notifications" control: surfaces whether push is even
// possible here, and turns a user gesture into a registered FCM token.
// Browsers require permission requests to originate from a real click, so
// this deliberately exposes an imperative enable() rather than requesting
// automatically on mount.
export const useEnablePushNotifications = () => {
  const [state, setState] = useState<PushPermissionState>('unsupported');
  const [isEnabling, setIsEnabling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isFirebaseConfigured || typeof Notification === 'undefined') return;
    setState(Notification.permission as PushPermissionState);
  }, []);

  const enable = useCallback(async () => {
    if (typeof Notification === 'undefined' || !VAPID_KEY) {
      setError('Push notifications are not configured yet.');
      return;
    }

    setIsEnabling(true);
    setError(null);
    try {
      const permission = await Notification.requestPermission();
      setState(permission as PushPermissionState);
      if (permission !== 'granted') return;

      const messaging = await getFirebaseMessaging();
      if (!messaging) {
        setError('This browser does not support push notifications.');
        return;
      }

      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: registration });
      if (!token) {
        setError('Could not get a device token. Try again.');
        return;
      }

      // This flow only targets Android per the current design brief — iOS
      // web push (Safari 16.4+) needs its own permission-prompt and
      // capability checks before that value would be safe to send here.
      await pushTokenApi.register({ token, platform: 'android' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to enable push notifications.');
    } finally {
      setIsEnabling(false);
    }
  }, []);

  return { state, isEnabling, error, enable, isConfigured: isFirebaseConfigured };
};
