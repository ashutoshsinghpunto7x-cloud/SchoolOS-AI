import { useState, useEffect, useCallback, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../api/auth.api';
import { recoveryApi } from '../api/recovery.api';
import { resetAuthRefreshState } from '@/services/api';
import { queryClient } from '@/lib/queryClient';
import { AuthContext } from '../context/AuthContext';
import type { AuthUser } from '@schoolos/types';

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // Validate existing session on mount. Session lives in sessionStorage so each
  // browser tab has its own isolated token — on shared front-office computers,
  // logging in on one tab must not silently swap the session of another tab
  // that's already open (was causing spurious /forbidden redirects and
  // wrong-user data on dashboards that were mid-session in another tab).
  useEffect(() => {
    const token = sessionStorage.getItem('accessToken');
    if (!token) {
      setIsLoading(false);
      return;
    }

    authApi
      .me()
      .then((data) => setUser(data))
      .catch(() => {
        sessionStorage.removeItem('accessToken');
        sessionStorage.removeItem('refreshToken');
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (identifier: string, password: string): Promise<AuthUser> => {
    const data = await authApi.login({ identifier, password });
    queryClient.clear();
    sessionStorage.setItem('accessToken', data.accessToken);
    sessionStorage.setItem('refreshToken', data.refreshToken);
    const mergedUser: AuthUser = {
      ...data.user,
      mustResetPassword: data.mustResetPassword ?? data.user.mustResetPassword,
      mustResetPin: data.mustResetPin ?? data.user.mustResetPin,
    };
    setUser(mergedUser);
    return mergedUser;
  }, []);

  const refreshUser = useCallback(async (): Promise<void> => {
    const data = await authApi.me();
    setUser(data);
  }, []);

  const loginWithPin = useCallback(async (deviceId: string, pin: string): Promise<AuthUser> => {
    const tokens = await recoveryApi.loginWithPin({ deviceId, pin });
    queryClient.clear();
    sessionStorage.setItem('accessToken', tokens.accessToken);
    sessionStorage.setItem('refreshToken', tokens.refreshToken);
    const data = await authApi.me();
    setUser(data);
    return data;
  }, []);

  const setupPin = useCallback(async (pin: string, deviceLabel?: string): Promise<{ deviceId: string }> => {
    return recoveryApi.setupPin({ pin, deviceLabel });
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    await authApi.logout();
    sessionStorage.removeItem('accessToken');
    sessionStorage.removeItem('refreshToken');
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
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
