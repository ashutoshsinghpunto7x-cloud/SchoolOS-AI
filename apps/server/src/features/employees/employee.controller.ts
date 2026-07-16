import { Request, Response, NextFunction } from 'express';
import { employeeService } from './employee.service';
import { sendSuccess, sendCreated, sendPaginated } from '../../lib/response';
import { buildAuthContext } from '../../lib/auth-context';
import { ValidationError, NotFoundError } from '../../middlewares/errorHandler';
import { fileToDataUri } from '../../lib/image-upload';

export const employeeController = {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx      = buildAuthContext(req.user!);
      const employee = await employeeService.createEmployee(req.body, ctx);
      sendCreated(res, employee, 'Employee record created successfully');
    } catch (err) { next(err); }
  },

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx    = buildAuthContext(req.user!);
      const result = await employeeService.listEmployees(req.query, ctx);
      sendPaginated(res, result.employees, {
        page: result.page,
        limit: result.limit,
        total: result.total,
      });
    } catch (err) { next(err); }
  },

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx      = buildAuthContext(req.user!);
      const employee = await employeeService.getEmployee(req.params.id, ctx);
      sendSuccess(res, employee);
    } catch (err) { next(err); }
  },

  /** Self-service: resolves the logged-in user's own linked Employee record
   *  (e.g. for a teacher viewing their own ID card) — never another employee's. */
  async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx      = buildAuthContext(req.user!);
      const employee = await employeeService.getEmployeeByUserId(ctx.userId, ctx.schoolId);
      if (!employee) throw new NotFoundError('Employee record for this account');
      sendSuccess(res, employee);
    } catch (err) { next(err); }
  },

  async getMyQr(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx      = buildAuthContext(req.user!);
      const employee = await employeeService.getEmployeeByUserId(ctx.userId, ctx.schoolId);
      if (!employee) throw new NotFoundError('Employee record for this account');
      const qr = await employeeService.getQrImage(employee._id.toString(), ctx);
      sendSuccess(res, qr);
    } catch (err) { next(err); }
  },

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx      = buildAuthContext(req.user!);
      const employee = await employeeService.updateEmployee(req.params.id, req.body, ctx);
      sendSuccess(res, employee, 'Employee updated successfully');
    } catch (err) { next(err); }
  },

  async uploadPhoto(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) throw new ValidationError('No file uploaded. Send the file in a "file" form field.');
      const ctx      = buildAuthContext(req.user!);
      const employee = await employeeService.updatePhoto(req.params.id, fileToDataUri(req.file), ctx);
      sendSuccess(res, employee, 'Photo updated');
    } catch (err) { next(err); }
  },

  async uploadSignature(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) throw new ValidationError('No file uploaded. Send the file in a "file" form field.');
      const ctx      = buildAuthContext(req.user!);
      const employee = await employeeService.updateSignature(req.params.id, fileToDataUri(req.file), ctx);
      sendSuccess(res, employee, 'Signature updated');
    } catch (err) { next(err); }
  },

  async deleteEmployee(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      await employeeService.deleteEmployee(req.params.id, ctx);
      sendSuccess(res, null, 'Employee record deleted');
    } catch (err) { next(err); }
  },

  // ── Login Provisioning ────────────────────────────────────────────────────

  async createLogin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx    = buildAuthContext(req.user!);
      const result = await employeeService.createLogin(req.params.id, req.body, ctx);
      sendCreated(res, result, 'Login created successfully');
    } catch (err) { next(err); }
  },

  // ── QR ────────────────────────────────────────────────────────────────────

  async regenerateQr(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx      = buildAuthContext(req.user!);
      const employee = await employeeService.regenerateQr(req.params.id, ctx);
      sendSuccess(res, employee, 'QR code regenerated');
    } catch (err) { next(err); }
  },

  async disableQr(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx      = buildAuthContext(req.user!);
      const employee = await employeeService.disableQr(req.params.id, ctx);
      sendSuccess(res, employee, 'QR code disabled');
    } catch (err) { next(err); }
  },

  async getQr(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const qr  = await employeeService.getQrImage(req.params.id, ctx);
      sendSuccess(res, qr);
    } catch (err) { next(err); }
  },
};
