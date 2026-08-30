import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuthContext } from '../context/AuthContext';
import { FeatureFlagProvider } from '@/lib/featureFlags';
import { useMaintenanceStatus } from '@/features/ops-center/hooks/useMaintenance';
import type { UserRole } from '@schoolos/types';

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
}

// Same allow-list as maintenanceService.isRoleExempt on the server — kept in
// sync manually since this is the client-side safety net for a tab that was
// already authenticated (with a still-valid token) when maintenance was
// toggled on mid-session. The server-side login check is what stops a
// blocked role from ever getting a session in the first place.
const MAINTENANCE_EXEMPT_ROLES: UserRole[] = ['admin', 'principal', 'incharge', 'owner', 'super_admin', 'devops', 'developer', 'support'];

// 'incharge' mirrors 'principal' 1:1 today — resolve it here so every
// existing allowedRoles={['principal', ...]} route picks it up without
// touching each route definition. Remove once the roles are meant to diverge.
const ROLE_ALIASES: Partial<Record<UserRole, UserRole>> = {
  incharge: 'principal',
};

export const ProtectedRoute = ({ allowedRoles }: ProtectedRouteProps) => {
  const { isAuthenticated, isLoading, user } = useAuthContext();
  const location = useLocation();
  const { data: maintenanceStatus } = useMaintenanceStatus(isAuthenticated);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F5F5F7]">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (allowedRoles && user) {
    const aliasedRole = ROLE_ALIASES[user.role];
    const isAllowed = allowedRoles.includes(user.role) || (aliasedRole && allowedRoles.includes(aliasedRole));
    if (!isAllowed) {
      return <Navigate to="/forbidden" replace />;
    }
  }

  if (user && maintenanceStatus?.isActive && !MAINTENANCE_EXEMPT_ROLES.includes(user.role)) {
    return <Navigate to="/under-maintenance" replace />;
  }

  // Account recovery isn't complete — block every other route until both the
  // new password and new PIN are set. The reset page itself is exempt so the
  // user can actually reach it.
  if (user && (user.mustResetPassword || user.mustResetPin) && location.pathname !== '/recovery/reset') {
    return <Navigate to="/recovery/reset" replace />;
  }

  return (
    <FeatureFlagProvider>
      <Outlet />
    </FeatureFlagProvider>
  );
};
