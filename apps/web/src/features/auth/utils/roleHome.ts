import type { UserRole } from '@schoolos/types';
import { OPS_ROLES } from '@schoolos/types';

// 'incharge' mirrors 'principal' 1:1 today — every permission/UI check that
// gates on role === 'principal' should use this instead of a raw comparison,
// so incharge accounts (and any future alias) automatically inherit every
// principal-only feature without each call site having to remember to list
// both roles. See ProtectedRoute.tsx's ROLE_ALIASES for the route-level twin
// of this. Remove/adjust once the roles are meant to diverge.
export const isPrincipalRole = (role: UserRole | undefined | null): boolean =>
  role === 'principal' || role === 'incharge';

// Single source of truth for where each role lands after login.
export const getHomePathForRole = (role: UserRole): string => {
  if (role === 'teacher') return '/teacher';
  if (role === 'accountant') return '/accountant';
  if (role === 'operations_manager') return '/operations';
  if (role === 'academic_coordinator') return '/coordinator';
  if (role === 'principal' || role === 'incharge') return '/principal';
  if (role === 'parent') return '/parent';
  if (role === 'driver') return '/driver';
  if (OPS_ROLES.includes(role)) return '/ops';
  return '/reception';
};
