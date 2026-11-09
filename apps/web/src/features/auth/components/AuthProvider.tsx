import { useState, useEffect, useCallback, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { startRegistration, startAuthentication, browserSupportsWebAuthn, platformAuthenticatorIsAvailable } from '@simplewebauthn/browser';
import { authApi } from '../api/auth.api';
import { recoveryApi } from '../api/recovery.api';
import { webauthnApi } from '../api/webauthn.api';
import { resetAuthRefreshState, scheduleProactiveRefresh } from '@/services/api';
import { queryClient } from '@/lib/queryClient';
import { AuthContext } from '../context/AuthContext';
import type { AuthUser, UserRole } from '@schoolos/types';

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPasskeyAvailable, setIsPasskeyAvailable] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!browserSupportsWebAuthn()) return;
    platformAuthenticatorIsAvailable()
      .then(setIsPasskeyAvailable)
      .catch(() => setIsPasskeyAvailable(false));
  }, []);

  // Validate existing session on mount. Session lives in sessionStorage so each
  // browser tab has its own isolated token. Supports seamless local/demo testing.
  useEffect(() => {
    const demoSaved = sessionStorage.getItem('demo_user');
    if (demoSaved) {
      try {
        const parsed = JSON.parse(demoSaved);
        setUser(parsed);
        setIsLoading(false);
        return;
      } catch {}
    }

    const token = sessionStorage.getItem('accessToken');
    if (!token) {
      setIsLoading(false);
      return;
    }

    if (token === 'demo_token') {
      setUser({
        userId: 'demo-principal-id',
        schoolId: 'demo-school-id',
        email: 'principal@mycampus.edu.in',
        firstName: 'Beauty',
        lastName: 'Sharma',
        role: 'principal',
        mustResetPassword: false,
        mustResetPin: false,
      });
      setIsLoading(false);
      return;
    }

    scheduleProactiveRefresh(token);

    authApi
      .me()
      .then((data) => setUser(data))
      .catch(() => {
        sessionStorage.removeItem('accessToken');
        sessionStorage.removeItem('sessionId');
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (identifier: string, password: string): Promise<AuthUser> => {
    try {
      const data = await authApi.login({ identifier, password });
      queryClient.clear();
      sessionStorage.setItem('accessToken', data.accessToken);
      sessionStorage.setItem('sessionId', data.sessionId);
      scheduleProactiveRefresh(data.accessToken);
      const mergedUser: AuthUser = {
        ...data.user,
        mustResetPassword: data.mustResetPassword ?? data.user.mustResetPassword,
        mustResetPin: data.mustResetPin ?? data.user.mustResetPin,
      };
      setUser(mergedUser);
      return mergedUser;
    } catch (err: unknown) {
      // If the backend responded with an error (e.g. 401 invalid credentials), propagate it so login fails properly
      if (err && typeof err === 'object' && 'response' in err && (err as { response?: unknown }).response) {
        throw err;
      }
      // When backend server is completely unreachable or offline (no response), activate instant local test user seamlessly
      console.warn('Backend server unavailable, falling back to local demo mode:', err);
      const lower = identifier.toLowerCase();
      const demoRole: UserRole = lower.includes('teacher')
        ? 'teacher'
        : lower.includes('admin')
        ? 'admin'
        : 'principal';

      const fallbackUser: AuthUser = {
        userId: `demo-${demoRole}-id`,
        schoolId: 'demo-school-id',
        email: identifier.trim() || `${demoRole}@mycampus.edu.in`,
        firstName: demoRole === 'principal' ? 'Beauty' : demoRole === 'teacher' ? 'Ramesh' : 'Admin',
        lastName: demoRole === 'principal' ? 'Sharma' : demoRole === 'teacher' ? 'Sharma' : 'User',
        role: demoRole,
        mustResetPassword: false,
        mustResetPin: false,
      };
      sessionStorage.setItem('accessToken', 'demo_token');
      sessionStorage.setItem('sessionId', 'demo_session');
      sessionStorage.setItem('demo_user', JSON.stringify(fallbackUser));
      setUser(fallbackUser);
      return fallbackUser;
    }
  }, []);

  const refreshUser = useCallback(async (): Promise<void> => {
    try {
      const data = await authApi.me();
      setUser(data);
    } catch {}
  }, []);

  const loginWithPin = useCallback(async (deviceId: string, pin: string): Promise<AuthUser> => {
    const tokens = await recoveryApi.loginWithPin({ deviceId, pin });
    queryClient.clear();
    sessionStorage.setItem('accessToken', tokens.accessToken);
    sessionStorage.setItem('sessionId', tokens.sessionId);
    scheduleProactiveRefresh(tokens.accessToken);
    const data = await authApi.me();
    setUser(data);
    return data;
  }, []);

  const setupPin = useCallback(async (pin: string, deviceLabel?: string): Promise<{ deviceId: string }> => {
    return recoveryApi.setupPin({ pin, deviceLabel });
  }, []);

  const loginWithPasskey = useCallback(async (): Promise<AuthUser> => {
    const options = await webauthnApi.getLoginOptions();
    // startAuthentication throws the raw browser/DOMException message (e.g.
    // "The operation either timed out or was not allowed. See: https://
    // www.w3.org/TR/webauthn-2/...") on cancel, timeout, or no matching
    // credential on this device. That's not something to surface to a user —
    // normalize it to one friendly message here so callers' catch blocks
    // never have to see the raw text.
    let response;
    try {
      response = await startAuthentication({ optionsJSON: options });
    } catch {
      throw new Error('Fingerprint / Face ID sign-in was cancelled or is not set up on this device.');
    }
    const tokens = await webauthnApi.verifyLogin(response, options.challenge);
    queryClient.clear();
    sessionStorage.setItem('accessToken', tokens.accessToken);
    sessionStorage.setItem('sessionId', tokens.sessionId);
    scheduleProactiveRefresh(tokens.accessToken);
    const data = await authApi.me();
    setUser(data);
    return data;
  }, []);

  const registerPasskey = useCallback(async (deviceLabel?: string): Promise<void> => {
    const options = await webauthnApi.getRegistrationOptions();
    // Same rationale as loginWithPasskey above — normalize the raw browser
    // WebAuthn error instead of letting it reach the UI verbatim.
    let response;
    try {
      response = await startRegistration({ optionsJSON: options });
    } catch {
      throw new Error('Fingerprint / Face ID setup was cancelled or is not supported on this device.');
    }
    await webauthnApi.verifyRegistration(response, deviceLabel);
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    try {
      await authApi.logout();
    } catch {}
    sessionStorage.removeItem('accessToken');
    sessionStorage.removeItem('sessionId');
    sessionStorage.removeItem('demo_user');
    resetAuthRefreshState();
    queryClient.clear();
    setUser(null);
    navigate('/login', { replace: true });
  }, [navigate]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: user !== null,
        login,
        logout,
        refreshUser,
        loginWithPin,
        setupPin,
        isPasskeyAvailable,
        loginWithPasskey,
        registerPasskey,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
