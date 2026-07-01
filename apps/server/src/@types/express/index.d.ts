import 'express';

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
        role: 'admin' | 'reception' | 'teacher' | 'accountant';
        schoolId: string;
        firstName: string;
        lastName: string;
      };
    }
  }
}
