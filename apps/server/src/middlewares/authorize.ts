import { Request, Response, NextFunction } from 'express';
import { ForbiddenError } from './errorHandler';
import type { UserRole } from '../features/users/user.model';

// 'incharge' mirrors 'principal' 1:1 today — rather than appending 'incharge'
// to every authorize('admin', 'principal', ...) call across the codebase,
// resolve it here so every existing principal-gated route picks it up
// automatically. Remove this alias (and add 'incharge' explicitly wherever
// it should keep access) the day the two roles are meant to diverge.
const ROLE_ALIASES: Partial<Record<UserRole, UserRole>> = {
  incharge: 'principal',
};

export const authorize =
  (...roles: UserRole[]) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new ForbiddenError('Not authenticated'));
      return;
    }
    const userRole = req.user.role as UserRole;
    const aliasedRole = ROLE_ALIASES[userRole];
    if (!roles.includes(userRole) && !(aliasedRole && roles.includes(aliasedRole))) {
      next(new ForbiddenError(`Access denied. Required role: ${roles.join(' or ')}`));
      return;
    }
    next();
  };
