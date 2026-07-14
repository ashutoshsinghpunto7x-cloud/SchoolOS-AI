import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { DevicePlatform } from '@schoolos/types';
import { secureStorage } from '@/services/secureStorage';
import { notificationsApi } from './api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export type PushRegistrationResult =
  | { status: 'registered' }
  | { status: 'permission_denied' }
  | { status: 'unsupported'; reason: string };

// Requires an EAS projectId to mint an Expo push token — that's set up at
// build/submission time (out of scope for this phase). Until then this
// no-ops safely instead of crashing, so the rest of the app is unaffected.
export async function registerForPushNotifications(): Promise<PushRegistrationResult> {
  if (!Device.isDevice) {
    return { status: 'unsupported', reason: 'Push notifications require a physical device' };
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
  if (!projectId) {
    return { status: 'unsupported', reason: 'App is not yet configured with an EAS project id' };
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') {
    return { status: 'permission_denied' };
  }

  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
  const platform: DevicePlatform = Platform.OS === 'ios' ? 'ios' : 'android';
  await notificationsApi.registerDeviceToken({ token, platform });
  await secureStorage.setPushToken(token);

  return { status: 'registered' };
}

// Best-effort — called on logout so a stale token doesn't keep receiving
// notifications for an account no longer signed in on this device.
export async function unregisterPushNotifications(): Promise<void> {
  const token = await secureStorage.getPushToken();
  if (!token) return;
  try {
    await notificationsApi.unregisterDeviceToken(token);
  } catch {
    // Ignore — the token will simply go stale server-side if this fails.
  }
  await secureStorage.clearPushToken();
}
