import { Request, Response, NextFunction } from 'express';
import { staffAttendanceService } from './staff-attendance.service';
import { sendSuccess } from '../../lib/response';
import { buildAuthContext } from '../../lib/auth-context';
import { ForbiddenError } from '../../middlewares/errorHandler';
import { employeeService } from '../employees/employee.service';

export const staffAttendanceController = {
  async scan(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx    = buildAuthContext(req.user!);
      const result = await staffAttendanceService.scanQr(req.body, ctx);
      sendSuccess(res, result, 'QR scanned');
    } catch (err) { next(err); }
  },

  async today(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx     = buildAuthContext(req.user!);
      const records = await staffAttendanceService.listToday(ctx);
      sendSuccess(res, records);
    } catch (err) { next(err); }
  },

  // Teacher self-service: only allow a teacher to view their own history.
  // NOTE: this checks employee.userId === ctx.userId — a proper "my employee
  // record" lookup helper would be cleaner but is a follow-up, not needed for
  // the admin/principal-first Phase 1 scope.
  async forEmployee(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const { employeeId } = req.params;

      if (ctx.role === 'teacher') {
        const own = await employeeService.getEmployeeByUserId(ctx.userId, ctx.schoolId);
        if (!own || own.employeeId !== employeeId) {
          throw new ForbiddenError('You can only view your own attendance history');
        }
      }

      const records = await staffAttendanceService.listForEmployee(employeeId, req.query, ctx);
      sendSuccess(res, records);
    } catch (err) { next(err); }
  },
};
