import { create } from 'zustand';
import type { AuthUser } from '@schoolos/types';
import { authApi } from '@/features/auth/api';
import { unregisterPushNotifications } from '@/features/notifications/registerForPush';
import { registerSessionExpiredHandler, resetAuthRefreshState } from '@/services/api/client';
import { secureStorage } from '@/services/secureStorage';

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  /** True only during the initial session-restore on app launch. */
  isBootstrapping: boolean;
  /** `identifier` is an email or a staff-issued username — the backend accepts either. */
  login: (identifier: string, password: string) => Promise<AuthUser>;
  loginWithPin: (deviceId: string, pin: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  restoreSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isBootstrapping: true,

  login: async (identifier, password) => {
    const result = await authApi.login({ identifier, password });
    await secureStorage.setTokens(result.accessToken, result.refreshToken);
    set({ user: result.user, isAuthenticated: true });
    return result.user;
  },

  loginWithPin: async (deviceId, pin) => {
    const result = await authApi.loginWithPin({ deviceId, pin });
    await secureStorage.setTokens(result.accessToken, result.refreshToken);
    set({ user: result.user, isAuthenticated: true });
    return result.user;
  },

  logout: async () => {
    await unregisterPushNotifications();
    try {
      await authApi.logout();
    } catch {
      // Best-effort — the client-side session is cleared regardless so the
      // user is never stuck signed in just because the network call failed.
    }
    resetAuthRefreshState();
    await secureStorage.clearTokens();
    set({ user: null, isAuthenticated: false });
  },

  refreshUser: async () => {
    const user = await authApi.me();
    set({ user });
  },

  // Wrapped end-to-end: if secure storage itself is unavailable or throws
  // (corrupted keychain, unsupported platform, etc.) the app must still fall
  // through to the sign-in screen rather than hang on the boot spinner forever.
  restoreSession: async () => {
    try {
      const token = await secureStorage.getAccessToken();
      if (!token) {
        set({ isBootstrapping: false });
        return;
      }
      const user = await authApi.me();
      set({ user, isAuthenticated: true, isBootstrapping: false });
    } catch {
      try {
        await secureStorage.clearTokens();
      } catch {
        // Storage itself is the thing that's broken — nothing more we can do here.
      }
      set({ user: null, isAuthenticated: false, isBootstrapping: false });
    }
  },
}));

// Wired once at module load: when the API client can't recover a session
// (refresh failed / no refresh token), collapse the store back to signed-out.
registerSessionExpiredHandler(() => {
  useAuthStore.setState({ user: null, isAuthenticated: false });
});
