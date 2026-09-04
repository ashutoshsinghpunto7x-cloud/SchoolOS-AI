import type { UserRole } from '@schoolos/types';
import { OPS_ROLES } from '@schoolos/types';

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
