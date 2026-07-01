import { Request, Response, NextFunction } from 'express';
import { ForbiddenError, UnauthorizedError } from './errorHandler';
import { hasPermission, Permission } from '../lib/permissions';
import type { UserRole } from '../features/users/user.model';

export const permit =
  (permission: Permission) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new UnauthorizedError());
      return;
    }
    if (!hasPermission(req.user.role as UserRole, permission)) {
      next(new ForbiddenError(`Required permission: ${permission}`));
      return;
    }
    next();
  };
