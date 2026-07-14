import { createContext, useContext } from 'react';
import type { AuthUser } from '@schoolos/types';

export interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  /** Accepts either an email or an admin-issued username. */
  login: (identifier: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  /** Re-fetches /auth/me — used after each account-recovery reset step so the forced-reset gate clears as soon as the server state does. */
  refreshUser: () => Promise<void>;
  /** Quick sign-in via a previously remembered device's 4-digit PIN. */
  loginWithPin: (deviceId: string, pin: string) => Promise<AuthUser>;
  /** Self-service: sets a PIN for the current account and remembers this browser/device. */
  setupPin: (pin: string, deviceLabel?: string) => Promise<{ deviceId: string }>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export const useAuthContext = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used inside AuthProvider');
  return ctx;
};
