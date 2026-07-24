import 'express';
import type { UserRole } from '../../features/users/user.model';

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
        role: UserRole;
        schoolId: string;
        firstName: string;
        lastName: string;
      };
    }
  }
}
