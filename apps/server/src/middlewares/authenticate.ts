import { Request, Response, NextFunction } from 'express';
import { tokenService } from '../features/auth/token.service';
import { UnauthorizedError } from './errorHandler';
import { attachRequestUser } from './requestContext';

export const authenticate = (req: Request, _res: Response, next: NextFunction): void => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    next(new UnauthorizedError('Authorization header missing'));
    return;
  }

  const token = header.slice(7);
  try {
    const payload = tokenService.verifyAccessToken(token);
    req.user = {
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
      schoolId: payload.schoolId,
      firstName: payload.firstName,
      lastName: payload.lastName,
    };
    attachRequestUser({ userId: payload.userId, schoolId: payload.schoolId, role: payload.role });
    next();
  } catch {
    next(new UnauthorizedError('Invalid or expired access token'));
  }
};
