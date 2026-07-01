import { Request, Response, NextFunction } from 'express';
import { ForbiddenError } from './errorHandler';
import type { UserRole } from '../features/users/user.model';

export const authorize =
  (...roles: UserRole[]) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new ForbiddenError('Not authenticated'));
      return;
    }
    if (!roles.includes(req.user.role as UserRole)) {
      next(new ForbiddenError(`Access denied. Required role: ${roles.join(' or ')}`));
      return;
    }
    next();
  };
