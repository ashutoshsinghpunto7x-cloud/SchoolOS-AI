import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Thin wrapper so the rest of the app depends on one seam, not directly on
// expo-secure-store — keeps token persistence swappable and testable.
const ACCESS_TOKEN_KEY = 'schoolos.accessToken';
const REFRESH_TOKEN_KEY = 'schoolos.refreshToken';
const DEVICE_ID_KEY = 'schoolos.deviceId';
const PUSH_TOKEN_KEY = 'schoolos.pushToken';

// expo-secure-store has no web implementation (Keychain/Keystore are
// iOS/Android-only concepts — web isn't a shipping target for this app, see
// the mobile plan). Fall back to localStorage on web only, purely so `expo
// start --web` is usable for quick dev-time smoke testing; native platforms
// never touch this path and keep using the real secure keychain.
const isWeb = Platform.OS === 'web';

async function getItem(key: string): Promise<string | null> {
  if (isWeb) return globalThis.localStorage?.getItem(key) ?? null;
  return SecureStore.getItemAsync(key);
}

async function setItem(key: string, value: string): Promise<void> {
  if (isWeb) {
    globalThis.localStorage?.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function deleteItem(key: string): Promise<void> {
  if (isWeb) {
    globalThis.localStorage?.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

// Reads never throw — if the keychain is unavailable for any reason, callers
// see "no value" rather than an unhandled rejection that could hang a screen.
async function readSafe(key: string): Promise<string | null> {
  try {
    return await getItem(key);
  } catch {
    return null;
  }
}

export const secureStorage = {
  async getAccessToken(): Promise<string | null> {
    return readSafe(ACCESS_TOKEN_KEY);
  },
  async getRefreshToken(): Promise<string | null> {
    return readSafe(REFRESH_TOKEN_KEY);
  },
  async setTokens(accessToken: string, refreshToken: string): Promise<void> {
    await Promise.all([setItem(ACCESS_TOKEN_KEY, accessToken), setItem(REFRESH_TOKEN_KEY, refreshToken)]);
  },
  async clearTokens(): Promise<void> {
    await Promise.all([deleteItem(ACCESS_TOKEN_KEY), deleteItem(REFRESH_TOKEN_KEY)]);
  },
  async getDeviceId(): Promise<string | null> {
    return readSafe(DEVICE_ID_KEY);
  },
  async setDeviceId(deviceId: string): Promise<void> {
    await setItem(DEVICE_ID_KEY, deviceId);
  },
  async getPushToken(): Promise<string | null> {
    return readSafe(PUSH_TOKEN_KEY);
  },
  async setPushToken(token: string): Promise<void> {
    await setItem(PUSH_TOKEN_KEY, token);
  },
  async clearPushToken(): Promise<void> {
    await deleteItem(PUSH_TOKEN_KEY);
  },
};
