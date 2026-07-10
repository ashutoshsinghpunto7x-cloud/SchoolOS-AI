import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuthContext } from '../context/AuthContext';
import type { UserRole } from '@schoolos/types';

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
}

export const ProtectedRoute = ({ allowedRoles }: ProtectedRouteProps) => {
  const { isAuthenticated, isLoading, user } = useAuthContext();
  const location = useLocation();

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

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/forbidden" replace />;
  }

  // Account recovery isn't complete — block every other route until both the
  // new password and new PIN are set. The reset page itself is exempt so the
  // user can actually reach it.
  if (user && (user.mustResetPassword || user.mustResetPin) && location.pathname !== '/recovery/reset') {
    return <Navigate to="/recovery/reset" replace />;
  }

  return <Outlet />;
};
