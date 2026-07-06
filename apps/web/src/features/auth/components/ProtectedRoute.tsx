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

  return <Outlet />;
};
