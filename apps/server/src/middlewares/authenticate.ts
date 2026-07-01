import { Request, Response, NextFunction } from 'express';
import { tokenService } from '../features/auth/token.service';
import { UnauthorizedError } from './errorHandler';

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
    next();
  } catch {
    next(new UnauthorizedError('Invalid or expired access token'));
  }
};
