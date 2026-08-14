import type { UserRole } from '@schoolos/types';
import { OPS_ROLES } from '@schoolos/types';

// Single source of truth for where each role lands after login.
export const getHomePathForRole = (role: UserRole): string => {
  if (role === 'teacher') return '/teacher';
  if (role === 'accountant') return '/accountant';
  if (role === 'principal') return '/principal';
  if (role === 'parent') return '/parent';
  if (OPS_ROLES.includes(role)) return '/ops';
  return '/reception';
};
