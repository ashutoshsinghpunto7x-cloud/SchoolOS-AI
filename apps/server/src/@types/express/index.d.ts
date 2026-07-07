import 'express';

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
        role: 'admin' | 'principal' | 'reception' | 'teacher' | 'accountant';
        schoolId: string;
        firstName: string;
        lastName: string;
      };
    }
  }
}
